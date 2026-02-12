-- Happy News Database Schema
-- This file contains the database schema for the Happy News application

-- ============================================================================
-- TABLES
-- ============================================================================

-- Articles table: Stores news articles
CREATE TABLE IF NOT EXISTS articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    source_name text NOT NULL,
    source_url text,
    article_url text NOT NULL UNIQUE,
    published_at timestamptz,
    category text,
    created_at timestamptz DEFAULT now()
);

-- Article scores table: Stores sentiment and quality scores for articles
CREATE TABLE IF NOT EXISTS article_scores (
    article_id uuid PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    overall_score float NOT NULL,
    hope float,
    calm float,
    joy float,
    progress float,
    outrage_penalty float,
    tags text[],
    scored_at timestamptz DEFAULT now()
);

-- Daily feed table: Stores the curated daily feed with ranking
CREATE TABLE IF NOT EXISTS daily_feed (
    article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
    feed_date date NOT NULL,
    rank int NOT NULL,
    PRIMARY KEY (article_id, feed_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying today's feed sorted by rank
CREATE INDEX IF NOT EXISTS idx_daily_feed_date_rank 
    ON daily_feed(feed_date DESC, rank ASC);

-- Index for querying articles by date (for filtering recent articles)
CREATE INDEX IF NOT EXISTS idx_articles_published_at 
    ON articles(published_at DESC NULLS LAST);

-- Index for querying articles by category
CREATE INDEX IF NOT EXISTS idx_articles_category 
    ON articles(category) WHERE category IS NOT NULL;

-- Index for sorting articles by overall score
CREATE INDEX IF NOT EXISTS idx_article_scores_overall_score 
    ON article_scores(overall_score DESC);

-- Index for joining daily_feed with articles efficiently
CREATE INDEX IF NOT EXISTS idx_daily_feed_article_id 
    ON daily_feed(article_id);

-- Index for querying articles by source
CREATE INDEX IF NOT EXISTS idx_articles_source_name 
    ON articles(source_name);

-- Composite index for common query pattern: feed date + article lookup
CREATE INDEX IF NOT EXISTS idx_daily_feed_date_article 
    ON daily_feed(feed_date DESC, article_id);

-- Index for querying scores by scored_at (for recent scoring)
CREATE INDEX IF NOT EXISTS idx_article_scores_scored_at 
    ON article_scores(scored_at DESC);
