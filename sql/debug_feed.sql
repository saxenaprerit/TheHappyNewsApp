-- Debug queries to check why daily_feed is empty

-- 1. Check articles with scores and their published_at dates
SELECT 
  a.id,
  a.title,
  a.source_name,
  a.published_at,
  a.created_at,
  s.overall_score,
  CASE 
    WHEN a.published_at IS NULL THEN 'NULL - Will be filtered out'
    WHEN a.published_at > NOW() - INTERVAL '48 hours' THEN 'Within 48 hours ✓'
    ELSE 'Older than 48 hours - Will be filtered out'
  END as status
FROM articles a
INNER JOIN article_scores s ON a.id = s.article_id
ORDER BY a.published_at DESC NULLS LAST
LIMIT 20;

-- 2. Count articles eligible for feed
SELECT 
  COUNT(*) as eligible_count,
  COUNT(*) FILTER (WHERE a.published_at IS NOT NULL) as with_published_at,
  COUNT(*) FILTER (WHERE a.published_at > NOW() - INTERVAL '48 hours') as within_48h
FROM articles a
INNER JOIN article_scores s ON a.id = s.article_id;

-- 3. Check current daily_feed
SELECT * FROM daily_feed 
ORDER BY feed_date DESC, rank ASC;

-- 4. Manually test: Get candidate articles (last 48 hours with scores)
SELECT 
  a.id,
  a.title,
  a.source_name,
  a.published_at,
  s.overall_score
FROM articles a
INNER JOIN article_scores s ON a.id = s.article_id
WHERE a.published_at IS NOT NULL
  AND a.published_at > NOW() - INTERVAL '48 hours'
ORDER BY s.overall_score DESC, a.published_at DESC
LIMIT 12;
