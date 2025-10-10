# Scheduling System Documentation

## Overview

Social Cat uses `node-cron` for scheduling automated tasks. Jobs run automatically in the background and can be configured with cron expressions.

## Architecture

```
instrumentation.ts        # Auto-starts scheduler on server start
└─ src/lib/jobs/
   ├── index.ts          # Job registry and initialization
   ├── example.ts        # Example jobs
   └── twitter-ai.ts     # AI + Twitter integration jobs
```

## Quick Start

### 1. Define a New Job

Create a new function in `src/lib/jobs/` or add to an existing file:

```typescript
export async function myCustomJob() {
  console.log('🚀 Running my custom job');

  // Your logic here
  // - Generate tweets with AI
  // - Post to Twitter
  // - Update database
  // - Send notifications
}
```

### 2. Register the Job

Add your job to `src/lib/jobs/index.ts`:

```typescript
import { myCustomJob } from './my-jobs';

const jobs: ScheduledJob[] = [
  {
    name: 'my-custom-job',
    schedule: '*/15 * * * *', // Every 15 minutes
    task: myCustomJob,
    enabled: true, // Set to false to disable
  },
  // ... other jobs
];
```

### 3. Start the Scheduler

The scheduler starts automatically when the server starts (via `instrumentation.ts`).

For development, restart the dev server:
```bash
npm run dev
```

## Cron Expression Guide

Format: `minute hour day month weekday`

```
* * * * *
┬ ┬ ┬ ┬ ┬
│ │ │ │ └─ day of week (0-7, 0 or 7 is Sunday)
│ │ │ └─── month (1-12)
│ │ └───── day of month (1-31)
│ └─────── hour (0-23)
└───────── minute (0-59)
```

### Common Patterns

| Schedule | Description |
|----------|-------------|
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour (at minute 0) |
| `0 */2 * * *` | Every 2 hours |
| `0 */4 * * *` | Every 4 hours |
| `0 0 * * *` | Every day at midnight |
| `0 9 * * *` | Every day at 9:00 AM |
| `0 9 * * 1-5` | Every weekday at 9:00 AM |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 0 1 * *` | First day of every month |

### Examples

```typescript
// Every 5 minutes
{ schedule: '*/5 * * * *', task: myJob }

// Every hour at minute 30
{ schedule: '30 * * * *', task: myJob }

// Every day at 9:30 AM
{ schedule: '30 9 * * *', task: myJob }

// Every Monday at 10:00 AM
{ schedule: '0 10 * * 1', task: myJob }

// First day of every month at midnight
{ schedule: '0 0 1 * *', task: myJob }
```

## Built-in Jobs

### Example Jobs (Disabled by Default)

Located in `src/lib/jobs/example.ts`:

1. **example-every-5-minutes** - Runs every 5 minutes
2. **example-hourly** - Runs every hour
3. **example-daily** - Runs every day at midnight

### AI + Twitter Jobs (Disabled by Default)

Located in `src/lib/jobs/twitter-ai.ts`:

1. **generate-scheduled-content** (`0 */4 * * *`)
   - Generates tweet drafts using OpenAI
   - Saves to database as drafts
   - Runs every 4 hours

2. **analyze-trends** (`0 8 * * *`)
   - Placeholder for trend analysis
   - Runs daily at 8:00 AM

3. **ai-tweet-generation** (`0 10 * * *`)
   - Generates AND posts tweets to Twitter
   - ⚠️ **WARNING**: Actually posts to Twitter when enabled!
   - Runs daily at 10:00 AM

## Enabling/Disabling Jobs

Edit `src/lib/jobs/index.ts`:

```typescript
const jobs: ScheduledJob[] = [
  {
    name: 'my-job',
    schedule: '0 * * * *',
    task: myTask,
    enabled: true, // Change to false to disable
  },
];
```

Restart the server after making changes.

## Manual Job Triggering

### Via API Route

Trigger any job manually without waiting for the schedule:

```bash
# List available jobs
curl http://localhost:3003/api/jobs/trigger

# Trigger a specific job
curl -X POST "http://localhost:3003/api/jobs/trigger?job=generate-scheduled-content"
```

Available endpoints:
- `GET /api/jobs/trigger` - List available jobs
- `POST /api/jobs/trigger?job=<job-name>` - Trigger a job manually
- `GET /api/scheduler` - Get scheduler status

### Via Code

```typescript
import { generateScheduledContent } from '@/lib/jobs';

// Call the job function directly
await generateScheduledContent();
```

## Scheduler Management

### Check Status

```bash
curl http://localhost:3003/api/scheduler
```

Response:
```json
{
  "isRunning": true,
  "jobCount": 3,
  "jobs": ["job-1", "job-2", "job-3"],
  "message": "Scheduler is running"
}
```

### Programmatic Control

```typescript
import { scheduler } from '@/lib/scheduler';

// Check status
scheduler.isRunning(); // boolean

// Get registered jobs
scheduler.getJobs(); // string[]

// Stop all jobs
scheduler.stop();

// Start all jobs
scheduler.start();

// Remove a specific job
scheduler.unregister('job-name');
```

## Railway Deployment

The scheduler works automatically on Railway:

1. **No additional setup required** - `instrumentation.ts` runs on server start
2. **Jobs run in the background** - No need for external cron services
3. **Logs visible in Railway** - All job outputs appear in Railway logs

### Important Notes for Production:

- Jobs only run when the server is running
- Railway doesn't sleep your app if you're on a paid plan
- For mission-critical schedules, consider Railway's cron jobs as backup
- All console.log output appears in Railway logs

## Best Practices

### 1. Keep Jobs Idempotent

Jobs should handle being run multiple times safely:

```typescript
export async function myJob() {
  // Check if work already done
  const existing = await db.select()
    .from(tasks)
    .where(eq(tasks.date, today));

  if (existing.length > 0) {
    console.log('Already processed today');
    return;
  }

  // Do work
}
```

### 2. Handle Errors Gracefully

```typescript
export async function myJob() {
  try {
    // Your logic
    await someAsyncOperation();
  } catch (error) {
    console.error('Job failed:', error);
    // Optionally: save error to database, send alert, etc.
    // Don't throw - let the job complete and retry next time
  }
}
```

### 3. Add Logging

```typescript
export async function myJob() {
  console.log('🚀 Starting job...');

  const startTime = Date.now();

  // Do work
  await myWork();

  const duration = Date.now() - startTime;
  console.log(`✅ Job completed in ${duration}ms`);
}
```

### 4. Test Before Enabling

Always test jobs manually before enabling them:

```bash
# Test the job via API
curl -X POST "http://localhost:3003/api/jobs/trigger?job=my-job"

# Check logs for errors
# Then enable in jobs/index.ts
```

### 5. Be Careful with Twitter Posting

The `ai-tweet-generation` job actually posts to Twitter. Before enabling:

1. Test with `generate-scheduled-content` first (generates drafts only)
2. Review generated content in database
3. Add content filters/approval process if needed
4. Consider rate limits (Twitter API limits apply)

## Database Integration Example

```typescript
import { db, useSQLite } from '../db';
import { tweetsTableSQLite, tweetsTablePostgres } from '../schema';

export async function myJob() {
  const tweetsTable = useSQLite ? tweetsTableSQLite : tweetsTablePostgres;

  // Insert
  await db.insert(tweetsTable).values({
    content: 'Generated content',
    status: 'draft',
  });

  // Query
  const drafts = await db.select()
    .from(tweetsTable)
    .where(eq(tweetsTable.status, 'draft'));

  // Update
  await db.update(tweetsTable)
    .set({ status: 'posted' })
    .where(eq(tweetsTable.id, 1));
}
```

## Troubleshooting

### Jobs Not Running

1. Check if instrumentation is enabled in `next.config.ts`:
   ```typescript
   experimental: {
     instrumentationHook: true,
   }
   ```

2. Check if jobs are enabled in `src/lib/jobs/index.ts`:
   ```typescript
   enabled: true // not false
   ```

3. Verify cron expression is valid:
   ```bash
   # The scheduler logs errors for invalid cron expressions
   # Check your terminal/Railway logs
   ```

4. Restart the dev server/redeploy to Railway

### Jobs Running Multiple Times

- This usually happens during hot reload in development
- Not an issue in production
- If it persists, check your cron expression

### Memory Leaks

- Ensure all database connections are properly closed
- Avoid creating new connections in jobs
- Use the singleton `db` instance

### API Keys Not Working

- Check `.env.local` has all required keys
- Verify keys are valid and have correct permissions
- For Railway, check environment variables in dashboard

## Advanced: Custom Scheduler Instance

If you need multiple schedulers:

```typescript
import { Scheduler } from '@/lib/scheduler';

const myScheduler = new Scheduler();

myScheduler.register({
  name: 'custom-job',
  schedule: '*/5 * * * *',
  task: async () => {
    console.log('Custom scheduler job');
  },
});

myScheduler.start();
```

## Monitoring

### Log Everything

All jobs should log:
- Start time
- Completion time
- Any errors
- Important metrics

### Railway Logs

View logs in Railway dashboard:
1. Open your project
2. Click on the service
3. Go to "Logs" tab
4. Filter by job names

### Add Metrics

```typescript
let jobRunCount = 0;
let lastRunTime: Date | null = null;

export async function myJob() {
  jobRunCount++;
  lastRunTime = new Date();

  console.log(`Run #${jobRunCount} at ${lastRunTime.toISOString()}`);

  // Do work
}

// Export for monitoring
export function getJobStats() {
  return { jobRunCount, lastRunTime };
}
```

## Example: Complete Tweet Workflow

```typescript
// src/lib/jobs/tweet-workflow.ts
import { generateTweet } from '../openai';
import { postTweet } from '../twitter';
import { db, useSQLite } from '../db';
import { tweetsTableSQLite, tweetsTablePostgres } from '../schema';
import { eq } from 'drizzle-orm';

export async function generateDrafts() {
  console.log('📝 Generating tweet drafts...');

  const prompts = [
    'Write about latest AI trends',
    'Share a productivity tip',
    'Ask an engaging question about tech',
  ];

  for (const prompt of prompts) {
    const content = await generateTweet(prompt);

    await db.insert(tweetsTable).values({
      content,
      status: 'draft',
    });
  }

  console.log(`✅ Generated ${prompts.length} drafts`);
}

export async function postApprovedTweets() {
  console.log('📤 Posting approved tweets...');

  const tweetsTable = useSQLite ? tweetsTableSQLite : tweetsTablePostgres;

  // Get tweets marked as 'approved'
  const approved = await db.select()
    .from(tweetsTable)
    .where(eq(tweetsTable.status, 'approved'));

  for (const tweet of approved) {
    try {
      const result = await postTweet(tweet.content);

      await db.update(tweetsTable)
        .set({
          tweetId: result.id,
          status: 'posted',
          postedAt: new Date(),
        })
        .where(eq(tweetsTable.id, tweet.id));

      console.log(`✅ Posted tweet ${tweet.id}`);
    } catch (error) {
      console.error(`❌ Failed to post tweet ${tweet.id}:`, error);

      await db.update(tweetsTable)
        .set({ status: 'failed' })
        .where(eq(tweetsTable.id, tweet.id));
    }
  }
}

// In jobs/index.ts:
const jobs: ScheduledJob[] = [
  {
    name: 'generate-drafts',
    schedule: '0 */6 * * *', // Every 6 hours
    task: generateDrafts,
    enabled: true,
  },
  {
    name: 'post-approved',
    schedule: '0 9,15,21 * * *', // 9 AM, 3 PM, 9 PM
    task: postApprovedTweets,
    enabled: true,
  },
];
```

## Summary

- **Create** jobs in `src/lib/jobs/`
- **Register** jobs in `src/lib/jobs/index.ts`
- **Enable** by setting `enabled: true`
- **Test** via API: `POST /api/jobs/trigger?job=<name>`
- **Monitor** via Railway logs
- **Deploy** to Railway (works automatically)

For questions or issues, check the logs first - all job output is logged with emoji prefixes for easy filtering.
