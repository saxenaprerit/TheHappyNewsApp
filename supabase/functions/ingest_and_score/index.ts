// Supabase Edge Function: ingest_and_score
// Fetches news from News API and ingests into the database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Source whitelist - reputable news sources
const SOURCE_WHITELIST = [
  'bbc',
  'bbc-news',
  'reuters',
  'associated-press',
  'the-guardian-uk',
  'the-new-york-times',
  'the-washington-post',
  'npr',
  'time',
  'usa-today',
  'cnn',
  'abc-news',
  'cbs-news',
  'nbc-news',
  'techcrunch',
  'wired',
  'the-verge',
];

interface LogContext {
  function: string;
  method?: string;
  path?: string;
  timestamp: string;
  [key: string]: any;
}

interface NewsApiArticle {
  title: string;
  description?: string;
  url: string;
  source?: {
    id?: string;
    name: string;
  };
  publishedAt?: string;
  category?: string;
}

interface NewsApiResponse {
  status: string;
  totalResults?: number;
  articles?: NewsApiArticle[];
  sources?: Array<{ id: string; name: string }>;
}

interface ArticleRecord {
  title: string;
  description: string | null;
  source_name: string;
  source_url: string | null;
  article_url: string;
  published_at: string | null;
  category: string | null;
}

interface IngestionStats {
  fetched: number;
  filtered: number;
  inserted: number;
  updated: number;
  scored_success: number;
  scored_failed: number;
  feed_count: number;
  feed_sample_titles?: string[];
}

interface ArticleWithScore {
  id: string;
  title: string;
  source_name: string;
  published_at: string | null;
  overall_score: number;
  published_at_timestamp: number; // For sorting
}

interface ScoringResponse {
  overall_score: number;
  hope: number;
  calm: number;
  joy: number;
  progress: number;
  outrage_penalty: number;
  tags: string[];
}

interface ArticleForScoring {
  id: string;
  title: string;
  description: string | null;
  source_name: string;
  category: string | null;
}

function log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
  const logEntry = {
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(logEntry));
}

/**
 * Check if article is within the last 48 hours
 */
function isWithin48Hours(publishedAt: string | null | undefined): boolean {
  if (!publishedAt) return false;
  
  try {
    const published = new Date(publishedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 48 && hoursDiff >= 0;
  } catch {
    return false;
  }
}

/**
 * Check if source is in whitelist
 */
function isWhitelistedSource(sourceId: string | null | undefined, sourceName: string): boolean {
  if (!sourceId && !sourceName) return false;
  
  const normalizedId = sourceId?.toLowerCase().trim();
  const normalizedName = sourceName?.toLowerCase().trim();
  
  return SOURCE_WHITELIST.some(whitelisted => {
    const normalized = whitelisted.toLowerCase();
    return normalizedId === normalized || normalizedName === normalized ||
           normalizedName?.includes(normalized) || normalized?.includes(normalizedName);
  });
}

/**
 * Normalize News API article to our schema
 */
function normalizeArticle(article: NewsApiArticle): ArticleRecord | null {
  if (!article.title || !article.url) {
    return null;
  }

  const sourceName = article.source?.name || 'Unknown Source';
  const sourceId = article.source?.id;

  // Check whitelist
  if (!isWhitelistedSource(sourceId, sourceName)) {
    return null;
  }

  // Check 48-hour filter
  if (!isWithin48Hours(article.publishedAt)) {
    return null;
  }

  return {
    title: article.title.trim(),
    description: article.description?.trim() || null,
    source_name: sourceName.trim(),
    source_url: null, // News API doesn't provide source URL directly
    article_url: article.url.trim(),
    published_at: article.publishedAt || null,
    category: article.category || null,
  };
}

/**
 * Fetch news from News API
 */
async function fetchNews(newsApiKey: string): Promise<NewsApiArticle[]> {
  const baseUrl = 'https://newsapi.org/v2';
  
  // Fetch from multiple endpoints for better coverage
  const endpoints = [
    '/top-headlines?country=us&pageSize=100',
    '/everything?q=technology&sortBy=publishedAt&pageSize=100',
    '/everything?q=science&sortBy=publishedAt&pageSize=100',
  ];

  const allArticles: NewsApiArticle[] = [];
  const seenUrls = new Set<string>();

  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}&apiKey=${newsApiKey}`;
      log('info', 'Fetching from News API', { endpoint, url: endpoint });

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        log('warn', 'News API request failed', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        continue;
      }

      const data: NewsApiResponse = await response.json();
      
      if (data.status !== 'ok' || !data.articles) {
        log('warn', 'News API returned non-ok status', {
          endpoint,
          status: data.status,
        });
        continue;
      }

      // Deduplicate by URL
      for (const article of data.articles) {
        if (article.url && !seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          allArticles.push(article);
        }
      }

      log('info', 'Fetched articles from endpoint', {
        endpoint,
        count: data.articles.length,
        unique: allArticles.length,
      });
    } catch (error) {
      log('error', 'Error fetching from News API endpoint', {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return allArticles;
}

/**
 * Upsert articles to database
 */
async function upsertArticles(
  supabase: ReturnType<typeof createClient>,
  articles: ArticleRecord[]
): Promise<{ inserted: number; updated: number }> {
  if (articles.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  // Check which articles already exist before upserting
  const articleUrls = articles.map(a => a.article_url);
  const { data: existingArticles, error: checkError } = await supabase
    .from('articles')
    .select('article_url')
    .in('article_url', articleUrls);

  if (checkError) {
    log('warn', 'Error checking existing articles', {
      error: checkError.message,
    });
  }

  const existingUrls = new Set((existingArticles || []).map(a => a.article_url));
  let inserted = 0;
  let updated = 0;

  // Process in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('articles')
      .upsert(batch, {
        onConflict: 'article_url',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      log('error', 'Error upserting articles batch', {
        batchStart: i,
        batchSize: batch.length,
        error: error.message,
        code: error.code,
      });
      continue;
    }

    // Count inserted vs updated based on what existed before
    for (const article of batch) {
      if (existingUrls.has(article.article_url)) {
        updated++;
      } else {
        inserted++;
      }
    }

    log('info', 'Upserted article batch', {
      batchStart: i,
      batchSize: batch.length,
      inserted: batch.filter(a => !existingUrls.has(a.article_url)).length,
      updated: batch.filter(a => existingUrls.has(a.article_url)).length,
    });
  }

  return { inserted, updated };
}

/**
 * Get articles that need scoring (not yet scored, limit 50)
 */
async function getUnscoredArticles(
  supabase: ReturnType<typeof createClient>
): Promise<ArticleForScoring[]> {
  // First, get all scored article IDs
  const { data: scoredData } = await supabase
    .from('article_scores')
    .select('article_id');

  const scoredIds = new Set((scoredData || []).map((s: any) => s.article_id));

  // Then get articles that are not in the scored set
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, description, source_name, category')
    .limit(100); // Get more than 50 to account for already-scored ones

  if (error) {
    log('error', 'Error fetching articles for scoring', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  // Filter out already-scored articles and limit to 50
  const unscored = (data || [])
    .filter((article: any) => !scoredIds.has(article.id))
    .slice(0, 50) as ArticleForScoring[];

  return unscored;
}

/**
 * Score an article using OpenAI
 */
async function scoreArticleWithOpenAI(
  openAiKey: string,
  article: ArticleForScoring
): Promise<ScoringResponse | null> {
  const hasDescription = article.description && article.description.trim().length > 0;
  
  const prompt = `You are a news sentiment analyzer. Analyze the following article and return ONLY a valid JSON object with the specified fields. Do NOT rewrite, summarize, or generate any text - only return the JSON scores.

Article:
Title: ${article.title}
${hasDescription ? `Description: ${article.description}` : 'Description: [Not available]'}
Source: ${article.source_name}
${article.category ? `Category: ${article.category}` : ''}

${!hasDescription ? 'Note: Description is missing - score with lower confidence but still provide all fields.' : ''}

Return ONLY this JSON structure (no markdown, no explanation, no other text):
{
  "overall_score": <number 0-100, higher is more positive/hopeful>,
  "hope": <number 0-1, how hopeful/optimistic>,
  "calm": <number 0-1, how calming/peaceful>,
  "joy": <number 0-1, how joyful/uplifting>,
  "progress": <number 0-1, how much it shows progress/advancement>,
  "outrage_penalty": <number 0-1, how much outrage/anger it generates (0=no outrage, 1=high outrage)>,
  "tags": [<array of relevant tags as strings>]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using gpt-4o-mini (cheaper, faster). Alternatives: 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'
        messages: [
          {
            role: 'system',
            content: 'You are a JSON-only response generator. Return ONLY valid JSON, no markdown, no explanations, no other text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent scoring
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'OpenAI API request failed', {
        articleId: article.id,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      log('error', 'OpenAI response missing content', {
        articleId: article.id,
        response: JSON.stringify(data),
      });
      return null;
    }

    // Parse JSON response
    let scoringResult: ScoringResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      scoringResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      log('error', 'Failed to parse OpenAI JSON response', {
        articleId: article.id,
        content,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return null;
    }

    // Validate and normalize the response
    const validated: ScoringResponse = {
      overall_score: Math.max(0, Math.min(100, Number(scoringResult.overall_score) || 0)),
      hope: Math.max(0, Math.min(1, Number(scoringResult.hope) || 0)),
      calm: Math.max(0, Math.min(1, Number(scoringResult.calm) || 0)),
      joy: Math.max(0, Math.min(1, Number(scoringResult.joy) || 0)),
      progress: Math.max(0, Math.min(1, Number(scoringResult.progress) || 0)),
      outrage_penalty: Math.max(0, Math.min(1, Number(scoringResult.outrage_penalty) || 0)),
      tags: Array.isArray(scoringResult.tags) ? scoringResult.tags.map(String) : [],
    };

    return validated;
  } catch (error) {
    log('error', 'Exception calling OpenAI API', {
      articleId: article.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Upsert article scores to database
 */
async function upsertArticleScore(
  supabase: ReturnType<typeof createClient>,
  articleId: string,
  score: ScoringResponse
): Promise<boolean> {
  const { error } = await supabase
    .from('article_scores')
    .upsert(
      {
        article_id: articleId,
        overall_score: score.overall_score,
        hope: score.hope,
        calm: score.calm,
        joy: score.joy,
        progress: score.progress,
        outrage_penalty: score.outrage_penalty,
        tags: score.tags,
        scored_at: new Date().toISOString(),
      },
      {
        onConflict: 'article_id',
      }
    );

  if (error) {
    log('error', 'Error upserting article score', {
      articleId,
      error: error.message,
      code: error.code,
    });
    return false;
  }

  return true;
}

/**
 * Score articles using OpenAI
 */
async function scoreArticles(
  supabase: ReturnType<typeof createClient>,
  openAiKey: string,
  articles: ArticleForScoring[]
): Promise<{ success: number; failed: number }> {
  if (articles.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  log('info', 'Starting article scoring', {
    count: articles.length,
  });

  // Score articles sequentially to avoid rate limits
  for (const article of articles) {
    try {
      const score = await scoreArticleWithOpenAI(openAiKey, article);

      if (!score) {
        failed++;
        log('warn', 'Failed to score article', {
          articleId: article.id,
          title: article.title.substring(0, 50),
        });
        continue;
      }

      const upserted = await upsertArticleScore(supabase, article.id, score);

      if (upserted) {
        success++;
        log('info', 'Successfully scored article', {
          articleId: article.id,
          overallScore: score.overall_score,
        });
      } else {
        failed++;
        log('warn', 'Failed to save article score', {
          articleId: article.id,
        });
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      failed++;
      log('error', 'Exception while scoring article', {
        articleId: article.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log('info', 'Article scoring completed', {
    success,
    failed,
    total: articles.length,
  });

  return { success, failed };
}

/**
 * Get today's date string in YYYY-MM-DD format (for feed building)
 */
function getTodayDateStringForFeed(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get credible sources for boost (optional)
 */
const CREDIBLE_SOURCES = [
  'bbc',
  'reuters',
  'associated press',
  'the guardian',
  'the new york times',
  'the washington post',
  'npr',
];

function isCredibleSource(sourceName: string): boolean {
  const normalized = sourceName.toLowerCase();
  return CREDIBLE_SOURCES.some(credible => normalized.includes(credible));
}

/**
 * Get candidate articles with scores (last 48 hours)
 */
async function getCandidateArticles(
  supabase: ReturnType<typeof createClient>
): Promise<ArticleWithScore[]> {
  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
  const cutoffTime = fortyEightHoursAgo.toISOString();

  // Join articles with article_scores and filter by published_at
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      source_name,
      published_at,
      article_scores!inner (
        overall_score
      )
    `)
    .gte('published_at', cutoffTime)
    .order('published_at', { ascending: false })
    .limit(200); // Get more candidates for diversity filtering

  if (error) {
    log('error', 'Error fetching candidate articles', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  // Transform and filter
  const candidates: ArticleWithScore[] = [];
  for (const item of data || []) {
    const score = Array.isArray(item.article_scores) 
      ? item.article_scores[0]?.overall_score 
      : (item.article_scores as any)?.overall_score;

    if (score !== undefined && score !== null && isWithin48Hours(item.published_at)) {
      candidates.push({
        id: item.id,
        title: item.title,
        source_name: item.source_name,
        published_at: item.published_at,
        overall_score: Number(score),
        published_at_timestamp: item.published_at 
          ? new Date(item.published_at).getTime() 
          : 0,
      });
    }
  }

  return candidates;
}

/**
 * Rank and select articles for daily feed with diversity enforcement
 */
function selectFeedArticles(
  candidates: ArticleWithScore[],
  maxItems: number = 12
): ArticleWithScore[] {
  if (candidates.length === 0) {
    return [];
  }

  // Sort by: overall_score desc, then published_at desc, with boost for credible sources
  const sorted = [...candidates].sort((a, b) => {
    // Add small boost for credible sources (multiply score by 1.05)
    const aScore = a.overall_score * (isCredibleSource(a.source_name) ? 1.05 : 1.0);
    const bScore = b.overall_score * (isCredibleSource(b.source_name) ? 1.05 : 1.0);

    // Primary: overall_score (desc)
    if (Math.abs(aScore - bScore) > 0.1) {
      return bScore - aScore;
    }

    // Secondary: published_at (desc)
    return b.published_at_timestamp - a.published_at_timestamp;
  });

  // Enforce diversity: max 2 articles per source
  const selected: ArticleWithScore[] = [];
  const sourceCounts = new Map<string, number>();

  for (const article of sorted) {
    const count = sourceCounts.get(article.source_name) || 0;
    if (count < 2) {
      selected.push(article);
      sourceCounts.set(article.source_name, count + 1);
      
      if (selected.length >= maxItems) {
        break;
      }
    }
  }

  return selected;
}

/**
 * Build daily feed for today
 */
async function buildDailyFeed(
  supabase: ReturnType<typeof createClient>
): Promise<{ count: number; sampleTitles: string[] }> {
  const today = getTodayDateStringForFeed();

  log('info', 'Building daily feed', { date: today });

  // Step 1: Get candidate articles
  const candidates = await getCandidateArticles(supabase);
  log('info', 'Found candidate articles', { count: candidates.length });

  if (candidates.length === 0) {
    log('warn', 'No candidate articles found for daily feed', { date: today });
    return { count: 0, sampleTitles: [] };
  }

  // Step 2: Select and rank articles
  const selected = selectFeedArticles(candidates, 12);
  log('info', 'Selected articles for feed', {
    count: selected.length,
    totalCandidates: candidates.length,
  });

  if (selected.length === 0) {
    log('warn', 'No articles selected for daily feed', { date: today });
    return { count: 0, sampleTitles: [] };
  }

  // Step 3: Delete existing feed for today
  const { error: deleteError } = await supabase
    .from('daily_feed')
    .delete()
    .eq('feed_date', today);

  if (deleteError) {
    log('error', 'Error deleting existing daily feed', {
      date: today,
      error: deleteError.message,
      code: deleteError.code,
    });
    // Continue anyway - upsert will handle conflicts
  } else {
    log('info', 'Deleted existing daily feed', { date: today });
  }

  // Step 4: Insert new feed items with ranks
  const feedItems = selected.map((article, index) => ({
    article_id: article.id,
    feed_date: today,
    rank: index + 1,
  }));

  const { error: insertError } = await supabase
    .from('daily_feed')
    .insert(feedItems);

  if (insertError) {
    log('error', 'Error inserting daily feed', {
      date: today,
      error: insertError.message,
      code: insertError.code,
    });
    return { count: 0, sampleTitles: [] };
  }

  log('info', 'Daily feed built successfully', {
    date: today,
    count: selected.length,
  });

  const sampleTitles = selected.slice(0, 5).map(a => a.title);

  return {
    count: selected.length,
    sampleTitles,
  };
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Log incoming request
  log('info', 'Request received', {
    function: 'ingest_and_score',
    requestId,
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    log('info', 'CORS preflight request', { requestId });
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow GET requests for now
    if (req.method !== 'GET') {
      log('warn', 'Method not allowed', {
        requestId,
        method: req.method,
      });
      return new Response(
        JSON.stringify({ error: 'Method not allowed', status: 'error' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const newsApiKey = Deno.env.get('NEWS_API_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      log('error', 'Missing Supabase configuration', {
        requestId,
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: Missing Supabase credentials',
          status: 'error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!newsApiKey) {
      log('error', 'Missing News API key', { requestId });
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: Missing NEWS_API_KEY',
          status: 'error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role key (server-side, full access)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    log('info', 'Starting news ingestion', { requestId });

    // Step 1: Fetch news from News API
    log('info', 'Fetching news from News API', { requestId });
    const fetchedArticles = await fetchNews(newsApiKey);
    log('info', 'Fetched articles from News API', {
      requestId,
      count: fetchedArticles.length,
    });

    // Step 2: Normalize and filter articles
    const normalizedArticles: ArticleRecord[] = [];
    let filteredCount = 0;

    for (const article of fetchedArticles) {
      const normalized = normalizeArticle(article);
      if (normalized) {
        normalizedArticles.push(normalized);
      } else {
        filteredCount++;
      }
    }

    log('info', 'Normalized and filtered articles', {
      requestId,
      fetched: fetchedArticles.length,
      normalized: normalizedArticles.length,
      filtered: filteredCount,
    });

    // Step 3: Upsert to database
    log('info', 'Upserting articles to database', {
      requestId,
      count: normalizedArticles.length,
    });

    const { inserted, updated } = await upsertArticles(supabase, normalizedArticles);

    // Step 4: Score articles with OpenAI (if API key is available)
    let scoredSuccess = 0;
    let scoredFailed = 0;

    if (openAiKey) {
      log('info', 'Starting article scoring', { requestId });

      // Get unscored articles (max 50 per run)
      const unscoredArticles = await getUnscoredArticles(supabase);
      log('info', 'Found unscored articles', {
        requestId,
        count: unscoredArticles.length,
      });

      if (unscoredArticles.length > 0) {
        const scoringResults = await scoreArticles(supabase, openAiKey, unscoredArticles);
        scoredSuccess = scoringResults.success;
        scoredFailed = scoringResults.failed;
      } else {
        log('info', 'No unscored articles found', { requestId });
      }
    } else {
      log('warn', 'OpenAI API key not configured, skipping article scoring', {
        requestId,
      });
    }

    // Step 5: Build daily feed for today
    log('info', 'Building daily feed', { requestId });
    const feedResult = await buildDailyFeed(supabase);
    log('info', 'Daily feed built', {
      requestId,
      count: feedResult.count,
    });

    const duration = Date.now() - startTime;
    const stats: IngestionStats = {
      fetched: fetchedArticles.length,
      filtered: filteredCount,
      inserted,
      updated,
      scored_success: scoredSuccess,
      scored_failed: scoredFailed,
      feed_count: feedResult.count,
      feed_sample_titles: feedResult.sampleTitles,
    };

    // Log successful completion
    log('info', 'News ingestion, scoring, and feed building completed', {
      requestId,
      duration: `${duration}ms`,
      ...stats,
    });

    // Return success response with stats
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'News ingestion, scoring, and feed building completed',
        requestId,
        timestamp: new Date().toISOString(),
        stats,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    log('error', 'Request failed with exception', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    return new Response(
      JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
