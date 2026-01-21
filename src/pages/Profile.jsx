import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Building } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Profile Header */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                        {user?.['Client\'s Image (Attachment)'] ? (
                            <img src={user['Client\'s Image (Attachment)']} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={64} className="text-gray-300" />
                        )}
                    </div>
                </div>

                <div className="text-center md:text-left space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">{user?.full_name || 'User Name'}</h1>
                    <div className="flex flex-col md:flex-row gap-4 text-gray-500 text-sm font-medium">
                        <span className="flex items-center gap-1.5"><Building size={16} /> {user?.role || 'Member'}</span>
                        <span className="flex items-center gap-1.5"><Mail size={16} /> {user?.email}</span>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Full Name</label>
                            <p className="font-medium text-gray-900">{user?.full_name || '-'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Mobile Number</label>
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" />
                                <p className="font-medium text-gray-900">{user?.['Mobile No'] || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Body Measurements</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Age</label>
                            <p className="font-medium text-gray-900">{user?.Age || '-'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Gender</label>
                            <p className="font-medium text-gray-900">{user?.Gender || '-'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Height</label>
                            <p className="font-medium text-gray-900">{user?.Height || '-'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Weight</label>
                            <p className="font-medium text-gray-900">{user?.Weight || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
