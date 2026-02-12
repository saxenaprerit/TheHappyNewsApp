import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { DailyFeedItem } from '../types/article';
import { formatDate, getTodayDateString } from '../utils/dateFormat';

interface HomeScreenProps {
  onShowHowItWorks: () => void;
}

export default function HomeScreen({ onShowHowItWorks }: HomeScreenProps) {
  const [articles, setArticles] = useState<DailyFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTodayFeed();
  }, []);

  const fetchTodayFeed = async () => {
    try {
      setError(null);
      const today = getTodayDateString();

      // Query daily_feed joined with articles for today's feed
      // Supabase automatically detects foreign key relationships
      const { data, error: queryError } = await supabase
        .from('daily_feed')
        .select(`
          article_id,
          feed_date,
          rank,
          articles (
            id,
            title,
            description,
            source_name,
            source_url,
            article_url,
            published_at,
            category,
            created_at
          )
        `)
        .eq('feed_date', today)
        .order('rank', { ascending: true })
        .limit(12);

      if (queryError) {
        throw queryError;
      }

      // Transform the data to match our type
      // Supabase returns the joined table as an array (even for one-to-one), so we extract it
      const feedItems: DailyFeedItem[] = (data || [])
        .filter((item: any) => item.articles && (Array.isArray(item.articles) ? item.articles.length > 0 : true))
        .map((item: any) => ({
          article_id: item.article_id,
          feed_date: item.feed_date,
          rank: item.rank,
          articles: Array.isArray(item.articles) ? item.articles[0] : item.articles,
        }));

      setArticles(feedItems);
    } catch (err: any) {
      console.error('Error fetching feed:', err);
      setError(err?.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTodayFeed();
  };

  const handleOpenArticle = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        setError(`Cannot open URL: ${url}`);
      }
    } catch (err: any) {
      setError(`Failed to open article: ${err?.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading happy news...</Text>
      </View>
    );
  }

  if (error && articles.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.errorStateContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (articles.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyTitle}>No happy news yet</Text>
          <Text style={styles.emptyText}>
            Check back later. The feed is updated 4 times daily with fresh, positive news.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {error}</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Happy News</Text>
          <TouchableOpacity
            style={styles.howItWorksButton}
            onPress={onShowHowItWorks}
          >
            <Text style={styles.howItWorksButtonText}>How it works</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Today's Feed</Text>
      </View>

      {articles.map((item) => (
        <ArticleCard
          key={item.article_id}
          article={item.articles}
          onReadOriginal={() => handleOpenArticle(item.articles.article_url)}
        />
      ))}
    </ScrollView>
  );
}

interface ArticleCardProps {
  article: DailyFeedItem['articles'];
  onReadOriginal: () => void;
}

function ArticleCard({ article, onReadOriginal }: ArticleCardProps) {
  const description = article.description || '';
  // Truncate description to 1-2 lines (approximately 150 characters)
  const truncatedDescription =
    description.length > 150 ? `${description.substring(0, 150)}...` : description;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{article.title}</Text>
      
      <View style={styles.cardMeta}>
        <Text style={styles.cardSource}>{article.source_name}</Text>
        <Text style={styles.cardDate}>{formatDate(article.published_at)}</Text>
      </View>

      {truncatedDescription && (
        <Text style={styles.cardDescription}>{truncatedDescription}</Text>
      )}

      <TouchableOpacity style={styles.readButton} onPress={onReadOriginal}>
        <Text style={styles.readButtonText}>Read original</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  errorBannerText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  howItWorksButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  howItWorksButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorStateContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 28,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSource: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  cardDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardDescription: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  readButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  readButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
