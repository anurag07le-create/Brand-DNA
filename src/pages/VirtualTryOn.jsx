import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Calendar, Clock, X, ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import RecommendationModal from '../components/dashboard/RecommendationModal';

const VirtualTryOn = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [selectedTryOn, setSelectedTryOn] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [sourceItemForRec, setSourceItemForRec] = useState(null);
    const [clientImageForRec, setClientImageForRec] = useState(null);
    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [isRecLoading, setIsRecLoading] = useState(false);

    const BASE_WEBHOOK_URL = "https://studio.pucho.ai/api/v1/webhooks/q2leIG527YOJyLWwMw4NC/sync";
    const TRY_OUT_WEBHOOK_URL = "https://studio.pucho.ai/api/v1/webhooks/VqFOHiQPyzdwOUZGufFDL/sync";
    const handleTryOut = async (recommendedItem) => {
        setIsRecLoading(true); // Re-use loading state or add specific one if needed

        // Generate Trigger Code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const triggerCode = Array.from({ length: 25 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        const startTime = Date.now();
        const MAX_POLL_DURATION = 130000; // ~2 minutes + buffer

        // Attempt to find client image
        // Use captured context, or fallback to selectedTryOn (if open), or user avatar
        const clientImage = clientImageForRec || selectedTryOn?.resultImage || user?.avatar_url || "";

        const payload = {
            source_item: sourceItemForRec,
            recommended_item: recommendedItem,
            client_image: clientImage,
            trigger_code: triggerCode
        };

        console.log("Triggering Try Out:", payload);

        // ... (rest of handleTryOut logic unchanged pending further edits if needed) ...
        // Polling Function
        const pollTryOut = async () => {
            if (Date.now() - startTime > MAX_POLL_DURATION) {
                console.warn("Try Out Polling timed out.");
                setIsRecLoading(false);
                alert("Try On took too long. Please check your history later.");
                return;
            }

            try {
                console.log(`Polling Try Out... (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);
                const response = await fetch(TRY_OUT_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trigger_code: triggerCode })
                });

                if (response.ok) {
                    const data = await response.json();
                    // Check for key field from user screenshot
                    if (data && data['try-on-image']) {
                        console.log("Try Out Success:", data);

                        // Normalize recommended item for the detail view which expects name and image
                        const normalizedRecItem = {
                            ...recommendedItem,
                            name: recommendedItem.name || recommendedItem.recommendation || "Recommended Item",
                            image: recommendedItem.image || recommendedItem.bgremove_image_url || "",
                            category: recommendedItem.category || "Recommendation"
                        };

                        // Construct new history item to display immediately
                        const newItem = {
                            id: data.id || Date.now(),
                            date: new Date().toISOString(),
                            resultImage: data['try-on-image'],
                            items: [sourceItemForRec, normalizedRecItem].filter(Boolean),
                            // Store extra AI metadata if schema allows, or just use for alert
                            compliment: data.compliment,
                            suggestions: data.improvement_suggestions
                        };

                        // Update local history and open modal
                        setHistory(prev => [newItem, ...prev]);
                        setSelectedTryOn(newItem);
                        setIsRecModalOpen(false);
                        setIsRecLoading(false);
                    } else {
                        setTimeout(pollTryOut, 3000);
                    }
                } else {
                    if (response.status === 404) {
                        console.warn("Try Out endpoint 404 (likely standard polling wait). Retrying...");
                    }
                    setTimeout(pollTryOut, 3000);
                }
            } catch (e) {
                console.error("Try Out poll error:", e);
                setTimeout(pollTryOut, 3000);
            }
        };

        // Initial Request
        try {
            const response = await fetch(TRY_OUT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data['try-on-image']) {
                    // Immediate success
                    // Normalize recommended item for the detail view which expects name and image
                    const normalizedRecItem = {
                        ...recommendedItem,
                        name: recommendedItem.name || recommendedItem.recommendation || "Recommended Item",
                        image: recommendedItem.image || recommendedItem.bgremove_image_url || "",
                        category: recommendedItem.category || "Recommendation"
                    };

                    const newItem = {
                        id: Date.now(),
                        date: new Date().toISOString(),
                        resultImage: data['try-on-image'],
                        items: [sourceItemForRec, normalizedRecItem].filter(Boolean)
                    };
                    setHistory(prev => [newItem, ...prev]);
                    setSelectedTryOn(newItem);
                    setIsRecModalOpen(false);
                    setIsRecLoading(false);
                } else {
                    // Start polling
                    console.log("Try Out initial accepted. Starting poll...");
                    setTimeout(pollTryOut, 3000);
                }
            } else {
                console.warn("Try Out initial fail/wait. Starting poll...");
                setTimeout(pollTryOut, 3000);
            }
        } catch (error) {
            console.error("Try Out trigger error:", error);
            // Fallback to polling
            setTimeout(pollTryOut, 3000);
        }
    };


    const handleRecommendation = async (item) => {
        // ... (validation) ...
        const spreadsheetId = user?.['Spreadsheet ID'] || user?.spreadsheet_id;
        const worksheetId = user?.['Worksheet ID (Cloth Log)'] || user?.worksheet_id;

        if (!spreadsheetId || !worksheetId) {
            alert("Spreadsheet details missing in user profile. Please ensure 'Spreadsheet ID' and 'Worksheet ID (Cloth Log)' are set.");
            return;
        }

        // Store source item for Try Out context
        setSourceItemForRec(item);

        // Capture client image context from the current detail view before closing it
        if (selectedTryOn) {
            setClientImageForRec(selectedTryOn.resultImage);
        } else {
            setClientImageForRec(null);
        }

        // Close the detail modal UI but keep the data via clientImageForRec and sourceItemForRec
        setSelectedTryOn(null);

        // 2. Initialize UI State
        setIsRecLoading(true);
        setIsRecModalOpen(true);

        // 3. Generate Request Metadata
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const triggerCode = Array.from({ length: 25 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        const startTime = Date.now();
        const MAX_POLL_DURATION = 130000; // ~2 minutes

        // --- Helper Functions ---

        /**
         * Parses and normalizes the API response data.
         * Handles markdown-wrapped strings and maps '1'-suffixed keys to standard keys.
         */
        const processData = (data) => {
            if (!data) return null;

            // Prioritize 'response' key, fallback to other variations
            let rawData = data.response || data.recommandation || data.recommendation;

            // If data is missing but we have mapped keys directly at the root, use data itself
            if (!rawData && (data.recommendation1 || data[0]?.recommendation1)) {
                rawData = data;
            }

            let recs = rawData;

            // Parse JSON if it's a string (e.g. from LLM output)
            if (typeof recs === 'string') {
                try {
                    const cleaned = recs.replace(/```json/g, '').replace(/```/g, '').trim();
                    recs = JSON.parse(cleaned);
                } catch (e) {
                    console.error("Failed to parse response string:", e);
                    return null;
                }
            }

            // Ensure it's an array
            if (!Array.isArray(recs) && recs && typeof recs === 'object') recs = [recs];

            // Map fields if valid array found
            if (recs && Array.isArray(recs) && recs.length > 0) {
                return recs.map(r => ({
                    recommendation: r.recommendation1 || r.recommendation,
                    bgremove_image_url: r.bgremove_image_url1 || r.bgremove_image_url,
                    reason: r.reason1 || r.reason,
                    ...r
                }));
            }
            return null;
        };

        /**
         * Polls the webhook URL for results.
         */
        const pollStatus = async () => {
            // Check timeout
            if (Date.now() - startTime > MAX_POLL_DURATION) {
                console.warn("Polling timed out.");
                setIsRecLoading(false);
                // We keep the modal open so the user sees *something* happened (or didn't), 
                // but strictly speaking visual loading stops.
                return;
            }

            try {
                console.log(`Polling via sync endpoint... (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

                // Polling uses the BASE URL (which now has /sync)
                const response = await fetch(BASE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trigger_code: triggerCode })
                });

                if (response.ok) {
                    const data = await response.json();
                    const result = processData(data);

                    if (result) {
                        console.log("Polling success:", result);
                        setRecommendations(result);
                        setIsRecLoading(false);
                    } else {
                        // Response OK but no data yet -> Keep polling
                        setTimeout(pollStatus, 3000);
                    }
                } else {
                    // Check for 404 specifically
                    if (response.status === 404) {
                        console.error("Endpoint 404. Workflow likely not published or URL incorrect.");
                        // Retry even on 404 since it might be transient in some setups during deployment
                    }

                    // Other errors (500, etc) -> Retry
                    console.warn(`Polling failed with ${response.status}. Retrying...`);
                    setTimeout(pollStatus, 3000);
                }
            } catch (error) {
                console.error("Polling network error:", error);
                setTimeout(pollStatus, 3000);
            }
        };

        // --- Main Execution Flow ---

        try {
            const payload = {
                item_name: item.name,
                bg_remove_link: item.image,
                spreadsheet_id: spreadsheetId,
                worksheet_id: worksheetId,
                category: item.category,
                code: triggerCode,        // Required by User
                trigger_code: triggerCode // Required by Backend
            };

            // Trigger uses BASE_WEBHOOK_URL (which includes /sync)
            console.log("Triggering Recommendation via:", BASE_WEBHOOK_URL);

            const response = await fetch(BASE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Initial Sync Response:", data);
                const result = processData(data);

                if (result) {
                    setRecommendations(result);
                    setIsRecLoading(false);
                } else {
                    // No data yet? Start polling
                    console.log("Initial empty response. Starting poll...");
                    setTimeout(pollStatus, 3000);
                }
            } else {
                console.warn(`Initial request failed with ${response.status}. Attempting to poll...`);
                // Fallback to polling
                setTimeout(pollStatus, 3000);
            }
        } catch (error) {
            console.error("Trigger Error:", error);
            // Even on network error, we can try to poll if the request might have gone through
            // alert(`Error sending request: ${error.message}`);
            console.warn("Retrying with polling...");
            setTimeout(pollStatus, 3000);
        }
    };

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('try_on_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) {
                // Map DB snake_case to UI camelCase
                const mappedHistory = data.map(item => ({
                    id: item.id,
                    date: item.created_at,
                    resultImage: item.result_image,
                    items: item.items_used || []
                }));
                setHistory(mappedHistory);
            }
            if (error) console.error("Error fetching history:", error);
        };

        fetchHistory();
    }, [user]);

    const handleClearHistory = async () => {
        if (confirm("Are you sure you want to delete all try-on history? This cannot be undone.")) {
            // Delete all for this user
            const { error } = await supabase
                .from('try_on_history')
                .delete()
                .eq('user_id', user.id);

            if (!error) {
                setHistory([]);
            } else {
                alert("Failed to clear history.");
                console.error(error);
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="space-y-8 font-['Inter']">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="pl-4">
                    <h2 className="text-lg font-bold tracking-tight text-[#111935]">My Virtual Try-On Library</h2>
                    <p className="text-gray-500 mt-0.5">Your generated styles and history</p>
                </div>
                <div className="flex items-center gap-6 self-end md:self-auto pr-4">
                    <div className="text-sm font-medium text-gray-400">
                        {history.length} Styles Generated
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                            <span>Clear History</span>
                        </button>
                    )}
                </div>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Shirt size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Try-Ons Yet</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Head over to your Wardrobe, select some items, and click "Try On" to generate your first look!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {history.map((item) => (
                        <motion.div
                            key={item.id}
                            whileHover={{ y: -5 }}
                            onClick={() => setSelectedTryOn(item)}
                            className="bg-white rounded-2xl p-2 md:p-4 shadow-sm hover:shadow-glow transition-all cursor-pointer border border-gray-100 group"
                        >
                            <div className="aspect-[3/4] bg-gray-100 rounded-xl mb-4 overflow-hidden relative">
                                <img
                                    src={item.resultImage}
                                    alt="Try On Result"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <p className="text-white text-sm font-medium">View Details</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(item.date).split(',')[0]}</span>
                                <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(item.date).split(',')[1]}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {
                selectedTryOn && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTryOn(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/95 backdrop-blur-2xl rounded-2xl w-[98vw] h-[96vh] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20"
                        >
                            {/* Result Image */}
                            <div className="w-full md:w-1/2 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center relative p-8 group">
                                <img
                                    src={selectedTryOn.resultImage}
                                    alt="Full Try On"
                                    className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg"
                                />
                                <a
                                    href={selectedTryOn.resultImage}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute bottom-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                                    title="Open Full Image"
                                >
                                    <ExternalLink size={20} />
                                </a>
                            </div>

                            {/* Sidebar / Details */}
                            <div className="w-full md:w-1/2 p-8 bg-transparent overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-gray-300/50 scrollbar-track-transparent">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Try-On Result</h2>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="purple" className="text-xs px-2 py-1">AI Generated</Badge>
                                            <p className="text-gray-500 text-sm">{formatDate(selectedTryOn.date)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedTryOn(null)} className="p-2 hover:bg-gray-100/50 rounded-full text-gray-500 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Compliment / AI Text */}
                                {selectedTryOn.compliment && (
                                    <div className="mb-8 p-6 bg-purple-50/50 rounded-2xl border border-purple-100">
                                        <div className="flex gap-3">
                                            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                                            <div>
                                                <h4 className="font-semibold text-purple-900 mb-1">AI Stylist Feedback</h4>
                                                <p className="text-purple-800/80 leading-relaxed text-sm">
                                                    {selectedTryOn.compliment}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Items Used</h3>
                                <div className="space-y-4">
                                    {selectedTryOn.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all">
                                            <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-900 truncate text-lg">{item.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSelectedTryOn(null); // Close detail modal
                                                    handleRecommendation(item); // Open rec modal
                                                }}
                                                className="p-3 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors focus:opacity-100 shadow-sm border border-purple-100 group"
                                                title="Get Recommendations"
                                            >
                                                <Sparkles size={20} className="fill-purple-200 group-hover:fill-purple-300 transition-colors" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto pt-8">
                                    <Button variant="outline" className="w-full justify-center py-6 text-lg bg-gray-900 text-white hover:bg-black border-transparent shadow-lg rounded-xl" onClick={() => setSelectedTryOn(null)}>
                                        Close Result
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>, document.body
                )
            }

            {/* Recommendation Modal */}
            <RecommendationModal
                isOpen={isRecModalOpen}
                onClose={() => setIsRecModalOpen(false)}
                recommendations={recommendations}
                isLoading={isRecLoading}
                loadingText={history.length > 0 && isRecLoading ? "Generating your Virtual Try-On..." : "Analyzing Your Style"} // Simple heuristic: if loading and we have history/or triggering tryout
                onTryOut={handleTryOut}
            />

        </div >
    );
};

export default VirtualTryOn;
