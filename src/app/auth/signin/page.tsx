'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Github, Chrome } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border bg-surface">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="font-black text-2xl tracking-tight">
            SOCIAL CAT
          </CardTitle>
          <CardDescription className="text-xs text-secondary">
            Sign in to manage your automations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* GitHub Sign In */}
          <Button
            onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
            variant="outline"
            className="w-full h-9 text-xs"
          >
            <Github className="mr-2 h-4 w-4" />
            Continue with GitHub
          </Button>

          {/* Google Sign In */}
          <Button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            variant="outline"
            className="w-full h-9 text-xs"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <Separator className="my-3 bg-border" />

          <p className="text-center text-[11px] text-secondary/70">
            By signing in, you agree to use Social Cat responsibly
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
