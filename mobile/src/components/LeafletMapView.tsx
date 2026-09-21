import React, { useRef, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Station } from "../types";
import { darkColors, lightColors } from "../theme/theme";

interface LeafletMapViewProps {
  stations: Station[];
  selectedCity: string;
  onSelectStation: (station: Station) => void;
  isDark?: boolean;
}

const CITY_COORDS: Record<string, { lat: number; lng: number; zoom: number }> = {
  "All India": { lat: 20.5937, lng: 78.9629, zoom: 5 },
  Bengaluru: { lat: 12.9716, lng: 77.5946, zoom: 12 },
  "New Delhi": { lat: 28.6139, lng: 77.209, zoom: 12 },
  Mumbai: { lat: 19.076, lng: 72.8777, zoom: 12 },
  Hyderabad: { lat: 17.385, lng: 78.4867, zoom: 12 },
  Chennai: { lat: 13.0827, lng: 80.2707, zoom: 12 },
  Pune: { lat: 18.5204, lng: 73.8567, zoom: 12 },
  Kolkata: { lat: 22.5726, lng: 88.3639, zoom: 12 },
};

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  stations,
  selectedCity,
  onSelectStation,
  isDark = true,
}) => {
  const webViewRef = useRef<WebView | null>(null);
  const colors = isDark ? darkColors : lightColors;

  // Update map markers, theme filter, and view when stations, city, or theme changes
  useEffect(() => {
    if (!webViewRef.current) return;
    const cityData = CITY_COORDS[selectedCity] || CITY_COORDS["All India"];
    
    const script = `
      if (window.updateMapData) {
        window.updateMapData(${JSON.stringify(stations)}, ${cityData.lat}, ${cityData.lng}, ${cityData.zoom}, ${isDark});
      }
    `;
    webViewRef.current.injectJavaScript(script);
  }, [stations, selectedCity, isDark]);

  const initialCity = CITY_COORDS[selectedCity] || CITY_COORDS["All India"];

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${isDark ? "#080c14" : "#f0f9ff"}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* Dark / Light Tile Filters */
    .dark-tiles .leaflet-tile {
      filter: brightness(0.85) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
    }
    .light-tiles .leaflet-tile {
      filter: contrast(1.05) saturate(1.1);
    }
    
    /* Custom Glowing EV Pins */
    .ev-custom-pin {
      background: transparent;
      border: none;
    }
    .pin-inner {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #020617;
      font-weight: 900;
      font-size: 14px;
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px rgba(0, 242, 254, 0.8), 0 3px 6px rgba(0,0,0,0.5);
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .pin-inner:active {
      transform: scale(1.25);
    }
    .pin-available {
      background: linear-gradient(135deg, #00f2fe 0%, #38bdf8 100%);
    }
    .pin-busy {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
    }

    /* Cluster Badges */
    .dark-tiles .marker-cluster-small, .dark-tiles .marker-cluster-medium, .dark-tiles .marker-cluster-large {
      background-color: rgba(56, 189, 248, 0.25) !important;
    }
    .dark-tiles .marker-cluster div {
      background-color: #080c14 !important;
      color: #00f2fe !important;
      font-weight: 900 !important;
      border: 2px solid #38bdf8 !important;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.6) !important;
    }

    .light-tiles .marker-cluster div {
      background-color: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 900 !important;
      border: 2px solid #ffffff !important;
      box-shadow: 0 0 10px rgba(2, 132, 199, 0.4) !important;
    }

    .leaflet-control-attribution {
      display: none !important;
    }
  </style>
</head>
<body class="${isDark ? "dark-tiles" : "light-tiles"}">
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    var map = L.map('map', {
      center: [${initialCity.lat}, ${initialCity.lng}],
      zoom: ${initialCity.zoom},
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 40,
      showCoverageOnHover: false
    });
    map.addLayer(clusterGroup);

    var currentStationsMap = {};

    window.updateMapData = function(stations, lat, lng, zoom, isDarkMode) {
      document.body.className = isDarkMode ? 'dark-tiles' : 'light-tiles';
      clusterGroup.clearLayers();
      currentStationsMap = {};

      if (lat && lng && zoom) {
        map.flyTo([lat, lng], zoom, { duration: 1.2 });
      }

      var markers = [];
      for (var i = 0; i < stations.length; i++) {
        var s = stations[i];
        currentStationsMap[s.id] = s;

        var isAvail = s.status === 'available';
        var pinClass = isAvail ? 'pin-available' : 'pin-busy';

        var customIcon = L.divIcon({
          className: 'ev-custom-pin',
          html: '<div class="pin-inner ' + pinClass + '">⚡</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        var marker = L.marker([s.lat, s.lng], { icon: customIcon });
        marker.stationId = s.id;

        marker.on('click', function(e) {
          var clickedStation = currentStationsMap[e.target.stationId];
          if (clickedStation && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SELECT_STATION',
              station: clickedStation
            }));
          }
        });

        markers.push(marker);
      }

      clusterGroup.addLayers(markers);
    };

    window.updateMapData(${JSON.stringify(stations)}, ${initialCity.lat}, ${initialCity.lng}, ${initialCity.zoom}, ${isDark});
  </script>
</body>
</html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={[styles.webView, { backgroundColor: colors.background }]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "SELECT_STATION" && data.station) {
              onSelectStation(data.station);
            }
          } catch (err) {
            console.warn("WebView message parse error:", err);
          }
        }}
        renderLoading={() => (
          <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loaderContainer: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
