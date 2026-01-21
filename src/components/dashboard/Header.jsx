import React, { useState, useRef, useEffect } from "react";
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Bell, Upload, X, UploadCloud, RefreshCw, ShoppingBag, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';
import RecommendationModal from './RecommendationModal';

const Header = ({ searchTerm, setSearchTerm, toggleSidebar }) => {
    const { user } = useAuth();
    const { cartItems, removeFromCart, clearCart } = useCart();
    const location = useLocation();
    const path = location.pathname;
    const [isFocused, setIsFocused] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [bulkFiles, setBulkFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tryOnResult, setTryOnResult] = useState(null);
    const fileInputRef = useRef(null);
    const bulkInputRef = useRef(null);
    // Track which items are selected for Try On (Lookboard)
    // Map of Category -> ItemID (Only 1 item per category allowed)
    const [activeTryOnSelection, setActiveTryOnSelection] = useState({});

    // Reset selection when cart changes or modal opens
    useEffect(() => {
        if (isCartModalOpen) {
            // Auto-select the first item of each category by default if nothing selected?
            // Or start empty. Let's start empty or smarter:
            // Actually, let's just keep it simple: If cart items exist, try to preserve selection, else reset.
            // For now, let's default to last added item per category? 
            // Better: When cart opens, if no selection, pre-select one per category.
            const initialSelection = {};
            cartItems.forEach(item => {
                // If multiple items of same category, this will pick the last one (latest added)
                // This acts as a sensible default
                initialSelection[item.category] = item.id;
            });
            setActiveTryOnSelection(initialSelection);
        }
    }, [isCartModalOpen, cartItems]);

    const toggleTryOnItem = (item) => {
        setActiveTryOnSelection(prev => ({
            ...prev,
            [item.category]: item.id // Radio checking: Replace any existing item of this category
        }));
    };

    const TRY_ON_WEBHOOK_URL = "https://studio.pucho.ai/api/v1/webhooks/blBzsUTZYx22RCorKDNgE/sync";

    const BULK_WEBHOOK_URL = "https://studio.pucho.ai/api/v1/webhooks/W7CGwp3TLwQHvMJIUOUHC";

    // Greeting Logic
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    const firstName = user?.full_name?.split(' ')[0] || user?.Name?.split(' ')[0] || 'Member';

    // Page Configuration
    const pageConfig = {
        '/wardrobe': {
            useGreeting: true, // Use Greeting instead of static title
            subtitle: 'READY TO STYLE SOMETHING NEW?',
            placeholder: 'Search Items...',
            showSearch: false, // Hiding search to make room for generic layout or keep it? User screenshot didn't show search bar in the "Good Afternoon" version.
            showAddItem: true
        },
        '/try-on': {
            title: 'Virtual Try On',
            subtitle: 'Visualize your outfits with AI',
            placeholder: 'Search...',
            showSearch: false,
            showAddItem: false
        },
        '/users': {
            title: 'User Management',
            subtitle: 'Manage system users and verify accounts',
            placeholder: 'Search Users...',
            showSearch: true,
            showAddItem: false
        },
        '/ai-stylist': {
            title: 'AI Stylist',
            subtitle: 'Let AI curate your perfect look',
            placeholder: 'Search...',
            showSearch: false,
            showAddItem: false
        },
        'default': {
            title: 'Dashboard',
            subtitle: 'Welcome to Pucho Virtual Try On',
            placeholder: 'Search',
            showSearch: false,
            showAddItem: false
        }
    };

    const getCurrentConfig = () => {
        const matchedKey = Object.keys(pageConfig)
            .filter(key => key !== 'default')
            .sort((a, b) => b.length - a.length)
            .find(key => path.startsWith(key));
        return matchedKey ? pageConfig[matchedKey] : pageConfig['default'];
    };

    const config = getCurrentConfig();

    // Determine Title Content
    const titleContent = config.useGreeting ? (
        <h1 className="text-xl font-bold text-[#111935] leading-tight">
            {timeGreeting}, <span className="text-[#8B5CF6]">{firstName}!</span>
        </h1>
    ) : (
        <h1 className="text-xl font-bold text-[#111935] leading-tight">
            {config.title}
        </h1>
    );

    // Upload Logic
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setBulkFiles([]); // Clear bulk if single selected
        }
    };

    const handleBulkFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setBulkFiles(Array.from(e.target.files));
            setSelectedFile(null); // Clear single if bulk selected
        }
    };

    const RECOMMENDATION_WEBHOOK_URL = "https://studio.pucho.ai/api/v1/webhooks/4Lcc5u4mZhPPrTvk1ZWfi/sync";

    // ... (inside Header component)
    const [recommendations, setRecommendations] = useState([]);
    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [isRecLoading, setIsRecLoading] = useState(false);

    const handleRecommendation = async (item) => {
        alert("Feature coming soon");
        return;

        /* Feature temporarily disabled
        const spreadsheetId = user?.['Spreadsheet ID'] || user?.spreadsheet_id;
        const worksheetId = user?.['Worksheet ID (Cloth Log)'] || user?.worksheet_id;

        if (!spreadsheetId || !worksheetId) {
            alert("Spreadsheet details missing in user profile.");
            return;
        }

        setIsRecLoading(true);
        setIsRecModalOpen(true);

        // Generate 25-char alphanumeric code ONCE
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const triggerCode = Array.from({ length: 25 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');

        const startTime = Date.now();
        const MAX_DURATION = 130000; // 2 min 10 sec

        // Helper to process response data
        const processData = (data) => {
            let recs = data.recommandation || data.recommendation;
            if (typeof recs === 'string') {
                try {
                    const cleaned = recs.replace(/```json/g, '').replace(/```/g, '').trim();
                    recs = JSON.parse(cleaned);
                } catch (e) {
                    console.error("Failed to parse string:", e);
                }
            }
            if (!Array.isArray(recs) && recs && typeof recs === 'object') recs = [recs];
            return (recs && Array.isArray(recs) && recs.length > 0) ? recs : null;
        };

        const pollStatus = async () => {
            if (Date.now() - startTime > MAX_DURATION) {
                console.warn("Polling timed out");
                alert("Request timed out. Please try again.");
                setIsRecModalOpen(false); // Close on hard timeout
                setIsRecLoading(false);
                return;
            }

            try {
                console.log("Polling status...");
                // Lightweight Poll: Send ONLY trigger_code
                const response = await fetch(RECOMMENDATION_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trigger_code: triggerCode })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("Poll Response:", data);
                    const recs = processData(data);

                    if (recs) {
                        setRecommendations(recs);
                        setIsRecLoading(false);
                    } else {
                        // Still empty, keep polling
                        setTimeout(pollStatus, 5000);
                    }
                } else {
                    // Server error, retry polling
                    setTimeout(pollStatus, 5000);
                }
            } catch (error) {
                console.error("Poll Error:", error);
                setTimeout(pollStatus, 5000);
            }
        };

        // Initial Trigger (Full Payload)
        try {
            const payload = {
                item_name: item.name,
                bg_remove_link: item.image,
                spreadsheet_id: spreadsheetId,
                worksheet_id: worksheetId,
                category: item.category,
                trigger_code: triggerCode,
                details: item.details || {}
            };

            // Single Long-Running Request (awaits until server responds)
            const response = await fetch(RECOMMENDATION_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Initial Response:", data);
                const recs = processData(data);

                if (recs) {
                    setRecommendations(recs);
                    setIsRecLoading(false);
                } else {
                    // No data yet? Start polling
                    console.warn("Initial empty response. Starting poll...");
                    setTimeout(pollStatus, 5000);
                }
            } else {
                alert("Failed to start recommendation process.");
                // Keep modal open
                setIsRecLoading(false);
            }
        } catch (error) {
            console.error("Trigger Error:", error);
            alert("Error sending request.");
            // Keep modal open
            setIsRecLoading(false);
        }
        */
    };

    const handleCreateLookboard = async () => {
        if (!user?.['Client\'s Image (Attachment)']) {
            alert("Please upload a profile image in your user settings first!");
            return;
        }

        // Validate: Ensure selection is not empty
        if (Object.keys(activeTryOnSelection).length === 0) {
            alert("Please select at least one item to create a lookboard.");
            return;
        }


        setIsSubmitting(true);
        try {
            // Filter cart items based on active selection
            const selectedItemsForPayload = cartItems.filter(item =>
                activeTryOnSelection[item.category] === item.id
            );

            const payload = {
                client_image: user['Client\'s Image (Attachment)'],
                selected_items: selectedItemsForPayload.map(item => ({
                    category: item.category,
                    image_url: item.image,
                    name: item.name
                })),
                timestamp: new Date().toISOString()
            };

            const response = await fetch(TRY_ON_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Webhook Error:", errorText);
                throw new Error(`Lookboard generation failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const resultImage = data.image_url;

            if (!resultImage) throw new Error("No image URL returned");

            const newHistoryItem = {
                user_id: user.id,
                result_image: resultImage,
                items_used: selectedItemsForPayload.map(item => ({
                    id: item.id,
                    original_row_number: item.original_row_number, // Capture explicit row
                    name: item.name,
                    category: item.category,
                    image: item.image,
                    details: item.details
                }))
            };

            const { error: dbError } = await supabase.from('try_on_history').insert([newHistoryItem]);
            if (dbError) console.error("History Save Error:", dbError);

            setTryOnResult({ ...newHistoryItem, resultImage: resultImage });
            setIsCartModalOpen(false); // Close cart to show result
        } catch (error) {
            console.error("Lookboard Error:", error);
            alert("Failed to generate lookboard. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };


    const removeBulkFile = (index) => {
        setBulkFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if ((!selectedFile && bulkFiles.length === 0) || !user) return;
        setUploading(true);

        try {
            // BULK UPLOAD FLOW
            if (bulkFiles.length > 0) {
                const uploadPromises = bulkFiles.map(async (file) => {
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
                    const { error: uploadError } = await supabase.storage
                        .from('user-images')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage.from('user-images').getPublicUrl(fileName);
                    return publicUrl;
                });

                const imageUrls = await Promise.all(uploadPromises);

                const spreadsheetId = user?.['Spreadsheet ID'] || user?.spreadsheet_id;
                const worksheetId = user?.['Worksheet ID (Cloth Log)'] || user?.worksheet_id;
                const folderId = user?.['Folder ID'] || user?.folder_id;

                const payload = {
                    images: imageUrls,
                    name: user.Name || user.full_name,
                    email: user.Email || user.email,
                    spreadsheet_id: spreadsheetId,
                    worksheet_id: worksheetId,
                    drive_folder_id: folderId
                };

                const response = await fetch(BULK_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Bulk upload failed");

                alert("Bulk upload successful! Items will appear shortly.");
                setBulkFiles([]);
                setIsModalOpen(false);
                window.location.reload(); // Refresh to show new items
                return;
            }

            // SINGLE FILE FLOW (Existing)
            const fileName = `${Date.now()}_${selectedFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('user-images')
                .upload(fileName, selectedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('user-images').getPublicUrl(fileName);

            const spreadsheetId = user?.['Spreadsheet ID'] || user?.spreadsheet_id;
            const worksheetId = user?.['Worksheet ID (Cloth Log)'] || user?.worksheet_id;
            const folderId = user?.['Folder ID'] || user?.folder_id;

            if (!spreadsheetId || !worksheetId) {
                alert("Configuration Error: Missing Spreadsheet ID or Worksheet ID.");
                setUploading(false);
                return;
            }

            const payload = {
                image: publicUrl,
                name: user.Name || user.full_name,
                email: user.Email || user.email,
                "spreadsheet id": spreadsheetId,
                "worksheet id": worksheetId,
                "folder id": folderId || ''
            };

            await fetch('https://studio.pucho.ai/api/v1/webhooks/zNoYEYqEAIPOk2leG7lYA', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            alert('Item added successfully!');
            setIsModalOpen(false);
            setSelectedFile(null);
            window.location.reload(); // Refresh to show changes
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to add item. ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-sm flex items-center justify-between px-8 py-4 font-['Inter']">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="hidden focus:outline-none text-gray-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>

                <div className="flex flex-col gap-0.5 pl-4">
                    {config.useGreeting ? (
                        <h1 className="text-xl font-bold text-[#111935] tracking-tight">
                            {timeGreeting}, <span className="text-[#8B5CF6]">{firstName}!</span>
                        </h1>
                    ) : (
                        <h1 className="text-xl font-bold text-[#111935] tracking-tight">
                            {config.title}
                        </h1>
                    )}
                    <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">
                        {config.subtitle}
                    </p>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-6">
                {/* Search Bar */}
                {config.showSearch && (
                    <div className={`
                        hidden md:flex items-center gap-2.5 bg-white rounded-full transition-all duration-200 ease-in-out
                        ${isFocused
                            ? 'h-[44px] w-[332px] border-[0.7px] border-[#B56FFF] shadow-[0px_0px_0px_3px_#DBD4FB] p-1'
                            : 'h-[44px] w-[332px] border border-black/5 p-1 hover:border-[#B56FFF] hover:shadow-none'
                        }
                    `}>
                        <div className="flex items-center justify-center w-9 h-9 bg-[#A0D296]/10 rounded-full flex-shrink-0 text-[#5A7C60]">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder={config.placeholder}
                            value={searchTerm || ''}
                            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
                            className={`
                                flex-1 bg-transparent border-none outline-none text-[#111935] placeholder:text-black/50 text-[16px] font-['Inter'] leading-[150%]
                                transition-all duration-300 ease-in-out ${isFocused ? 'pl-2' : 'pl-0'}
                            `}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </div>
                )}

                {/* Cart Button */}
                <Button
                    onClick={() => setIsCartModalOpen(true)}
                    className="bg-white text-[#111935] border border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 shadow-sm hover:shadow-md rounded-xl px-4 py-2 h-[44px] flex items-center gap-2.5 font-medium transition-all duration-200 group"
                >
                    <ShoppingBag size={20} className="text-gray-600 group-hover:text-[#8B5CF6] transition-colors" />
                    <span className="text-sm font-semibold">Cart</span>
                    {cartItems.length > 0 && (
                        <span className="bg-[#8B5CF6] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ml-0.5">
                            {cartItems.length}
                        </span>
                    )}
                </Button>

                {/* Add Item Button */}
                {config.showAddItem && (
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20 rounded-xl px-4 py-2 h-[44px] flex items-center gap-2 font-medium transition-all"
                    >
                        <Plus size={20} /> Add Item
                    </Button>
                )}
            </div>

            {/* Cart Modal */}
            {
                isCartModalOpen && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm text-[#111935] font-['Inter']">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative mx-4 md:mx-0 max-h-[80vh] flex flex-col"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <ShoppingBag size={20} />
                                    Your Cart ({cartItems.length})
                                </h3>
                                <button onClick={() => setIsCartModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                {cartItems.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>Your cart is empty.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {cartItems.map((item) => {
                                            const isSelected = activeTryOnSelection[item.category] === item.id;
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => toggleTryOnItem(item)}
                                                    className={`relative group rounded-xl p-3 border cursor-pointer transition-all duration-200
                                                ${isSelected
                                                            ? 'bg-purple-50 border-[#8B5CF6] shadow-sm ring-1 ring-[#8B5CF6]/50'
                                                            : 'bg-gray-50 border-gray-100 hover:border-purple-200'
                                                        }
                                            `}
                                                >
                                                    {/* Selection Indicator */}
                                                    {isSelected && (
                                                        <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-[#8B5CF6] text-white rounded-full flex items-center justify-center shadow-sm">
                                                            <CheckCircle2 size={12} />
                                                        </div>
                                                    )}

                                                    <div className="aspect-[3/4] mb-2 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2" />
                                                    </div>
                                                    <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                                                    <p className="text-xs text-gray-500 truncate">{item.category}</p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent selection toggle when removing
                                                            removeFromCart(item.id);
                                                        }}
                                                        className="absolute top-2 right-2 bg-white text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors z-10"
                                                        title="Remove item"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <Button variant="ghost" onClick={clearCart} className="text-red-500 hover:text-red-700 hover:bg-red-50">Clear Cart</Button>

                                {cartItems.length > 0 ? (
                                    <Button
                                        onClick={handleCreateLookboard}
                                        className="bg-[#111935] text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin" /> Generating...
                                            </>
                                        ) : (
                                            "Create your lookboard"
                                        )}
                                    </Button>
                                ) : (
                                    <Button onClick={() => setIsCartModalOpen(false)} className="bg-[#111935] text-white hover:bg-black">
                                        Continue Styling
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )
            }

            {/* Try On Result Modal */}
            {
                tryOnResult && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setTryOnResult(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/90 backdrop-blur-2xl rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col md:flex-row m-4 md:m-0 font-['Inter'] ring-1 ring-white/20"
                        >
                            {/* Result Image */}
                            <div className="w-full md:w-1/2 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center relative p-4 group">
                                <img
                                    src={tryOnResult.resultImage}
                                    alt="Full Lookboard"
                                    className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
                                />
                            </div>

                            {/* Sidebar / Details */}
                            <div className="w-full md:w-1/2 p-8 bg-transparent overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-gray-300/50 scrollbar-track-transparent">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Lookboard Ready!</h2>
                                        <p className="text-gray-500 text-sm">Here is your generated style.</p>
                                    </div>
                                    <button onClick={() => setTryOnResult(null)} className="p-2 hover:bg-gray-100/50 rounded-full text-gray-500 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Items Used</h3>
                                <div className="space-y-4">
                                    {tryOnResult.items_used && tryOnResult.items_used.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl border border-gray-200/50 bg-white/40 hover:bg-white/60 transition-colors backdrop-blur-sm group">
                                            <div className="w-16 h-16 bg-gray-50/50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-900 truncate">{item.name || 'Item'}</h4>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100/80 text-purple-800">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRecommendation(item)}
                                                className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors focus:opacity-100 shadow-sm border border-purple-100"
                                                title="Get Recommendations"
                                            >
                                                <Sparkles size={18} className="fill-purple-300" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto pt-8 flex gap-3">
                                    <Button onClick={() => setTryOnResult(null)} className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">
                                        Done
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )
            }

            {/* Add Item Modal */}
            {
                isModalOpen && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm text-[#111935] font-['Inter']">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative mx-4 md:mx-0"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg">Add New Item</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <input
                                    type="file"
                                    accept=".jpg, .jpeg, .png, .webp"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    ref={fileInputRef}
                                />
                                <input
                                    type="file"
                                    multiple
                                    accept=".jpg, .jpeg, .png, .webp"
                                    onChange={handleBulkFileChange}
                                    className="hidden"
                                    ref={bulkInputRef}
                                />
                                {/* Main Drop Zone (Single) or Bulk List */}
                                {bulkFiles.length > 0 ? (
                                    <div className="border-2 border-dashed border-purple-200 rounded-xl p-4 max-h-[250px] overflow-y-auto bg-purple-50 custom-scrollbar">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3 sticky top-0 bg-purple-50 pb-2 border-b border-purple-100 flex justify-between">
                                            <span>Selected Files ({bulkFiles.length})</span>
                                            <button onClick={() => setBulkFiles([])} className="text-xs text-red-500 hover:text-red-700">Clear All</button>
                                        </h4>
                                        <div className="space-y-2">
                                            {bulkFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm shadow-sm">
                                                    <span className="truncate max-w-[200px] text-gray-700">{file.name}</span>
                                                    <button onClick={() => removeBulkFile(idx)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative group"
                                        >
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-purple-50 text-[#8B5CF6] flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Upload size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-700">Click to upload single image</p>
                                                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or WEBP</p>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedFile && (
                                            <div className="mt-4 p-3 bg-purple-50 text-[#8B5CF6] text-sm rounded-lg flex items-center justify-between">
                                                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                                                <button onClick={() => setSelectedFile(null)} className="hover:text-red-500"><X size={14} /></button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-3">
                                {/* Left Side: Bulk Upload Trigger */}
                                <button
                                    onClick={() => bulkInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-500 hover:border-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-purple-50 rounded-xl transition-all shadow-sm text-xs font-medium"
                                    title="Bulk Upload (Multiple Files)"
                                >
                                    <UploadCloud size={16} />
                                    <span>Bulk Upload</span>
                                </button>

                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={(!selectedFile && bulkFiles.length === 0) || uploading}
                                        className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                                    >
                                        {uploading ? (
                                            <><RefreshCw size={16} className="animate-spin mr-2" /> Uploading...</>
                                        ) : (
                                            bulkFiles.length > 0 ? `Submit Items (${bulkFiles.length})` : 'Submit Item'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )
            }

            {/* Recommendation Modal */}
            <RecommendationModal
                isOpen={isRecModalOpen}
                onClose={() => setIsRecModalOpen(false)}
                recommendations={recommendations}
                isLoading={isRecLoading}
            />

        </header >
    );
};

export default Header;
