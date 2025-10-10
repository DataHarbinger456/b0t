import { scheduler, ScheduledJob } from '../scheduler';
import { exampleEvery5Minutes, exampleHourly, exampleDaily } from './example';
import { generateAndPostTweet, analyzeTrends, generateScheduledContent } from './twitter-ai';
import { checkAndReplyToYouTubeComments, trackYouTubeVideo, fetchYouTubeCommentsForAnalysis } from './youtube';

/**
 * Define all your scheduled jobs here
 *
 * Cron expression examples:
 * - '* /5 * * * *' - Every 5 minutes
 * - '* /10 * * * *' - Every 10 minutes
 * - '* /30 * * * *' - Every 30 minutes
 * - '0 * * * *' - Every hour
 * - '0 0 * * *' - Every day at midnight
 * - '0 9 * * 1-5' - Every weekday at 9:00 AM
 * - '0 0 * * 0' - Every Sunday at midnight
 *
 * Set enabled: false to disable a job
 */
const jobs: ScheduledJob[] = [
  // Example jobs (disabled by default)
  {
    name: 'example-every-5-minutes',
    schedule: '*/5 * * * *', // Every 5 minutes
    task: exampleEvery5Minutes,
    enabled: false, // Set to true to enable this example job
  },
  {
    name: 'example-hourly',
    schedule: '0 * * * *', // Every hour at minute 0
    task: exampleHourly,
    enabled: false, // Set to true to enable this example job
  },
  {
    name: 'example-daily',
    schedule: '0 0 * * *', // Every day at midnight
    task: exampleDaily,
    enabled: false, // Set to true to enable this example job
  },

  // AI + Twitter jobs (disabled by default - enable when ready)
  {
    name: 'generate-scheduled-content',
    schedule: '0 */4 * * *', // Every 4 hours
    task: generateScheduledContent,
    enabled: false, // Enable this to generate tweet drafts every 4 hours
  },
  {
    name: 'analyze-trends',
    schedule: '0 8 * * *', // Every day at 8:00 AM
    task: analyzeTrends,
    enabled: false, // Enable this to analyze trends daily
  },
  {
    name: 'ai-tweet-generation',
    schedule: '0 10 * * *', // Every day at 10:00 AM
    task: generateAndPostTweet,
    enabled: false, // Enable this to generate and post tweets (WARNING: will post to Twitter!)
  },

  // YouTube jobs (disabled by default - enable when ready)
  {
    name: 'check-youtube-comments',
    schedule: '*/30 * * * *', // Every 30 minutes
    task: checkAndReplyToYouTubeComments,
    enabled: false, // Enable this to check and reply to YouTube comments
  },
  {
    name: 'fetch-youtube-comments-analysis',
    schedule: '0 */6 * * *', // Every 6 hours
    task: fetchYouTubeCommentsForAnalysis,
    enabled: false, // Enable this to fetch comments for analysis (no replies)
  },
];

/**
 * Initialize and start all scheduled jobs
 */
export function initializeScheduler() {
  console.log('🔧 Initializing scheduler...');

  // Register all jobs
  jobs.forEach((job) => {
    scheduler.register(job);
  });

  // Start the scheduler
  scheduler.start();

  console.log('📋 Available jobs:', scheduler.getJobs());
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  scheduler.stop();
}

// Export individual job functions for manual testing
export {
  exampleEvery5Minutes,
  exampleHourly,
  exampleDaily,
  generateAndPostTweet,
  analyzeTrends,
  generateScheduledContent,
  checkAndReplyToYouTubeComments,
  trackYouTubeVideo,
  fetchYouTubeCommentsForAnalysis,
};
