import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';

const AdminDashboard = () => {
    return (
        <div className="flex min-h-screen bg-pucho-light font-sans text-pucho-dark pb-20 md:pb-0">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-64 relative min-h-screen flex flex-col">
                <Header />
                <div className="p-4 md:p-8 flex-1 overflow-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
