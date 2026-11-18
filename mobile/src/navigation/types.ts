import type { NavigatorScreenParams } from "@react-navigation/native";
import type { Station } from "../types";

export type MainTabParamList = {
  Home: undefined;
  Map: { city?: string } | undefined;
  Stations: { city?: string; query?: string; connector?: string } | undefined;
  Connectors: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  StationDetail: {
    stationId: string;
    station?: Station;
  };
};
