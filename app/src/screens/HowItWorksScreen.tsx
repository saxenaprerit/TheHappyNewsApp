import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

interface HowItWorksScreenProps {
  onBack: () => void;
}

export default function HowItWorksScreen({ onBack }: HowItWorksScreenProps) {

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>How It Works</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📰</Text>
        </View>
        <Text style={styles.sectionTitle}>We Don't Generate News</Text>
        <Text style={styles.sectionText}>
          Happy News does not create, edit, or rewrite news articles. We only curate and rank existing articles from reputable sources.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔗</Text>
        </View>
        <Text style={styles.sectionTitle}>Direct Links to Sources</Text>
        <Text style={styles.sectionText}>
          Every article links directly to the original source. We believe in transparency and giving credit where it's due.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🤖</Text>
        </View>
        <Text style={styles.sectionTitle}>AI for Ranking Only</Text>
        <Text style={styles.sectionText}>
          AI is used solely to analyze and rank articles for positive, constructive, and hopeful content. We filter for news that inspires rather than divides.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✨</Text>
        </View>
        <Text style={styles.sectionTitle}>Curated Daily Feed</Text>
        <Text style={styles.sectionText}>
          Our algorithm selects up to 12 articles per day, prioritizing those that promote hope, progress, and constructive dialogue.
        </Text>
      </View>

      <View style={styles.privacySection}>
        <Text style={styles.privacyTitle}>🔒 Privacy</Text>
        <Text style={styles.privacyText}>
          <Text style={styles.bold}>No accounts required.</Text> We don't collect or store any personal data. This MVP version is completely anonymous and respects your privacy.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
      >
        <Text style={styles.backButtonText}>← Back to Feed</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    textAlign: 'center',
  },
  privacySection: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 10,
  },
  privacyText: {
    fontSize: 15,
    color: '#1e3a8a',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
