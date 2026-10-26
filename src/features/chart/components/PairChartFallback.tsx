import { Skeleton } from '@/components/ui/Skeleton';

export function PairChartFallback() {
  return (
    <section className="border-line bg-surface/90 overflow-hidden rounded-xl border">
      <div className="border-line flex items-center justify-between border-b px-4 py-3.5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="flex h-[360px] flex-col gap-3 p-4 sm:h-[420px]">
        <div className="flex gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-full w-full" />
      </div>
      <div className="border-line flex justify-between border-t px-4 py-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-36" />
      </div>
    </section>
  );
}
