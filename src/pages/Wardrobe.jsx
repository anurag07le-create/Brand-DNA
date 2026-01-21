import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Shirt, RefreshCw, AlertCircle, X, ExternalLink, Filter, CheckCircle2, Trash2, Edit, UploadCloud, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

const Wardrobe = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { cartItems, toggleCartItem, removeFromCart } = useCart();

    // Local state for Wardrobe view
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeFilters, setActiveFilters] = useState({});
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Old Selection State Removed - using CartContext now
    const [viewItem, setViewItem] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [editFormData, setEditFormData] = useState({
        Type: '',
        Category: '',
        Subcategory: '',
        Discard: 'No',
        DiscardReason: ''
    });

    const UPDATE_WEBHOOK_URL = "https://studio.pucho.ai/api/v1/webhooks/9uAl4US0IT6FimP33rwGR";
    const BULK_UPLOAD_WEBHOOK_URL = "https://studio.pucho.ai/api/v1/webhooks/W7CGwp3TLwQHvMJIUOUHC";

    // TRY_ON_WEBHOOK_URL removed (moved to Header)

    const EXCLUDED_FILTERS = ['image url', 'background rem', 'item', 'name', 'timestamp', 'file id', 'spreadsheet id', 'worksheet id', 'folder id', 'detailed summary', 'link to buy', 'notes', 'discard reason'];

    // Helper: Simple CSV Line Parser
    const parseCSVLine = (text) => {
        const result = [];
        let cell = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cell.trim());
                cell = '';
            } else {
                cell += char;
            }
        }
        result.push(cell.trim());
        return result;
    };

    const fetchSheetData = async () => {
        const spreadsheetId = user?.['Spreadsheet ID'] || user?.spreadsheet_id;
        const worksheetId = user?.['Worksheet ID (Cloth Log)'] || user?.worksheet_id;

        if (!spreadsheetId || !worksheetId) {
            setError("Spreadsheet configuration missing. Please contact admin.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${worksheetId}`;
            const response = await fetch(url);

            if (!response.ok) throw new Error('Failed to fetch sheet data');

            const csvText = await response.text();
            const lines = csvText.split('\n').filter(line => line.trim() !== '');

            if (lines.length < 2) {
                setItems([]);
                return;
            }

            const headers = parseCSVLine(lines[0]).map(h => h.trim());
            const lowerHeaders = headers.map(h => h.toLowerCase());

            const imgIndex = lowerHeaders.findIndex(h => h.includes('background rem') || h.includes('background removed'));
            const itemIndex = lowerHeaders.findIndex(h => h === 'item' || h === 'name');
            const categoryIndex = lowerHeaders.findIndex(h => h === 'category');
            const subCategoryIndex = lowerHeaders.findIndex(h => h === 'subcategory');
            const occasionIndex = lowerHeaders.findIndex(h => h === 'occasion');
            const seasonIndex = lowerHeaders.findIndex(h => h === 'season');

            const parsedItems = lines.slice(1).map((line, idx) => {
                const row = parseCSVLine(line);
                if (row.length < headers.length) return null;
                const bgRemURL = imgIndex !== -1 ? row[imgIndex]?.replace(/^"|"$/g, '') : '';
                const details = {};
                headers.forEach((header, i) => {
                    const value = row[i]?.replace(/^"|"$/g, '').trim();
                    if (value && value !== 'N/A' && value !== '#N/A') {
                        details[header] = value;
                    }
                });

                return {
                    id: idx,
                    original_row_number: idx + 2, // Explicit row number from CSV (1-based + header)
                    name: row[itemIndex]?.replace(/^"|"$/g, '') || 'Unknown Item',
                    image: bgRemURL,
                    category: row[categoryIndex]?.replace(/^"|"$/g, ''),
                    subcategory: row[subCategoryIndex]?.replace(/^"|"$/g, ''),
                    tags: [
                        row[occasionIndex]?.replace(/^"|"$/g, ''),
                        row[seasonIndex]?.replace(/^"|"$/g, '')
                    ].filter(Boolean),
                    details: details
                };
            }).filter(item => item && item.image);

            setItems(parsedItems);
            setError(null);
        } catch (err) {
            console.error("Sheet Fetch Error:", err);
            setError("Could not load wardrobe data. Check permissions or network.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchSheetData();
        }
    }, [user]);

    const availableFilters = React.useMemo(() => {
        const filters = {};
        if (items.length === 0) return filters;
        items.forEach(item => {
            Object.entries(item.details).forEach(([key, value]) => {
                const lowerKey = key.toLowerCase();
                if (!EXCLUDED_FILTERS.some(excluded => lowerKey.includes(excluded)) && value) {
                    if (!filters[key]) filters[key] = new Set();
                    filters[key].add(value);
                }
            });
        });
        Object.keys(filters).forEach(key => {
            filters[key] = Array.from(filters[key]).sort();
        });
        return filters;
    }, [items]);

    const filteredItems = items.filter(item => {
        // Exclude discarded items from main view
        if (item.details.Discard === 'Yes') return false;

        return Object.entries(activeFilters).every(([key, value]) => {
            if (!value) return true;
            return item.details[key] === value;
        });
    });

    const discardedItems = items.filter(item => item.details.Discard === 'Yes');

    const handleFilterChange = (key, value) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setActiveFilters({});
    };

    const toggleSelection = (item) => {
        toggleCartItem(item);
    };

    const handleEditClick = (item) => {
        setEditFormData({
            Type: item.details.Type || item.name || '',
            Category: item.category || '',
            Subcategory: item.subcategory || '',
            Discard: item.details.Discard || 'No',
            DiscardReason: item.details['Discard Reason'] || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEdit = async () => {
        if (!viewItem) return;

        // 1. Prepare Payload
        const rowNo = viewItem.id + 2; // id is 0-indexed idx from lines array (which starts after header). 
        // So idx 0 is line 2 (row 2). header is row 1.

        const payload = {
            Type: editFormData.Type,
            Category: editFormData.Category,
            Subcategory: editFormData.Subcategory,
            Discard: editFormData.Discard,
            "Discard Reason": editFormData.DiscardReason,
            spreadsheet_id: user?.['Spreadsheet ID'] || user?.spreadsheet_id,
            worksheet_id: user?.['Worksheet ID (Cloth Log)'] || user?.worksheet_id,
            row_no: rowNo
        };

        // 2. Update Local State (Optimistic UI)
        const updatedItem = {
            ...viewItem,
            name: editFormData.Type, // Assuming Type maps to item name somewhat
            category: editFormData.Category,
            subcategory: editFormData.Subcategory,
            details: {
                ...viewItem.details,
                Type: editFormData.Type,
                Discard: editFormData.Discard,
                'Discard Reason': editFormData.DiscardReason
            }
        };

        setItems(prevItems => prevItems.map(item => item.id === viewItem.id ? updatedItem : item));
        setViewItem(updatedItem);
        setIsEditModalOpen(false);

        // 3. Send to Webhook
        try {
            const response = await fetch(UPDATE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error("Failed to update sheet", await response.text());
                // Optionally show toast/alert, but we are doing optimistic UI
            } else {
                console.log("Sheet updated successfully");
            }
        } catch (err) {
            console.error("Error updating sheet:", err);
        }
    };

    // handleTryOn removed - moved to Header.jsx (Cart Flow)

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadFiles(prev => [...prev, ...files]);
    };

    const removeUploadFile = (index) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkSubmit = async () => {
        if (uploadFiles.length === 0) return;
        setIsUploading(true);

        try {
            // Convert all images to Base64
            const convertToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result); // This includes data:image/png;base64,... prefix
                    reader.onerror = error => reject(error);
                });
            };

            const base64Images = await Promise.all(uploadFiles.map(convertToBase64));

            const payload = {
                images: base64Images,
                name: user?.full_name || user?.Name || 'Unknown User',
                email: user?.email,
                spreadsheet_id: user?.['Spreadsheet ID'] || user?.spreadsheet_id,
                worksheet_id: user?.['Worksheet ID (Cloth Log)'] || user?.worksheet_id,
                drive_folder_id: user?.['Folder ID'] || user?.folder_id
            };

            const response = await fetch(BULK_UPLOAD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Bulk upload failed");

            // Success
            alert("Images uploaded successfully! They will appear in your wardrobe shortly.");
            setUploadFiles([]);
            setIsUploadModalOpen(false);

            // Optionally trigger a re-fetch after a delay
            setTimeout(fetchSheetData, 5000);

        } catch (error) {
            console.error("Bulk Upload Error:", error);
            alert("Failed to upload images. Please check your connection and try again.");
        } finally {
            setIsUploading(false);
        }
    };

    // --- Loading & Error States with New Design ---
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-gray-400 font-['Inter']">
                <RefreshCw size={24} className="animate-spin mr-3 text-black" /> Loading wardrobe...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500 font-['Inter']">
                <AlertCircle size={32} className="mb-2 text-red-500" />
                <p>{error}</p>
                <button onClick={fetchSheetData} className="mt-4 text-sm font-semibold underline hover:text-black">Retry</button>
            </div>
        );
    }

    // --- Main Render with Pucho CA Dashboard Design ---
    return (
        <div className="space-y-6 font-['Inter'] text-[#111935]">
            {/* Control Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 pl-4">
                    <span className="text-lg font-bold tracking-tight">Your Virtual Wardrobe ({filteredItems.length})</span>
                </div>

                <div className="flex items-center gap-3">

                    {Object.keys(activeFilters).some(key => activeFilters[key]) && (
                        <button
                            onClick={clearFilters}
                            className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                    <button
                        onClick={() => setIsDiscardModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-red-200 rounded-xl text-sm font-medium transition-all shadow-sm group"
                    >
                        <Trash2 size={16} className="text-gray-500 group-hover:text-red-500 transition-colors" />
                        <span className="text-gray-700 group-hover:text-red-600 transition-colors">Discarded ({discardedItems.length})</span>
                    </button>
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-black/20 rounded-xl text-sm font-medium transition-all shadow-sm"
                    >
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Shirt size={48} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-gray-500 font-medium">No items found matching your filters.</p>
                </div>
            ) : (
                /* Card Grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredItems.map((item) => {
                        const isSelected = cartItems.some(i => i.id === item.id);
                        return (
                            <div
                                key={item.id}
                                onClick={() => toggleSelection(item)}
                                className={`
                                    group flex flex-col bg-white rounded-2xl p-4 cursor-pointer transition-all duration-300 ease-in-out relative
                                    ${isSelected
                                        ? 'border border-black shadow-none ring-1 ring-black/5'
                                        : 'border border-transparent shadow-[0px_10px_10px_rgba(0,0,0,0.02)] hover:shadow-[0px_20px_25px_rgba(0,0,0,0.05)] hover:border-black/5'
                                    }
                                `}
                            >
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="absolute top-4 right-4 z-10 w-6 h-6 bg-black rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in-50 duration-200">
                                        <CheckCircle2 size={14} />
                                    </div>
                                )}

                                {/* Image Area */}
                                <div className="aspect-[3/4] bg-[#F8F9FA] rounded-xl mb-4 flex items-center justify-center relative overflow-hidden group">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 hue-rotate-0" />
                                    ) : (
                                        <Shirt className="text-gray-200" size={40} />
                                    )}
                                    <div className="absolute inset-0 bg-black/5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-auto">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewItem(item);
                                            }}
                                            className="bg-white text-black text-sm font-bold px-4 py-2 rounded-lg shadow-sm transform scale-100 md:scale-95 group-hover:scale-100 transition-transform cursor-pointer hover:bg-gray-50 backdrop-blur-sm"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex flex-col gap-1 min-w-0">
                                    <h3 className="font-semibold text-[16px] leading-[120%] tracking-[-0.01em] text-[#111935] truncate max-w-full">
                                        {item.name}
                                    </h3>
                                    <p className="font-normal text-[13px] leading-[150%] tracking-[-0.012em] text-[#111935]/60 truncate">
                                        {item.category} • {item.subcategory}
                                    </p>
                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {item.tags && item.tags.map((tag, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-xs rounded-md text-gray-600 font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floating Selection Bar Removed - Moved to Cart Header */}

            {/* Try On Result Modal Removed - moved to Header logic */}

            {/* Item Details Modal */}
            {viewItem && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewItem(null)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/90 backdrop-blur-2xl rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col md:flex-row m-4 md:m-0 font-['Inter'] ring-1 ring-white/20"
                    >
                        {/* Image Section */}
                        <div className="w-full md:w-1/2 bg-gray-50/50 flex items-center justify-center p-8 relative">
                            {viewItem.category && (
                                <div className="absolute top-6 left-6">
                                    <Badge variant="purple" className="px-3 py-1 text-sm bg-purple-100/90 text-purple-700 backdrop-blur hover:bg-purple-200 border-none">
                                        {viewItem.category}
                                    </Badge>
                                </div>
                            )}
                            <img
                                src={viewItem.image}
                                alt={viewItem.name}
                                className="max-w-full max-h-[40vh] md:max-h-[70vh] object-contain drop-shadow-xl"
                            />
                            <button
                                onClick={() => setViewItem(null)}
                                className="absolute top-4 right-4 p-2 bg-white/60 hover:bg-white/90 backdrop-blur rounded-full text-gray-500 md:hidden shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Info Section */}
                        <div className="w-full md:w-1/2 p-6 bg-transparent overflow-y-auto overscroll-contain touch-pan-y flex flex-col scrollbar-thin scrollbar-thumb-gray-300/50 scrollbar-track-transparent [&::-webkit-scrollbar]:w-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <div className="flex justify-between items-start mb-1">
                                <h2 className="text-3xl font-bold text-[#111935]">{viewItem.name}</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditClick(viewItem)}
                                        className="p-2 hover:bg-gray-100/50 rounded-full text-gray-500 hover:text-blue-600 transition-colors"
                                        title="Edit Details"
                                    >
                                        <Edit size={24} />
                                    </button>
                                    <button onClick={() => setViewItem(null)} className="hidden md:block p-2 hover:bg-gray-100/50 rounded-full text-gray-500 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Tags & Date */}
                            <div className="mb-6 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {viewItem.tags && viewItem.tags.map((tag, idx) => (
                                        <span key={idx} className="px-2.5 py-1 bg-gray-100/60 text-xs font-semibold text-gray-600 rounded-full border border-gray-100">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                {viewItem.details.Timestamp && (
                                    <p className="text-xs text-gray-400 font-medium">
                                        Added on: {viewItem.details.Timestamp}
                                    </p>
                                )}
                            </div>

                            {/* Details List */}
                            <div className="space-y-6">
                                {/* Order of Display: Type, Category, Subcategory, Occasion, Color, Pattern, Neckline, Fit Factor, Joy Factor, Season */}
                                {[
                                    { label: 'Type', value: viewItem.details.Type || viewItem.name },
                                    { label: 'Category', value: viewItem.category },
                                    { label: 'Subcategory', value: viewItem.subcategory },
                                    { label: 'Occasion', value: viewItem.details.Occasion },
                                    { label: 'Color', value: viewItem.details.Color },
                                    { label: 'Pattern', value: viewItem.details.Pattern },
                                    { label: 'Neckline', value: viewItem.details.Neckline },
                                    { label: 'Fit Factor', value: viewItem.details['Fit Factor'] },
                                    { label: 'Joy Factor', value: viewItem.details['Joy Factor'] },
                                    { label: 'Season', value: viewItem.details.Season },
                                ].map((field, idx) => field.value && (
                                    <div key={idx} className="border-b border-gray-200/50 pb-3 last:border-0 last:pb-0">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{field.label}</h4>
                                        <p className="text-[15px] font-medium text-gray-900 leading-snug">{field.value}</p>
                                    </div>
                                ))}

                                {/* Notes */}
                                {viewItem.details.Notes && (
                                    <div className="border-b border-gray-200/50 pb-3">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</h4>
                                        <p className="text-[15px] font-medium text-gray-900 leading-relaxed">{viewItem.details.Notes}</p>
                                    </div>
                                )}

                                {/* Discard */}
                                {viewItem.details.Discard && (
                                    <div className="border-b border-gray-200/50 pb-3">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Discard</h4>
                                        <p className="text-[15px] font-medium text-gray-900">{viewItem.details.Discard}</p>
                                    </div>
                                )}

                                {/* Discard Reason (Visible if Discard is present or in Edit) */}
                                {viewItem.details['Discard Reason'] && (
                                    <div className="border-b border-gray-200/50 pb-3">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Discard Reason</h4>
                                        <p className="text-[15px] font-medium text-gray-900">{viewItem.details['Discard Reason']}</p>
                                    </div>
                                )}

                                {/* Detailed Summary */}
                                {viewItem.details['Detailed Summary'] && (
                                    <div className="pt-2">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Detailed Summary</h4>
                                        <p className="text-[15px] font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                                            {viewItem.details['Detailed Summary']}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto pt-6 border-t border-gray-200/50 bg-transparent">
                                <button
                                    className="w-full justify-center bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelection(viewItem);
                                        setViewItem(null);
                                    }}
                                >
                                    {cartItems.some(i => i.id === viewItem.id) ? (
                                        <>
                                            <CheckCircle2 size={18} />
                                            <span>Remove from Cart</span>
                                        </>
                                    ) : (
                                        <>
                                            <Shirt size={18} />
                                            <span>Virtual Try On with this Item</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>, document.body
            )}

            {/* Filter Modal (Restyled) */}
            {isFilterModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-['Inter']">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-[#111935]">Filters</h2>
                            <button onClick={() => setIsFilterModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                            {Object.entries(availableFilters).map(([key, options]) => (
                                <div key={key}>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{key}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {options.map(opt => {
                                            const isActive = activeFilters[key] === opt;
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => handleFilterChange(key, isActive ? '' : opt)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isActive ? 'bg-[#18181B] text-white border-[#18181B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={clearFilters} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-500">Clear All</button>
                            <button onClick={() => setIsFilterModalOpen(false)} className="px-6 py-2 bg-[#18181B] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black/90">View Results</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Edit Item Modal */}
            {isEditModalOpen && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-['Inter'] animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-[#111935]">Edit Layout Details</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                                <input
                                    type="text"
                                    name="Type"
                                    value={editFormData.Type}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    placeholder="e.g. Polo T-Shirts"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                                <input
                                    type="text"
                                    name="Category"
                                    value={editFormData.Category}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    placeholder="e.g. Tops"
                                />
                            </div>

                            {/* Subcategory */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subcategory</label>
                                <input
                                    type="text"
                                    name="Subcategory"
                                    value={editFormData.Subcategory}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
                                    placeholder="e.g. Polos"
                                />
                            </div>

                            {/* Discard */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discard?</label>
                                <div className="flex gap-4 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="Discard"
                                            value="Yes"
                                            checked={editFormData.Discard === 'Yes'}
                                            onChange={handleEditChange}
                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Yes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="Discard"
                                            value="No"
                                            checked={editFormData.Discard !== 'Yes'}
                                            onChange={handleEditChange}
                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                                        />
                                        <span className="text-sm font-medium text-gray-700">No</span>
                                    </label>
                                </div>
                            </div>

                            {/* Discard Reason */}
                            {editFormData.Discard === 'Yes' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discard Reason</label>
                                    <textarea
                                        name="DiscardReason"
                                        value={editFormData.DiscardReason}
                                        onChange={handleEditChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium min-h-[80px]"
                                        placeholder="Why are you discarding this item?"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-6 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Discarded Items Modal */}
            {isDiscardModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setIsDiscardModalOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden font-['Inter'] flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
                            <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
                                <Trash2 size={20} /> Discarded Items ({discardedItems.length})
                            </h2>
                            <button onClick={() => setIsDiscardModalOpen(false)} className="text-red-400 hover:text-red-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {discardedItems.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-gray-400">
                                    <Trash2 size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No discarded items found.</p>
                                </div>
                            ) : (
                                discardedItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-gray-50 rounded-xl p-3 border border-gray-100 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                                        onClick={() => {
                                            setIsDiscardModalOpen(false);
                                            setViewItem(item);
                                        }}
                                    >
                                        <div className="aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2 grayscale hover:grayscale-0 transition-all" />
                                        </div>
                                        <h3 className="text-xs font-bold text-gray-700 truncate">{item.name}</h3>
                                        <p className="text-[10px] text-gray-500 truncate">{item.details['Discard Reason'] || 'No reason provided'}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>, document.body
            )}


        </div>
    );
};

export default Wardrobe;
