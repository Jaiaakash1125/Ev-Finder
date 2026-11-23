import React, { useRef, useEffect, useMemo } from "react";
import { StyleSheet, View, ActivityIndicator, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Station } from "../types";
import { darkColors, lightColors } from "../theme/theme";
import { BENGALURU_CENTER } from "../constants/cities";

export interface MapCenterTarget {
  lat: number;
  lng: number;
  zoom: number;
  key: number;
}

export interface MapBounds {
  min_lat: number;
  min_lng: number;
  max_lat: number;
  max_lng: number;
}

interface LeafletMapViewProps {
  stations: Station[];
  center?: MapCenterTarget;
  userLocation?: { lat: number; lng: number } | null;
  onSelectStation: (station: Station) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  isDark?: boolean;
}

const MAX_RENDERED_MARKERS = 2000;

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  stations,
  center,
  userLocation = null,
  onSelectStation,
  onBoundsChange,
  isDark = true,
}) => {
  const webViewRef = useRef<WebView | null>(null);
  const iframeRef = useRef<any>(null);
  const lastCenterKeyRef = useRef<number | null>(null);
  const latestPropsRef = useRef({ stations, center, userLocation, isDark });
  latestPropsRef.current = { stations, center, userLocation, isDark };
  const colors = isDark ? darkColors : lightColors;

  const pushMapData = (forceFly: boolean) => {
    const {
      stations: curStations,
      center: curCenter,
      userLocation: curUserLoc,
      isDark: curDark,
    } = latestPropsRef.current;

    const cappedStations = curStations.slice(0, MAX_RENDERED_MARKERS);
    const shouldFly =
      curCenter !== undefined &&
      (forceFly || lastCenterKeyRef.current !== curCenter.key);

    if (shouldFly && curCenter) {
      lastCenterKeyRef.current = curCenter.key;
    }

    const latArg = shouldFly && curCenter ? curCenter.lat : null;
    const lngArg = shouldFly && curCenter ? curCenter.lng : null;
    const zoomArg = shouldFly && curCenter ? curCenter.zoom : null;

    if (Platform.OS === "web") {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow && (iframe.contentWindow as any).updateMapData) {
        (iframe.contentWindow as any).updateMapData(
          cappedStations,
          latArg,
          lngArg,
          zoomArg,
          curDark,
          curUserLoc
        );
      }
      return;
    }

    if (!webViewRef.current) return;
    const script = `
      if (window.updateMapData) {
        window.updateMapData(
          ${JSON.stringify(cappedStations)},
          ${latArg === null ? "null" : latArg},
          ${lngArg === null ? "null" : lngArg},
          ${zoomArg === null ? "null" : zoomArg},
          ${curDark},
          ${JSON.stringify(curUserLoc)}
        );
      }
      true;
    `;
    webViewRef.current.injectJavaScript(script);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "SELECT_STATION" && data.station) {
          onSelectStation(data.station);
        } else if (data?.type === "BOUNDS_CHANGE" && data.bounds && onBoundsChange) {
          onBoundsChange(data.bounds);
        }
      } catch {
        // ignore invalid json messages
      }
    };
    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [onSelectStation, onBoundsChange]);

  useEffect(() => {
    pushMapData(false);
  }, [stations, center?.key, userLocation?.lat, userLocation?.lng, isDark]);

  const htmlContent = useMemo(() => {
    return `
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
    html, body, #map { width: 100%; height: 100%; background: #080c14; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body.light-tiles, body.light-tiles #map { background: #f0f9ff; }

    .dark-tiles .leaflet-tile {
      filter: brightness(0.85) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
    }
    .light-tiles .leaflet-tile {
      filter: contrast(1.05) saturate(1.1);
    }

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
    }
    .pin-available {
      background: linear-gradient(135deg, #00f2fe 0%, #38bdf8 100%);
    }
    .pin-busy {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
    }
    .pin-offline {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      color: #ffffff;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
    }

    .user-loc-pin {
      background: transparent;
      border: none;
    }
    .user-loc-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #38bdf8;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.35);
    }

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
<body class="dark-tiles">
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    var map = L.map('map', {
      center: [${BENGALURU_CENTER.lat}, ${BENGALURU_CENTER.lng}],
      zoom: ${BENGALURU_CENTER.zoom},
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 20,
      maxClusterRadius: 45,
      showCoverageOnHover: false
    });
    map.addLayer(clusterGroup);

    var iconAvailable = L.divIcon({
      className: 'ev-custom-pin',
      html: '<div class="pin-inner pin-available">⚡</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    var iconBusy = L.divIcon({
      className: 'ev-custom-pin',
      html: '<div class="pin-inner pin-busy">⚡</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    var iconOffline = L.divIcon({
      className: 'ev-custom-pin',
      html: '<div class="pin-inner pin-offline">⚡</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    var userLocIcon = L.divIcon({
      className: 'user-loc-pin',
      html: '<div class="user-loc-dot"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    var userMarker = null;
    var suppressNextMoveEnd = false;
    var suppressTimer = null;

    function postToApp(obj) {
      var msg = JSON.stringify(obj);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    }

    map.on('moveend', function() {
      if (suppressNextMoveEnd) {
        suppressNextMoveEnd = false;
        return;
      }
      try {
        var b = map.getBounds();
        postToApp({
          type: 'BOUNDS_CHANGE',
          bounds: {
            min_lat: b.getSouth(),
            min_lng: b.getWest(),
            max_lat: b.getNorth(),
            max_lng: b.getEast()
          }
        });
      } catch (e) {}
    });

    var currentStationsMap = {};

    window.updateMapData = function(stations, lat, lng, zoom, isDarkMode, userLoc) {
      document.body.className = isDarkMode ? 'dark-tiles' : 'light-tiles';

      if (userLoc && typeof userLoc.lat === 'number' && typeof userLoc.lng === 'number') {
        if (!userMarker) {
          userMarker = L.marker([userLoc.lat, userLoc.lng], { icon: userLocIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
          userMarker.setLatLng([userLoc.lat, userLoc.lng]);
        }
      }

      if (lat !== null && lng !== null && zoom !== null && typeof lat === 'number' && typeof lng === 'number') {
        suppressNextMoveEnd = true;
        if (suppressTimer) clearTimeout(suppressTimer);
        suppressTimer = setTimeout(function() { suppressNextMoveEnd = false; }, 1600);
        map.flyTo([lat, lng], zoom, { duration: 0.8 });
      }

      clusterGroup.clearLayers();
      currentStationsMap = {};

      var markers = [];
      if (Array.isArray(stations)) {
        for (var i = 0; i < stations.length; i++) {
          var s = stations[i];
          if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number' || !s.lat || !s.lng) {
            continue;
          }
          currentStationsMap[s.id] = s;

          var pinIcon = s.status === 'available' ? iconAvailable : (s.status === 'offline' ? iconOffline : iconBusy);
          var marker = L.marker([s.lat, s.lng], { icon: pinIcon });
          marker.stationId = s.id;

          marker.on('click', function(e) {
            var clickedStation = currentStationsMap[e.target.stationId];
            if (clickedStation) {
              postToApp({
                type: 'SELECT_STATION',
                station: clickedStation
              });
            }
          });

          markers.push(marker);
        }
      }

      clusterGroup.addLayers(markers);
    };
  </script>
</body>
</html>
    `;
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Leaflet Map"
          onLoad={() => pushMapData(true)}
        />
      </View>
    );
  }

  const NativeWebView = WebView as any;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NativeWebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={[styles.webView, { backgroundColor: colors.background }]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onLoadEnd={() => pushMapData(true)}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "SELECT_STATION" && data.station) {
              onSelectStation(data.station);
            } else if (data.type === "BOUNDS_CHANGE" && data.bounds && onBoundsChange) {
              onBoundsChange(data.bounds);
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
