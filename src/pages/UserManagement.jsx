import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Plus, User, ArrowRight, ArrowLeft, Save, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [slide, setSlide] = useState(1);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        email: '',
        mobileNo: '',
        age: '',
        height: '',
        weight: '',
        gender: 'Male', // Default to Male
        image: null // File object
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('User').select('*');
        if (data) setUsers(data);
        if (error) console.error('Error fetching users:', error);
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image') {
            setFormData(prev => ({ ...prev, image: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const nextSlide = () => setSlide(2);
    const prevSlide = () => setSlide(1);

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            name: '', username: '', password: '', email: '',
            mobileNo: '', age: '', height: '', weight: '', image: null
        });
        setSlide(1);
        setIsModalOpen(true);
    };

    const handleEdit = (user) => {
        setEditingId(user.id); // Assuming 'id' column exists in Supabase
        setFormData({
            name: user.Name || '',
            username: user.Username || '',
            password: user.Password || '',
            email: user.Email || '',
            mobileNo: user['Mobile No'] || '',
            age: user.Age || '',
            height: user.Height || '',
            weight: user.Weight || '',
            image: null // We don't prefill file object, but we keep existing URL if not changed
        });
        setSlide(1);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let imageUrl = editingId ? users.find(u => u.id === editingId)?.['Client\'s Image (Attachment)'] : '';

            // 1. Upload Image (only if new image selected)
            if (formData.image) {
                const fileName = `${Date.now()}_${formData.image.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('user-images')
                    .upload(fileName, formData.image);

                if (uploadData) {
                    const { data: { publicUrl } } = supabase.storage.from('user-images').getPublicUrl(fileName);
                    imageUrl = publicUrl;
                }
            }

            // 2. Prepare Payload
            const payload = {
                Name: formData.name,
                Username: formData.username,
                Password: formData.password,
                Email: formData.email,
                "Mobile No": formData.mobileNo,
                Age: formData.age,
                Height: formData.height,
                Weight: formData.weight,
                Gender: formData.gender,
                "Client's Image (Attachment)": imageUrl
            };

            // Only add defaults for new users
            if (!editingId) {
                payload["Spreadsheet ID"] = "";
                payload["Worksheet ID (Cloth Log)"] = "";
                payload["Folder ID"] = "";
            }

            // 3. Insert or Update to Supabase
            if (editingId) {
                const { error: updateError } = await supabase
                    .from('User')
                    .update(payload)
                    .eq('id', editingId); // Ensure 'id' is the primary key
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('User').insert([payload]);
                if (insertError) throw insertError;

                // 4. Trigger Webhook (Only for creation generally, or if needed for sync)
                await fetch('https://studio.pucho.ai/api/v1/webhooks/fauYHS0TGJ7XuXFYMs5hP', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            // Reset
            setIsModalOpen(false);
            setEditingId(null);
            fetchUsers();
            alert(editingId ? 'User updated successfully!' : 'User created successfully!');

        } catch (error) {
            console.error('Error saving user:', error);
            alert('Failed to save user: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-pucho-dark">User Management</h2>
                <Button onClick={handleCreate} className="flex items-center gap-2">
                    <Plus size={18} /> Add User
                </Button>
            </div>

            {/* List View */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Username</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Mobile</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-pucho-dark">{user.Name}</td>
                                <td className="px-6 py-4 text-gray-500">{user.Username}</td>
                                <td className="px-6 py-4 text-gray-500">{user.Email}</td>
                                <td className="px-6 py-4 text-gray-500">{user['Mobile No']}</td>
                                <td className="px-6 py-4 text-right">
                                    <Button variant="ghost" className="text-xs" onClick={() => handleEdit(user)}>Edit</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="p-8 text-center text-gray-400">No users found.</div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg">{editingId ? 'Edit User' : 'Create New User'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">&times;</button>
                            </div>

                            <div className="p-6">
                                {/* Slide Indicators */}
                                <div className="flex gap-2 mb-6 justify-center">
                                    <div className={`h-1.5 w-12 rounded-full transition-colors ${slide === 1 ? 'bg-pucho-purple' : 'bg-gray-200'}`} />
                                    <div className={`h-1.5 w-12 rounded-full transition-colors ${slide === 2 ? 'bg-pucho-purple' : 'bg-gray-200'}`} />
                                </div>

                                {/* Form Content */}
                                <div className="min-h-[300px]">
                                    {slide === 1 ? (
                                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
                                            <h4 className="font-semibold text-gray-600 mb-4">Personal Details</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} />
                                                <Input name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} />
                                                <Input name="mobileNo" placeholder="Mobile No" value={formData.mobileNo} onChange={handleInputChange} />
                                                <Input name="age" placeholder="Age" value={formData.age} onChange={handleInputChange} />
                                                <Input name="height" placeholder="Height" value={formData.height} onChange={handleInputChange} />
                                                <Input name="weight" placeholder="Weight" value={formData.weight} onChange={handleInputChange} />
                                            </div>

                                            {/* Gender Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="gender"
                                                            value="Male"
                                                            checked={formData.gender === 'Male'}
                                                            onChange={handleInputChange}
                                                            className="text-pucho-purple focus:ring-pucho-purple"
                                                        />
                                                        <span className="text-sm text-gray-600">Male</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="gender"
                                                            value="Female"
                                                            checked={formData.gender === 'Female'}
                                                            onChange={handleInputChange}
                                                            className="text-pucho-purple focus:ring-pucho-purple"
                                                        />
                                                        <span className="text-sm text-gray-600">Female</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Client's Selfie</label>
                                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                    <input type="file" name="image" onChange={handleInputChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                    <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                                                    <span className="text-xs text-gray-500">{formData.image ? formData.image.name : "Click to upload"}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
                                            <h4 className="font-semibold text-gray-600 mb-4">Credentials</h4>
                                            <Input name="username" placeholder="Username" value={formData.username} onChange={handleInputChange} />
                                            <Input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleInputChange} />
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
                                {slide === 2 ? (
                                    <Button variant="secondary" onClick={prevSlide} className="flex items-center gap-2">
                                        <ArrowLeft size={16} /> Back
                                    </Button>
                                ) : (
                                    <div></div>
                                )}

                                {slide === 1 ? (
                                    <Button onClick={nextSlide} className="flex items-center gap-2">
                                        Next <ArrowRight size={16} />
                                    </Button>
                                ) : (
                                    <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
                                        {loading ? 'Saving...' : (editingId ? 'Update User' : 'Create User')} <Save size={16} />
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserManagement;
