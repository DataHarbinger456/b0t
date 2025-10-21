import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-secondary">Loading dashboard...</p>
      </div>
    </div>
  );
}
