# Happy News

A monorepo for the Happy News application.

## Structure

- `app/` - Expo React Native application (TypeScript)
- `supabase/` - Supabase functions and configuration
- `sql/` - Database schema and migrations

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Supabase CLI (for Supabase functions)

### Installation

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Setup the Expo app:
   ```bash
   cd app
   npm install
   ```

3. Configure environment variables:
   ```bash
   cd app
   cp .env.example .env
   ```
   
   Then edit `app/.env` and add your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   You can find these values in your Supabase project settings:
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to Settings → API
   - Copy the "Project URL" and "anon public" key

4. Setup Supabase Edge Functions:
   ```bash
   # Install Supabase CLI (if not already installed)
   # macOS: brew install supabase/tap/supabase
   # Or visit: https://github.com/supabase/cli
   
   # Login to Supabase
   supabase login
   
   # Link to your project (optional, for local development)
   # supabase link --project-ref your-project-ref
   ```

### Running the App

```bash
cd app
npm start
# or
npx expo start
```

### Environment Variables

The Expo app uses environment variables for Supabase configuration. These are loaded from:
- `app/.env` file (create from `app/.env.example`)
- Or via `EXPO_PUBLIC_*` prefix which makes them available at build time

**Important:** 
- Variables prefixed with `EXPO_PUBLIC_` are embedded in your app bundle and are publicly accessible
- Never commit `.env` files with real credentials to version control
- The `.env` file is already in `.gitignore`

### Database

Database schema is located in `sql/schema.sql`.

#### Setting up the Database Schema

To create the database tables in your Supabase project:

1. **Open Supabase SQL Editor:**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to the **SQL Editor** in the left sidebar

2. **Run the schema:**
   - Click **New query**
   - Copy the contents of `sql/schema.sql`
   - Paste it into the SQL Editor
   - Click **Run** (or press `Cmd/Ctrl + Enter`)

3. **Verify tables were created:**
   - Navigate to **Table Editor** in the left sidebar
   - You should see three tables: `articles`, `article_scores`, and `daily_feed`

The schema includes:
- **articles**: Stores news articles with metadata
- **article_scores**: Stores sentiment and quality scores for articles
- **daily_feed**: Stores the curated daily feed with ranking
- **Indexes**: Optimized for querying today's feed and sorting by score

### Supabase Edge Functions

Edge Functions are serverless functions that run on Supabase's edge network. The `ingest_and_score` function handles news ingestion and scoring.

#### Prerequisites

- [Supabase CLI](https://github.com/supabase/cli) installed
- Authenticated with Supabase (`supabase login`)

**Note:** Local development requires Docker Desktop. If you don't have Docker installed, you can skip local testing and deploy directly to production (see "Deploying the Function" below).

#### Local Development (Requires Docker Desktop)

If you have Docker Desktop installed and running:

1. **Start local Supabase (optional, for full local testing):**
   ```bash
   supabase start
   ```

2. **Serve the function locally:**
   ```bash
   # From the project root
   supabase functions serve ingest_and_score
   
   # Or serve all functions
   supabase functions serve
   ```

3. **Test the function:**
   ```bash
   # The function will be available at:
   # http://localhost:54321/functions/v1/ingest_and_score
   
   curl http://localhost:54321/functions/v1/ingest_and_score
   ```

**Don't have Docker?** No problem! You can deploy directly to production and test there (see deployment section below).

#### Environment Variables

Edge Functions require environment variables to be set in Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (found in Settings → API)
   - `NEWS_API_KEY` - Your News API key (get one free at https://newsapi.org/)
   - `OPENAI_API_KEY` - Your OpenAI API key (get one at https://platform.openai.com/api-keys)

   Or use the CLI:
   ```bash
   supabase secrets set SUPABASE_URL=your_project_url --project-ref your-project-ref
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key --project-ref your-project-ref
   supabase secrets set NEWS_API_KEY=your_news_api_key --project-ref your-project-ref
   supabase secrets set OPENAI_API_KEY=your_openai_api_key --project-ref your-project-ref
   ```

**Getting API Keys:**
- **News API Key:** Visit https://newsapi.org/register
  - Sign up for a free account (100 requests/day on free tier)
  - Copy your API key from the dashboard
- **OpenAI API Key:** Visit https://platform.openai.com/api-keys
  - Sign up or log in to your OpenAI account
  - Create a new API key
  - Copy and store it securely (you won't be able to see it again)

#### Deploying the Function (No Docker Required)

You can deploy and test the function directly in production without Docker:

1. **Link your project (first time only):**
   ```bash
   # Get your project ref from the Supabase dashboard URL:
   # https://app.supabase.com/project/your-project-ref
   supabase link --project-ref your-project-ref
   ```

2. **Set environment variables (secrets):**
   
   **Option A: Via Supabase Dashboard (Recommended)**
   - Go to **Project Settings** → **Edge Functions** → **Secrets**
   - Add:
     - `SUPABASE_URL` = Your project URL (from Settings → API)
     - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (from Settings → API)
     - `NEWS_API_KEY` = Your News API key (from https://newsapi.org/)
     - `OPENAI_API_KEY` = Your OpenAI API key (from https://platform.openai.com/api-keys)
   
   **Option B: Via CLI:**
   ```bash
   supabase secrets set SUPABASE_URL=your_project_url --project-ref your-project-ref
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key --project-ref your-project-ref
   supabase secrets set NEWS_API_KEY=your_news_api_key --project-ref your-project-ref
   ```

3. **Deploy the function:**
   ```bash
   # From the project root
   supabase functions deploy ingest_and_score --project-ref your-project-ref
   ```

4. **Test the deployed function:**
   ```bash
   # Get your anon key from Settings → API
   # IMPORTANT: You MUST include the Authorization header
   curl -i "https://your-project-ref.supabase.co/functions/v1/ingest_and_score" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```
   
   **Common Error:** If you get `{"code":401,"message":"Missing authorization header"}`, you forgot to include the `-H "Authorization: Bearer ..."` header.
   
   **Example with actual values:**
   ```bash
   curl -i "https://ppewvxkyqyoiprpnphje.supabase.co/functions/v1/ingest_and_score" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```
   
   **Note:** Replace `YOUR_ANON_KEY` with your actual anon key from Supabase Dashboard → Settings → API

#### Function Details

- **Location:** `supabase/functions/ingest_and_score/index.ts`
- **Current Status:** Fetches news from News API, ingests into database, scores with OpenAI, and builds daily feed
- **Health Endpoint:** The function always returns a status response, even when no new articles are found, making it suitable as a health check endpoint
- **Features:**
  - Fetches news from News API (top headlines, technology, science)
  - Source whitelist filtering (reputable sources only)
  - 48-hour time filter (only recent articles)
  - Upserts articles by `article_url` (unique constraint)
  - Scores articles with OpenAI GPT-4o (max 50 per run)
  - Stores scores in `article_scores` table
  - Builds daily feed for today (up to 12 articles, ranked by score)
  - Enforces diversity (max 2 articles per source)
  - Replaces existing daily feed for today to keep it fresh
  - Returns ingestion, scoring, and feed statistics
- **Uses:** 
  - Service role key for full database access (server-side only)
  - News API key for fetching news articles
- **Logging:** Comprehensive JSON logging for debugging

**Important:** 
- The service role key has full database access. Never expose it in client-side code or commit it to version control.
- The News API key should also be kept secret and stored as an environment variable.

#### Function Response

The function returns a JSON response with ingestion statistics:

```json
{
  "status": "ok",
  "message": "News ingestion, scoring, and feed building completed",
  "requestId": "...",
  "timestamp": "2024-01-15T...",
  "stats": {
    "fetched": 150,
    "filtered": 45,
    "inserted": 80,
    "updated": 25,
    "scored_success": 48,
    "scored_failed": 2,
    "feed_count": 12,
    "feed_sample_titles": [
      "Breakthrough in renewable energy...",
      "New study shows positive trends...",
      "..."
    ]
  }
}
```

- **fetched**: Total articles fetched from News API
- **filtered**: Articles filtered out (not whitelisted or too old)
- **inserted**: New articles added to database
- **updated**: Existing articles updated (by article_url)
- **scored_success**: Articles successfully scored with OpenAI
- **scored_failed**: Articles that failed to score (logged but don't fail the run)
- **feed_count**: Number of articles in today's daily feed (0-12)
- **feed_sample_titles**: Sample of up to 5 article titles from the feed

#### Scheduling the Function

The function should run automatically on a schedule to keep your feed fresh. Supabase supports cron-based scheduled triggers.

**Schedule: 4 runs per day**
- Recommended times: 6am, 11am, 4pm, 9pm (local time)
- This ensures fresh content throughout the day

**Setting up Scheduled Triggers:**

1. **Go to Supabase Dashboard:**
   - Navigate to **Database** → **Cron Jobs** (or **Database** → **Extensions** → enable `pg_cron` if needed)
   - Or use the SQL Editor to create cron jobs

2. **Create cron jobs via SQL Editor:**

   ```sql
   -- Enable required extensions
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   -- Note: Supabase may use pg_net or http extension - check your Supabase version
   -- For newer Supabase projects, you might use pg_net instead

   -- Schedule function runs (4 times per day)
   -- Note: Times are in UTC. Adjust based on your timezone.
   -- 
   -- America/Los_Angeles timezone conversion:
   -- PST (Pacific Standard Time, Nov-Mar): UTC-8
   -- PDT (Pacific Daylight Time, Mar-Nov): UTC-7
   -- 
   -- For 6am, 11am, 4pm, 9pm in Los Angeles:
   -- - 6am PST = 14:00 UTC, 6am PDT = 13:00 UTC
   -- - 11am PST = 19:00 UTC, 11am PDT = 18:00 UTC  
   -- - 4pm PST = 00:00 UTC (next day), 4pm PDT = 23:00 UTC
   -- - 9pm PST = 05:00 UTC (next day), 9pm PDT = 04:00 UTC
   --
   -- Example below uses UTC times for PDT (daylight saving time)
   -- You may need to adjust these twice a year for DST changes
   -- Or use a timezone-aware scheduling solution

   -- Method 1: Using pg_net (newer Supabase projects)
   -- If pg_net is available, use this:
   SELECT cron.schedule(
     'ingest-6am',
     '0 13 * * *',  -- 1:00 PM UTC = 6:00 AM PDT (adjust for PST: use '0 14 * * *')
     $$
     SELECT net.http_get(
       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest_and_score',
       headers := jsonb_build_object(
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )::jsonb
     ) AS request_id;
     $$
   );
   
   -- Method 2: Alternative using http extension (if pg_net not available)
   -- Uncomment and use this if Method 1 doesn't work:
   /*
   SELECT cron.schedule(
     'ingest-6am',
     '0 13 * * *',
     $$
     SELECT http_get(
       'https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest_and_score',
       jsonb_build_object(
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )
     );
     $$
   );
   */

   SELECT cron.schedule(
     'ingest-11am',
     '0 18 * * *',  -- 6:00 PM UTC = 11:00 AM PDT (adjust for PST: use '0 19 * * *')
     $$
     SELECT net.http_get(
       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest_and_score',
       headers := jsonb_build_object(
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )::jsonb
     ) AS request_id;
     $$
   );

   SELECT cron.schedule(
     'ingest-4pm',
     '0 23 * * *',  -- 11:00 PM UTC = 4:00 PM PDT (adjust for PST: use '0 0 * * *' for next day)
     $$
     SELECT net.http_get(
       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest_and_score',
       headers := jsonb_build_object(
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )::jsonb
     ) AS request_id;
     $$
   );

   SELECT cron.schedule(
     'ingest-9pm',
     '0 4 * * *',  -- 4:00 AM UTC (next day) = 9:00 PM PDT (adjust for PST: use '0 5 * * *')
     $$
     SELECT net.http_get(
       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest_and_score',
       headers := jsonb_build_object(
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )::jsonb
     ) AS request_id;
     $$
   );
   ```

   **Important:** Replace:
   - `YOUR-PROJECT-REF` with your actual Supabase project reference
   - `YOUR_SERVICE_ROLE_KEY` with your service role key (from Settings → API)

3. **Timezone Conversion Notes:**
   - Supabase cron jobs use UTC time
   - **America/Los_Angeles** timezone:
     - **PST (Pacific Standard Time)**: UTC-8 (November - March)
     - **PDT (Pacific Daylight Time)**: UTC-7 (March - November)
   - The examples above use PDT times. For PST, add 1 hour to each UTC time
   - You may need to adjust cron schedules twice a year for daylight saving time
   - Use a timezone converter like https://www.timeanddate.com/worldclock/converter.html to verify times
   - **Tip:** Consider using a service like GitHub Actions or external cron service if you need timezone-aware scheduling

4. **Verify scheduled jobs:**
   ```sql
   SELECT * FROM cron.job;
   ```

5. **View job history:**
   ```sql
   SELECT * FROM cron.job_run_details 
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

6. **Remove a scheduled job (if needed):**
   ```sql
   SELECT cron.unschedule('ingest-6am');
   ```

**Alternative Scheduling Methods:**

If `pg_cron` is not available or doesn't work in your Supabase project, consider:

1. **External Cron Service (Recommended for reliability):**
   - Use services like [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or GitHub Actions
   - Set up HTTP requests to your function endpoint at the scheduled times
   - Example with cron-job.org:
     - Create a new cron job
     - Set schedule: `0 13,18,23,4 * * *` (for the 4 times)
     - URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest_and_score`
     - Method: GET
     - Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

2. **Supabase Dashboard (if available):**
   - Some Supabase projects have a UI for cron jobs
   - Check **Database** → **Cron Jobs** in your dashboard
   - Create new cron jobs with the same schedule times

3. **Verify pg_net extension:**
   - Check if `pg_net` extension is available: `SELECT * FROM pg_available_extensions WHERE name = 'pg_net';`
   - If not available, you may need to enable it or use an external cron service

#### Manual Execution (Run Now)

For testing and debugging, you can manually trigger the function:

**Via HTTP Request:**
```bash
# IMPORTANT: Include the Authorization header!
curl -i "https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest_and_score" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Troubleshooting:**
- If you get `401 Missing authorization header`, you forgot the `-H "Authorization: Bearer ..."` header
- Get your anon key from: Supabase Dashboard → Settings → API → anon public key

**Via Supabase Dashboard:**
1. Go to **Edge Functions** in your Supabase dashboard
2. Click on `ingest_and_score`
3. Click **Invoke** button
4. View the response and logs

**Health Check Behavior:**
The function acts as a lightweight health endpoint - it will always return a status response even if:
- No new articles are found
- All articles are filtered out
- No articles need scoring
- Daily feed is empty

Example response when no new articles:
```json
{
  "status": "ok",
  "message": "News ingestion, scoring, and feed building completed",
  "stats": {
    "fetched": 0,
    "filtered": 0,
    "inserted": 0,
    "updated": 0,
    "scored_success": 0,
    "scored_failed": 0,
    "feed_count": 0,
    "feed_sample_titles": []
  }
}
```

## Development

- [x] Add setup instructions for Expo
- [x] Add setup instructions for Supabase Edge Functions
- [ ] Add development workflow documentation
