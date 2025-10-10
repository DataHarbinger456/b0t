# Authentication Documentation

## Overview

Social Cat uses **NextAuth.js v5** (Auth.js) for authentication. It supports multiple authentication providers and includes full database integration with Drizzle ORM.

## Features

- ✅ Multiple authentication providers (GitHub, Google, Credentials)
- ✅ Database-backed sessions
- ✅ Protected routes with middleware
- ✅ Full TypeScript support
- ✅ SQLite for local development, PostgreSQL for production

## Quick Start

### 1. Configure Environment Variables

Edit `.env.local` and add your authentication credentials:

```env
# Required: Generate with `openssl rand -base64 32`
AUTH_SECRET=your_generated_secret_here

# Required: Your app URL
AUTH_URL=http://localhost:3003

# Optional: GitHub OAuth
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret

# Optional: Google OAuth
GOOGLE_ID=your_google_client_id
GOOGLE_SECRET=your_google_client_secret
```

### 2. Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output and set it as `AUTH_SECRET` in `.env.local`.

### 3. Restart Development Server

```bash
npm run dev
```

Authentication is now ready to use!

## Authentication Providers

### GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Social Cat
   - **Homepage URL**: `http://localhost:3003` (dev) or your production URL
   - **Authorization callback URL**: `http://localhost:3003/api/auth/callback/github`
4. Copy Client ID → `GITHUB_ID` in `.env.local`
5. Generate Client Secret → `GITHUB_SECRET` in `.env.local`

### Google OAuth

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project or select existing
3. Click "Create Credentials" → "OAuth client ID"
4. Configure OAuth consent screen if prompted
5. Choose "Web application"
6. Add authorized redirect URI:
   - `http://localhost:3003/api/auth/callback/google`
7. Copy Client ID → `GOOGLE_ID` in `.env.local`
8. Copy Client Secret → `GOOGLE_SECRET` in `.env.local`

### Credentials Provider (Email/Password)

The credentials provider is included but **not fully implemented** by default for security reasons.

To implement:

1. Edit `src/lib/auth.ts`
2. Implement password hashing (use bcrypt or argon2)
3. Add database lookup logic
4. Return user object on successful authentication

**Example implementation:**

```typescript
import { compare } from 'bcrypt';
import { db } from './db';
import { usersTableSQLite } from './schema';
import { eq } from 'drizzle-orm';

Credentials({
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    // Look up user in database
    const users = await db
      .select()
      .from(usersTableSQLite)
      .where(eq(usersTableSQLite.email, credentials.email as string));

    const user = users[0];

    if (!user || !user.password) {
      return null;
    }

    // Verify password
    const isValid = await compare(credentials.password as string, user.password);

    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  },
});
```

## Database Schema

Authentication uses these tables:

### `users`
- `id` - Unique user identifier
- `name` - User's display name
- `email` - Email address (unique)
- `emailVerified` - Email verification timestamp
- `image` - Profile image URL
- `createdAt` - Account creation date

### `accounts`
- Links users to OAuth providers
- Stores OAuth tokens and provider info

### `sessions`
- Active user sessions
- Session tokens and expiration

### `verification_tokens`
- Email verification tokens

All tables support both SQLite (dev) and PostgreSQL (prod).

## Usage in Code

### Server Components

```typescript
import { auth } from '@/lib/auth';

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Welcome, {session.user?.name}!</h1>
      <p>Email: {session.user?.email}</p>
    </div>
  );
}
```

### Client Components

```typescript
'use client';

import { useSession } from 'next-auth/react';

export default function ClientComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome, {session.user?.name}!</div>;
}
```

### API Routes

```typescript
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // User is authenticated
  return NextResponse.json({
    message: 'Hello',
    user: session.user,
  });
}
```

## Sign In/Sign Out

### Sign In

```typescript
import { signIn } from '@/lib/auth';

// Sign in with GitHub
await signIn('github');

// Sign in with Google
await signIn('google');

// Sign in with credentials
await signIn('credentials', {
  email: 'user@example.com',
  password: 'password123',
});

// Sign in with redirect
await signIn('github', { redirectTo: '/dashboard' });
```

### Sign Out

```typescript
import { signOut } from '@/lib/auth';

// Sign out
await signOut();

// Sign out with redirect
await signOut({ redirectTo: '/' });
```

### Sign In Button Example

```typescript
'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
  return (
    <button onClick={() => signIn('github')}>
      Sign in with GitHub
    </button>
  );
}
```

### Sign Out Button Example

```typescript
'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button onClick={() => signOut()}>
      Sign out
    </button>
  );
}
```

## Protected Routes

The middleware in `middleware.ts` automatically protects routes.

### Current Configuration

All routes are protected except:
- `/` - Home page
- `/auth/signin` - Sign in page
- `/auth/error` - Error page
- `/api/auth/*` - NextAuth API routes

### Customize Protected Routes

Edit `middleware.ts`:

```typescript
// Protect specific routes
const publicRoutes = ['/', '/about', '/blog'];

// Or protect everything except public routes
const publicRoutes = [
  '/',
  '/auth',
  '/api/public',
];
```

### Protect Individual Pages

For more granular control, check auth in the page itself:

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin?callbackUrl=/protected');
  }

  return <div>Protected content</div>;
}
```

## Session Management

### Session Configuration

Sessions are configured in `src/lib/auth.ts`:

```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

### Get Session

```typescript
import { auth } from '@/lib/auth';

const session = await auth();

console.log(session?.user); // { id, name, email, image }
```

### Custom Session Data

Add custom data to the session in `src/lib/auth.ts`:

```typescript
callbacks: {
  async session({ session, token }) {
    // Add custom data
    if (token.sub) {
      session.user.id = token.sub;
      session.user.role = token.role; // Custom field
    }
    return session;
  },

  async jwt({ token, user, account }) {
    // Add custom data to token
    if (user) {
      token.id = user.id;
      token.role = user.role; // Custom field
    }
    return token;
  },
}
```

Update TypeScript types:

```typescript
// types/next-auth.d.ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string; // Custom field
    } & DefaultSession['user'];
  }

  interface User {
    role: string; // Custom field
  }
}
```

## Custom Pages

Create custom authentication pages in `src/app/auth/`:

### Sign In Page

```typescript
// src/app/auth/signin/page.tsx
import { signIn } from '@/lib/auth';

export default function SignInPage() {
  return (
    <div>
      <h1>Sign In</h1>
      <button onClick={() => signIn('github')}>
        Sign in with GitHub
      </button>
      <button onClick={() => signIn('google')}>
        Sign in with Google
      </button>
    </div>
  );
}
```

### Error Page

```typescript
// src/app/auth/error/page.tsx
export default function ErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div>
      <h1>Authentication Error</h1>
      <p>Error: {searchParams.error}</p>
    </div>
  );
}
```

## Railway Deployment

### 1. Set Environment Variables in Railway

Add these variables in Railway dashboard:

```
AUTH_SECRET=<generate with openssl rand -base64 32>
AUTH_URL=https://your-app.railway.app
GITHUB_ID=<your github client id>
GITHUB_SECRET=<your github client secret>
GOOGLE_ID=<your google client id>
GOOGLE_SECRET=<your google client secret>
DATABASE_URL=<automatically set by Railway PostgreSQL>
```

### 2. Update OAuth Callback URLs

For each OAuth provider, add production callback URLs:

**GitHub:**
- `https://your-app.railway.app/api/auth/callback/github`

**Google:**
- `https://your-app.railway.app/api/auth/callback/google`

### 3. Deploy

```bash
railway up
```

### 4. Run Database Migration

```bash
# SSH into Railway or run locally with production DATABASE_URL
npm run db:push
```

## Testing Authentication

### Test Sign In

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3003/api/auth/signin`
3. Click a provider button
4. Complete OAuth flow
5. You should be redirected back authenticated

### Test Protected Routes

1. Create a protected page
2. Try accessing without authentication (should redirect)
3. Sign in
4. Try accessing again (should work)

### Test Sign Out

1. While signed in, navigate to `http://localhost:3003/api/auth/signout`
2. Click sign out
3. Try accessing protected routes (should redirect to sign in)

## Troubleshooting

### "Invalid Credentials" Error

- Check `AUTH_SECRET` is set
- Verify OAuth client IDs and secrets
- Ensure callback URLs are correct

### Redirect Loop

- Check middleware configuration
- Ensure public routes are properly defined
- Verify `AUTH_URL` matches your app URL

### Session Not Persisting

- Clear browser cookies
- Check `AUTH_SECRET` hasn't changed
- Verify database tables exist (`npm run db:push`)

### OAuth Provider Errors

**GitHub:**
- Verify callback URL: `http://localhost:3003/api/auth/callback/github`
- Check OAuth App settings in GitHub

**Google:**
- Verify authorized redirect URIs include your callback URL
- Ensure OAuth consent screen is configured

### Database Errors

```bash
# Reset database and recreate tables
rm local.db
npm run db:push
```

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use strong AUTH_SECRET** - Generate with `openssl rand -base64 32`
3. **Enable HTTPS in production** - Railway does this automatically
4. **Rotate secrets regularly** - Especially after team member changes
5. **Use environment-specific URLs** - Different for dev/prod
6. **Implement rate limiting** - For credentials provider
7. **Add CSRF protection** - Built into NextAuth
8. **Validate redirect URLs** - Prevent open redirect attacks

## API Reference

### `auth()`

Get current session (server-side):

```typescript
import { auth } from '@/lib/auth';
const session = await auth();
```

### `signIn(provider, options)`

Sign in with a provider:

```typescript
import { signIn } from '@/lib/auth';

await signIn('github');
await signIn('github', { redirectTo: '/dashboard' });
```

### `signOut(options)`

Sign out:

```typescript
import { signOut } from '@/lib/auth';

await signOut();
await signOut({ redirectTo: '/' });
```

## Advanced Configuration

### Custom Provider

Add a custom OAuth provider in `src/lib/auth.ts`:

```typescript
import MyCustomProvider from 'next-auth/providers/my-provider';

providers: [
  MyCustomProvider({
    clientId: process.env.CUSTOM_ID,
    clientSecret: process.env.CUSTOM_SECRET,
  }),
]
```

### Email Provider

Add email-based authentication:

```bash
npm install nodemailer
```

```typescript
import Email from 'next-auth/providers/email';

providers: [
  Email({
    server: process.env.EMAIL_SERVER,
    from: process.env.EMAIL_FROM,
  }),
]
```

### Database Adapter

For full database integration (optional):

```bash
npm install @auth/drizzle-adapter
```

```typescript
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  // ... rest of config
});
```

## Resources

- **NextAuth.js Documentation**: https://authjs.dev
- **GitHub OAuth Apps**: https://github.com/settings/developers
- **Google Cloud Console**: https://console.cloud.google.com
- **Generate Secrets**: https://generate-secret.vercel.app/32

## Summary

- ✅ **NextAuth v5** installed and configured
- ✅ **Multiple providers** (GitHub, Google, Credentials)
- ✅ **Database tables** created for users, accounts, sessions
- ✅ **Middleware** protecting routes
- ✅ **Environment variables** configured
- ✅ **Ready for Railway** deployment

To get started:
1. Add OAuth credentials to `.env.local`
2. Restart dev server
3. Navigate to `/api/auth/signin`
4. Test sign in with your providers

For detailed examples and advanced usage, see this documentation.
