import { z } from 'zod';

/**
 * Validation schemas using Zod
 *
 * Use these to validate API inputs, form data, and external API responses
 */

// Tweet validation
export const tweetSchema = z.object({
  content: z.string().min(1).max(280, 'Tweet must be 280 characters or less'),
  status: z.enum(['draft', 'posted', 'failed']).default('draft'),
  tweetId: z.string().optional(),
});

export const createTweetSchema = z.object({
  content: z.string().min(1).max(280),
});

// YouTube validation
export const youtubeVideoSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
  title: z.string().optional(),
  channelId: z.string().optional(),
});

export const youtubeCommentSchema = z.object({
  commentId: z.string().min(1),
  videoId: z.string().min(1),
  text: z.string().min(1),
  authorDisplayName: z.string().optional(),
});

// Job trigger validation
export const triggerJobSchema = z.object({
  job: z.string().min(1, 'Job name is required'),
});

// Cron schedule validation
export const cronScheduleSchema = z.object({
  schedule: z.string().regex(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
    'Invalid cron expression'
  ),
  enabled: z.boolean().default(false),
});

// AI prompt validation
export const promptSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000, 'Prompt too long'),
  model: z.string().default('gpt-4o-mini'),
});

// Automation configuration
export const automationConfigSchema = z.object({
  jobName: z.string().min(1),
  schedule: z.string().min(1),
  prompt: z.string().min(1),
  enabled: z.boolean(),
});

// API Response schemas
export const apiSuccessSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
});

// Types inferred from schemas
export type Tweet = z.infer<typeof tweetSchema>;
export type CreateTweet = z.infer<typeof createTweetSchema>;
export type YouTubeVideo = z.infer<typeof youtubeVideoSchema>;
export type YouTubeComment = z.infer<typeof youtubeCommentSchema>;
export type TriggerJob = z.infer<typeof triggerJobSchema>;
export type CronSchedule = z.infer<typeof cronScheduleSchema>;
export type Prompt = z.infer<typeof promptSchema>;
export type AutomationConfig = z.infer<typeof automationConfigSchema>;
