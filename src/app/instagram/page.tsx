import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function InstagramPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-black text-2xl tracking-tight">Instagram</h1>
          <p className="text-sm text-secondary">
            Automate comment replies on your posts
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base font-black tracking-tight">Comment Automation</CardTitle>
            <CardDescription className="text-xs text-secondary">
              Configuration interface coming soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-xs text-secondary">
              <p>Planned features:</p>
              <ul className="space-y-1.5 ml-4 list-disc">
                <li>Schedule configuration for comment checking</li>
                <li>System prompts for AI-generated replies</li>
                <li>Post tracking management</li>
                <li>Test buttons to verify automation flow</li>
              </ul>
              <p className="pt-2 text-xs">
                Requires Meta Business account and Facebook Page setup
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
