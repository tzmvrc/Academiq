import { Skeleton } from "@/components/ui/skeleton";

export const DiscussionCardSkeleton = ({ index = 0 }: { index?: number }) => (
  <div className="rounded-xl border border-border bg-card p-4 sm:p-6 animate-pulse" style={{ animationDelay: `${index * 50}ms` }}>
    {/* Author row */}
    <div className="flex items-center gap-2 sm:gap-3 mb-3">
      <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>

    {/* Title */}
    <Skeleton className="h-5 w-full mb-3" />

    {/* Preview lines */}
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-3/4 mb-4" />

    {/* AI Summary box */}
    <div className="rounded-lg bg-ai-subtle/50 border border-ai/10 p-2.5 sm:p-3 mb-4">
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-5/6" />
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-10 rounded-md" />
      <Skeleton className="h-6 w-6 rounded" />
      <Skeleton className="h-8 w-10 rounded-md" />
      <Skeleton className="h-8 w-16 rounded-md" />
      <div className="ml-auto">
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  </div>
);

export const PostDetailsSkeleton = () => (
  <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
    {/* Back button */}
    <Skeleton className="h-4 w-20 mb-6" />

    {/* Header tags */}
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>

    {/* Title */}
    <Skeleton className="h-8 w-full mb-2" />
    <Skeleton className="h-8 w-3/4 mb-6" />

    {/* Author info */}
    <div className="flex items-center gap-3 mb-6">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>

    {/* AI Summary */}
    <div className="rounded-lg bg-ai-subtle border border-ai/10 p-3 mb-6">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6" />
    </div>

    {/* Content paragraphs */}
    <div className="mb-8 space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>

    {/* Attachments */}
    <div className="mb-8">
      <Skeleton className="h-5 w-32 mb-3" />
      <div className="flex gap-2 sm:gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>

    {/* Actions bar */}
    <div className="flex items-center gap-2 border-t border-b border-border py-3 mb-8">
      <Skeleton className="h-10 w-12" />
      <Skeleton className="h-6 w-6" />
      <Skeleton className="h-10 w-12" />
      <Skeleton className="h-10 w-12 ml-auto" />
    </div>

    {/* Comments section */}
    <div>
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="py-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const PeerCardSkeleton = ({ index = 0 }: { index?: number }) => (
  <div className="rounded-xl border border-border bg-card p-4 sm:p-5 text-center animate-pulse" style={{ animationDelay: `${index * 50}ms` }}>
    <Skeleton className="mx-auto mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-full" />
    <Skeleton className="h-4 w-32 mx-auto mb-2" />
    <Skeleton className="h-3 w-24 mx-auto mb-2" />
    <Skeleton className="h-3 w-20 mx-auto mb-3" />
    <Skeleton className="h-3 w-32 mx-auto mb-4" />
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
);

export const LeaderboardRowSkeleton = ({ index = 0 }: { index?: number }) => (
  <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 animate-pulse" style={{ animationDelay: `${index * 50}ms` }}>
    <Skeleton className="h-6 w-6 sm:w-8" />
    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
    <div className="flex-1 min-w-0">
      <Skeleton className="h-4 w-40 mb-2" />
      <Skeleton className="h-3 w-56" />
    </div>
    <div className="text-right">
      <Skeleton className="h-4 w-16 mb-1" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const NotificationSkeleton = ({ index = 0 }: { index?: number }) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 animate-pulse" style={{ animationDelay: `${index * 50}ms` }}>
    <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0" />
    <div className="flex-1 min-w-0 w-full">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-2 w-2 rounded-full mt-2" />
  </div>
);

export const InterestTopicSkeleton = ({ index = 0 }: { index?: number }) => (
  <Skeleton 
    className="shrink-0 h-10 rounded-lg border border-border w-32" 
    style={{ animationDelay: `${index * 50}ms` }} 
  />
);
