'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyTasks, updateTask } from '@/lib/api';
import Link from 'next/link';
import {
    CheckSquare,
    Clock,
    RotateCcw,
    CheckCircle2,
    CalendarDays,
    ExternalLink,
    ClipboardList,
    ChevronRight,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskRowSkeleton } from '@/components/ui/Skeleton';

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
    high: { label: 'High', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100' },
    medium: { label: 'Medium', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
    low: { label: 'Low', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
];

type FilterKey = 'all' | 'pending' | 'in_progress' | 'completed';

const FILTER_TABS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'All', icon: ClipboardList },
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'in_progress', label: 'In Progress', icon: RotateCcw },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export default function MyTasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchMyTasks()
            .then(setTasks)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleStatusChange = async (taskId: string, status: string) => {
        setUpdatingId(taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
        try { await updateTask(taskId, { status }); } catch { }
        finally { setUpdatingId(null); }
    };

    const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
    const counts: Record<FilterKey, number> = {
        all: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    };

    const completionPct = tasks.length > 0 ? Math.round((counts.completed / tasks.length) * 100) : 0;
    const overdueCount = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed').length;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">My Tasks</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Action items assigned to <span className="font-medium text-slate-700">{user?.full_name}</span>
                </p>
            </header>

            {/* Alert: overdue */}
            {!loading && overdueCount > 0 && (
                <div className="mb-6 flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-md p-4 text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-rose-700 font-medium">
                        {overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue.
                    </p>
                </div>
            )}

            {/* Stats row */}
            {!loading && tasks.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total', value: counts.all, color: 'text-slate-900' },
                        { label: 'Pending', value: counts.pending, color: 'text-amber-600' },
                        { label: 'In Progress', value: counts.in_progress, color: 'text-blue-600' },
                        { label: 'Completed', value: counts.completed, color: 'text-emerald-600' },
                    ].map(s => (
                        <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                            <p className={cn("text-2xl font-semibold", s.color)}>{s.value}</p>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex border-b border-slate-200 mb-6 gap-0">
                {FILTER_TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setFilter(key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px",
                            filter === key
                                ? "border-slate-900 text-slate-900"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        )}>
                        <Icon className="w-4 h-4" />
                        {label}
                        <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded font-semibold",
                            filter === key ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"
                        )}>
                            {counts[key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden divide-y divide-slate-100">
                    {Array.from({ length: 5 }).map((_, i) => <TaskRowSkeleton key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-lg">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckSquare className="w-6 h-6 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                        {tasks.length === 0 ? 'No tasks assigned yet' : `No ${filter.replace('_', ' ')} tasks`}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        {tasks.length === 0
                            ? 'Action items from meetings assigned to you will appear here.'
                            : 'Try switching to a different filter to see other tasks.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {filtered.map(task => {
                            const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
                            return (
                                <div key={task.id} className={cn(
                                    "flex items-start gap-4 px-6 py-5 hover:bg-slate-50 transition-colors",
                                    task.status === 'completed' && 'opacity-60'
                                )}>
                                    <button
                                        onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                                        disabled={updatingId === task.id}
                                        className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                            task.status === 'completed'
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'border-slate-300 hover:border-emerald-400'
                                        )}>
                                        {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-medium text-slate-800 leading-snug",
                                            task.status === 'completed' && 'line-through text-slate-400'
                                        )}>
                                            {task.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider", pc.badge)}>
                                                <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", pc.dot)}></span>
                                                {pc.label}
                                            </span>
                                            {task.deadline && (
                                                <span className={cn(
                                                    "text-xs flex items-center gap-1 font-medium",
                                                    isOverdue ? 'text-rose-600' : 'text-slate-400'
                                                )}>
                                                    <CalendarDays className="w-3 h-3" />
                                                    {task.deadline}
                                                    {isOverdue && <span className="font-semibold"> (overdue)</span>}
                                                </span>
                                            )}
                                            {task.external_ticket_url && (
                                                <a href={task.external_ticket_url} target="_blank" rel="noreferrer"
                                                    className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                    <ExternalLink className="w-3 h-3" /> Ticket
                                                </a>
                                            )}
                                            {task.meeting_title && (
                                                <Link href={`/meetings/${task.meeting_id}`}
                                                    className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                                                    <ChevronRight className="w-3 h-3" />{task.meeting_title}
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <select
                                        value={task.status}
                                        onChange={e => handleStatusChange(task.id, e.target.value)}
                                        disabled={updatingId === task.id}
                                        className="text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white shrink-0 text-slate-700">
                                        {STATUS_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Progress footer */}
            {!loading && tasks.length > 0 && (
                <div className="mt-6 bg-white border border-slate-200 rounded-lg shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Overall Progress</p>
                            <p className="text-xs text-slate-400 mt-0.5">{counts.completed} of {counts.all} tasks completed</p>
                        </div>
                        <span className="text-2xl font-semibold text-slate-900">{completionPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-slate-900 rounded-full transition-all duration-500"
                            style={{ width: `${completionPct}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
