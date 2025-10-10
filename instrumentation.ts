/**
 * Next.js Instrumentation File
 *
 * This file is used to run code when the server starts.
 * Perfect for initializing scheduled jobs.
 *
 * Note: This only runs in production or when NODE_ENV is set to 'production'
 * For development, you need to enable it in next.config.ts
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeScheduler } = await import('./src/lib/jobs');

    console.log('🚀 Initializing scheduler from instrumentation...');
    initializeScheduler();
  }
}
