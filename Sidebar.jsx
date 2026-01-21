import React from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
    LayoutDashboard as HomeIcon,
    MessageSquare as ChatIcon,
    Network as AgentsIcon,
    GitBranch as FlowsIcon,
    Settings as SettingsIcon,
    Phone as PhoneIcon,
    AlertTriangle as AlertIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/pucho_logo_sidebar_v2.png';

import MarketplaceIcon from '../../assets/icons/marketplace.svg';
import LogoutIcon from '../../assets/icons/logout.svg';
import BooksHygieneIcon from '../../assets/icons/books_hygiene.png';
import ActivityIcon from '../../assets/icons/activity.svg';
import HomeSvg from '../../assets/icons/home.svg';
import ChecklistIcon from '../../assets/icons/checklist.png';
import AuditPackIcon from '../../assets/icons/audit_pack.png';
import CfoNoteIcon from '../../assets/icons/cfo_note.png';
import DepreciationIcon from '../../assets/icons/depreciation.png';
import GstIcon from '../../assets/icons/gst.png';
import ProvisionsIcon from '../../assets/icons/provisions.png';
import CashLedgerIcon from '../../assets/icons/cash_ledger.png';
import ItcIcon from '../../assets/icons/itc.png';
import SalaryIcon from '../../assets/icons/salary.png';
import TdsIcon from '../../assets/icons/tds.png';
import OutputTaxIcon from '../../assets/icons/output_tax.png';

import MascotIcon from '../../assets/mascot_1.png';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Menu items configuration
    const menuItems = [
        // { name: 'Cards', icon: HomeSvg, path: '/admin' }, // Using Home icon for "Cards" view as primary
        { name: 'Books Hygine', icon: BooksHygieneIcon, path: '/admin/books-hygiene' },
        { name: 'Ledger Scrutiny', icon: ActivityIcon, path: '/admin/ledger-scrutiny' },
        { name: 'Related Party', icon: AlertIcon, path: '/admin/related-party' },

        { name: 'Notice Readiness', icon: ChecklistIcon, path: '/admin/notice-readiness', disabled: false },
        { name: 'Audit File Pack', icon: AuditPackIcon, path: '/admin/audit-file-pack', disabled: false },
        { name: 'Client CFO Note', icon: CfoNoteIcon, path: '/admin/client-cfo-note', disabled: false },
        { name: 'Fixed Assets', icon: DepreciationIcon, path: '/admin/fixed-assets', disabled: false },

        { name: 'Month End Checklist', icon: GstIcon, path: '/admin/month-end-checklist', disabled: false },
        { name: 'ITC Equity Guardrail', icon: ProvisionsIcon, path: '/admin/itc-equity-guardrail', disabled: false },
        { name: 'GST Filing Readiness', icon: CashLedgerIcon, path: '/admin/gst-filing-readiness', disabled: false },
        { name: 'ITC Eligibility Check', icon: ItcIcon, path: '#', disabled: true },
        { name: 'Salary vs Contractor', icon: SalaryIcon, path: '#', disabled: true },
        { name: 'TDS Compliance', icon: TdsIcon, path: '#', disabled: true },
        { name: 'Output Tax Check', icon: OutputTaxIcon, path: '#', disabled: true },

        // { name: 'Sidebar #2', icon: AgentsIcon, path: '/admin/agents' },
        // { name: 'Sidebar #3', icon: ChatIcon, path: '/admin/chat' },
        // { name: 'Sidebar #4', icon: FlowsIcon, path: '/admin/flow' },
        // { name: 'Sidebar #5', icon: ActivityIcon, path: '/admin/activity' },
        // { name: 'Sidebar #6', icon: McpIcon, path: '/admin/mcp' },
        // { name: 'Sidebar #7', icon: KnowledgeIcon, path: '/admin/knowledge' }, // Knowledge
        // { name: 'Sidebar #8', icon: ToolsIcon, path: '/admin/tools' }, // Tools
        // { name: 'Sidebar #9', icon: MarketplaceIcon, path: '/admin/marketplace' }, // Marketplace
    ];

    return (
        <aside
            className={`
                fixed inset-y-0 left-0 z-30 w-[240px] bg-white border-r border-gray-100 flex flex-col 
                transition-transform duration-300 ease-in-out transform 
                lg:translate-x-0 lg:static lg:h-screen lg:z-10
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {/* Logo */}
            <div className="pl-3 pt-3 pb-2"> {/* Minor padding adjustment */}
                <div className="flex items-center gap-2">
                    <img src={logo} alt="Pucho" className="h-[34px] w-auto" />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={(e) => item.disabled && e.preventDefault()}
                        className={({ isActive }) => `
                            flex items-center gap-[10px] px-[12px] h-[40px] rounded-[22px] text-[14px] font-medium transition-all duration-200 border
                            ${item.disabled ? 'cursor-not-allowed hover:border-transparent opacity-50' : ''}
                            ${!item.disabled && isActive
                                ? 'bg-[#DCFCE7] border-transparent text-black' // Active: Filled Light Green (green-100)
                                : !item.disabled
                                    ? 'bg-transparent border-transparent text-black hover:bg-white hover:border-[#86EFAC]' // Inactive Hover: Green Border + White Bg
                                    : 'bg-transparent border-transparent text-black' // Inactive: Clean
                            }
                        `}
                    >
                        {/* Render Icon (Hybrid approach: img for files, Component for Lucide) */}
                        {typeof item.icon === 'string' ? (
                            <img
                                src={item.icon}
                                alt={item.name}
                                className="w-5 h-5 object-contain opacity-100"
                            />
                        ) : (
                            <item.icon
                                size={20}
                                className="opacity-100"
                            />
                        )}
                        <span className="truncate">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User Profile (Bottom) */}
            <div className="hidden md:block p-4 border-t border-gray-100 space-y-3">

                {/* User Info */}
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        <img
                            src={MascotIcon}
                            alt="User"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">Admin User</p>
                        <p className="text-xs text-gray-400 truncate">admin@pucho.ai</p>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-3xl text-[14px] font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                    <img
                        src={LogoutIcon}
                        alt="Logout"
                        className="w-5 h-5 object-contain opacity-80"
                    />
                    <span className="truncate">Log out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
