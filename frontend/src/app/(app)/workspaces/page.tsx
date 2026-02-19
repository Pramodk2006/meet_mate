'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWorkspaces, createWorkspace } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceCardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import {
    FolderKanban,
    Plus,
    ArrowRight,
    MoreHorizontal,
    Users,
    Video
} from 'lucide-react';

export default function WorkspacesPage() {
    const { user } = useAuth();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchWorkspaces()
            .then(setWorkspaces)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const ws = await createWorkspace(newName.trim());
            setWorkspaces(prev => [ws, ...prev]);
            setNewName('');
            setShowModal(false);
        } catch (err: any) {
            alert(err.message || 'Failed to create workspace');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-10">
                <div className="w-48 h-10 bg-slate-100 rounded animate-pulse" />
                <div className="w-32 h-10 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <WorkspaceCardSkeleton key={i} />)}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Workspaces</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage shared environments and project-specific meeting notes.</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> New Workspace
                </button>
            </div>

            {workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-300 rounded-lg">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <FolderKanban className="w-6 h-6 text-slate-300" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">No workspaces yet</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs text-center">Create a workspace to start collaborating and processing meeting notes.</p>
                    <button onClick={() => setShowModal(true)}
                        className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Get started by creating a workspace <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map((ws) => (
                        <Link key={ws.id} href={`/workspaces/${ws.id}`}
                            className="group bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-10 h-10 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                                    {ws.name[0].toUpperCase()}
                                </div>
                                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-base font-semibold text-slate-900 mb-1 truncate">{ws.name}</h3>
                            <p className="text-xs text-slate-400 mb-6">Established {new Date(ws.created_at).toLocaleDateString()}</p>

                            <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Meetings</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Team Members</span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    <button onClick={() => setShowModal(true)}
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                        <Plus className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors mb-2" />
                        <span className="text-sm font-medium text-slate-400 group-hover:text-blue-600">Create new workspace</span>
                    </button>
                </div>
            )}

            {/* Create Workspace Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-900">Create Workspace</h2>
                            <p className="text-slate-500 text-xs mt-1">Specify a name for your team or project environment.</p>
                        </div>
                        <form onSubmit={handleCreate} className="p-6">
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-widest mb-2">Workspace Name</label>
                                <input
                                    autoFocus type="text" required value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Engineering, Product Design"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <button type="button" onClick={() => { setShowModal(false); setNewName(''); }}
                                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 uppercase tracking-widest px-4 py-2 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating}
                                    className="bg-slate-900 text-white px-5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm">
                                    {creating ? 'Creating...' : 'Create Workspace'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
