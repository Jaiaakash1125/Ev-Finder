import { Platform, Linking } from "react-native";

export async function openStationDirections(lat: number, lng: number, label?: string): Promise<void> {
  const encodedLabel = encodeURIComponent(label || "EV Charging Station");

  const url = Platform.select({
    ios: `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedLabel}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });

  if (!url) return;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // Fallback to web Google Maps URL
  }

  await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}
