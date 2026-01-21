import React, { useState } from "react";
import { useLocation } from 'react-router-dom';
import MenuIcon from '../../assets/icons/menu.svg';
import SearchIcon from '../../assets/icons/search.svg';

const Header = ({ searchTerm, setSearchTerm, toggleSidebar }) => {
    const location = useLocation();
    const [isFocused, setIsFocused] = useState(false);

    // Configuration for page titles, subtitles, and search placeholders
    const pageConfig = {
        '/admin/books-hygiene': {
            title: 'Books Hygiene',
            subtitle: 'Monitor ledger hygiene and exceptions',
            placeholder: 'Search Ledger or Group...',
            showSearch: true
        },
        '/admin/ledger-scrutiny': {
            title: 'Ledger Scrutiny',
            subtitle: 'Detailed examination of ledger entries',
            placeholder: 'Search Ledger...',
            showSearch: true
        },
        '/admin/related-party': {
            title: 'Related Party',
            subtitle: 'Overview of related party transactions',
            placeholder: 'Search Party...',
            showSearch: false
        },
        '/admin/fixed-assets': {
            title: 'Depreciation & Fixed Assets',
            subtitle: 'Audit summary and risk assessment for FY 2023',
            placeholder: 'Search Assets...',
            showSearch: false
        },
        '/admin/audit-file-pack': {
            title: 'Audit File Pack',
            subtitle: 'Centralized financial documents and role-specific views',
            placeholder: 'Search Documents...',
            placeholder: 'Search Documents...',
            showSearch: false
        },
        '/admin/client-cfo-note': {
            title: 'Client CFO Note',
            subtitle: 'Monthly Strategic Financial Overview',
            placeholder: 'Search...',
            showSearch: false
        },
        '/admin/notice-readiness': {
            title: 'Notice Readiness',
            subtitle: 'Statutory Compliance Protocol & Evidence',
            placeholder: 'Search Protocol...',
            showSearch: false
        },
        '/admin/gst-filing-readiness': {
            title: 'GST Filing Readiness',
            subtitle: 'Monthly filing status and audit timeline',
            placeholder: 'Search...',
            showSearch: false
        },
        '/admin/itc-equity-guardrail': {
            title: 'ITC Equity Guardrail',
            subtitle: 'Intelligent Risk Analysis & Compliance Inspection',
            placeholder: 'Search...',
            showSearch: false
        },
        '/admin/month-end-checklist': {
            title: 'Month End Checklist',
            subtitle: 'Financial Compliance & Status Report',
            placeholder: 'Search...',
            showSearch: false
        },
        // Default for /admin or others
        'default': {
            title: 'Cards',
            subtitle: 'Overview of all active cards',
            placeholder: 'Search',
            showSearch: false
        }
    };

    // Helper to get current page config
    const getCurrentConfig = () => {
        const path = location.pathname;
        const matchedKey = Object.keys(pageConfig)
            .filter(key => key !== 'default')
            .sort((a, b) => b.length - a.length)
            .find(key => path.startsWith(key));

        return matchedKey ? pageConfig[matchedKey] : pageConfig['default'];
    };

    const config = getCurrentConfig();

    return (
        <header className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between pl-5 py-4 pr-8">
            {/* Left Section: Mobile Menu + Page Title/Subtitle */}
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="lg:hidden focus:outline-none">
                    <img src={MenuIcon} alt="Menu" className="w-6 h-6 opacity-60" />
                </button>

                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-[#111935] leading-tight">
                        {config.title}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">
                        {config.subtitle}
                    </p>
                </div>
            </div>

            {/* Right Section: Search + Branding */}
            <div className="flex items-center gap-6">
                {/* Search Bar - conditionally rendered */}
                {config.showSearch && (
                    <div
                        className={`
                        hidden md:flex items-center gap-2.5 bg-white rounded-full transition-all duration-200 ease-in-out
                        ${isFocused
                                ? 'h-[44px] w-[332px] border-[0.7px] border-[#B56FFF] shadow-[0px_0px_0px_3px_#DBD4FB] p-1'
                                : 'h-[44px] w-[332px] border border-black/5 p-1 hover:border-[#B56FFF] hover:shadow-none'
                            }
                    `}
                    >
                        <div className="flex items-center justify-center w-9 h-9 bg-[#A0D296]/10 rounded-full flex-shrink-0">
                            <img src={SearchIcon} alt="Search" className="w-4 h-4 opacity-100" />
                        </div>
                        <input
                            type="text"
                            placeholder={config.placeholder}
                            value={searchTerm || ''}
                            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
                            className={`
                            flex-1 bg-transparent border-none outline-none text-[#111935] placeholder:text-black/50 text-[16px] font-['Inter'] leading-[150%]
                            transition-all duration-300 ease-in-out
                            ${isFocused ? 'pl-2' : 'pl-0'}
                        `}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </div>
                )}

                {/* Branding */}
                <span className="hidden lg:block text-base font-bold text-[#111935]">
                    Pucho's CA Dashboard
                </span>
            </div>
        </header>
    );
};

export default Header;
