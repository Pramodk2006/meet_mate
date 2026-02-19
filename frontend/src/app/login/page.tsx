'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const DEMO_ACCOUNTS = [
    { label: '👑 Manager', email: 'sarah.johnson@meetmate.app', password: 'Manager@2026', name: 'Sarah Johnson', role: 'manager', color: 'from-purple-500 to-purple-700' },
    { label: '👤 Employee', email: 'alex.chen@meetmate.app', password: 'Employee@2026', name: 'Alex Chen', role: 'employee', color: 'from-blue-500 to-blue-700' },
    { label: '👤 Employee', email: 'priya.sharma@meetmate.app', password: 'Employee@2026', name: 'Priya Sharma', role: 'employee', color: 'from-emerald-500 to-emerald-700' },
    { label: '👤 Employee', email: 'james.wilson@meetmate.app', password: 'Employee@2026', name: 'James Wilson', role: 'employee', color: 'from-amber-500 to-amber-700' },
];

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const quickLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
        setEmail(acc.email);
        setPassword(acc.password);
        setError('');
        setLoading(true);
        try {
            await login(acc.email, acc.password);
        } catch (err: any) {
            setError(err.message || 'Quick login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative w-full max-w-5xl flex gap-8 items-center">
                {/* Left: Brand panel */}
                <div className="hidden lg:flex flex-col flex-1 text-white p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg">M</div>
                        <div>
                            <p className="text-2xl font-bold">MeetMate</p>
                            <p className="text-blue-300 text-sm">AI Meeting Intelligence</p>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold leading-tight mb-4">
                        Turn meetings into<br />
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            actionable insights
                        </span>
                    </h1>
                    <p className="text-slate-300 mb-10 leading-relaxed">
                        Upload transcripts, extract action items automatically, assign tasks to teammates, and track progress — all powered by AI.
                    </p>

                    {/* Features */}
                    <div className="space-y-4">
                        {[
                            { icon: '🎙️', title: 'AI Transcription', desc: 'Automatic summary & key points' },
                            { icon: '✅', title: 'Smart Tasks', desc: 'Priority-ranked action items' },
                            { icon: '👥', title: 'Team Workspaces', desc: 'Collaborate with role-based access' },
                            { icon: '💬', title: 'Meeting Chat', desc: 'Ask AI anything about the meeting' },
                        ].map(f => (
                            <div key={f.title} className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{f.icon}</div>
                                <div>
                                    <p className="font-semibold">{f.title}</p>
                                    <p className="text-slate-400 text-sm">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Login form */}
                <div className="w-full lg:w-[420px] flex-shrink-0">
                    {/* Demo accounts */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-4">
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">⚡ Quick Login — Demo Accounts</p>
                        <div className="grid grid-cols-2 gap-2">
                            {DEMO_ACCOUNTS.map(acc => (
                                <button key={acc.email} onClick={() => quickLogin(acc)} disabled={loading}
                                    className={`bg-gradient-to-r ${acc.color} text-white text-sm px-3 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 text-left`}>
                                    <div className="font-semibold">{acc.label}</div>
                                    <div className="text-white/70 text-xs mt-0.5 truncate">{acc.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Login card */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-7 shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
                        <p className="text-slate-400 text-sm mb-6">Sign in to your account</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1.5 font-medium">Email</label>
                                <input
                                    type="email" required value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@meetmate.app"
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1.5 font-medium">Password</label>
                                <input
                                    type="password" required value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? (
                                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Signing in...</>
                                ) : 'Sign In →'}
                            </button>
                        </form>

                        <div className="mt-5 text-center">
                            <p className="text-slate-400 text-sm">
                                Don't have an account?{' '}
                                <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition">Create one</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
