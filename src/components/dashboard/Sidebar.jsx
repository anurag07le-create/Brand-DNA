import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    Shirt, MonitorPlay, User, LogOut, X, Mail, Phone, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';
import Logo from '../../assets/pucho_logo_sidebar_new.png';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Virtual Try On Navigation Items
    const navItems = [
        { icon: Shirt, label: 'Virtual Wardrobe', path: '/wardrobe', roles: ['user'] },
        { icon: MonitorPlay, label: 'Virtual Try On', path: '/try-on', roles: ['user'] },
        { icon: Sparkles, label: 'AI Stylist', path: '/ai-stylist', roles: ['user'] },
        { icon: User, label: 'My Profile', path: '/profile', roles: ['user'] },
        { icon: User, label: 'User Management', path: '/users', roles: ['admin'] },
    ];

    const filteredItems = navItems.filter(item => item?.roles?.includes(user?.role));

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="w-[280px] h-screen fixed left-0 top-0 bg-white border-r border-gray-100 hidden md:flex flex-col z-30 font-['Inter']">
                {/* Logo Area */}
                <div className="pl-8 py-6 flex items-center justify-start">
                    <img src={Logo} alt="Pucho.ai" className="h-10 w-auto object-contain" />
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {filteredItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                                isActive
                                    ? "bg-[#F0FDF4] text-gray-900"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <item.icon size={20} strokeWidth={1.5} className={clsx("flex-shrink-0 transition-colors", ({ isActive }) => isActive ? "text-gray-900" : "text-gray-500")} />
                            <span className="truncate">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => setIsProfileModalOpen(true)}>
                        <div className="w-10 h-10 rounded-full bg-[#E5E7EB] overflow-hidden flex-shrink-0 border border-gray-200">
                            {user?.['Client\'s Image (Attachment)'] ? (
                                <img src={user['Client\'s Image (Attachment)']} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-full h-full p-2 text-gray-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || 'Admin User'}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.email || 'admin@pucho.ai'}</p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full mt-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={16} />
                        Log out
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar (Simplified) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center px-2 py-3 z-40 safe-area-pb font-['Inter']">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => clsx(
                            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200",
                            isActive ? "text-gray-900 bg-gray-50" : "text-gray-400"
                        )}
                    >
                        <item.icon size={20} />
                    </NavLink>
                ))}
                <button
                    onClick={logout}
                    className="flex flex-col items-center gap-1 p-2 text-red-500 hover:text-red-700 rounded-xl"
                >
                    <LogOut size={20} />
                </button>
            </nav>

            {/* Profile Modal (Reused existing logic with updated style) */}
            {isProfileModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="relative h-24 bg-gradient-to-r from-gray-900 to-gray-800">
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="absolute top-4 right-4 p-1 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 pb-8 relative">
                            <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg -mt-12 mb-4 mx-auto overflow-hidden flex items-center justify-center">
                                {user?.['Client\'s Image (Attachment)'] ? (
                                    <img src={user['Client\'s Image (Attachment)']} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">{user?.full_name || 'User Name'}</h3>
                                <p className="text-sm text-gray-500 capitalize">{user?.role || 'User Role'}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Mail size={16} className="text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 font-medium truncate">{user?.email || 'No email'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Phone size={16} className="text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 font-medium truncate">{user?.['Mobile No'] || 'Not provided'}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsProfileModalOpen(false);
                                        logout();
                                    }}
                                    className="w-full mt-4 p-3 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-center gap-2 text-red-600 font-bold transition-colors"
                                >
                                    <LogOut size={18} /> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default Sidebar;
