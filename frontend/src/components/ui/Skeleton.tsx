import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn('animate-pulse rounded-md bg-slate-100', className)} />
    );
}

// Pre-built skeleton layouts for common pages
export function StatCardSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

export function MeetingRowSkeleton() {
    return (
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
            <Skeleton className="h-2 w-2 rounded-full flex-shrink-0" />
            <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-72" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
        </div>
    );
}

export function WorkspaceCardSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4" />
        </div>
    );
}

export function TaskRowSkeleton() {
    return (
        <div className="flex items-start gap-4 px-6 py-4 border-b border-slate-100">
            <Skeleton className="h-4 w-4 rounded mt-0.5 flex-shrink-0" />
            <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-md" />
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="h-7 w-64 mb-2" />
            <Skeleton className="h-4 w-48 mb-10" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <Skeleton className="h-5 w-40" />
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => <MeetingRowSkeleton key={i} />)}
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <Skeleton className="h-5 w-32 mb-4" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50">
                            <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
