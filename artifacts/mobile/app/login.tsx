import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiBase, isValidHubUrl, useAuth } from "@/context/AuthContext";

const ERROR_MESSAGES: Record<string, string> = {
  misconfigured: "Hub is not configured — set your Hub URL below.",
  network: "Cannot reach the Hub. Check your connection and try again.",
  invalid_credentials: "Incorrect mobile number or password.",
};

type FieldKey = "phone" | "password" | null;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, apiUrl, setApiUrl } = useAuth();

  const isMisconfigured = getApiBase() === "";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<FieldKey>(null);

  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);

  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandLift = useRef(new Animated.Value(18)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formLift = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(brandOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(brandLift, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 460, useNativeDriver: true }),
        Animated.timing(formLift, { toValue: 0, duration: 460, useNativeDriver: true }),
      ]),
    ]).start();
  }, [brandOpacity, brandLift, formOpacity, formLift]);

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
      setUrlError("Please enter the Hub URL.");
      return;
    }
    if (!isValidHubUrl(trimmed)) {
      setUrlError(
        "Enter a valid Hub URL (https://… or http://localhost:8080 for local).",
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

  const fieldBorder = (key: FieldKey, hasError = false) => {
    if (hasError) return "#DC2626";
    if (focused === key) return "#2E6BE6";
    return "#DDE3ED";
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0B1F3A", "#12305A", "#0A2540"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.gridHint} />

      <Modal
        visible={showUrlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUrlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <MaterialIcons name="device-hub" size={24} color="#1A3A6B" />
            </View>
            <Text style={styles.modalTitle}>Hub URL</Text>
            <Text style={styles.modalSubtitle}>
              Update the server your device connects to
            </Text>
            <View
              style={[
                styles.modalInputWrap,
                { borderColor: urlError ? "#DC2626" : "#DDE3ED" },
              ]}
            >
              <MaterialIcons name="link" size={18} color="#6B7A8D" />
              <TextInput
                style={styles.modalInput}
                value={urlInput}
                onChangeText={(t) => {
                  setUrlInput(t);
                  setUrlError("");
                }}
                placeholder="http://127.0.0.1:8080"
                placeholderTextColor="#9BACC4"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            {urlError ? <Text style={styles.urlErrorText}>{urlError}</Text> : null}
            <View style={styles.modalBtns}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => {
                  setShowUrlModal(false);
                  setUrlError("");
                }}
                disabled={urlSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalSaveBtn,
                  (urlSaving || pressed) && { opacity: 0.85 },
                ]}
                onPress={handleSaveUrl}
                disabled={urlSaving}
              >
                {urlSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Pressable
        style={[styles.hubBtn, { top: (Platform.OS === "web" ? 16 : insets.top) + 10 }]}
        onPress={openUrlModal}
        accessibilityLabel="Change Hub URL"
        android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true, radius: 22 }}
      >
        <MaterialIcons name="settings-ethernet" size={20} color="#A8C0D8" />
      </Pressable>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 36,
              paddingBottom: insets.bottom + 36,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.brandBlock,
              { opacity: brandOpacity, transform: [{ translateY: brandLift }] },
            ]}
          >
            <View style={styles.logoPlate}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>Coldverse</Text>
            <Text style={styles.brandTagline}>Staff sign-in for field operations</Text>
          </Animated.View>

          {isMisconfigured && (
            <View style={styles.misconfigBanner}>
              <MaterialIcons name="warning-amber" size={18} color="#92400E" />
              <Text style={styles.misconfigText}>
                Hub is not configured. Tap the network icon to set your Hub URL.
              </Text>
            </View>
          )}

          <Animated.View
            style={[
              styles.card,
              { opacity: formOpacity, transform: [{ translateY: formLift }] },
            ]}
          >
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Use your staff mobile number and password</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile number</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: fieldBorder("phone"),
                    backgroundColor: focused === "phone" ? "#F5F8FF" : "#F7F9FC",
                  },
                ]}
              >
                <MaterialIcons
                  name="phone-iphone"
                  size={20}
                  color={focused === "phone" ? "#2E6BE6" : "#8FA3B8"}
                />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocused("phone")}
                  onBlur={() => setFocused(null)}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#B4C2D2"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: fieldBorder("password"),
                    backgroundColor: focused === "password" ? "#F5F8FF" : "#F7F9FC",
                  },
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={focused === "password" ? "#2E6BE6" : "#8FA3B8"}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  placeholderTextColor="#B4C2D2"
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color="#8FA3B8"
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.signInBtn,
                (loading || pressed) && styles.signInBtnPressed,
              ]}
              onPress={handleLogin}
              disabled={loading}
              android_ripple={{ color: "rgba(255,255,255,0.16)" }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.signInBtnText}>Sign in</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <Pressable style={styles.hubChip} onPress={openUrlModal}>
              <MaterialIcons name="device-hub" size={14} color="#5B8DEF" />
              <Text style={styles.hubChipText} numberOfLines={1}>
                {apiUrl || "Hub not configured"}
              </Text>
              <Text style={styles.hubChipAction}>Change</Text>
            </Pressable>
          </Animated.View>

          <Text style={styles.footer}>Coldverse Supply Chain Pvt. Ltd.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A2540" },
  flex: { flex: 1 },

  glowTop: {
    position: "absolute",
    top: -140,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#2E6BE6",
    opacity: 0.18,
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#1A3A6B",
    opacity: 0.45,
  },
  gridHint: {
    position: "absolute",
    top: "28%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  hubBtn: {
    position: "absolute",
    right: 18,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },

  scroll: {
    paddingHorizontal: 22,
    flexGrow: 1,
    justifyContent: "center",
  },

  brandBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoPlate: {
    width: 168,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  logoImage: { width: "100%", height: "100%" },
  brandName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  brandTagline: {
    marginTop: 6,
    color: "#8BAFC7",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: "#04101F",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.22,
        shadowRadius: 28,
      },
      android: { elevation: 10 },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0A1628",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    marginBottom: 22,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: "#6B7A8D",
  },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#3D5A73",
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#0A1628",
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 18,
  },

  signInBtn: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#1A3A6B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#1A3A6B",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  signInBtnPressed: { opacity: 0.88 },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },

  hubChip: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#EEF3FB",
  },
  hubChipText: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#5A718A",
  },
  hubChipAction: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#2E6BE6",
  },

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
    color: "rgba(139, 175, 199, 0.75)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 28,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(6, 16, 32, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EEF3FB",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    color: "#0A1628",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    color: "#6B7A8D",
    marginBottom: 16,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 13,
    paddingHorizontal: 13,
    minHeight: 48,
    backgroundColor: "#F7F9FC",
  },
  modalInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0A1628",
  },
  urlErrorText: {
    color: "#DC2626",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalSaveBtn: { backgroundColor: "#1A3A6B" },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#4A6585",
  },
  modalSaveText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
