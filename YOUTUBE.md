# YouTube Integration Documentation

## Overview

Social Cat integrates with the **YouTube Data API v3** to enable automated comment monitoring, replying, and video tracking. The integration uses the official `googleapis` package and includes full database support for tracking videos and comments.

## Features

- ✅ Monitor comments on your videos
- ✅ Reply to comments automatically with AI
- ✅ Track multiple videos
- ✅ Store comments for analysis
- ✅ Search videos and channels
- ✅ Get video details and statistics
- ✅ Scheduled jobs for automation
- ✅ Manual API triggers

## Quick Start

### 1. Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External (for testing) or Internal (for organization)
   - App name: Social Cat
   - Add your email
   - Add scopes: `https://www.googleapis.com/auth/youtube.force-ssl`
4. Application type: "Web application"
5. Add authorized redirect URIs:
   - `http://localhost:3003/api/youtube/callback`
   - (Add production URL when deploying)
6. Click "Create"
7. Copy Client ID and Client Secret

### 3. Configure Environment Variables

Edit `.env.local`:

```env
# YouTube Data API v3 Configuration
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REFRESH_TOKEN=your_refresh_token_here
YOUTUBE_REDIRECT_URI=http://localhost:3003/api/youtube/callback
```

### 4. Get Refresh Token

Run this script to generate a refresh token:

```typescript
// scripts/get-youtube-token.ts
import { getYouTubeAuthUrl, getTokensFromCode } from '@/lib/youtube';

console.log('Visit this URL to authorize:');
console.log(getYouTubeAuthUrl());
console.log('\nAfter authorizing, you\'ll get a code. Run:');
console.log('node scripts/exchange-token.ts <code>');
```

Then exchange the code:

```typescript
// scripts/exchange-token.ts
import { getTokensFromCode } from '@/lib/youtube';

const code = process.argv[2];
const tokens = await getTokensFromCode(code);
console.log('Add to .env.local:');
console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
```

**Or use this quick method:**

1. Visit: `http://localhost:3003/api/youtube/auth/start`
2. Authorize your app
3. Copy the refresh token from the response
4. Add it to `.env.local`

### 5. Test the Connection

```bash
# Test by fetching video details
curl http://localhost:3003/api/youtube/test
```

## Database Schema

### `youtube_videos` Table

Stores videos being tracked:

- `id` - Auto-incrementing ID
- `videoId` - YouTube video ID (unique)
- `title` - Video title
- `channelId` - Channel ID
- `channelTitle` - Channel name
- `description` - Video description
- `publishedAt` - Publication date
- `lastChecked` - Last comment check timestamp
- `createdAt` - Record creation date

### `youtube_comments` Table

Stores comments from tracked videos:

- `id` - Auto-incrementing ID
- `commentId` - YouTube comment ID (unique)
- `videoId` - Associated video ID
- `parentId` - Parent comment ID (for replies)
- `text` - Comment text
- `authorDisplayName` - Comment author
- `authorChannelId` - Author's channel ID
- `replyText` - Your reply to this comment
- `repliedAt` - Reply timestamp
- `status` - Status (pending, replied, ignored)
- `createdAt` - Record creation date

## API Functions

All functions are available in `src/lib/youtube.ts`:

### Get Video Comments

```typescript
import { getVideoComments } from '@/lib/youtube';

const comments = await getVideoComments('VIDEO_ID', 100);

// Returns array of comment threads
comments.forEach((thread) => {
  const comment = thread.snippet?.topLevelComment?.snippet;
  console.log(`${comment?.authorDisplayName}: ${comment?.textDisplay}`);
});
```

### Reply to Comment

```typescript
import { replyToComment } from '@/lib/youtube';

await replyToComment('COMMENT_ID', 'Thanks for your comment!');
```

### Post Top-Level Comment

```typescript
import { postComment } from '@/lib/youtube';

await postComment('VIDEO_ID', 'Great video!', 'YOUR_CHANNEL_ID');
```

### Get Video Details

```typescript
import { getVideoDetails } from '@/lib/youtube';

const video = await getVideoDetails('VIDEO_ID');

console.log(video.snippet?.title);
console.log(video.statistics?.viewCount);
```

### Search Videos

```typescript
import { searchVideos } from '@/lib/youtube';

const results = await searchVideos('AI tutorial', 10);

results.forEach((video) => {
  console.log(video.snippet?.title);
});
```

### Get Channel Info

```typescript
import { getChannelDetails } from '@/lib/youtube';

// Get your own channel
const myChannel = await getChannelDetails();

// Get specific channel
const channel = await getChannelDetails('CHANNEL_ID');
```

### Delete Comment

```typescript
import { deleteComment } from '@/lib/youtube';

await deleteComment('COMMENT_ID');
```

### Mark as Spam

```typescript
import { markCommentAsSpam } from '@/lib/youtube';

await markCommentAsSpam('COMMENT_ID');
```

### Moderate Comment

```typescript
import { setCommentModerationStatus } from '@/lib/youtube';

await setCommentModerationStatus('COMMENT_ID', 'published');
// Options: 'heldForReview', 'published', 'rejected'
```

## Scheduled Jobs

### Track and Monitor Comments

**Job:** `check-youtube-comments`
**Schedule:** Every 30 minutes
**Function:** `checkAndReplyToYouTubeComments()`

Checks all tracked videos for new comments and optionally replies with AI-generated responses.

**Enable in `src/lib/jobs/index.ts`:**

```typescript
{
  name: 'check-youtube-comments',
  schedule: '*/30 * * * *',
  task: checkAndReplyToYouTubeComments,
  enabled: true, // Change to true
}
```

**Enable AI Replies:**

Edit `src/lib/jobs/youtube.ts` and uncomment the AI reply section:

```typescript
// Uncomment this section to enable automatic replies:
const replyText = await generateTweet(
  `Generate a friendly reply to this YouTube comment: "${comment.textDisplay}"`
);

await replyToComment(commentId, replyText);
```

### Fetch Comments for Analysis

**Job:** `fetch-youtube-comments-analysis`
**Schedule:** Every 6 hours
**Function:** `fetchYouTubeCommentsForAnalysis()`

Fetches and stores comments without replying (for analysis purposes).

## Manual Usage

### Track a Video

```typescript
import { trackYouTubeVideo } from '@/lib/jobs/youtube';

await trackYouTubeVideo('VIDEO_ID');
```

Or via API:

```bash
curl -X POST "http://localhost:3003/api/youtube/track?videoId=VIDEO_ID"
```

### Trigger Job Manually

```bash
# Check comments
curl -X POST "http://localhost:3003/api/jobs/trigger?job=check-youtube-comments"

# Fetch for analysis
curl -X POST "http://localhost:3003/api/jobs/trigger?job=fetch-youtube-comments-analysis"
```

## Usage Examples

### Example 1: Monitor Your Latest Video

```typescript
// Track your latest upload
const channel = await getChannelDetails();
const videoId = 'YOUR_VIDEO_ID';

await trackYouTubeVideo(videoId);

// Comments will be checked automatically every 30 minutes (if job enabled)
```

### Example 2: Reply to Specific Comments

```typescript
import { db } from '@/lib/db';
import { youtubeCommentsTableSQLite } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// Get pending comments
const pendingComments = await db
  .select()
  .from(youtubeCommentsTableSQLite)
  .where(eq(youtubeCommentsTableSQLite.status, 'pending'));

// Reply to each
for (const comment of pendingComments) {
  const reply = await generateTweet(
    `Reply to: ${comment.text}`
  );

  await replyToComment(comment.commentId, reply);

  // Update status
  await db
    .update(youtubeCommentsTableSQLite)
    .set({
      replyText: reply,
      repliedAt: new Date(),
      status: 'replied',
    })
    .where(eq(youtubeCommentsTableSQLite.id, comment.id));
}
```

### Example 3: Search and Comment

```typescript
// Search for videos about your topic
const videos = await searchVideos('Next.js tutorial', 5);

for (const video of videos) {
  const videoId = video.id?.videoId;
  if (!videoId) continue;

  // Get video details
  const details = await getVideoDetails(videoId);

  // Post a helpful comment
  await postComment(
    videoId,
    'Great tutorial! Thanks for sharing.',
    'YOUR_CHANNEL_ID'
  );
}
```

## API Routes

Create these routes for easier management:

### Track Video Endpoint

```typescript
// src/app/api/youtube/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { trackYouTubeVideo } from '@/lib/jobs/youtube';

export async function POST(req: NextRequest) {
  const { videoId } = await req.json();

  await trackYouTubeVideo(videoId);

  return NextResponse.json({ success: true });
}
```

### Get Tracked Videos

```typescript
// src/app/api/youtube/videos/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { youtubeVideosTableSQLite } from '@/lib/schema';

export async function GET() {
  const videos = await db.select().from(youtubeVideosTableSQLite);

  return NextResponse.json({ videos });
}
```

## Railway Deployment

### Environment Variables

Add these to Railway:

```
YOUTUBE_CLIENT_ID=<your_client_id>
YOUTUBE_CLIENT_SECRET=<your_client_secret>
YOUTUBE_REFRESH_TOKEN=<your_refresh_token>
YOUTUBE_REDIRECT_URI=https://your-app.railway.app/api/youtube/callback
```

### Update OAuth Redirect URIs

Add production callback URL in Google Cloud Console:
- `https://your-app.railway.app/api/youtube/callback`

### Database Migration

```bash
# After deploying, run migration
npm run db:push
```

## Rate Limits

YouTube Data API v3 has quota limits:

- **Default quota:** 10,000 units/day
- **Read operations:** 1-50 units
- **Write operations:** 50-400 units

**Monitor your usage:**
- Check quota in Google Cloud Console
- Enable YouTube Data API v3 billing alerts
- Request quota increase if needed

**Best practices:**
- Don't poll too frequently (30 min is reasonable)
- Batch operations when possible
- Cache video details

## Security Best Practices

1. **Never commit credentials** - Already in `.gitignore`
2. **Use refresh tokens** - Access tokens expire, refresh tokens don't
3. **Limit API scopes** - Only request needed permissions
4. **Rate limit your requests** - Respect YouTube's limits
5. **Validate input** - Sanitize video IDs and comments
6. **Monitor usage** - Watch for suspicious activity

## Troubleshooting

### "Invalid Credentials" Error

- Check `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`
- Verify YouTube Data API v3 is enabled
- Ensure OAuth consent screen is configured

### "Refresh Token Invalid"

- Refresh token may have expired (rare)
- Re-authorize the app to get new refresh token
- Check if user revoked access

### "Quota Exceeded"

- You've hit the daily API quota (10,000 units)
- Wait until midnight PT for reset
- Request quota increase in Google Cloud Console

### Comments Not Appearing

- Check video has comments enabled
- Verify you have permission to view comments
- Some videos may have comments disabled

### Can't Reply to Comments

- Ensure you're using correct comment ID
- Check if replies are disabled on that video
- Verify you have proper permissions

## Advanced Features

### Comment Sentiment Analysis

```typescript
import { getVideoComments } from '@/lib/youtube';
import { openai } from '@/lib/openai';

const comments = await getVideoComments('VIDEO_ID');

for (const thread of comments) {
  const comment = thread.snippet?.topLevelComment?.snippet?.textDisplay;

  const analysis = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Analyze sentiment of: "${comment}"`
    }]
  });

  console.log(analysis.choices[0]?.message?.content);
}
```

### Auto-Reply Based on Keywords

```typescript
const keywords = {
  'tutorial': 'Thanks for watching! Check out more tutorials on our channel.',
  'help': 'I\'d be happy to help! Can you provide more details?',
  'great': 'Thank you so much! Glad you enjoyed it! 🎉',
};

for (const thread of comments) {
  const comment = thread.snippet?.topLevelComment?.snippet?.textDisplay || '';
  const commentId = thread.snippet?.topLevelComment?.id;

  for (const [keyword, reply] of Object.entries(keywords)) {
    if (comment.toLowerCase().includes(keyword)) {
      await replyToComment(commentId, reply);
      break;
    }
  }
}
```

## Resources

- **YouTube Data API Docs**: https://developers.google.com/youtube/v3
- **Google Cloud Console**: https://console.cloud.google.com
- **API Explorer**: https://developers.google.com/youtube/v3/docs
- **googleapis Package**: https://www.npmjs.com/package/googleapis
- **Quota Calculator**: https://developers.google.com/youtube/v3/determine_quota_cost

## Summary

Your YouTube integration is ready with:

- ✅ Full API client configured
- ✅ Helper functions for all operations
- ✅ Database tables for tracking
- ✅ Scheduled jobs for automation
- ✅ Manual triggers via API
- ✅ AI-powered reply generation

To get started:
1. Set up Google Cloud project
2. Get OAuth credentials
3. Generate refresh token
4. Add to `.env.local`
5. Track a video: `trackYouTubeVideo('VIDEO_ID')`
6. Enable scheduled jobs if desired

The integration is disabled by default for safety. Enable features as needed!
