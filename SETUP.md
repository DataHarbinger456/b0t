# Social Cat - Setup Guide

## Overview

Social Cat is a Next.js application that integrates with OpenAI and Twitter/X APIs. It uses SQLite for local development and PostgreSQL for production (Railway deployment).

## Prerequisites

- Node.js 20+ installed
- npm installed
- OpenAI API key
- Twitter/X API credentials (API Key, API Secret, Access Token, Access Secret)

## Initial Setup

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` to `.env.local` and fill in your API credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```env
# Database Configuration
# Leave empty for SQLite (local development)
DATABASE_URL=

# OpenAI API Configuration
OPENAI_API_KEY=your_actual_openai_api_key

# Twitter/X API Configuration
TWITTER_API_KEY=your_actual_twitter_api_key
TWITTER_API_SECRET=your_actual_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_actual_twitter_access_token
TWITTER_ACCESS_SECRET=your_actual_twitter_access_secret
TWITTER_BEARER_TOKEN=your_actual_twitter_bearer_token

# Environment
NODE_ENV=development
```

### 3. Database Setup

The database is already initialized with SQLite for local development. The `local.db` file has been created.

If you need to reset the database or apply schema changes:

```bash
npm run db:push
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at http://localhost:3003 (or another port if 3003 is in use).

## Database Commands

- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:push` - Push schema changes directly to database (good for dev)
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Drizzle Studio to view/edit database

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
└── lib/                   # Utilities and configurations
    ├── db.ts             # Database configuration
    ├── schema.ts         # Database schema
    ├── openai.ts         # OpenAI client and helpers
    └── twitter.ts        # Twitter/X client and helpers
```

## Database Schema

Current tables:

### `tweets`
- `id` - Auto-incrementing primary key
- `content` - Tweet content text
- `tweetId` - Twitter/X tweet ID (after posting)
- `status` - Status (draft, posted, failed)
- `createdAt` - Creation timestamp
- `postedAt` - Posted timestamp

### `ai_responses`
- `id` - Auto-incrementing primary key
- `prompt` - The prompt sent to OpenAI
- `response` - The response from OpenAI
- `model` - The model used
- `createdAt` - Creation timestamp

## Railway Deployment

### Prerequisites

1. Create a Railway account at https://railway.app
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

### Deploy Steps

1. Create a new Railway project:
```bash
railway init
```

2. Add PostgreSQL database:
- Go to Railway dashboard
- Click "New" → "Database" → "PostgreSQL"
- Railway will automatically set the `DATABASE_URL` environment variable

3. Set environment variables in Railway dashboard:
- `OPENAI_API_KEY`
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `TWITTER_BEARER_TOKEN`
- `NODE_ENV=production`

4. Deploy:
```bash
railway up
```

5. Push database schema to production:
```bash
# Make sure DATABASE_URL is set to your Railway PostgreSQL URL
npm run db:push
```

## API Integration Examples

### OpenAI

```typescript
import { generateTweet } from '@/lib/openai';

const tweet = await generateTweet('Write a tweet about AI');
```

### Twitter/X

```typescript
import { postTweet } from '@/lib/twitter';

const result = await postTweet('Hello from Social Cat!');
```

## Environment Detection

The app automatically detects the environment:
- **Local Development**: Uses SQLite (`local.db`) when `DATABASE_URL` is not set
- **Production**: Uses PostgreSQL when `DATABASE_URL` is set (Railway)

## Troubleshooting

### Database Issues

If you encounter database issues:

1. Delete `local.db` file
2. Run `npm run db:push` to recreate tables

### API Credential Issues

Make sure all API credentials are correctly set in `.env.local` and have the necessary permissions.

### Dev Server Issues

If the dev server doesn't start:
1. Check if the port is in use
2. Check for syntax errors in code
3. Clear `.next` directory: `rm -rf .next`
4. Restart the dev server

## Security Notes

- Never commit `.env.local` to git (it's already in `.gitignore`)
- Keep your API keys secure
- Rotate API keys regularly
- Use environment variables for all sensitive data
