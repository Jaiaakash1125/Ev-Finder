import React from "react";
import { DarkTheme, NavigationContainer, type Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, Map as MapIcon, List, Plug } from "lucide-react-native";

import { colors } from "../theme/theme";
import type { MainTabParamList, RootStackParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { MapDiscoveryScreen } from "../screens/MapDiscoveryScreen";
import { StationsScreen } from "../screens/StationsScreen";
import { ConnectorsScreen } from "../screens/ConnectorsScreen";
import { StationDetailScreen } from "../screens/StationDetailScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.backgroundSecondary,
    text: colors.foreground,
    border: colors.tabBarBorder,
    notification: colors.accent,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.foregroundSubtle,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapDiscoveryScreen}
        options={{
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => <MapIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Stations"
        component={StationsScreen}
        options={{
          tabBarLabel: "Stations",
          tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Connectors"
        component={ConnectorsScreen}
        options={{
          tabBarLabel: "Connectors",
          tabBarIcon: ({ color, size }) => <Plug size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        id="RootStack"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.backgroundSecondary,
          },
          headerTintColor: colors.foreground,
          headerTitleStyle: {
            fontWeight: "800",
            color: colors.foreground,
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StationDetail"
          component={StationDetailScreen}
          options={({ route }) => ({
            title: route.params?.station?.name || "Station Details",
            headerBackTitle: "Back",
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
