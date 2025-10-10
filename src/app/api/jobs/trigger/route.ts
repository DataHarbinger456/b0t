import { NextRequest, NextResponse } from 'next/server';
import {
  exampleEvery5Minutes,
  exampleHourly,
  exampleDaily,
  generateAndPostTweet,
  analyzeTrends,
  generateScheduledContent,
  checkAndReplyToYouTubeComments,
  fetchYouTubeCommentsForAnalysis,
} from '@/lib/jobs';
import { checkStrictRateLimit } from '@/lib/ratelimit';
import { logger, logApiRequest, logApiError } from '@/lib/logger';
import { triggerJobSchema } from '@/lib/validations';

/**
 * API Route to manually trigger scheduled jobs
 *
 * Usage:
 * POST /api/jobs/trigger?job=example-every-5-minutes
 *
 * Available jobs:
 * - example-every-5-minutes
 * - example-hourly
 * - example-daily
 * - generate-scheduled-content
 * - analyze-trends
 * - ai-tweet-generation
 * - check-youtube-comments
 * - fetch-youtube-comments-analysis
 */

const availableJobs: Record<string, () => Promise<void>> = {
  'example-every-5-minutes': exampleEvery5Minutes,
  'example-hourly': exampleHourly,
  'example-daily': exampleDaily,
  'generate-scheduled-content': generateScheduledContent,
  'analyze-trends': analyzeTrends,
  'ai-tweet-generation': generateAndPostTweet,
  'check-youtube-comments': checkAndReplyToYouTubeComments,
  'fetch-youtube-comments-analysis': fetchYouTubeCommentsForAnalysis,
};

export async function POST(request: NextRequest) {
  // Apply strict rate limiting (3 requests per minute)
  const rateLimitResult = await checkStrictRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const jobName = searchParams.get('job');

    // Validate input with Zod
    const validation = triggerJobSchema.safeParse({ job: jobName });

    if (!validation.success) {
      logApiRequest('POST', '/api/jobs/trigger', 400);
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.issues,
          availableJobs: Object.keys(availableJobs),
        },
        { status: 400 }
      );
    }

    const validatedJobName = validation.data.job;
    const jobFunction = availableJobs[validatedJobName];

    if (!jobFunction) {
      logApiRequest('POST', '/api/jobs/trigger', 404);
      return NextResponse.json(
        {
          error: `Job "${validatedJobName}" not found`,
          availableJobs: Object.keys(availableJobs),
        },
        { status: 404 }
      );
    }

    logger.info({ job: validatedJobName }, `Manually triggering job: ${validatedJobName}`);

    await jobFunction();

    logApiRequest('POST', '/api/jobs/trigger', 200);

    return NextResponse.json({
      success: true,
      message: `Job "${validatedJobName}" executed successfully`,
      job: validatedJobName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logApiError('POST', '/api/jobs/trigger', error);

    return NextResponse.json(
      {
        error: 'Failed to execute job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger a job',
    availableJobs: Object.keys(availableJobs),
    usage: 'POST /api/jobs/trigger?job=<job-name>',
  });
}
