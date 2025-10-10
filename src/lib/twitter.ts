import { TwitterApi } from 'twitter-api-v2';

// Check if Twitter credentials are set
const hasTwitterCredentials =
  process.env.TWITTER_API_KEY &&
  process.env.TWITTER_API_SECRET &&
  process.env.TWITTER_ACCESS_TOKEN &&
  process.env.TWITTER_ACCESS_SECRET;

if (!hasTwitterCredentials) {
  console.warn('⚠️  Twitter API credentials are not fully set. Twitter features will not work.');
}

// Initialize Twitter client
export const twitterClient = hasTwitterCredentials
  ? new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    })
  : null;

// Helper function to post a tweet
export async function postTweet(text: string) {
  if (!twitterClient) {
    throw new Error('Twitter client is not initialized. Please set Twitter API credentials.');
  }

  try {
    const tweet = await twitterClient.v2.tweet(text);
    return tweet.data;
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}

// Helper function to get user timeline
export async function getUserTimeline(userId: string, maxResults = 10) {
  if (!twitterClient) {
    throw new Error('Twitter client is not initialized. Please set Twitter API credentials.');
  }

  try {
    const timeline = await twitterClient.v2.userTimeline(userId, {
      max_results: maxResults,
    });
    return timeline;
  } catch (error) {
    console.error('Error fetching user timeline:', error);
    throw error;
  }
}

// Helper function to search tweets
export async function searchTweets(query: string, maxResults = 10) {
  if (!twitterClient) {
    throw new Error('Twitter client is not initialized. Please set Twitter API credentials.');
  }

  try {
    const search = await twitterClient.v2.search(query, {
      max_results: maxResults,
    });
    return search;
  } catch (error) {
    console.error('Error searching tweets:', error);
    throw error;
  }
}
