-- Check detailed breakdown of articles eligible for feed

SELECT 
  COUNT(*) as total_with_scores,
  COUNT(*) FILTER (WHERE a.published_at IS NOT NULL) as with_published_at,
  COUNT(*) FILTER (WHERE a.published_at > NOW() - INTERVAL '48 hours') as within_48h,
  COUNT(*) FILTER (WHERE a.published_at IS NULL) as null_published_at,
  COUNT(*) FILTER (WHERE a.published_at IS NOT NULL AND a.published_at <= NOW() - INTERVAL '48 hours') as older_than_48h
FROM articles a
INNER JOIN article_scores s ON a.id = s.article_id;

-- Show sample articles and their status
SELECT 
  a.id,
  LEFT(a.title, 50) as title,
  a.published_at,
  a.created_at,
  s.overall_score,
  CASE 
    WHEN a.published_at IS NULL THEN '❌ NULL published_at'
    WHEN a.published_at > NOW() - INTERVAL '48 hours' THEN '✅ Eligible'
    ELSE '❌ Older than 48h'
  END as feed_eligibility,
  NOW() - a.published_at as age
FROM articles a
INNER JOIN article_scores s ON a.id = s.article_id
ORDER BY a.published_at DESC NULLS LAST
LIMIT 20;
