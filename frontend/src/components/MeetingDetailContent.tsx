'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchMeeting, fetchWorkspaceMembers, updateTask, askChat, exportTasksToCSV } from '@/lib/api';

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
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!meeting) return <div className="p-8 text-gray-500">Meeting not found.</div>;

    const pendingCount = tasks.filter(t => t.status !== 'completed').length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            <div className="mb-6">
                <Link href={`/workspaces/${meeting.workspace_id}`} className="text-sm text-gray-400 hover:text-blue-600 transition flex items-center gap-1 mb-3">
                    ← Back to workspace
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{meeting.title}</h1>
                            <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${meeting.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                    meeting.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                }`}>{meeting.status}</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            {new Date(meeting.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={() => exportTasksToCSV(tasks, meeting.title)} disabled={tasks.length === 0}
                        className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl shadow-sm transition whitespace-nowrap disabled:opacity-40">
                        ⬇️ Export Tasks CSV
                    </button>
                </div>
            </div>

            {tasks.length > 0 && (
                <div className="flex gap-4 mb-6 flex-wrap">
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm text-sm">
                        <span className="text-gray-400">Total: </span><span className="font-semibold">{tasks.length}</span>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm text-sm">
                        <span className="text-gray-400">Open: </span><span className="font-semibold text-blue-600">{pendingCount}</span>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm text-sm">
                        <span className="text-gray-400">Done: </span><span className="font-semibold text-emerald-600">{completedCount}</span>
                    </div>
                    {tasks.filter(t => t.priority === 'high').length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 shadow-sm text-sm">
                            <span className="text-red-500">🔴 High: </span>
                            <span className="font-semibold text-red-700">{tasks.filter(t => t.priority === 'high').length}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
                {(['summary', 'tasks', 'chat', 'transcript'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        {tab === 'tasks' ? `Tasks (${tasks.length})` :
                            tab === 'chat' ? '💬 AI Chat' :
                                tab === 'summary' ? '📋 Summary' : '📄 Transcript'}
                    </button>
                ))}
            </div>

            {/* Summary */}
            {activeTab === 'summary' && (
                <div className="space-y-6">
                    {meeting.status === 'processing' && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                            <p>AI is processing this transcript. Refresh in a moment.</p>
                        </div>
                    )}
                    {meeting.ai_summary ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="font-semibold text-gray-800 text-lg mb-3 flex items-center gap-2">📋 AI Summary</h2>
                            <p className="text-gray-600 leading-relaxed">{meeting.ai_summary}</p>
                        </div>
                    ) : meeting.status === 'completed' ? (
                        <div className="bg-gray-50 rounded-2xl p-6 text-gray-400 text-center">No summary generated</div>
                    ) : null}
                    {meeting.ai_key_points?.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="font-semibold text-gray-800 text-lg mb-4">🔑 Key Points</h2>
                            <ul className="space-y-3">
                                {meeting.ai_key_points.map((point: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                        <span className="text-gray-600">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Tasks */}
            {activeTab === 'tasks' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {tasks.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-5xl mb-3">✅</p>
                            <p className="text-gray-500 font-medium">No tasks extracted yet</p>
                            <p className="text-gray-400 text-sm mt-1">Upload a meeting transcript with action items</p>
                        </div>
                    ) : (['high', 'medium', 'low'] as const).map(priority => {
                        const priorityTasks = tasks.filter(t => (t.priority || 'medium') === priority);
                        if (priorityTasks.length === 0) return null;
                        const pc = PRIORITY_CONFIG[priority];
                        return (
                            <div key={priority}>
                                <div className={`px-5 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${priority === 'high' ? 'bg-red-50 text-red-600' :
                                        priority === 'medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                    <span className={`w-2 h-2 rounded-full ${pc.dot}`}></span>
                                    {priority} Priority ({priorityTasks.length})
                                </div>
                                {priorityTasks.map((task, idx) => (
                                    <div key={task.id} className={`p-5 hover:bg-gray-50 transition-colors ${idx < priorityTasks.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        <div className="flex items-start gap-4">
                                            <button onClick={() => handleTaskUpdate(task.id, 'status', task.status === 'completed' ? 'pending' : 'completed')}
                                                disabled={updatingTask === task.id}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'
                                                    }`}>
                                                {task.status === 'completed' && <span className="text-xs">✓</span>}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-gray-800 font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                                                    {task.description}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                    {task.deadline && <span className="text-xs text-gray-400">📅 {task.deadline}</span>}
                                                    {task.raw_assignee_name && !task.assigned_to_user_id && <span className="text-xs text-gray-400">👤 {task.raw_assignee_name}</span>}
                                                    {task.external_ticket_url && <a href={task.external_ticket_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">🔗 Ticket</a>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <select value={task.status} onChange={e => handleTaskUpdate(task.id, 'status', e.target.value)} disabled={updatingTask === task.id}
                                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                                    <option value="pending">Pending</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                                <select value={task.priority || 'medium'} onChange={e => handleTaskUpdate(task.id, 'priority', e.target.value)} disabled={updatingTask === task.id}
                                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                                    <option value="high">🔴 High</option>
                                                    <option value="medium">🟡 Medium</option>
                                                    <option value="low">🟢 Low</option>
                                                </select>
                                                {members.length > 0 && (
                                                    <select value={task.assigned_to_user_id || ''} onChange={e => handleTaskUpdate(task.id, 'assigned_to_user_id', e.target.value || null as any)}
                                                        disabled={updatingTask === task.id}
                                                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white max-w-[140px]">
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

            {/* Chat */}
            {activeTab === 'chat' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style={{ height: '65vh' }}>
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg">✨</div>
                        <div>
                            <p className="font-semibold text-gray-800">AI Meeting Assistant</p>
                            <p className="text-xs text-gray-400">Ask anything about this meeting</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-3">
                                <div className="text-5xl">💬</div>
                                <p className="font-medium text-gray-500">Ask me about this meeting!</p>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    {["What were the main decisions?", "Who is responsible for what?", "What are the deadlines?"].map(q => (
                                        <button key={q} onClick={() => setChatInput(q)}
                                            className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-full transition border border-gray-200">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}>{msg.content}</div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                                    {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>)}
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChat} className="p-4 border-t border-gray-100 flex gap-3">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                            placeholder="Ask about decisions, tasks, attendees..." disabled={chatLoading}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        <button type="submit" disabled={chatLoading || !chatInput.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition">
                            Send
                        </button>
                    </form>
                </div>
            )}

            {/* Transcript */}
            {activeTab === 'transcript' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-800 mb-4">📄 Raw Transcript</h2>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                            {meeting.raw_transcript || 'No transcript available'}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
