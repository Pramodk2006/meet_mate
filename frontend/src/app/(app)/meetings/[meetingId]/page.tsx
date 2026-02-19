'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchMeeting, fetchWorkspaceMembers, updateTask, askChat, exportTasksToCSV } from '@/lib/api';
import {
    ChevronLeft,
    Download,
    FileText,
    ListChecks,
    MessageSquare,
    AlignLeft,
    Sparkles,
    Bot,
    Key,
    Loader2,
    CheckCircle2,
    AlertCircle,
    CalendarDays,
    ExternalLink,
    User,
    Send,
    ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
    medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
    low: { label: 'Low', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
};

export default function MeetingDetailPage() {
    const params = useParams<{ meetingId: string }>();
    const [meeting, setMeeting] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'summary' | 'tasks' | 'chat' | 'transcript'>('summary');
    const [tasks, setTasks] = useState<any[]>([]);
    const [updatingTask, setUpdatingTask] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function load() {
            if (!params.meetingId) return;
            try {
                const meetingData = await fetchMeeting(params.meetingId);
                setMeeting(meetingData);
                setTasks(meetingData.tasks || []);
                if (meetingData.workspace_id) {
                    const membersData = await fetchWorkspaceMembers(meetingData.workspace_id).catch(() => []);
                    setMembers(membersData);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load meeting');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.meetingId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleTaskUpdate = async (taskId: string, field: string, value: any) => {
        setUpdatingTask(taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
        try {
            await updateTask(taskId, { [field]: value });
        } catch {
            const fresh = await fetchMeeting(params.meetingId);
            setTasks(fresh.tasks || []);
        } finally {
            setUpdatingTask(null);
        }
    };

    const handleChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;
        const question = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: question }]);
        setChatLoading(true);
        try {
            const data = await askChat(params.meetingId, question);
            setChatMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I could not get a response. Try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    );
    if (error) return (
        <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">{error}</p>
        </div>
    );
    if (!meeting) return <div className="p-8 text-slate-500 text-sm">Meeting not found.</div>;

    const pendingCount = tasks.filter(t => t.status !== 'completed').length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <Link href={`/workspaces/${meeting.workspace_id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition mb-4">
                    <ChevronLeft className="w-4 h-4" /> Back to workspace
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1.5">
                            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{meeting.title}</h1>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                meeting.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                    meeting.status === 'processing' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-rose-50 text-rose-700 border-rose-100"
                            )}>
                                {meeting.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {new Date(meeting.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={() => exportTasksToCSV(tasks, meeting.title)} disabled={tasks.length === 0}
                        className="inline-flex items-center gap-2 text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md shadow-sm transition whitespace-nowrap disabled:opacity-40">
                        <Download className="w-4 h-4" /> Export Tasks CSV
                    </button>
                </div>
            </div>

            {/* Task Stats Bar */}
            {tasks.length > 0 && (
                <div className="flex gap-3 mb-8 flex-wrap">
                    <div className="bg-white border border-slate-200 rounded-md px-4 py-2 shadow-sm text-sm">
                        <span className="text-slate-400 font-medium">Total</span>
                        <span className="ml-2 font-semibold text-slate-900">{tasks.length}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-md px-4 py-2 shadow-sm text-sm">
                        <span className="text-slate-400 font-medium">Open</span>
                        <span className="ml-2 font-semibold text-blue-600">{pendingCount}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-md px-4 py-2 shadow-sm text-sm">
                        <span className="text-slate-400 font-medium">Done</span>
                        <span className="ml-2 font-semibold text-emerald-600">{completedCount}</span>
                    </div>
                    {tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-md px-4 py-2 shadow-sm text-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="font-semibold text-red-700">{tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length} High Priority</span>
                        </div>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 gap-0">
                {([
                    { key: 'summary', label: 'Summary', icon: FileText },
                    { key: 'tasks', label: `Tasks (${tasks.length})`, icon: ListChecks },
                    { key: 'chat', label: 'AI Chat', icon: MessageSquare },
                    { key: 'transcript', label: 'Transcript', icon: AlignLeft },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key as any)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px",
                            activeTab === key
                                ? "border-slate-900 text-slate-900"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        )}>
                        <Icon className="w-4 h-4" />{label}
                    </button>
                ))}
            </div>

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                <div className="space-y-6">
                    {meeting.status === 'processing' && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-md p-4 text-blue-700 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <p>AI is processing this transcript. Refresh in a moment.</p>
                        </div>
                    )}
                    {meeting.ai_summary ? (
                        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                            <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-slate-400" /> AI Summary
                            </h2>
                            <p className="text-slate-600 leading-relaxed text-sm">{meeting.ai_summary}</p>
                        </div>
                    ) : meeting.status === 'completed' ? (
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-slate-400 text-center text-sm">No summary generated.</div>
                    ) : null}
                    {meeting.ai_key_points?.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                            <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
                                <Key className="w-4 h-4 text-slate-400" /> Key Points
                            </h2>
                            <ul className="space-y-3">
                                {meeting.ai_key_points.map((point: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border border-slate-200">{i + 1}</span>
                                        <span className="text-slate-600 text-sm leading-relaxed">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    {tasks.length === 0 ? (
                        <div className="py-16 text-center">
                            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-700">No tasks extracted yet</p>
                            <p className="text-xs text-slate-400 mt-1">Upload a meeting transcript with action items to generate tasks.</p>
                        </div>
                    ) : (['high', 'medium', 'low'] as const).map(priority => {
                        const priorityTasks = tasks.filter(t => (t.priority || 'medium') === priority);
                        if (priorityTasks.length === 0) return null;
                        const pc = PRIORITY_CONFIG[priority];
                        return (
                            <div key={priority}>
                                <div className={cn(
                                    "px-5 py-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest border-b",
                                    priority === 'high' ? 'bg-red-50/70 text-red-700 border-red-100' :
                                        priority === 'medium' ? 'bg-amber-50/70 text-amber-700 border-amber-100' : 'bg-emerald-50/70 text-emerald-700 border-emerald-100'
                                )}>
                                    <span className={cn("w-2 h-2 rounded-full", pc.dot)}></span>
                                    {priority} Priority <span className="font-semibold opacity-60 ml-1">({priorityTasks.length})</span>
                                </div>
                                {priorityTasks.map((task, idx) => (
                                    <div key={task.id} className={cn(
                                        "p-5 hover:bg-slate-50 transition-colors",
                                        idx < priorityTasks.length - 1 ? 'border-b border-slate-100' : ''
                                    )}>
                                        <div className="flex items-start gap-4">
                                            <button onClick={() => handleTaskUpdate(task.id, 'status', task.status === 'completed' ? 'pending' : 'completed')}
                                                disabled={updatingTask === task.id}
                                                className={cn(
                                                    "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                                    task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400'
                                                )}>
                                                {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-medium text-slate-800", task.status === 'completed' && 'line-through text-slate-400')}>
                                                    {task.description}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                    {task.deadline && (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <CalendarDays className="w-3 h-3" /> {task.deadline}
                                                        </span>
                                                    )}
                                                    {task.raw_assignee_name && !task.assigned_to_user_id && (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <User className="w-3 h-3" /> {task.raw_assignee_name}
                                                        </span>
                                                    )}
                                                    {task.external_ticket_url && (
                                                        <a href={task.external_ticket_url} target="_blank" rel="noreferrer"
                                                            className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3" /> Ticket
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <select value={task.status} onChange={e => handleTaskUpdate(task.id, 'status', e.target.value)}
                                                    disabled={updatingTask === task.id}
                                                    className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700">
                                                    <option value="pending">Pending</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                                <select value={task.priority || 'medium'} onChange={e => handleTaskUpdate(task.id, 'priority', e.target.value)}
                                                    disabled={updatingTask === task.id}
                                                    className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700">
                                                    <option value="high">High</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="low">Low</option>
                                                </select>
                                                {members.length > 0 && (
                                                    <select value={task.assigned_to_user_id || ''} onChange={e => handleTaskUpdate(task.id, 'assigned_to_user_id', e.target.value || null as any)}
                                                        disabled={updatingTask === task.id}
                                                        className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white max-w-35 text-slate-700">
                                                        <option value="">Unassigned</option>
                                                        {members.map((m: any) => (
                                                            <option key={m.user_id} value={m.user_id}>{m.user.full_name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '65vh' }}>
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">AI Meeting Assistant</p>
                            <p className="text-xs text-slate-400">Ask anything about this meeting</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Active
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 mb-1">Ask me about this meeting</p>
                                    <p className="text-xs text-slate-400">Questions, decisions, owners, deadlines — all indexed.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    {["What were the main decisions?", "Who is responsible for what?", "What are the deadlines?"].map(q => (
                                        <button key={q} onClick={() => setChatInput(q)}
                                            className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md border border-slate-200 transition font-medium">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : chatMessages.map((msg, i) => (
                            <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'ai' && (
                                    <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center shrink-0 mt-0.5 mr-2">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="flex justify-start items-center gap-2">
                                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center shrink-0">
                                    <Bot className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="bg-slate-100 rounded-lg px-4 py-3 flex gap-1 items-center">
                                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>)}
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChat} className="p-4 border-t border-slate-100 flex gap-3">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                            placeholder="Ask about decisions, tasks, attendees..." disabled={chatLoading}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition" />
                        <button type="submit" disabled={chatLoading || !chatInput.trim()}
                            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2.5 rounded-md font-semibold text-sm transition inline-flex items-center gap-2">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-slate-400" /> Raw Transcript
                    </h2>
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-5 max-h-125 overflow-y-auto">
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                            {meeting.raw_transcript || 'No transcript available.'}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
