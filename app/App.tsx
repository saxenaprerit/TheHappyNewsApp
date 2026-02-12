import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import HowItWorksScreen from './src/screens/HowItWorksScreen';

export default function App() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  if (showHowItWorks) {
    return (
      <>
        <HowItWorksScreen onBack={() => setShowHowItWorks(false)} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <HomeScreen onShowHowItWorks={() => setShowHowItWorks(true)} />
      <StatusBar style="auto" />
    </>
  );
}
