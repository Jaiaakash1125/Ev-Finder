export type StationStatus = "available" | "limited" | "busy" | "offline";

export interface Station {
  id: string;
  name: string;
  network: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  status: StationStatus;
  freePorts: number;
  totalPorts: number;
  connectors: string[];
  maxPowerKw: number;
  pricePerKwh: number;
  hours: string;
  amenities: string[];
  rating: number;
  reviews: number;
  isFavorite?: boolean;
}

export interface PortTelemetry {
  portNumber: number;
  connectorType: string;
  maxPowerKw: number;
  status: "available" | "occupied";
  pricePerKwh: number;
}

export interface ReviewItem {
  id: string;
  stationId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  plugCondition: "working_perfect" | "slow_charge" | "broken_connector";
  createdAt: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  vehicles: Vehicle[];
  favorites: string[];
  createdAt: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  connectorType: string;
  batteryKwh: number;
  regNumber?: string;
}

export interface RouteStop {
  stopNumber: number;
  station: Station;
  distanceFromStartKm: number;
  offRouteKm: number;
  estimatedArrivalSoc: number;
  targetChargeSoc: number;
  chargeTimeMinutes: number;
  estimatedCostInr: number;
}

export interface RoutePlanResult {
  /** false when no charging plan can complete the trip (battery too low or no chargers on the corridor) */
  feasible: boolean;
  totalDistanceKm: number;
  estimatedRoadDistanceKm: number;
  estimatedDriveTimeMinutes: number;
  estimatedChargingMinutes: number;
  stopsNeeded: boolean;
  recommendedStops: RouteStop[];
  arrivalDestinationSocPercent: number;
  warnings: string[];
}

// ---- Auth & API plumbing ----

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  /** seconds */
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface LoginResult {
  user: UserProfile;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export interface Booking {
  id: string;
  stationId: string;
  portNumber: number;
  scheduledStart: string;
  scheduledEnd: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  station: Pick<Station, "id" | "name" | "address" | "lat" | "lng"> | null;
}

export interface StationDetail extends Station {
  ports: PortTelemetry[];
  /** false: port states are estimated from free/total ports, not read live from the charger */
  liveTelemetry: boolean;
  /** Latest community reviews (up to 20). `reviews` on Station is the total count. */
  recentReviews: ReviewItem[];
}

export interface Page {
  count: number;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface StationFilters {
  connector?: string;
  min_power_kw?: number;
  network?: string;
  status?: StationStatus | "all";
}
