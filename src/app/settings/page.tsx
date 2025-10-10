'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Twitter, Youtube, Instagram, Check, X } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [instagramConnected, setInstagramConnected] = useState(false);

  const handleConnect = (platform: string) => {
    if (platform === 'twitter') {
      if (twitterConnected) {
        // Disconnect
        setTwitterConnected(false);
        // TODO: Clear Twitter credentials from backend
      } else {
        // Open Twitter OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          '/api/auth/twitter/authorize',
          'Twitter Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    }

    if (platform === 'youtube') {
      if (youtubeConnected) {
        setYoutubeConnected(false);
        // TODO: Clear YouTube credentials
      } else {
        // Open YouTube/Google OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          '/api/auth/youtube/authorize',
          'YouTube Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    }

    if (platform === 'instagram') {
      // Instagram coming soon
      alert('Instagram integration coming soon. Requires Meta Business account.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-black text-2xl tracking-tight">Settings</h1>
          <p className="text-xs text-secondary">Connect your social media accounts</p>
        </div>

        {/* Platform Connections - One Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Twitter */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">Twitter</CardTitle>
                </div>
                {twitterConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {twitterConnected ? 'Connected' : 'Not connected'}
              </div>
              <Button
                onClick={() => handleConnect('twitter')}
                variant={twitterConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
              >
                {twitterConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </CardContent>
          </Card>

          {/* YouTube */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">YouTube</CardTitle>
                </div>
                {youtubeConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {youtubeConnected ? 'Connected' : 'Not connected'}
              </div>
              <Button
                onClick={() => handleConnect('youtube')}
                variant={youtubeConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
              >
                {youtubeConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">Instagram</CardTitle>
                </div>
                {instagramConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {instagramConnected ? 'Connected' : 'Coming soon'}
              </div>
              <Button
                onClick={() => handleConnect('instagram')}
                variant={instagramConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
                disabled={!instagramConnected}
              >
                {instagramConnected ? 'Disconnect' : 'Coming Soon'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
