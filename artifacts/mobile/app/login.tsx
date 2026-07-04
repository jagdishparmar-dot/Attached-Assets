import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiBase, useAuth } from "@/context/AuthContext";

const ERROR_MESSAGES: Record<string, string> = {
  misconfigured: "Hub is not configured — contact your admin.",
  network: "Cannot reach the Hub. Check your connection and try again.",
  invalid_credentials: "Incorrect mobile number or password.",
};

function isValidUrl(url: string): boolean {
  return /^https:\/\/.+\..+/.test(url.trim());
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, apiUrl, setApiUrl } = useAuth();

  const isMisconfigured = Platform.OS !== "web" && getApiBase() === "";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hub URL change modal
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);

  const handleLogin = async () => {
    if (isMisconfigured) {
      setError(ERROR_MESSAGES.misconfigured);
      return;
    }
    if (!phone.trim() || !password.trim()) {
      setError("Please enter your mobile number and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const result = await login(phone.trim(), password);
    if (result.ok) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      router.replace("/(tabs)");
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setError(
        ERROR_MESSAGES[result.errorType] ??
          "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  const openUrlModal = () => {
    setUrlInput(apiUrl ?? "");
    setUrlError("");
    setShowUrlModal(true);
  };

  const handleSaveUrl = async () => {
    const trimmed = urlInput.trim().replace(/\/+$/, "");
    if (!trimmed) {
      setUrlError("Please enter the Hub URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setUrlError(
        'Hub URL must start with "https://" (HTTP is not supported).',
      );
      return;
    }
    setUrlError("");
    setUrlSaving(true);
    try {
      await setApiUrl(trimmed);
      setShowUrlModal(false);
      setError("");
    } catch {
      setUrlError("Could not save URL. Please try again.");
    } finally {
      setUrlSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: "#0A2540" }]}>
      {/* Decorative blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* ── Hub URL modal ── */}
      <Modal
        visible={showUrlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUrlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconCircle}>
                <MaterialIcons name="device-hub" size={26} color="#1A3A6B" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: "#0A1628" }]}>
              Hub URL
            </Text>
            <Text style={[styles.modalSubtitle, { color: "#6B7A8D" }]}>
              Enter the correct Hub connection URL
            </Text>
            <View
              style={[
                styles.modalInputWrap,
                {
                  borderColor: urlError ? "#DC2626" : "#DDE3ED",
                  backgroundColor: "#F0F4F9",
                },
              ]}
            >
              <MaterialIcons name="link" size={18} color="#6B7A8D" />
              <TextInput
                style={[styles.modalInput, { color: "#0A1628" }]}
                value={urlInput}
                onChangeText={(t) => {
                  setUrlInput(t);
                  setUrlError("");
                }}
                placeholder="https://yourhub.replit.app"
                placeholderTextColor="#9BACC4"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            {urlError ? (
              <Text style={styles.urlErrorText}>{urlError}</Text>
            ) : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowUrlModal(false);
                  setUrlError("");
                }}
                disabled={urlSaving}
              >
                <Text style={[styles.modalBtnText, { color: "#4A6585" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalSaveBtn,
                  urlSaving && { opacity: 0.7 },
                ]}
                onPress={handleSaveUrl}
                disabled={urlSaving}
              >
                {urlSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hub icon button — native only, top-right */}
      {Platform.OS !== "web" && (
        <TouchableOpacity
          style={[styles.hubBtn, { top: insets.top + 12 }]}
          onPress={openUrlModal}
          activeOpacity={0.7}
        >
          <MaterialIcons name="device-hub" size={18} color="#4A6585" />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 48,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Misconfigured banner */}
          {isMisconfigured && (
            <View style={styles.misconfigBanner}>
              <MaterialIcons name="warning-amber" size={18} color="#92400E" />
              <Text style={styles.misconfigText}>
                Hub is not configured. Contact your admin before signing in.
              </Text>
            </View>
          )}

          {/* ── Login card ── */}
          <View style={[styles.card, { backgroundColor: "#FFFFFF" }]}>
            {/* Greeting */}
            <View style={styles.greetingRow}>
              <View style={styles.greetingIconWrap}>
                <MaterialIcons name="person" size={22} color="#1A3A6B" />
              </View>
              <View style={styles.greetingText}>
                <Text style={[styles.cardTitle, { color: "#0A1628" }]}>
                  Welcome back
                </Text>
                <Text style={[styles.cardSubtitle, { color: "#6B7A8D" }]}>
                  Sign in to your Coldverse account
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>
                Mobile Number
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: "#DDE3ED", backgroundColor: "#F8FAFC" },
                ]}
              >
                <MaterialIcons name="phone" size={19} color="#9BACC4" />
                <TextInput
                  style={[styles.input, { color: "#0A1628" }]}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (error) setError("");
                  }}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#C0CEDA"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: "#DDE3ED", backgroundColor: "#F8FAFC" },
                ]}
              >
                <MaterialIcons name="lock-outline" size={19} color="#9BACC4" />
                <TextInput
                  style={[styles.input, { color: "#0A1628" }]}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError("");
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#C0CEDA"
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={19}
                    color="#9BACC4"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={15} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Sign In button */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.signInBtnText}>Sign In</Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Hub URL recovery — native only */}
            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={styles.hubLink}
                onPress={openUrlModal}
                activeOpacity={0.65}
              >
                <MaterialIcons name="device-hub" size={12} color="#B0BEC5" />
                <Text style={styles.hubLinkText} numberOfLines={1}>
                  {apiUrl ? apiUrl : "Hub not configured"}
                  {" · "}
                  <Text style={{ color: "#7A9AB4" }}>Change</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.footer}>
            Coldverse Supply Chain Pvt. Ltd.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Blobs
  blobTopRight: {
    position: "absolute",
    top: -120,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#2563EB",
    opacity: 0.13,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#1A3A6B",
    opacity: 0.2,
  },

  hubBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  scroll: { paddingHorizontal: 24 },

  // Logo
  logoSection: { alignItems: "center", marginBottom: 36 },
  logoWrapper: {
    width: 200,
    height: 68,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  logoImage: { width: "100%", height: "100%" },

  // Card
  card: {
    borderRadius: 24,
    padding: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
    }),
  },

  // Greeting row
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  greetingIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF3FB",
    justifyContent: "center",
    alignItems: "center",
  },
  greetingText: { flex: 1 },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF2F8",
    marginBottom: 22,
  },

  // Fields
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 18,
  },

  // Sign In button
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#1A3A6B",
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#1A3A6B",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  signInBtnDisabled: { opacity: 0.65 },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },

  // Hub URL link
  hubLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 18,
    paddingVertical: 4,
  },
  hubLinkText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#B0BEC5",
    flex: 1,
  },

  // Misconfigured banner
  misconfigBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  misconfigText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#92400E",
    lineHeight: 19,
  },

  footer: {
    textAlign: "center",
    color: "#3D5A73",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 32,
  },

  // ── URL Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 22,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  modalIconRow: { alignItems: "center", marginBottom: 14 },
  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#EEF3FB",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    color: "#6B7A8D",
    marginBottom: 18,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 4,
  },
  modalInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  urlErrorText: {
    color: "#DC2626",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
    marginTop: 4,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: { borderWidth: 1.5, borderColor: "#E2E8F0" },
  modalSaveBtn: { backgroundColor: "#1A3A6B" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
