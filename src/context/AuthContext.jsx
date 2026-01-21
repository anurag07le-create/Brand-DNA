/* REFERENCE LOGIC - DO NOT MODIFY */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. REHYDRATE: Check local storage on mount
        const storedUser = localStorage.getItem('dashboard_user_data');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { console.error(e); }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        // 2. BACKDOOR (Mock): Instant Admin Access
        if (username === 'admin' && password === 'admin') {
            const mockUser = {
                id: 'admin-1',
                email: 'admin@pucho.ai',
                role: 'admin',      // Critical for routing
                full_name: 'Pucho Admin'
            };
            setUser(mockUser);
            localStorage.setItem('dashboard_user_data', JSON.stringify(mockUser));
            return { success: true, role: mockUser.role };
        }

        // 3. REAL AUTH (Supabase)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password,
            });
            if (error) throw error;

            // Get Role from 'profiles' table
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            const fullUser = { ...data.user, ...profile };
            setUser(fullUser);
            localStorage.setItem('dashboard_user_data', JSON.stringify(fullUser));
            return { success: true, role: fullUser.role };
        } catch (authError) {
            // 4. FALLBACK: Check Custom 'User' Table
            try {
                const { data: customUser, error: customError } = await supabase
                    .from('User')
                    .select('*')
                    .eq('Username', username)
                    .eq('Password', password)
                    .single();

                if (customUser) {
                    const mappedUser = {
                        id: customUser.id,
                        email: customUser.Email,
                        full_name: customUser.Name,
                        role: 'user',
                        // Explicitly map these to ensure they are available even if casing differs slightly in downstream usage
                        'Spreadsheet ID': customUser['Spreadsheet ID'],
                        'Worksheet ID (Cloth Log)': customUser['Worksheet ID (Cloth Log)'],
                        'Folder ID': customUser['Folder ID'],
                        ...customUser
                    };
                    setUser(mappedUser);
                    localStorage.setItem('dashboard_user_data', JSON.stringify(mappedUser));
                    return { success: true, role: mappedUser.role };
                }
            } catch (e) {
                console.error("Custom auth failed:", e);
            }

            return { success: false, message: authError.message || "Invalid credentials" };
        }
    };

    const logout = async () => {
        setUser(null);
        localStorage.removeItem('dashboard_user_data');
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
