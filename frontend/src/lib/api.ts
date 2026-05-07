const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('mm_token');
}

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
    if (res.status === 401) {
        localStorage.removeItem('mm_token');
        localStorage.removeItem('mm_user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (res.status === 401) {
        localStorage.removeItem('mm_token');
        localStorage.removeItem('mm_user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

// --- Workspaces ---
export async function fetchWorkspaces() { return apiGet<any[]>('/workspaces/'); }
export async function createWorkspace(name: string) { return apiPost<any>('/workspaces/', { name }); }
export async function fetchWorkspace(id: string) { return apiGet<any>(`/workspaces/${id}`); }
export async function fetchWorkspaceMembers(id: string) { return apiGet<any[]>(`/workspaces/${id}/members`); }
export async function inviteMember(workspaceId: string, email: string, role: 'manager' | 'member' = 'member') {
    return apiPost<any>(`/workspaces/${workspaceId}/invite`, { email, role });
}

// --- Meetings ---
export async function fetchMeetings(workspaceId: string) { return apiGet<any[]>(`/meetings/workspace/${workspaceId}`); }
export async function fetchMeeting(id: string) { return apiGet<any>(`/meetings/${id}`); }
export async function searchMeetings(workspaceId: string, q: string) {
    return apiGet<any[]>(`/meetings/workspace/${workspaceId}/search?q=${encodeURIComponent(q)}`);
}

export async function uploadTranscript(workspaceId: string, file: File) {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(
        `${API_BASE_URL}/meetings/${workspaceId}/upload?title=${encodeURIComponent(file.name.replace(/\.txt$/i, ''))}`,
        {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
}

// --- Tasks ---
export async function fetchWorkspaceTasks(workspaceId: string) { return apiGet<any[]>(`/tasks/workspace/${workspaceId}`); }
export async function fetchMyTasks() { return apiGet<any[]>('/tasks/my'); }
export async function updateTask(taskId: string, updates: Record<string, unknown>) {
    return apiPatch<any>(`/tasks/${taskId}`, updates);
}

// --- Chat ---
export async function askChat(meetingId: string, question: string) {
    return apiPost<any>(`/chat/${meetingId}`, { question });
}

// --- CSV Export ---
export function exportTasksToCSV(tasks: any[], meetingTitle: string) {
    const headers = ['Description', 'Assignee', 'Priority', 'Status', 'Deadline', 'Ticket URL'];
    const rows = tasks.map(t => [
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${t.raw_assignee_name || ''}"`,
        t.priority || 'medium',
        t.status || 'pending',
        t.deadline || '',
        t.external_ticket_url || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/\s+/g, '_')}_tasks.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Tool Integrations ---
export async function exportToNotion(meetingId: string) {
    return apiPost<any>(`/export/${meetingId}/notion`, {});
}

export async function sendTaskEmails(meetingId: string) {
    return apiPost<any>(`/export/${meetingId}/email-tasks`, {});
}

// --- Trello ---
export async function getTrelloBoards() {
    return apiGet<{ id: string; name: string }[]>('/export/trello/boards');
}

export async function getTrelloBoardLists(boardId: string) {
    return apiGet<{ id: string; name: string }[]>(`/export/trello/boards/${boardId}/lists`);
}

export async function syncTasksToTrello(meetingId: string, listId: string) {
    return apiPost<any>(`/export/${meetingId}/trello-tasks`, { list_id: listId });
}

export async function setMemberTrelloId(workspaceId: string, userId: string, trelloUsername: string) {
    return apiPatch<any>(`/workspaces/${workspaceId}/members/${userId}/trello`, { trello_username: trelloUsername });
}

