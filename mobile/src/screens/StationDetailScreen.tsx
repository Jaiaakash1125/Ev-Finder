import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Share,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  MapPin,
  Navigation,
  Share2,
  Zap,
  Clock,
  Star,
  Info,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react-native";

import type { ReviewItem, Station } from "../types";
import type { RootStackParamList } from "../navigation/types";
import {
  fetchStationById,
  fetchStationReviews,
  postStationReview,
  getErrorMessage,
  isAbortError,
} from "../api/stationsApi";
import { colors, radius, spacing } from "../theme/theme";
import { openStationDirections } from "../utils/maps";
import { LeafletMapView } from "../components/LeafletMapView";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";

type Props = NativeStackScreenProps<RootStackParamList, "StationDetail">;

type PlugCondition = ReviewItem["plugCondition"];

const PLUG_CONDITIONS: { id: PlugCondition; label: string }[] = [
  { id: "working_perfect", label: "Working perfectly" },
  { id: "slow_charge", label: "Slow charge" },
  { id: "broken_connector", label: "Broken connector" },
];

const STATUS_LABEL: Record<Station["status"], string> = {
  available: "Available",
  limited: "Limited",
  busy: "Busy",
  offline: "Offline",
};

function formatDate(raw: string): string {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ReviewCard = memo(({ review }: { review: ReviewItem }) => {
  const condColor =
    review.plugCondition === "working_perfect"
      ? colors.success
      : review.plugCondition === "slow_charge"
        ? colors.warning
        : colors.destructive;

  const condLabel =
    review.plugCondition === "working_perfect"
      ? "Working perfectly"
      : review.plugCondition === "slow_charge"
        ? "Slow charge"
        : "Broken connector";

  const CondIcon =
    review.plugCondition === "working_perfect"
      ? CheckCircle2
      : review.plugCondition === "slow_charge"
        ? AlertCircle
        : XCircle;

  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewItemHeader}>
        <Text style={styles.reviewerName}>{review.userName}</Text>
        <View style={styles.reviewStars}>
          <Star size={13} color={colors.warning} fill={colors.warning} />
          <Text style={styles.reviewRatingNum}>{review.rating}.0</Text>
        </View>
      </View>

      <View style={styles.reviewMetaRow}>
        <View style={styles.plugBadge}>
          <CondIcon size={12} color={condColor} />
          <Text style={[styles.plugBadgeText, { color: condColor }]}>{condLabel}</Text>
        </View>
        {review.createdAt ? (
          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
        ) : null}
      </View>

      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
    </View>
  );
});

export const StationDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { stationId, station: initialStation } = route.params;

  const [station, setStation] = useState<Station | null>(initialStation || null);
  const [loading, setLoading] = useState<boolean>(!initialStation);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Add review form state
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [plugCondition, setPlugCondition] = useState<PlugCondition>("working_perfect");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const loadData = useCallback(
    async (isRefresh = false, signal?: AbortSignal) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!station) {
        setLoading(true);
      }
      setError(null);
      setReviewsLoading(true);
      setReviewsError(null);

      const stationTask = fetchStationById(stationId, signal)
        .then((data) => {
          setStation(data);
          navigation.setOptions({ title: data.name });
        })
        .catch((err) => {
          if (!isAbortError(err)) {
            setError(getErrorMessage(err));
          }
        });

      const reviewsTask = fetchStationReviews(stationId, signal)
        .then((list) => {
          setReviews(list);
        })
        .catch((err) => {
          if (!isAbortError(err)) {
            setReviewsError(getErrorMessage(err));
          }
        });

      await Promise.all([stationTask, reviewsTask]);
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
        setReviewsLoading(false);
      }
    },
    [stationId, navigation]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(false, controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const mapCenter = useMemo(
    () =>
      station
        ? { lat: station.lat, lng: station.lng, zoom: 15, key: 1 }
        : undefined,
    [station?.lat, station?.lng]
  );

  const singleStationList = useMemo(() => (station ? [station] : []), [station]);

  const handleShare = async () => {
    if (!station) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;
    try {
      await Share.share({
        title: station.name,
        message: `${station.name} (${station.network})\n${station.address}${
          station.city ? `, ${station.city}` : ""
        }\nMax Power: ${station.maxPowerKw} kW · Connectors: ${station.connectors.join(", ")}\n${mapsUrl}`,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleSubmitReview = async () => {
    if (rating < 1 || rating > 5) {
      setSubmitError("Please select a star rating from 1 to 5.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await postStationReview(stationId, {
        userName: userName.trim() || "EV Driver",
        rating,
        comment: comment.trim(),
        plugCondition,
      });

      setUserName("");
      setRating(5);
      setComment("");
      setPlugCondition("working_perfect");
      setShowReviewForm(false);
      setSubmitSuccess(true);

      // Refresh both reviews list and updated station rating/reviews count
      await loadData(true);
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Failed to submit review."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !station) {
    return <LoadingState message="Loading station details..." />;
  }

  if (error && !station) {
    return (
      <ErrorState
        title="Can't load station"
        message={error}
        onRetry={() => loadData(false)}
      />
    );
  }

  if (!station) {
    return <EmptyState title="Station not found" message="This station could not be loaded." />;
  }

  const statusColor =
    station.status === "available"
      ? colors.success
      : station.status === "offline"
        ? colors.destructive
        : colors.warning;

  const statusBg =
    station.status === "available"
      ? colors.successBg
      : station.status === "offline"
        ? colors.destructiveBg
        : colors.warningBg;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top badges: Network + Status */}
        <View style={styles.badgeRow}>
          <View style={styles.networkBadge}>
            <Zap size={12} color={colors.accent} />
            <Text style={styles.networkText}>{station.network}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[station.status]}
            </Text>
          </View>
        </View>

        {/* Station Name & Address */}
        <Text style={styles.title}>{station.name}</Text>

        <View style={styles.addressRow}>
          <MapPin size={15} color={colors.foregroundSubtle} style={styles.addressIcon} />
          <Text style={styles.addressText}>
            {station.address}
            {station.city && !station.address.toLowerCase().includes(station.city.toLowerCase())
              ? `, ${station.city}`
              : ""}
            {station.state ? `, ${station.state}` : ""}
            {station.pincode ? ` - ${station.pincode}` : ""}
          </Text>
        </View>

        {/* Primary Action Buttons: Get Directions + Share */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={() => openStationDirections(station.lat, station.lng, station.name)}
            activeOpacity={0.85}
          >
            <Navigation size={17} color={colors.accentForeground} />
            <Text style={styles.directionsText}>Get Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Share2 size={17} color={colors.primary} />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Demo data hint */}
        <View style={styles.demoHint}>
          <Info size={14} color={colors.foregroundMuted} />
          <Text style={styles.demoHintText}>
            Demo data: Port availability, tariff, status, and baseline rating are sample values, not live charger telemetry.
          </Text>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PORTS FREE</Text>
            <Text style={[styles.metricValue, { color: colors.accent }]}>
              {station.freePorts}/{station.totalPorts}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>MAX POWER</Text>
            <Text style={styles.metricValue}>{station.maxPowerKw} kW</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PRICE</Text>
            <Text style={styles.metricValue}>₹{station.pricePerKwh}/kWh</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>RATING</Text>
            <View style={styles.ratingValueRow}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.metricValue}>
                {station.rating > 0 ? station.rating.toFixed(1) : "—"}
              </Text>
              <Text style={styles.reviewCountSmall}>({station.reviews})</Text>
            </View>
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.infoCard}>
          <View style={styles.hoursRow}>
            <Clock size={16} color={colors.primary} />
            <View>
              <Text style={styles.infoLabel}>OPERATING HOURS</Text>
              <Text style={styles.infoValue}>{station.hours || "24×7"}</Text>
            </View>
          </View>
        </View>

        {/* Connectors */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Connectors</Text>
          <View style={styles.chipWrap}>
            {station.connectors.map((c, idx) => (
              <View key={`${c}-${idx}`} style={styles.connectorChip}>
                <Zap size={13} color={colors.accent} />
                <Text style={styles.connectorChipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Amenities */}
        {station.amenities.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.chipWrap}>
              {station.amenities.map((a, idx) => (
                <View key={`${a}-${idx}`} style={styles.amenityChip}>
                  <Text style={styles.amenityChipText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Small Map Preview */}
        <View style={styles.sectionCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>Location Preview</Text>
            <Text style={styles.coordsText}>
              {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
            </Text>
          </View>
          <View style={styles.mapPreviewContainer}>
            <LeafletMapView
              stations={singleStationList}
              center={mapCenter}
              onSelectStation={() => {}}
              isDark
            />
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.sectionCard}>
          <View style={styles.reviewsHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Driver Reviews ({reviews.length})
              </Text>
              <Text style={styles.reviewsSubtitle}>
                Community feedback saved to the server
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addReviewToggle}
              onPress={() => {
                setShowReviewForm((prev) => !prev);
                setSubmitError(null);
                setSubmitSuccess(false);
              }}
              activeOpacity={0.8}
            >
              <MessageSquarePlus size={15} color={colors.accentForeground} />
              <Text style={styles.addReviewToggleText}>
                {showReviewForm ? "Cancel" : "Add review"}
              </Text>
            </TouchableOpacity>
          </View>

          {submitSuccess ? (
            <View style={styles.successBanner}>
              <CheckCircle2 size={15} color={colors.success} />
              <Text style={styles.successBannerText}>
                Review submitted! Thank you for helping fellow EV drivers.
              </Text>
            </View>
          ) : null}

          {/* Add Review Form */}
          {showReviewForm ? (
            <View style={styles.reviewForm}>
              <Text style={styles.formLabel}>Your Name (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={userName}
                onChangeText={setUserName}
                placeholder="EV Driver"
                placeholderTextColor={colors.foregroundSubtle}
                maxLength={120}
              />

              <Text style={styles.formLabel}>Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity
                    key={num}
                    onPress={() => setRating(num)}
                    style={styles.starBtn}
                    activeOpacity={0.7}
                  >
                    <Star
                      size={28}
                      color={num <= rating ? colors.warning : colors.foregroundSubtle}
                      fill={num <= rating ? colors.warning : "transparent"}
                    />
                  </TouchableOpacity>
                ))}
                <Text style={styles.starLabel}>{rating} / 5</Text>
              </View>

              <Text style={styles.formLabel}>Plug Condition</Text>
              <View style={styles.conditionRow}>
                {PLUG_CONDITIONS.map((opt) => {
                  const active = plugCondition === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.conditionChip,
                        active && styles.conditionChipActive,
                      ]}
                      onPress={() => setPlugCondition(opt.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.conditionChipText,
                          active && styles.conditionChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.formLabel}>Comment</Text>
              <TextInput
                style={[styles.textInput, styles.commentInput]}
                value={comment}
                onChangeText={setComment}
                placeholder="Share charging speed, plug status, or parking tips..."
                placeholderTextColor={colors.foregroundSubtle}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {submitError ? <Text style={styles.formError}>{submitError}</Text> : null}

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmitReview}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.accentForeground} />
                ) : (
                  <Text style={styles.submitBtnText}>Post Review</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Reviews List */}
          {reviewsLoading && reviews.length === 0 ? (
            <LoadingState compact message="Loading reviews..." />
          ) : reviewsError ? (
            <ErrorState
              compact
              title="Couldn't load reviews"
              message={reviewsError}
              onRetry={() => loadData(true)}
            />
          ) : reviews.length === 0 ? (
            <EmptyState
              compact
              title="No reviews yet"
              message="Be the first to share your charging experience at this station."
            />
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((rev) => (
                <ReviewCard key={rev.id} review={rev} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 242, 254, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  networkText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  directionsBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.accentForeground,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  shareText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  demoHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  demoHintText: {
    flex: 1,
    fontSize: 11,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
    marginTop: 4,
  },
  ratingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  reviewCountSmall: {
    fontSize: 12,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.foreground,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  connectorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 242, 254, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  connectorChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  amenityChip: {
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  amenityChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coordsText: {
    fontSize: 11,
    color: colors.foregroundSubtle,
    fontWeight: "600",
  },
  mapPreviewContainer: {
    height: 200,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reviewsSubtitle: {
    fontSize: 11,
    color: colors.foregroundSubtle,
    marginTop: 2,
  },
  addReviewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  addReviewToggleText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.accentForeground,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.success,
  },
  reviewForm: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
  },
  commentInput: {
    minHeight: 80,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starBtn: {
    padding: 2,
  },
  starLabel: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "800",
    color: colors.foreground,
  },
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  conditionChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  conditionChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  conditionChipTextActive: {
    color: colors.accentForeground,
    fontWeight: "900",
  },
  formError: {
    fontSize: 12,
    color: colors.destructive,
    fontWeight: "700",
  },
  submitBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.accentForeground,
  },
  reviewsList: {
    gap: spacing.sm,
  },
  reviewItem: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  reviewItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.foreground,
  },
  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewRatingNum: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.warning,
  },
  reviewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plugBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  plugBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  reviewDate: {
    fontSize: 11,
    color: colors.foregroundSubtle,
  },
  reviewComment: {
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 19,
  },
});
