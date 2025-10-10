import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompactAutomationRow } from '@/components/automation/CompactAutomationRow';

export default function TwitterPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-black text-2xl tracking-tight">Twitter</h1>
          <p className="text-xs text-secondary">Automate tweet generation and posting</p>
        </div>

        {/* Compact Automations List */}
        <div className="space-y-2">
          <CompactAutomationRow
            title="Generate Tweet Drafts"
            jobName="generate-scheduled-content"
            defaultInterval="0 */4 * * *"
            defaultPrompt="You are a social media expert. Create engaging, informative tweets about technology and AI. Keep it under 280 characters and make it shareable."
          />

          <CompactAutomationRow
            title="Generate & Post Tweets"
            jobName="ai-tweet-generation"
            defaultInterval="0 10 * * *"
            defaultPrompt="You are a thought leader in tech. Create insightful tweets about AI, software development, and innovation. Be authentic and engaging."
          />

          <CompactAutomationRow
            title="Analyze Twitter Trends"
            jobName="analyze-trends"
            defaultInterval="0 8 * * *"
            defaultPrompt="Analyze current Twitter trends and identify opportunities for engagement in the tech and AI space."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
