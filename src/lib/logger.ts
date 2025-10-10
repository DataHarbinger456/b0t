import pino from 'pino';

/**
 * Structured logging with Pino
 *
 * Usage:
 * logger.info('Tweet generated', { tweetId: '123', content: 'Hello world' });
 * logger.error('Failed to post', { error: err.message });
 * logger.debug('Debug info', { data: someData });
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Use basic pino without pretty transport to avoid worker thread issues
// pino-pretty doesn't work in Next.js instrumentation/edge runtime
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'info' : 'info'),
  // No transport - use basic JSON output
  // For pretty logs in development, pipe to pino-pretty: npm run dev | pino-pretty
});

// Helper functions for common logging patterns
export const logJobStart = (jobName: string) => {
  logger.info({ job: jobName }, `🔄 Starting job: ${jobName}`);
};

export const logJobComplete = (jobName: string, duration?: number) => {
  logger.info({ job: jobName, duration }, `✅ Completed job: ${jobName}`);
};

export const logJobError = (jobName: string, error: unknown) => {
  logger.error(
    { job: jobName, error: error instanceof Error ? error.message : String(error) },
    `❌ Job failed: ${jobName}`
  );
};

export const logApiRequest = (method: string, path: string, statusCode: number) => {
  logger.info({ method, path, statusCode }, `${method} ${path} - ${statusCode}`);
};

export const logApiError = (method: string, path: string, error: unknown) => {
  logger.error(
    { method, path, error: error instanceof Error ? error.message : String(error) },
    `API error: ${method} ${path}`
  );
};
