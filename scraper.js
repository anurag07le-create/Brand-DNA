const puppeteerCore = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cheerio = require('cheerio');
const ColorThief = require('colorthief');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Conditional import to avoid issues in serverless if full puppeteer isn't needed/installed correctly
let puppeteer;
try {
    if (!process.env.VERCEL) {
        puppeteer = require('puppeteer');
    }
} catch (e) { }

// Increase limit for Vercel if possible
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

async function scrapeWebsite(targetUrl, onProgress = () => { }) {
    let browser;
    try {
        onProgress("Initializing browser...", 0);
        console.log(`[Scraper] Starting analysis for: ${targetUrl}`);

        const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION;

        if (isVercel) {
            console.log('[Scraper] Running in Serverless/Vercel mode');
            browser = await puppeteerCore.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        } else {
            console.log('[Scraper] Running in Local/Render mode');
            browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--window-size=1920,1080',
                    '--disable-dev-shm-usage', // Critical for Render/Docker
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
        }

        console.log('[Scraper] Browser launched');

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Enable Request Interception to speed up loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // Block heavy/unnecessary resources
            // User specifically requested FONTS, so we MUST NOT block 'font'
            if (['media', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Go to URL
        onProgress("Navigating to website...", 10);
        console.log('[Scraper] Navigating to page...');
        // Reduced timeout to 30s to fail fast
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('[Scraper] Page loaded (domcontentloaded)');

        // Auto-scroll to trigger lazy loading
        onProgress("Scanning for lazy-loaded assets...", 20);
        console.log('[Scraper] Starting auto-scroll for lazy loading...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 800; // Larger jumps (was 400)
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    // Reduced limit to 8000 (was 15000)
                    if (totalHeight >= scrollHeight || totalHeight > 8000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
        console.log('[Scraper] Auto-scroll complete');

        // Wait for network idle to ensure images load
        onProgress("Waiting for network idle...", 40);
        try {
            await page.waitForNetworkIdle({ timeout: 1500 }).catch(() => { });
        } catch (e) { }

        // Get generic metadata
        onProgress("Extracting metadata...", 50);
        console.log('[Scraper] Extracting metadata...');
        const content = await page.content();
        const $ = cheerio.load(content);

        const rawTitle = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
        const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
        const keywords = $('meta[name="keywords"]').attr('content');

        // Extract strictly the brand name
        let brandName = $('meta[property="og:site_name"]').attr('content');
        if (!brandName) {
            // Try content of a.navbar-brand or similar
            // Or try to parse from title separator ( | or - )
            if (rawTitle.includes(' | ')) brandName = rawTitle.split(' | ')[0];
            else if (rawTitle.includes(' - ')) brandName = rawTitle.split(' - ')[0];
            else if (rawTitle.includes(': ')) brandName = rawTitle.split(': ')[0];

            // Fallback to domain host
            if (!brandName || brandName.length > 20) {
                try {
                    const parsed = new url.URL(targetUrl);
                    brandName = parsed.hostname.replace('www.', '').split('.')[0];
                    // Capitalize
                    brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
                } catch (e) { brandName = 'Site'; }
            }
        }
        console.log(`[Scraper] Identified Brand Name: ${brandName} `);

        onProgress("Capturing screenshot...", 60);
        console.log('[Scraper] Taking screenshot...');

        // Scroll back to top for the screenshot (User Request)
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 500)); // Wait for fixed headers/animations (Reduced time)

        // For Vercel/Serverless, we cannot rely on writing to 'public/screenshots' permanently.
        // Even locally, returning base64 is cleaner for a stateless architecture.
        // However, ColorThief needs a file path or buffer.

        // RESIZE for Vercel Safety: Ensure the screenshot is small (800px width)
        // This dramatically reduces payload size (~100-200KB)
        await page.setViewport({ width: 800, height: 600 });

        const screenshotBuffer = await page.screenshot({
            fullPage: false,
            type: 'jpeg',
            quality: 50,
            encoding: 'binary'
        });
        const screenshotBase64 = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

        // LOCAL FALLBACK: Save to file for debugging if needed, or just standard behavior
        let screenshotPathForColorThief = null;
        if (!isVercel) {
            const screenshotPath = path.join(__dirname, 'public', 'screenshots', `site_${Date.now()}.png`);
            if (!fs.existsSync(path.dirname(screenshotPath))) {
                fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
            }
            fs.writeFileSync(screenshotPath, screenshotBuffer);
            screenshotPathForColorThief = screenshotPath;
            console.log(`[Scraper] Screenshot saved to ${screenshotPath} `);
        }

        onProgress("Extracting visual assets...", 70);
        console.log('[Scraper] Extracting assets (Images, Backgrounds, SVGs)...');
        const assetData = await page.evaluate(() => {
            const images = new Set();
            const minSize = 15;

            const addImg = (src) => {
                if (src && !src.startsWith('data:') && (src.startsWith('http') || src.startsWith('//') || src.startsWith('/'))) {
                    images.add(src);
                }
            };

            // 1. IMG tags
            document.querySelectorAll('img').forEach(img => {
                const src = img.currentSrc || img.src || img.getAttribute('data-src');
                const srcset = img.srcset || img.getAttribute('data-srcset');

                if (srcset) {
                    const sources = srcset.split(',').map(s => {
                        const parts = s.trim().split(' ');
                        return { url: parts[0], width: parts[1] ? parseInt(parts[1]) : 0 };
                    });
                    sources.sort((a, b) => b.width - a.width);
                    if (sources.length > 0) addImg(sources[0].url);
                }

                if (src) {
                    addImg(src);
                }
            });

            // 2. Background Images
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const bgImage = style.backgroundImage;
                if (bgImage && bgImage !== 'none' && bgImage.startsWith('url')) {
                    const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                    if (urlMatch && urlMatch[1]) {
                        addImg(urlMatch[1]);
                    }
                }
            });

            // 3. SVGs (Inline) - convert to data URI or finding logical way to reference?
            // For this MVP, we will only look for external SVGs referenced in <img src="..."> already covered.
            // Inline SVGs are hard to "extract" as a URL.
            // However, we can look for specific class names or IDs if needed, but let's stick to URLs for now.

            return Array.from(images);
        });

        // Resolve relative URLs
        const resolvedImages = assetData.map(imgSrc => {
            try {
                return new url.URL(imgSrc, targetUrl).href;
            } catch (err) {
                return imgSrc;
            }
        }).filter(img => !img.startsWith('data:')); // STRICTLY remove data URIs

        const uniqueImages = [...new Set(resolvedImages)].slice(0, 50); // Limit to 50 for safety
        console.log(`[Scraper] Found ${uniqueImages.length} unique images`);

        const favicons = [];
        $('link[rel*="icon"]').each((i, el) => {
            let href = $(el).attr('href');
            if (href) {
                try {
                    href = new url.URL(href, targetUrl).href;
                    favicons.push(href);
                } catch (e) { }
            }
        });

        // Extract Colors (Logic below)

        // Try to identify the Main Logo
        onProgress("Identifying main logo...", 84);
        const mainLogo = await page.evaluate(() => {
            const potentialLogos = [];
            const allImages = document.querySelectorAll('img, svg');

            allImages.forEach(img => {
                let score = 0;
                const src = img.currentSrc || img.src || (img.tagName === 'SVG' ? 'svg' : '');
                const alt = img.getAttribute('alt') || '';
                const className = img.getAttribute('class') || ''; // Fix: className can be object on SVG
                const id = img.getAttribute('id') || '';
                const filename = src ? src.split('/').pop().toLowerCase() : '';

                // 1. Check Keywords
                if (filename.includes('logo')) score += 5;
                if (className.toLowerCase().includes('logo')) score += 3;
                if (id.toLowerCase().includes('logo')) score += 3;
                if (alt.toLowerCase().includes('logo')) score += 3;

                // 2. Position (Logos are typically Top-Left)
                const rect = img.getBoundingClientRect();
                if (rect.top < 150 && rect.left < 500) score += 5;

                // 3. Parent link check (often home link)
                const parentLink = img.closest('a');
                if (parentLink) {
                    const href = parentLink.getAttribute('href');
                    if (href === '/' || href === '.' || href === window.location.origin) score += 3;
                }

                if (rect.width > 20 && rect.height > 20 && score > 0) {
                    potentialLogos.push({ src: src, score: score });
                }
            });

            potentialLogos.sort((a, b) => b.score - a.score);
            return potentialLogos.length > 0 ? potentialLogos[0].src : null;
        });

        let resolvedLogo = null;
        if (mainLogo) {
            try {
                resolvedLogo = new url.URL(mainLogo, targetUrl).href;
            } catch (e) { resolvedLogo = mainLogo; }
        }

        // Extract Colors
        onProgress("Analyzing color palette...", 85);
        console.log('[Scraper] Extracting colors...');
        let hexPalette = [];
        try {
            // ColorThief only accepts file path or buffer? 
            // The library 'colorthief' (if it's the standard one) accepts a file path in Node.
            // If on Vercel, we can't easily use a file path.
            // We might need to skip color extraction or find a buffer-friendly way.
            // The standard 'colorthief' package is often a wrapper around get-pixels.

            if (screenshotPathForColorThief) {
                const palette = await ColorThief.getPalette(screenshotPathForColorThief, 6);
                hexPalette = palette.map(rgb => {
                    return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
                });
            } else {
                // For Vercel, we'll try to use a different approach or mock it for now to avoid crashes
                // Since 'colorthief' npm package usually required a file path.
                // We'll fallback to a mock palette or try to write to /tmp
                try {
                    const tmpPath = path.join('/tmp', `screenshot_${Date.now()}.png`);
                    fs.writeFileSync(tmpPath, screenshotBuffer);
                    const palette = await ColorThief.getPalette(tmpPath, 6);
                    hexPalette = palette.map(rgb => {
                        return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
                    });
                    // fs.unlinkSync(tmpPath); // Clean up
                } catch (e) {
                    console.warn('[Scraper] Vercel color extraction fallback failed', e);
                    hexPalette = ['#000000', '#ffffff', '#333333', '#666666'];
                }
            }

        } catch (e) {
            console.warn("[Scraper] Color extraction failed, buffering defaults");
            hexPalette = ['#000000', '#ffffff', '#333333', '#666666'];
        }

        onProgress("Identifying typography...", 90);
        console.log('[Scraper] Extracting fonts...');
        const fonts = await page.evaluate(() => {
            const getFont = (selector) => {
                const el = document.querySelector(selector);
                if (!el) return null;
                const font = window.getComputedStyle(el).fontFamily;
                return font.split(',')[0].replace(/['"]/g, '');
            };
            return {
                body: getFont('body'),
                heading: getFont('h1') || getFont('h2') || getFont('h3')
            };
        });

        onProgress("Finalizing DNA report...", 98);
        console.log('[Scraper] Analysis complete!');
        return {
            url: targetUrl,
            meta: {
                title: rawTitle,
                brand: brandName,
                description,
                keywords
            },
            assets: {
                logo: resolvedLogo,
                screenshot: screenshotBase64, // Returning Base64 string now
                images: uniqueImages,
                favicons
            },
            colors: hexPalette,
            fonts
        };

    } catch (error) {
        console.error("[Scraper] Error:", error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scrapeWebsite };
