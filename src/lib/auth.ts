import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

/**
 * NextAuth.js v5 (Auth.js) Configuration
 *
 * Supports multiple authentication providers:
 * - GitHub OAuth
 * - Google OAuth
 * - Email/Password (Credentials)
 */

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // GitHub OAuth Provider
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),

    // Google OAuth Provider
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),

    // Credentials Provider (Email/Password)
    // WARNING: This is a basic example. In production, use proper password hashing!
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: Replace with actual database lookup and password verification
        // This is just a placeholder for demonstration

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Example: Check against database
        // const user = await db.select().from(usersTable).where(eq(usersTable.email, credentials.email));
        // if (!user || !verifyPassword(credentials.password, user.password)) {
        //   return null;
        // }

        // For now, return null (disabled)
        // Remove this and implement actual auth logic
        console.warn('⚠️  Credentials provider is not fully implemented');
        return null;

        // Example return when implemented:
        // return {
        //   id: user.id,
        //   email: user.email,
        //   name: user.name,
        // };
      },
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user',
  },

  callbacks: {
    async signIn({ user, account }) {
      // You can add custom logic here, e.g., check if user is allowed
      console.log('🔐 Sign in:', { user: user.email, provider: account?.provider });
      return true;
    },

    async session({ session, token }) {
      // Add user id to session
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },

    async jwt({ token, user }) {
      // Add user id to token on first sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === 'development',
});
