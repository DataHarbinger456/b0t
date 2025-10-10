import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * YouTube Data API v3 Client
 *
 * This module provides functions to interact with YouTube API
 * for commenting, replying, and managing video content.
 */

// Check if YouTube credentials are set
const hasYouTubeCredentials =
  process.env.YOUTUBE_CLIENT_ID &&
  process.env.YOUTUBE_CLIENT_SECRET &&
  process.env.YOUTUBE_REFRESH_TOKEN;

if (!hasYouTubeCredentials) {
  console.warn('⚠️  YouTube API credentials are not fully set. YouTube features will not work.');
}

// Initialize OAuth2 client
let oauth2Client: OAuth2Client | null = null;
let youtubeClient: youtube_v3.Youtube | null = null;

if (hasYouTubeCredentials) {
  oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3003/api/youtube/callback'
  );

  // Set credentials with refresh token
  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });

  // Initialize YouTube API client
  youtubeClient = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });
}

export { oauth2Client, youtubeClient };

/**
 * Get comments for a video
 */
export async function getVideoComments(videoId: string, maxResults = 100) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    const response = await youtubeClient.commentThreads.list({
      part: ['snippet', 'replies'],
      videoId,
      maxResults,
      order: 'time', // Most recent first
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching video comments:', error);
    throw error;
  }
}

/**
 * Reply to a comment
 */
export async function replyToComment(commentId: string, text: string) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    const response = await youtubeClient.comments.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: text,
        },
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error replying to comment:', error);
    throw error;
  }
}

/**
 * Post a top-level comment on a video
 */
export async function postComment(videoId: string, text: string, channelId: string) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    const response = await youtubeClient.commentThreads.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          videoId,
          channelId,
          topLevelComment: {
            snippet: {
              textOriginal: text,
            },
          },
        },
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error posting comment:', error);
    throw error;
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    await youtubeClient.comments.delete({
      id: commentId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Get video details
 */
export async function getVideoDetails(videoId: string) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    const response = await youtubeClient.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId],
    });

    return response.data.items?.[0] || null;
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
}

/**
 * Search for videos
 */
export async function searchVideos(query: string, maxResults = 10) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    const response = await youtubeClient.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults,
      order: 'relevance',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
}

/**
 * Get channel details
 */
export async function getChannelDetails(channelId?: string) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    const params: youtube_v3.Params$Resource$Channels$List = {
      part: ['snippet', 'statistics', 'contentDetails'],
      ...(channelId ? { id: [channelId] } : { mine: true }),
    };

    const response = await youtubeClient.channels.list(params);

    return response.data.items?.[0] || null;
  } catch (error) {
    console.error('Error fetching channel details:', error);
    throw error;
  }
}

/**
 * Mark comment as spam
 */
export async function markCommentAsSpam(commentId: string) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    await youtubeClient.comments.markAsSpam({
      id: [commentId],
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking comment as spam:', error);
    throw error;
  }
}

/**
 * Set comment moderation status
 */
export async function setCommentModerationStatus(
  commentId: string,
  status: 'heldForReview' | 'published' | 'rejected'
) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    await youtubeClient.comments.setModerationStatus({
      id: [commentId],
      moderationStatus: status,
    });

    return { success: true };
  } catch (error) {
    console.error('Error setting comment moderation status:', error);
    throw error;
  }
}

/**
 * Get comment by ID
 */
export async function getComment(commentId: string) {
  if (!youtubeClient) {
    throw new Error('YouTube client is not initialized. Please set YouTube API credentials.');
  }

  try {
    const response = await youtubeClient.comments.list({
      part: ['snippet'],
      id: [commentId],
    });

    return response.data.items?.[0] || null;
  } catch (error) {
    console.error('Error fetching comment:', error);
    throw error;
  }
}

/**
 * Helper to generate OAuth URL for initial setup
 */
export function getYouTubeAuthUrl() {
  if (!oauth2Client) {
    throw new Error('OAuth2 client is not initialized.');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube',
    ],
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  if (!oauth2Client) {
    throw new Error('OAuth2 client is not initialized.');
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
