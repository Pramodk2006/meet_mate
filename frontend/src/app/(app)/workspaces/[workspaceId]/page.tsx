'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    fetchWorkspace, fetchMeetings, fetchWorkspaceMembers,
    uploadTranscript, inviteMember, searchMeetings,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import {
    Video,
    Upload,
    UserPlus,
    Search,
    ChevronRight,
    BarChart3,
    Users,
    Calendar,
    X,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react';

export default function WorkspaceDetailPage() {
    const params = useParams<{ workspaceId: string }>();
    const [workspace, setWorkspace] = useState<any>(null);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    useEffect(() => {
        async function load() {
            if (!params.workspaceId) return;
            try {
                const [ws, meets, mems] = await Promise.all([
                    fetchWorkspace(params.workspaceId),
                    fetchMeetings(params.workspaceId),
                    fetchWorkspaceMembers(params.workspaceId).catch(() => []),
                ]);
                setWorkspace(ws);
                setMeetings(meets);
                setMembers(mems);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.workspaceId]);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults(null); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await searchMeetings(params.workspaceId, searchQuery);
                setSearchResults(res);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery, params.workspaceId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadMsg(null);
        try {
            await uploadTranscript(params.workspaceId, file);
            setUploadMsg({ type: 'ok', text: 'Transcript uploaded. AI processing started.' });
            const fresh = await fetchMeetings(params.workspaceId);
            setMeetings(fresh);
        } catch (err: any) {
            setUploadMsg({ type: 'err', text: err.message || 'Upload failed' });
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setInviteMsg(null);
        try {
            await inviteMember(params.workspaceId, inviteEmail);
            setInviteMsg({ type: 'ok', text: `Added ${inviteEmail} to workspace` });
            const fresh = await fetchWorkspaceMembers(params.workspaceId);
            setMembers(fresh);
            setInviteEmail('');
        } catch (err: any) {
            setInviteMsg({ type: 'err', text: err.message || 'Invitation failed' });
        } finally {
            setInviting(false);
        }
    };

    if (loading) return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <Skeleton className="h-8 w-64 mb-10" />
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-4">
                    <Skeleton className="h-12 w-full mb-6" />
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );

    const displayMeetings = searchResults !== null ? searchResults : meetings;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xl shrink-0">
                        {workspace.name[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{workspace.name}</h1>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Workspace</span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">Management console for meeting intelligence and team action items.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowInvite(!showInvite)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
                        <UserPlus className="w-4 h-4" /> Invite Team
                    </button>
                    <label className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md cursor-pointer transition-all shadow-sm",
                        uploading ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white hover:bg-slate-800"
                    )}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Uploading...' : 'Upload Transcript'}
                        <input type="file" accept=".txt" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </header>

            {uploadMsg && (
                <div className={cn(
                    "mb-8 p-4 rounded-md text-sm font-medium flex items-center gap-3",
                    uploadMsg.type === 'ok' ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-rose-50 text-rose-800 border border-rose-100"
                )}>
                    {uploadMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {uploadMsg.text}
                    <button onClick={() => setUploadMsg(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {showInvite && (
                <div className="mb-8 p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Invite Team Member</h3>
                    <p className="text-xs text-slate-500 mb-6">Enter an email address to grant access. Members will see all meetings within this workspace.</p>

                    <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                        </div>
                        <button type="submit" disabled={inviting}
                            className="bg-slate-900 text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors">
                            {inviting ? 'Sending...' : 'Send Invitation'}
                        </button>
                        <button type="button" onClick={() => setShowInvite(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                            Cancel
                        </button>
                    </form>

                    {inviteMsg && (
                        <p className={cn(
                            "mt-4 text-xs font-medium",
                            inviteMsg.type === 'ok' ? "text-emerald-600" : "text-rose-600"
                        )}>{inviteMsg.text}</p>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-50">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Add Demo Teammates</p>
                        <div className="flex flex-wrap gap-2">
                            {['alex.chen@meetmate.app', 'priya.sharma@meetmate.app', 'james.wilson@meetmate.app'].map(mail => (
                                <button key={mail} type="button" onClick={() => setInviteEmail(mail)}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors border border-slate-200">
                                    {mail.split('@')[0].replace('.', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                {/* Meetings Dashboard */}
                <div className="xl:col-span-3">
                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search repositories of shared meeting intel..."
                            className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        />
                        {searching && <div className="absolute inset-y-0 right-3 flex items-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>}
                    </div>

                    {displayMeetings.length === 0 ? (
                        <div className="py-24 text-center bg-white border border-slate-200 rounded-lg">
                            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                <Video className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">
                                {searchResults !== null ? 'No results found' : 'No meetings archived'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                                {searchResults !== null ? 'Try refining your search terms.' : 'Upload your first transcript to generate meeting intelligence.'}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {displayMeetings.map((m: any) => (
                                    <Link key={m.id} href={`/meetings/${m.id}`} className="group block hover:bg-slate-50 transition-colors">
                                        <div className="px-6 py-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1.5">
                                                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                            {m.title}
                                                        </h3>
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                                            m.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                                m.status === 'processing' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                                        )}>
                                                            {m.status}
                                                        </span>
                                                    </div>
                                                    {m.ai_summary && (
                                                        <p className="text-sm text-slate-500 line-clamp-1 mb-3">{m.ai_summary}</p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
                                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {(m.tasks || []).length} items</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Console */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                        <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" /> Authorized Team
                        </h2>
                        <div className="space-y-4">
                            {members.map((m: any) => (
                                <div key={m.user_id} className="flex items-center gap-3 group">
                                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
                                        {m.user.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{m.user.full_name}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 truncate">{m.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                        <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-slate-400" /> Intelligence Stats
                        </h2>
                        <div className="space-y-4">
                            {[
                                { label: 'Meetings Archived', val: meetings.length },
                                { label: 'Action Items', val: meetings.reduce((a: number, m: any) => a + (m.tasks?.length || 0), 0) },
                                {
                                    label: 'Completion Rate', val: (() => {
                                        const total = meetings.reduce((a: number, m: any) => a + (m.tasks?.length || 0), 0);
                                        if (total === 0) return '0%';
                                        const done = meetings.reduce((a: number, m: any) => a + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0);
                                        return Math.round((done / total) * 100) + '%';
                                    })()
                                },
                            ].map(stat => (
                                <div key={stat.label} className="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                    <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                                    <span className="text-sm font-semibold text-slate-900">{stat.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
