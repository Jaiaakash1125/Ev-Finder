import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { X, Phone, KeyRound, ShieldCheck, Zap } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";
import { api } from "../api/client";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+919876543210");
  const [otp, setOtp] = useState("123456");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) return Alert.alert("Error", "Please enter phone number");
    setLoading(true);
    try {
      const res = await api.sendOtp(phone);
      setStep("otp");
      if (res.data?.demoOtp) {
        setOtp(res.data.demoOtp);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return Alert.alert("Error", "Please enter OTP");
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp);
      Alert.alert("Welcome!", "You are now authenticated on India EV Finder.");
      onSuccess(res.user);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={colors.frost} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Zap size={22} color="#00f2fe" />
            </View>
            <Text style={styles.title}>
              {step === "phone" ? "Sign In to EV Finder" : "Enter Verification Code"}
            </Text>
            <Text style={styles.subtitle}>
              {step === "phone"
                ? "Enter your mobile number to sync your EV vehicles, reservations & favorites."
                : `Enter the 6-digit SMS code sent to ${phone}`}
            </Text>
          </View>

          {step === "phone" ? (
            <View style={styles.form}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color={colors.primary} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.foregroundSubtle}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSendOtp} activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Verification OTP ➔</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>6-DIGIT OTP</Text>
              <View style={styles.inputWrapper}>
                <KeyRound size={18} color={colors.accent} />
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="123456"
                  placeholderTextColor={colors.foregroundSubtle}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyOtp} activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify & Continue ➔</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep("phone")} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Change Mobile Number</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 4,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.foregroundMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  form: {
    marginTop: spacing.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundInput,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#020617",
  },
  backBtn: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  backBtnText: {
    fontSize: 12,
    color: colors.frost,
    fontWeight: "600",
  },
});
