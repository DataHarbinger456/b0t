import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-black text-2xl tracking-tight">Dashboard</h1>
          <p className="text-sm text-secondary">
            Monitor your social media automations
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Twitter Stats */}
          <Card className="border-border bg-surface hover:bg-surface-hover transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-secondary">Twitter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black">0</div>
              <p className="text-xs text-secondary">tweets posted</p>
            </CardContent>
          </Card>

          {/* YouTube Stats */}
          <Card className="border-border bg-surface hover:bg-surface-hover transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-secondary">YouTube</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black">0</div>
              <p className="text-xs text-secondary">comments replied</p>
            </CardContent>
          </Card>

          {/* Instagram Stats */}
          <Card className="border-border bg-surface hover:bg-surface-hover transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-secondary">Instagram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-secondary">—</div>
              <p className="text-xs text-secondary">coming soon</p>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="space-y-4">
          <h2 className="font-black text-lg tracking-tight">System</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border bg-surface">
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <div className="text-xs text-secondary">Active Jobs</div>
                  <div className="text-xl font-black">0</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <div className="text-xs text-secondary">Executions</div>
                  <div className="text-xl font-black">0</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <div className="text-xs text-secondary">Database</div>
                  <div className="text-xl font-black">SQLite</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
