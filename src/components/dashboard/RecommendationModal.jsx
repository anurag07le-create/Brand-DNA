import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, MoveRight, Quote } from 'lucide-react';
import { createPortal } from 'react-dom';

const RecommendationModal = ({ isOpen, onClose, recommendations = [], isLoading, onTryOut, loadingText = "Analyzing Your Style" }) => {
    if (!isOpen) return null;

    const items = Array.isArray(recommendations)
        ? recommendations
        : recommendations?.recommandation
        || recommendations?.recommendation
        || [];

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md font-['Inter']">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-2 md:inset-4 lg:inset-6 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20"
            >
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center relative z-10 bg-white/80 border-b border-gray-100 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <Sparkles className="text-purple-600 w-6 h-6 fill-purple-50" />
                            <span>AI Style Recommendations</span>
                        </h2>
                        <p className="text-gray-500 text-sm mt-1.5 ml-9 font-medium">
                            Curated matches compatible with your selection
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="group p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
                    >
                        <X size={20} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative z-10">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-2">{loadingText}</h3>
                            <p className="text-gray-500 max-w-md text-center leading-relaxed">
                                {loadingText.includes("Try-On")
                                    ? "Our AI is generating your virtual try-on result. This may take about 2 minutes."
                                    : "Our AI is scanning color palettes, textures, and current trends to find your perfect match."}
                            </p>
                            <p className="text-purple-600 font-semibold text-xs mt-6 px-4 py-2 bg-purple-50 rounded-full animate-pulse">
                                ESTIMATED TIME: ~1-2 MINUTES
                            </p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center min-h-[300px] text-center">
                            <h3 className="text-xl font-bold text-gray-400">No matches found</h3>
                            <p className="text-gray-400 mt-2">Try selecting a different item from your wardrobe.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                            {items.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                                    className="group relative bg-white rounded-3xl p-5 shadow-lg shadow-gray-100/50 hover:shadow-2xl hover:shadow-purple-100/50 transition-all duration-500 border border-gray-100 hover:-translate-y-2"
                                >
                                    {/* Image Container with Hover Effect */}
                                    <div className="relative aspect-[4/4] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl mb-6 overflow-hidden flex items-center justify-center p-6 group-hover:from-white group-hover:to-purple-50/30 transition-colors duration-500">
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/80 to-transparent z-10" />
                                        <img
                                            src={item.bgremove_image_url || item.image || ''}
                                            alt={item.recommendation}
                                            className="relative z-20 w-full h-full object-contain filter drop-shadow-sm group-hover:drop-shadow-xl group-hover:scale-110 transition-all duration-700 ease-out"
                                        />
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex flex-col space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-purple-700 transition-colors">
                                                {item.recommendation || 'Recommended Item'}
                                            </h3>
                                        </div>

                                        <div className="relative bg-gray-50/80 rounded-2xl p-4 group-hover:bg-white border border-transparent group-hover:border-purple-100 transition-all duration-300">
                                            <Quote className="absolute top-3 left-3 w-4 h-4 text-purple-300 fill-purple-300 opacity-50" />
                                            <p className="text-sm text-gray-600 leading-relaxed pl-2 relative z-10 pt-1">
                                                {item.reason}
                                            </p>
                                            {/* Try Out Button - Always Visible & Clickable */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTryOut && onTryOut(item);
                                                }}
                                                className="w-full mt-auto py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-medium shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 relative z-30 cursor-pointer"
                                            >
                                                <Sparkles className="w-4 h-4 text-purple-300" />
                                                <span>Try Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default RecommendationModal;
