'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWorkspaces, fetchMeetings } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Video,
    CheckCircle2,
    Clock,
    ArrowRight,
    AlertCircle,
    FolderKanban,
    Plus
} from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [allMeetings, setAllMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const wsList = await fetchWorkspaces();
                setWorkspaces(wsList);
                const meetingPromises = wsList.map((ws: any) => fetchMeetings(ws.id).catch(() => []));
                const results = await Promise.all(meetingPromises);
                setAllMeetings(results.flat());
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <DashboardSkeleton />;

    const allTasks = allMeetings.flatMap((m: any) => m.tasks || []);
    const pendingTasks = allTasks.filter(t => t.status !== 'completed');
    const highPriorityTasks = allTasks.filter(t => t.priority === 'high' && t.status !== 'completed');
    const recentMeetings = [...allMeetings]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    const stats = [
        { label: 'Active Workspaces', value: workspaces.length, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Meetings', value: allMeetings.length, icon: Video, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Pending Items', value: pendingTasks.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Completed', value: allTasks.filter(t => t.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="mb-10">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    Overview
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Manage your meeting intelligence and team action items.
                </p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-hover hover:border-slate-300">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon className={cn("w-5 h-5", stat.color)} />
                            <span className="text-xs font-medium text-slate-400">Total</span>
                        </div>
                        <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{stat.label}</p>
                    </div>
                ))}
            </div>

            {highPriorityTasks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-8 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">Priority items require attention</p>
                        <p className="text-sm text-amber-700 mt-0.5">There are {highPriorityTasks.length} high-priority tasks pending across your workspaces.</p>
                    </div>
                    <Link href="/my-tasks" className="text-sm font-semibold text-amber-900 hover:text-amber-800 flex items-center gap-1 group">
                        Review tasks <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Meetings */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Recent Meetings</h2>
                        <Link href="/workspaces" className="text-xs font-semibold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1">
                            Go to workspaces <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        {recentMeetings.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Video className="w-6 h-6 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-medium text-slate-900">No meetings found</h3>
                                <p className="text-xs text-slate-500 mt-1">Upload a transcript to see insights here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentMeetings.map((m) => (
                                    <Link key={m.id} href={`/meetings/${m.id}`} className="group flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            m.status === 'completed' ? 'bg-emerald-500' :
                                                m.status === 'processing' ? 'bg-blue-500' : 'bg-rose-500'
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                {m.title}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                <span>{new Date(m.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>{m.tasks?.length || 0} action items</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Access */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Workspaces</h2>
                        <div className="space-y-3">
                            {workspaces.map((ws) => (
                                <Link key={ws.id} href={`/workspaces/${ws.id}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors group">
                                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                        {ws.name[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 truncate flex-1">{ws.name}</span>
                                </Link>
                            ))}
                            <Link href="/workspaces" className="flex items-center gap-2 p-2 rounded-md border border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors text-sm font-medium">
                                <Plus className="w-4 h-4" /> New workspace
                            </Link>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-6 shadow-lg text-white">
                        <h2 className="font-semibold mb-1">My Action Items</h2>
                        <p className="text-slate-400 text-xs mb-4 leading-relaxed">View all tasks assigned to you across all current meetings.</p>
                        <Link href="/my-tasks" className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-slate-900 px-4 py-2 rounded-md hover:bg-slate-100 transition-colors">
                            Go to tasks <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
