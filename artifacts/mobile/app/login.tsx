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
  misconfigured: "App is not configured — contact your admin.",
  network: "Can't reach the server. Check your connection and try again.",
  invalid_credentials: "Invalid Mobile Number or password.",
};

function isValidUrl(url: string): boolean {
  return /^https:\/\/.+\..+/.test(url.trim());
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, apiUrl, setApiUrl } = useAuth();

  const isMisconfigured = Platform.OS !== "web" && getApiBase() === "";

  const [phone, setPhone] = useState("9876543210");
  const [password, setPassword] = useState("cold@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Server URL change modal (so a wrong URL doesn't lock the user out)
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
      setError("Please enter your Mobile Number and password");
      return;
    }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await login(phone.trim(), password);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(
        ERROR_MESSAGES[result.errorType] ?? "Something went wrong. Please try again.",
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
      setUrlError("Please enter the server URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setUrlError('URL must start with "https://" (HTTP is not supported for security).');
      return;
    }
    setUrlError("");
    setUrlSaving(true);
    try {
      await setApiUrl(trimmed);
      setShowUrlModal(false);
      setError(""); // clear any previous auth error after URL change
    } catch {
      setUrlError("Could not save URL. Please try again.");
    } finally {
      setUrlSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: "#0A2540" }]}>
      {/* ── Server URL change modal (pre-login recovery) ── */}
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
                { borderColor: urlError ? "#DC2626" : "#DDE3ED", backgroundColor: "#F0F4F9" },
              ]}
            >
              <MaterialIcons name="link" size={18} color="#6B7A8D" />
              <TextInput
                style={[styles.modalInput, { color: "#0A1628" }]}
                value={urlInput}
                onChangeText={(t) => { setUrlInput(t); setUrlError(""); }}
                placeholder="https://yourapp.replit.app"
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
                onPress={() => { setShowUrlModal(false); setUrlError(""); }}
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

      <View style={styles.topBlob} />

      {/* Server settings button — lets user fix URL if login fails */}
      {Platform.OS !== "web" && (
        <TouchableOpacity
          style={[styles.serverBtn, { top: insets.top + 12 }]}
          onPress={openUrlModal}
          activeOpacity={0.7}
        >
          <MaterialIcons name="device-hub" size={18} color="#8BAFC7" />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appLabel}>Staff Portal</Text>
          </View>

          {isMisconfigured && (
            <View style={styles.misconfigBanner}>
              <MaterialIcons name="warning" size={18} color="#92400E" />
              <Text style={styles.misconfigText}>
                App is not configured. Contact your admin before logging in.
              </Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.cardTitle, { color: "#0A1628" }]}>
              Staff Login
            </Text>
            <Text style={[styles.cardSubtitle, { color: "#6B7A8D" }]}>
              Enter your credentials to access deliveries
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>
                Mobile Number
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: "#DDE3ED", backgroundColor: "#F0F4F9" },
                ]}
              >
                <MaterialIcons name="phone" size={20} color="#6B7A8D" />
                <TextInput
                  style={[styles.input, { color: "#0A1628" }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#9BACC4"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: "#DDE3ED", backgroundColor: "#F0F4F9" },
                ]}
              >
                <MaterialIcons name="lock" size={20} color="#6B7A8D" />
                <TextInput
                  style={[styles.input, { color: "#0A1628" }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#9BACC4"
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color="#6B7A8D"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.loginBtn,
                { backgroundColor: "#1A3A6B" },
                loading && styles.loginBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#FFFFFF" />
                  <Text style={styles.loginBtnText}>Login</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.hintBox}>
              <MaterialIcons name="info-outline" size={14} color="#6B7A8D" />
              <Text style={[styles.hintText, { color: "#6B7A8D" }]}>
                Demo:{" "}
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#1A3A6B",
                  }}
                >
                  9876543210
                </Text>{" "}
                · PW{" "}
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#1A3A6B",
                  }}
                >
                  cold@123
                </Text>
              </Text>
            </View>

            {/* Pre-login URL recovery — visible on native only */}
            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={styles.changeUrlLink}
                onPress={openUrlModal}
                activeOpacity={0.7}
              >
                <MaterialIcons name="device-hub" size={13} color="#9BACC4" />
                <Text style={styles.changeUrlText}>
                  {apiUrl ?? "Hub not configured"} · Change
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.footer}>
            Coldverse Supply Chain Pvt. Ltd. · v1.0.0
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBlob: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#2E6BE6",
    opacity: 0.15,
  },
  serverBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  scroll: { paddingHorizontal: 24 },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logoWrapper: {
    width: 220,
    height: 80,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoImage: { width: "100%", height: "100%" },
  appLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#F5A623",
    marginTop: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    backgroundColor: "#F0F4F9",
    padding: 10,
    borderRadius: 10,
  },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  changeUrlLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 14,
    paddingVertical: 4,
  },
  changeUrlText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#9BACC4",
  },
  misconfigBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  misconfigText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#92400E",
    lineHeight: 18,
  },
  footer: {
    textAlign: "center",
    color: "#4A6585",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 32,
  },
  // ── URL Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  modalIconRow: { alignItems: "center", marginBottom: 12 },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
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
    marginBottom: 16,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 4,
  },
  modalInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  urlErrorText: {
    color: "#DC2626",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
    marginTop: 2,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: { borderWidth: 1.5, borderColor: "#DDE3ED" },
  modalSaveBtn: { backgroundColor: "#1A3A6B" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
