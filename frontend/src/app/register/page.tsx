'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirm) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        try {
            await register(formData.email, formData.password, formData.full_name);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const update = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3 shadow-lg">M</div>
                    <h1 className="text-3xl font-bold text-white">Join MeetMate</h1>
                    <p className="text-slate-400 text-sm mt-1">Create your account and start your first workspace</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-7 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-300 mb-1.5 font-medium">Full Name</label>
                            <input
                                type="text" required value={formData.full_name} onChange={update('full_name')}
                                placeholder="Sarah Johnson"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1.5 font-medium">Email</label>
                            <input
                                type="email" required value={formData.email} onChange={update('email')}
                                placeholder="you@company.com"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1.5 font-medium">Password</label>
                            <input
                                type="password" required value={formData.password} onChange={update('password')}
                                placeholder="Min 8 characters"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1.5 font-medium">Confirm Password</label>
                            <input
                                type="password" required value={formData.confirm} onChange={update('confirm')}
                                placeholder="••••••••"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                            {loading ? (
                                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Creating account...</>
                            ) : 'Create Account →'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <p className="text-slate-400 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
