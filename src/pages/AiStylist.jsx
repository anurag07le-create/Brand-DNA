import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shirt, PartyPopper, Briefcase, Sun, Heart, Send, Plane, Dumbbell, Gem, Smile, Zap, Cloud, Palette, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';

const TryOnResultModal = ({ result, onClose, onSave, isSaving }) => {
    if (!result) return null;
    const { body } = result;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
            >
                <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full backdrop-blur-sm transition-colors">
                    <CheckCircle2 size={24} className="rotate-45" /> {/* Using as Close icon */}
                </button>

                {/* Left: Image */}
                <div className="w-full md:w-5/12 bg-gray-100 flex items-center justify-center p-6 relative">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-black/5 bg-white">
                        <img
                            src={body['try-on-image']}
                            alt="Try On Result"
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl border border-white/50 shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">AI Compliment</p>
                                <p className="text-sm font-medium text-gray-900 leading-snug">"{body.compliment}"</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Details */}
                <div className="w-full md:w-7/12 p-8 overflow-y-auto custom-scrollbar bg-white flex flex-col">
                    <div className="mb-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
                            <Sparkles size={14} />
                            {body.style_tag || 'Your Style'}
                        </div>
                        <h2 className="text-3xl font-bold text-[#111935] mb-2 leading-tight">Your Curated Look</h2>
                        <p className="text-gray-600 leading-relaxed">{body.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        {/* Accessories */}
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Gem size={16} className="text-purple-500" />
                                Review Accessories
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(body.accessory_suggestions || {}).map(([key, value]) => (
                                    <div key={key} className="text-sm">
                                        <span className="font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span className="text-gray-500 ml-1">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Improvements */}
                        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Zap size={16} className="text-blue-500" />
                                Style Tips
                            </h3>
                            <ul className="space-y-2">
                                {(body.improvement_suggestions || []).map((tip, idx) => (
                                    <li key={idx} className="text-sm text-gray-600 flex gap-2 items-start">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="py-4 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold"
                        >
                            Try Another Look
                        </Button>
                        <Button
                            onClick={onSave}
                            disabled={isSaving}
                            className="py-4 rounded-xl bg-[#111935] text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Heart size={20} className="fill-current" />
                                    Save to Library
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

const AiStylist = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [mood, setMood] = useState('');
    const [occasion, setOccasion] = useState('');

    const handleTryOn = async (topImg, bottomImg, index) => {
        if (!user) {
            alert("Please log in to use Virtual Try-On.");
            return;
        }

        setLoadingOutfit(index);

        try {
            const payload = {
                top_image: topImg,
                bottom_image: bottomImg,
                mood: mood,
                occasion: occasion,
                prompt: prompt,
                client_image: user['Client\'s Image (Attachment)'] || user.avatar_url || '',
                user_id: user.id || user['User ID'],
                user_name: user.full_name || user.Name
            };

            const response = await fetch('https://studio.pucho.ai/api/v1/webhooks/nuSEc8v5WqTLBOqInhEoj/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Try-On failed: ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json();
            const bodyData = rawData.body || rawData; // Handle both wrapped and flattened responses

            setTryOnResult({ body: bodyData, topImg, bottomImg });

        } catch (error) {
            console.error("Try-On Error:", error);
            alert(`Failed to initiate Try-On: ${error.message}`);
        } finally {
            setLoadingOutfit(null);
        }
    };
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState(null); // Expecting array of sets
    const [activeSet, setActiveSet] = useState(0);
    const [loadingOutfit, setLoadingOutfit] = useState(null);

    // Missing state from previous error
    const [tryOnResult, setTryOnResult] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveLook = async () => {
        if (!tryOnResult || !user) return;
        setIsSaving(true);
        try {
            const { body, topImg, bottomImg } = tryOnResult;

            // Construct items_used array similar to VirtualTryOn structure
            const itemsUsed = [
                { name: 'Top', image: topImg, category: 'Top' },
                { name: 'Bottom', image: bottomImg, category: 'Bottom' }
            ];

            const { error } = await supabase
                .from('try_on_history')
                .insert({
                    user_id: user.id,
                    result_image: body['try-on-image'],
                    items_used: itemsUsed
                });

            if (error) throw error;

            alert("Look saved to your Virtual Try-On Library!");
            setTryOnResult(null); // Close modal on success

        } catch (error) {
            console.error("Save Error:", error);
            alert("Failed to save the look. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const moods = [
        { id: 'happy', label: 'Happy', icon: Smile, color: 'bg-yellow-100 text-yellow-600' },
        { id: 'confident', label: 'Confident', icon: Zap, color: 'bg-purple-100 text-purple-600' },
        { id: 'relaxed', label: 'Relaxed', icon: Cloud, color: 'bg-blue-100 text-blue-600' },
        { id: 'artistic', label: 'Artistic', icon: Palette, color: 'bg-pink-100 text-pink-600' },
    ];

    const occasions = [
        { id: 'casual', label: 'Casual', icon: Sun, color: 'bg-orange-100 text-orange-600' },
        { id: 'party', label: 'Party', icon: PartyPopper, color: 'bg-indigo-100 text-indigo-600' },
        { id: 'office', label: 'Office', icon: Briefcase, color: 'bg-slate-100 text-slate-600' },
        { id: 'date', label: 'Date', icon: Heart, color: 'bg-red-100 text-red-600' },
        { id: 'vacation', label: 'Vacation', icon: Plane, color: 'bg-sky-100 text-sky-600' },
        { id: 'sport', label: 'Sport', icon: Dumbbell, color: 'bg-emerald-100 text-emerald-600' },
        { id: 'wedding', label: 'Wedding', icon: Gem, color: 'bg-rose-100 text-rose-600' },
    ];

    const handleGenerate = async () => {
        if (!mood && !occasion && !prompt) return;

        if (!user) {
            alert("Please log in to use AI Stylist.");
            return;
        }

        setIsGenerating(true);
        setSuggestions(null);

        try {
            const generateTrackingCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                for (let i = 0; i < 25; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };

            const payload = {
                name: user.full_name || user.Name || 'User',
                spreadsheet_id: user['Spreadsheet ID'] || user.spreadsheet_id,
                worksheet_id: user['Worksheet ID (Cloth Log)'] || user.worksheet_id, // Cloth Log
                detail_worksheet_id: user['Worksheet ID (Details)'] || user['Worksheet ID (Cloth Log)'], // Fallback to Cloth Log if Details not found
                mood: mood,
                occasion: occasion,
                prompt: prompt,
                client_image: user['Client\'s Image (Attachment)'] || user.avatar_url || '',
                tracking_code: generateTrackingCode()
            };

            const response = await fetch('https://studio.pucho.ai/api/v1/webhooks/Kf2M0HA3XOlPzxzJ0Hhzg/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate styles. Status: ${response.status} ${response.statusText}. Response: ${errorText}`);
            }

            const rawData = await response.json();
            // Handle structure: { body: { set_1: {...}, set_2: {...} } }
            const bodyData = rawData.body || rawData;

            // Convert object sets (set_1, set_2, ...) to array
            const sets = Object.values(bodyData)
                .filter(item => item && typeof item === 'object' && item.outfits)
                .map((set, index) => ({
                    id: set.set_id || `Set ${index + 1}`,
                    theme: set.theme,
                    reason: set.reason,
                    outfits: set.outfits || [] // Array of { top, bottom }
                }));

            if (sets.length === 0) {
                // Fallback Mock if API returns empty for demo purposes (Optional, can remove if API is guaranteed)
                /*
                setSuggestions([
                   { reason: "A fresh look based on your mood.", items: [{ id: 1, name: 'Sample Tee', type: 'Top', image: '' }] },
                   { reason: "Alternative vibe.", items: [] },
                   { reason: "Bold choice.", items: [] }
                ]);
                */
                alert("AI couldn't generate outfits at this moment. Please try again.");
            } else {
                setSuggestions(sets);
                setActiveSet(0);
            }

        } catch (error) {
            console.error("AI Stylist Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full font-['Inter'] max-w-7xl mx-auto flex flex-col md:flex-row gap-6 overflow-hidden px-4 py-4 items-start">

            {/* Input Section - Redesigned & Compact */}
            <div className="flex-1 max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl shadow-purple-500/5 border border-purple-50 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-h-full relative z-10 shrink-0">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-[#111935] tracking-tight">Curate Your Look</h2>
                    <p className="text-xs text-gray-400 font-medium">Select your vibe and let AI style you.</p>
                </div>

                <div className="space-y-6">
                    {/* Mood Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Mood</label>
                        <div className="grid grid-cols-2 gap-3">
                            {moods.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMood(m.id)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group
                                        ${mood === m.id
                                            ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-200'
                                            : 'border-gray-100 hover:border-purple-200 hover:bg-purple-50/30'
                                        }
                                    `}
                                >
                                    <div className={`p-2 rounded-xl ${m.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <m.icon size={16} strokeWidth={2.5} />
                                    </div>
                                    <span className={`text-sm font-semibold ${mood === m.id ? 'text-purple-700' : 'text-gray-600'}`}>{m.label}</span>
                                    {mood === m.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Occasion Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Occasion</label>
                        <div className="flex flex-wrap gap-2">
                            {occasions.map((o) => (
                                <button
                                    key={o.id}
                                    onClick={() => setOccasion(o.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-200
                                        ${occasion === o.id
                                            ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-200'
                                            : 'border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <o.icon size={14} className={occasion === o.id ? 'text-purple-200' : 'text-gray-400'} />
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details Input - Fixed Height */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Details</label>
                        <div className="relative group">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={3}
                                placeholder="E.g., 'Summer garden party with floral themes'"
                                className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-400 text-sm font-medium leading-relaxed resize-none"
                            />
                            <div className="absolute bottom-3 right-3 text-purple-300">
                                <Sparkles size={14} className="group-focus-within:animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || (!mood && !occasion)}
                    className="w-full py-4 rounded-2xl bg-[#111935] text-white font-bold text-sm shadow-xl shadow-gray-200 hover:shadow-2xl hover:scale-[1.02] active:scale-98 transform transition-all duration-300 flex items-center justify-center gap-3 mt-auto shrink-0 group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center gap-2">
                        {isGenerating ? (
                            <>
                                <RefreshCw className="animate-spin" size={18} />
                                <span>Curating...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                                <span>Curate My Look</span>
                            </>
                        )}
                    </div>
                </Button>
            </div>

            {/* Results Section */}
            <div className="flex-1 w-full bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 flex flex-col p-3 overflow-hidden h-full relative">
                <div className="flex items-center justify-between mb-2 shrink-0">
                    <h2 className="text-xs font-bold text-[#111935] flex items-center gap-2 uppercase tracking-wider">
                        <Shirt size={16} className="text-[#8B5CF6]" />
                        {suggestions ? 'Your Look' : 'Inspiration'}
                    </h2>

                    {/* Set Toggles */}
                    {suggestions && suggestions.length > 0 && (
                        <div className="flex bg-white/50 p-0.5 rounded-lg border border-gray-200/50">
                            {suggestions.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveSet(idx)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeSet === idx
                                        ? 'bg-white shadow-sm text-purple-600 ring-1 ring-black/5'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    Set {idx + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {suggestions && suggestions.length > 0 ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Theme & Reason */}
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-3 shrink-0">
                            <h3 className="text-sm font-bold text-gray-900 mb-1">{suggestions[activeSet].theme || `Option ${activeSet + 1}`}</h3>
                            <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
                                <Sparkles size={12} className="inline mr-1 text-purple-500" />
                                {suggestions[activeSet].reason}
                            </p>
                        </div>

                        {/* Outfits Grid */}
                        <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 flex-1 content-start custom-scrollbar p-1">
                            {suggestions[activeSet].outfits && suggestions[activeSet].outfits.map((outfit, index) => {
                                const topImg = outfit.top?.bgremove_url || outfit.top?.image_url;
                                const bottomImg = outfit.bottom?.bgremove_url || outfit.bottom?.image_url;

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                                    >
                                        <div className="flex items-stretch gap-4">
                                            {/* Top */}
                                            <div className="flex-1 flex flex-col gap-3 group/item">
                                                <div className="aspect-[3/4] rounded-2xl bg-gray-50 overflow-hidden relative border border-gray-100 group-hover:border-purple-100 transition-colors">
                                                    {topImg ? (
                                                        <img src={topImg} alt={outfit.top?.item} className="w-full h-full object-contain p-2 mix-blend-multiply transition-transform duration-500 group-hover/item:scale-110" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><Shirt size={32} /></div>
                                                    )}
                                                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-gray-900 shadow-sm border border-gray-100 tracking-wide uppercase">Top</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 truncate">{outfit.top?.item || 'Top Item'}</p>
                                                    <p className="text-xs text-gray-500 font-medium truncate capitalize mt-0.5">{outfit.top?.color}</p>
                                                </div>
                                            </div>

                                            {/* Connector */}
                                            <div className="flex flex-col justify-center items-center">
                                                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm border border-purple-100 group-hover:scale-110 transition-transform duration-300">
                                                    <span className="text-lg font-bold">+</span>
                                                </div>
                                            </div>

                                            {/* Bottom */}
                                            <div className="flex-1 flex flex-col gap-3 group/item">
                                                <div className="aspect-[3/4] rounded-2xl bg-gray-50 overflow-hidden relative border border-gray-100 group-hover:border-purple-100 transition-colors">
                                                    {bottomImg ? (
                                                        <img src={bottomImg} alt={outfit.bottom?.item} className="w-full h-full object-contain p-2 mix-blend-multiply transition-transform duration-500 group-hover/item:scale-110" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><Shirt size={32} /></div>
                                                    )}
                                                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-gray-900 shadow-sm border border-gray-100 tracking-wide uppercase">Bottom</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 truncate">{outfit.bottom?.item || 'Bottom Item'}</p>
                                                    <p className="text-xs text-gray-500 font-medium truncate capitalize mt-0.5">{outfit.bottom?.color}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleTryOn(topImg, bottomImg, index)}
                                            disabled={loadingOutfit === index}
                                            className={`w-full mt-4 py-3 rounded-2xl bg-gray-900 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-gray-800 hover:shadow-xl hover:scale-[1.02] active:scale-98 transform transition-all duration-200 flex items-center justify-center gap-2 group/btn ${loadingOutfit === index ? 'opacity-75 cursor-wait' : ''}`}
                                        >
                                            {loadingOutfit === index ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                <Gem size={14} className="group-hover/btn:text-purple-400 transition-colors" />
                                            )}
                                            {loadingOutfit === index ? 'Processing...' : 'Try This Look'}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                        {isGenerating ? (
                            <div className="flex flex-col items-center max-w-[200px]">
                                <RefreshCw size={32} className="animate-spin text-purple-500 mb-4" />
                                <p className="font-bold text-sm text-[#111935]">Styling your look...</p>
                                <p className="text-xs mt-2 text-gray-500 leading-relaxed">This usually takes 1-2 minutes to curate the perfect combinations.</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                    <Sparkles size={20} className="text-gray-300" />
                                </div>
                                <p className="font-medium text-sm">Waiting for your vibe...</p>
                                <p className="text-xs mt-1 max-w-[200px]">Select options to generate.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
            {/* Result Modal */}
            <TryOnResultModal
                result={tryOnResult}
                onClose={() => setTryOnResult(null)}
                onSave={handleSaveLook}
                isSaving={isSaving}
            />
        </div>
    );
};

export default AiStylist;
