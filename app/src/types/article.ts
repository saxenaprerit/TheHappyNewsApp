export interface Article {
  id: string;
  title: string;
  description: string | null;
  source_name: string;
  source_url: string | null;
  article_url: string;
  published_at: string | null;
  category: string | null;
  created_at: string;
}

export interface DailyFeedItem {
  article_id: string;
  feed_date: string;
  rank: number;
  articles: Article;
}
