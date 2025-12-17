import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div>
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

