import React, { useEffect } from "react";
import { StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { colors } from "./src/theme/theme";
import { api } from "./src/api/client";
import { MapDiscoveryScreen } from "./src/screens/MapDiscoveryScreen";

export default function App() {
  useEffect(() => {
    api.init();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <MapDiscoveryScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
