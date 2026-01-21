import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Wardrobe from './pages/Wardrobe';
import UserManagement from './pages/UserManagement';
import VirtualTryOn from './pages/VirtualTryOn';
import Profile from './pages/Profile';
import AiStylist from './pages/AiStylist';

// GUARD: Protects routes from unauthenticated users
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-pucho-light">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

// HELPER: Redirects based on user role
const RoleRedirect = () => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user?.role === 'admin') return <Navigate to="/users" replace />;
    return <Navigate to="/wardrobe" replace />;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CartProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        {/* Admin Area */}
                        <Route path="/" element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }>
                            <Route index element={<RoleRedirect />} />
                            <Route path="admin" element={<RoleRedirect />} />
                            <Route path="wardrobe" element={<Wardrobe />} />
                            <Route path="users" element={<UserManagement />} />
                            <Route path="try-on" element={<VirtualTryOn />} />
                            <Route path="ai-stylist" element={<AiStylist />} />
                            <Route path="profile" element={<Profile />} />
                        </Route>

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
export default App;
