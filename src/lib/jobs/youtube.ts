import { getVideoComments, getVideoDetails } from '../youtube';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { replyToComment } from '../youtube';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { generateTweet } from '../openai';
import { db, useSQLite } from '../db';
import { youtubeVideosTableSQLite, youtubeCommentsTableSQLite, youtubeVideosTablePostgres, youtubeCommentsTablePostgres } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Check for new comments on tracked videos and reply with AI
 */
export async function checkAndReplyToYouTubeComments() {
  console.log('🎬 Starting YouTube comment checking job...');

  try {
    // Get all tracked videos from database
    const videos = useSQLite
      ? await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>).select().from(youtubeVideosTableSQLite)
      : await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>).select().from(youtubeVideosTablePostgres);

    if (videos.length === 0) {
      console.log('   No videos being tracked yet');
      return;
    }

    console.log(`   Checking ${videos.length} video(s) for new comments...`);

    for (const video of videos) {
      console.log(`   📹 Checking video: ${video.title} (${video.videoId})`);

      // Get comments from YouTube
      const commentThreads = await getVideoComments(video.videoId, 50);

      for (const thread of commentThreads) {
        const comment = thread.snippet?.topLevelComment?.snippet;
        if (!comment) continue;

        const commentId = thread.snippet?.topLevelComment?.id;
        if (!commentId) continue;

        // Check if we've already seen this comment
        const existingComment = useSQLite
          ? await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>)
              .select()
              .from(youtubeCommentsTableSQLite)
              .where(eq(youtubeCommentsTableSQLite.commentId, commentId))
          : await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)
              .select()
              .from(youtubeCommentsTablePostgres)
              .where(eq(youtubeCommentsTablePostgres.commentId, commentId));

        if (existingComment.length > 0) {
          // Already processed this comment
          continue;
        }

        console.log(`   💬 New comment from ${comment.authorDisplayName}: "${comment.textDisplay?.substring(0, 50)}..."`);

        // Save comment to database
        if (useSQLite) {
          await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>).insert(youtubeCommentsTableSQLite).values({
            commentId,
            videoId: video.videoId,
            text: comment.textDisplay || '',
            authorDisplayName: comment.authorDisplayName,
            authorChannelId: comment.authorChannelId?.value,
            status: 'pending',
          });
        } else {
          await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>).insert(youtubeCommentsTablePostgres).values({
            commentId,
            videoId: video.videoId,
            text: comment.textDisplay || '',
            authorDisplayName: comment.authorDisplayName,
            authorChannelId: comment.authorChannelId?.value,
            status: 'pending',
          });
        }

        // Generate AI reply (optional - only enable when ready)
        // Uncomment the following lines to enable automatic replies:
        /*
        const replyText = await generateTweet(
          `Generate a friendly reply to this YouTube comment: "${comment.textDisplay}"`
        );

        // Post the reply
        await replyToComment(commentId, replyText);

        // Update database with reply
        if (useSQLite) {
          await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>).update(youtubeCommentsTableSQLite)
            .set({
              replyText,
              repliedAt: new Date(),
              status: 'replied',
            })
            .where(eq(youtubeCommentsTableSQLite.commentId, commentId));
        } else {
          await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>).update(youtubeCommentsTablePostgres)
            .set({
              replyText,
              repliedAt: new Date(),
              status: 'replied',
            })
            .where(eq(youtubeCommentsTablePostgres.commentId, commentId));
        }

        console.log(`   ✅ Replied: "${replyText}"`);
        */

        console.log(`   💾 Saved comment to database (reply disabled by default)`);
      }

      // Update last checked timestamp
      if (useSQLite) {
        await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>)
          .update(youtubeVideosTableSQLite)
          .set({ lastChecked: new Date() })
          .where(eq(youtubeVideosTableSQLite.videoId, video.videoId));
      } else {
        await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)
          .update(youtubeVideosTablePostgres)
          .set({ lastChecked: new Date() })
          .where(eq(youtubeVideosTablePostgres.videoId, video.videoId));
      }
    }

    console.log('✅ YouTube comment checking job completed');
  } catch (error) {
    console.error('❌ Error in YouTube comment checking job:', error);
    throw error;
  }
}

/**
 * Track a new video for comment monitoring
 */
export async function trackYouTubeVideo(videoId: string) {
  console.log(`🎯 Starting to track video: ${videoId}`);

  try {
    // Check if already tracking
    const existing = useSQLite
      ? await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>)
          .select()
          .from(youtubeVideosTableSQLite)
          .where(eq(youtubeVideosTableSQLite.videoId, videoId))
      : await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)
          .select()
          .from(youtubeVideosTablePostgres)
          .where(eq(youtubeVideosTablePostgres.videoId, videoId));

    if (existing.length > 0) {
      console.log('   Already tracking this video');
      return existing[0];
    }

    // Get video details from YouTube
    const videoDetails = await getVideoDetails(videoId);

    if (!videoDetails) {
      throw new Error('Video not found');
    }

    const snippet = videoDetails.snippet;

    // Save to database
    const newVideo = useSQLite
      ? await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>).insert(youtubeVideosTableSQLite).values({
          videoId,
          title: snippet?.title,
          channelId: snippet?.channelId,
          channelTitle: snippet?.channelTitle,
          description: snippet?.description,
          publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : null,
        })
      : await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>).insert(youtubeVideosTablePostgres).values({
          videoId,
          title: snippet?.title,
          channelId: snippet?.channelId,
          channelTitle: snippet?.channelTitle,
          description: snippet?.description,
          publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : null,
        });

    console.log(`✅ Now tracking video: ${snippet?.title}`);
    return newVideo;
  } catch (error) {
    console.error('❌ Error tracking video:', error);
    throw error;
  }
}

/**
 * Fetch and save recent comments for analysis (no replies)
 */
export async function fetchYouTubeCommentsForAnalysis() {
  console.log('📊 Fetching YouTube comments for analysis...');

  try {
    const videos = useSQLite
      ? await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>).select().from(youtubeVideosTableSQLite)
      : await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>).select().from(youtubeVideosTablePostgres);

    if (videos.length === 0) {
      console.log('   No videos being tracked');
      return;
    }

    for (const video of videos) {
      const commentThreads = await getVideoComments(video.videoId, 100);

      let newCount = 0;

      for (const thread of commentThreads) {
        const comment = thread.snippet?.topLevelComment?.snippet;
        if (!comment) continue;

        const commentId = thread.snippet?.topLevelComment?.id;
        if (!commentId) continue;

        const existingComment = useSQLite
          ? await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>)
              .select()
              .from(youtubeCommentsTableSQLite)
              .where(eq(youtubeCommentsTableSQLite.commentId, commentId))
          : await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)
              .select()
              .from(youtubeCommentsTablePostgres)
              .where(eq(youtubeCommentsTablePostgres.commentId, commentId));

        if (existingComment.length === 0) {
          if (useSQLite) {
            await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>).insert(youtubeCommentsTableSQLite).values({
              commentId,
              videoId: video.videoId,
              text: comment.textDisplay || '',
              authorDisplayName: comment.authorDisplayName,
              authorChannelId: comment.authorChannelId?.value,
              status: 'pending',
            });
          } else {
            await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>).insert(youtubeCommentsTablePostgres).values({
              commentId,
              videoId: video.videoId,
              text: comment.textDisplay || '',
              authorDisplayName: comment.authorDisplayName,
              authorChannelId: comment.authorChannelId?.value,
              status: 'pending',
            });
          }
          newCount++;
        }
      }

      console.log(`   📹 ${video.title}: ${newCount} new comments saved`);
    }

    console.log('✅ Comment analysis fetch completed');
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    throw error;
  }
}
