import React, { Component, type ReactNode } from "react";
import { StatusBar, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Root ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>⚡</Text>
          <Text style={errorStyles.title}>India EV Finder</Text>
          <Text style={errorStyles.msg}>
            {this.state.error?.message || "An unexpected error occurred while launching."}
          </Text>
          <TouchableOpacity style={errorStyles.btn} onPress={this.handleRestart}>
            <Text style={errorStyles.btnText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 8,
  },
  msg: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: "#00f2fe",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: "#020617",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <RootErrorBoundary>
        <AppNavigator />
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}
