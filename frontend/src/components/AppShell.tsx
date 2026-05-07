'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWorkspaces, createWorkspace } from '@/lib/api';
import {
    LayoutDashboard,
    CheckSquare,
    FolderOpen,
    FolderKanban,
    Mic2,
    LogOut,
    Plus,
    Zap
} from 'lucide-react';

function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const sz = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
    return (
        <div className={`${sz} bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
            {initials}
        </div>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, token, logout, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [showNewWs, setShowNewWs] = useState(false);
    const [newWsName, setNewWsName] = useState('');
    const [creating, setCreating] = useState(false);

    // Auth guard
    useEffect(() => {
        if (!loading && !token) {
            router.push('/login');
        }
    }, [loading, token, router]);

    useEffect(() => {
        if (token) {
            fetchWorkspaces().then(setWorkspaces).catch(() => { });
        }
    }, [token]);

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWsName.trim()) return;
        setCreating(true);
        try {
            const ws = await createWorkspace(newWsName.trim());
            setWorkspaces(prev => [...prev, ws]);
            setNewWsName('');
            setShowNewWs(false);
        } catch (err: any) {
            alert(err.message || 'Failed to create workspace');
        } finally {
            setCreating(false);
        }
    };

    const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    if (loading || !token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
                {/* Logo */}
                <div className="p-5 border-b border-slate-800">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-700 border border-slate-600 rounded-md flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-base font-semibold tracking-tight">MeetMate</span>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
                    <Link href="/dashboard"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium ${isActive('/dashboard') ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <LayoutDashboard className="w-4 h-4 shrink-0" /> Dashboard
                    </Link>
                    <Link href="/my-tasks"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium ${isActive('/my-tasks') ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <CheckSquare className="w-4 h-4 shrink-0" /> My Tasks
                    </Link>
                    <Link href="/workspaces"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium ${isActive('/workspaces') ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <FolderOpen className="w-4 h-4 shrink-0" /> All Workspaces
                    </Link>

                    {/* Workspaces section */}
                    <div className="pt-4 mt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between px-3 mb-2">
                            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Workspaces</p>
                            <button onClick={() => setShowNewWs(true)}
                                className="text-slate-500 hover:text-white transition w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700">
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {showNewWs && (
                            <form onSubmit={handleCreateWorkspace} className="px-3 mb-2">
                                <input
                                    autoFocus type="text" placeholder="Workspace name..."
                                    value={newWsName}
                                    onChange={e => setNewWsName(e.target.value)}
                                    onKeyDown={e => e.key === 'Escape' && setShowNewWs(false)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none mb-1.5"
                                />
                                <div className="flex gap-1.5">
                                    <button type="submit" disabled={creating}
                                        className="flex-1 text-xs bg-white text-slate-900 hover:bg-slate-100 py-1.5 rounded-md disabled:opacity-50 transition font-medium">
                                        {creating ? '...' : 'Create'}
                                    </button>
                                    <button type="button" onClick={() => { setShowNewWs(false); setNewWsName(''); }}
                                        className="flex-1 text-xs bg-slate-700 text-slate-400 hover:text-white py-1.5 rounded-md transition">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-0.5">
                            {workspaces.map((ws) => (
                                <Link key={ws.id} href={`/workspaces/${ws.id}`}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-all text-sm ${isActive(`/workspaces/${ws.id}`) ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                    <FolderKanban className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                    <span className="truncate">{ws.name}</span>
                                </Link>
                            ))}
                            {workspaces.length === 0 && !showNewWs && (
                                <button onClick={() => setShowNewWs(true)}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition rounded-md flex items-center gap-2">
                                    <Plus className="w-3 h-3" /> Create your first workspace
                                </button>
                            )}
                        </div>
                    </div>
                </nav>

                {/* User footer */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        {user && <UserAvatar name={user.full_name} />}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                        <button onClick={logout}
                            title="Sign out"
                            className="text-slate-500 hover:text-white transition p-1.5 rounded-md hover:bg-slate-700">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        {pathname === '/dashboard' && <><LayoutDashboard className="w-4 h-4" /><span>Dashboard</span></>}
                        {pathname === '/my-tasks' && <><CheckSquare className="w-4 h-4" /><span>My Tasks</span></>}
                        {pathname === '/workspaces' && <><FolderOpen className="w-4 h-4" /><span>Workspaces</span></>}
                        {pathname.startsWith('/workspaces/') && pathname.split('/').length === 3 && <><FolderKanban className="w-4 h-4" /><span>Workspace</span></>}
                        {pathname.startsWith('/meetings/') && <><Mic2 className="w-4 h-4" /><span>Meeting Detail</span></>}
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            AI Active
                        </div>
                        {user && (
                            <div className="flex items-center gap-2">
                                <UserAvatar name={user.full_name} />
                                <span className="text-sm font-medium text-slate-700 hidden md:block">{user.full_name}</span>
                            </div>
                        )}
                    </div>
                </header>
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
        </div>
    );
}
