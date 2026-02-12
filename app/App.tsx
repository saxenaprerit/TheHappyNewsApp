import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import HowItWorksScreen from './src/screens/HowItWorksScreen';

export default function App() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {showHowItWorks ? (
        <HowItWorksScreen onBack={() => setShowHowItWorks(false)} />
      ) : (
        <HomeScreen onShowHowItWorks={() => setShowHowItWorks(true)} />
      )}
    </SafeAreaProvider>
  );
}
