import { replyToTweetsWorkflow } from '@/lib/workflows/twitter/reply-to-tweets';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { appSettingsTable } from '@/lib/schema';

/**
 * Job: Reply to Tweets
 *
 * Searches for tweets based on a configured search term,
 * selects the hottest + newest tweet from today,
 * generates an AI reply, and posts it.
 *
 * Configuration:
 * - Configure via UI (Twitter page -> Reply to Tweets -> Prompt/Filters)
 * - Settings are stored in database (appSettingsTable)
 * - Falls back to TWITTER_REPLY_SEARCH_QUERY env var if not configured
 */

interface ReplyJobParams {
  minimumLikesCount?: number;
  minimumRetweetsCount?: number;
  searchFromToday?: boolean;
  removePostsWithLinks?: boolean;
  removePostsWithMedia?: boolean;
}

/**
 * Load settings from database for a specific job
 */
async function loadJobSettings(jobName: string): Promise<Record<string, unknown>> {
  try {
    const prefix = `${jobName}_`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allSettings = await (db as any)
      .select()
      .from(appSettingsTable) as Array<{ id: number; key: string; value: string; updatedAt: Date | null }>;

    const jobSettings = allSettings
      .filter((setting: { key: string }) => setting.key.startsWith(prefix))
      .reduce((acc: Record<string, unknown>, setting: { key: string; value: string }) => {
        const settingKey = setting.key.replace(prefix, '');
        try {
          acc[settingKey] = JSON.parse(setting.value);
        } catch {
          acc[settingKey] = setting.value;
        }
        return acc;
      }, {} as Record<string, unknown>);

    return jobSettings;
  } catch (error) {
    logger.error({ error }, 'Failed to load job settings from database');
    return {};
  }
}

export async function replyToTweetsJob(params?: ReplyJobParams) {
  // Load settings from database
  const settings = await loadJobSettings('reply-to-tweets');

  // Get search query from database settings or fallback to env var
  const searchQuery = (settings.searchQuery as string) || process.env.TWITTER_REPLY_SEARCH_QUERY;

  if (!searchQuery) {
    logger.warn('⚠️  Search query not configured - set it in the Twitter page UI or TWITTER_REPLY_SEARCH_QUERY env var');
    return;
  }

  // Get prompt from database settings or fallback to env var
  const systemPrompt = (settings.prompt as string | undefined) || process.env.TWITTER_REPLY_SYSTEM_PROMPT;

  try {
    logger.info('🚀 Starting Reply to Tweets workflow...');
    logger.info({ searchQuery, hasCustomPrompt: !!systemPrompt }, `Searching for: "${searchQuery}"`);

    // Use params if provided (from API), otherwise use database settings
    const searchParams = params || {
      minimumLikesCount: settings.minimumLikes as number | undefined,
      minimumRetweetsCount: settings.minimumRetweets as number | undefined,
      searchFromToday: settings.searchFromToday as boolean | undefined,
      removePostsWithLinks: settings.removeLinks as boolean | undefined,
      removePostsWithMedia: settings.removeMedia as boolean | undefined,
    };

    const result = await replyToTweetsWorkflow({
      searchQuery,
      systemPrompt,
      searchParams,
    });

    logger.info('✅ Reply to Tweets workflow completed successfully');
    logger.info({
      tweetId: result.selectedTweet?.tweet_id,
      replyId: (result.replyResult as { id?: string })?.id,
    });
  } catch (error) {
    logger.error({ error }, '❌ Failed to execute Reply to Tweets workflow');
    throw error;
  }
}
