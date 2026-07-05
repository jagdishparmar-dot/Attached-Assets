import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

// Pre-fill from build-time env var so admins only need one tap on existing builds.
const ENV_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const DEFAULT_URL = ENV_DOMAIN ? `https://${ENV_DOMAIN}` : "";

function isValidUrl(url: string): boolean {
  return /^https:\/\/.+\..+/.test(url.trim());
}

export default function HubSetupScreen() {
  const insets = useSafeAreaInsets();
  const { setApiUrl } = useAuth();

  const [url, setUrl] = useState(DEFAULT_URL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) {
      setError("Please enter your Hub URL to continue.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError('Hub URL must start with "https://" — e.g. https://yourhub.replit.app');
      return;
    }
    setError("");
    setSaving(true);
    try {
      await setApiUrl(trimmed);
      // Stack.Protected guard in _layout.tsx navigates to login automatically.
    } catch {
      setError("Could not save the Hub URL. Please try again.");
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: "#0A2540" }]}>
      {/* Decorative blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 32,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand header ── */}
          <View style={styles.brandSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.hubBadge}>
              <MaterialIcons name="device-hub" size={11} color="#F5A623" />
              <Text style={styles.hubBadgeText}>HUB SETUP</Text>
            </View>
          </View>

          {/* ── Main card ── */}
          <View style={[styles.card, { backgroundColor: "#FFFFFF" }]}>
            {/* Icon */}
            <View style={styles.iconSection}>
              <View style={styles.iconRing}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="device-hub" size={32} color="#1A3A6B" />
                </View>
              </View>
            </View>

            <Text style={[styles.cardTitle, { color: "#0A1628" }]}>
              Connect to Your Hub
            </Text>
            <Text style={[styles.cardSubtitle, { color: "#6B7A8D" }]}>
              Enter the Hub URL provided by your Coldverse admin to get started.
              Your connection will be saved securely on this device.
            </Text>

            {/* One-time badge */}
            <View style={styles.onceStrip}>
              <MaterialIcons name="check-circle" size={13} color="#0A8A4A" />
              <Text style={styles.onceStripText}>
                One-time setup · Your Hub URL is saved for future logins
              </Text>
            </View>

            {/* URL field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>
                Hub URL
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: error ? "#DC2626" : "#DDE3ED",
                    backgroundColor: "#F0F4F9",
                  },
                ]}
              >
                <MaterialIcons name="link" size={20} color="#6B7A8D" />
                <TextInput
                  style={[styles.input, { color: "#0A1628" }]}
                  value={url}
                  onChangeText={(t) => {
                    setUrl(t);
                    setError("");
                  }}
                  placeholder="https://yourhub.replit.app"
                  placeholderTextColor="#9BACC4"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  textContentType="URL"
                  returnKeyType="done"
                  onSubmitEditing={handleConnect}
                />
              </View>
              <Text style={styles.fieldHint}>
                Provided by your Coldverse admin — starts with https://
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* CTA button */}
            <TouchableOpacity
              style={[
                styles.connectBtn,
                saving && styles.connectBtnDisabled,
              ]}
              onPress={handleConnect}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="device-hub" size={20} color="#FFFFFF" />
                  <Text style={styles.connectBtnText}>Connect to Hub</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Help text */}
            <View style={styles.helpBox}>
              <MaterialIcons name="help-outline" size={14} color="#6B7A8D" />
              <Text style={[styles.helpText, { color: "#6B7A8D" }]}>
                Don't have your Hub URL?&nbsp;
                <Text style={{ color: "#1A3A6B", fontFamily: "Inter_600SemiBold" }}>
                  Ask your hub supervisor or admin.
                </Text>
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>Coldverse Supply Chain Pvt. Ltd.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  blobTopRight: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#2E6BE6",
    opacity: 0.12,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#1A3A6B",
    opacity: 0.18,
  },
  scroll: { paddingHorizontal: 24 },

  // ── Brand header ──
  brandSection: { alignItems: "center", marginBottom: 28 },
  logoWrapper: {
    width: 200,
    height: 70,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoImage: { width: "100%", height: "100%" },
  hubBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,166,35,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.35)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  hubBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#F5A623",
    letterSpacing: 1.5,
  },

  // ── Card ──
  card: {
    borderRadius: 24,
    padding: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
    }),
  },

  // ── Icon ──
  iconSection: { alignItems: "center", marginBottom: 20 },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: "#EEF3FB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D6E4F7",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 28,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 18,
  },

  // ── One-time strip ──
  onceStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 22,
  },
  onceStripText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#166534",
    lineHeight: 17,
  },

  // ── URL field ──
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1,
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#9BACC4",
    marginTop: 7,
    lineHeight: 15,
  },

  // ── Error ──
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 18,
  },

  // ── Connect button ──
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#1A3A6B",
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#1A3A6B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  connectBtnDisabled: { opacity: 0.7 },
  connectBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },

  // ── Help box ──
  helpBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
  },
  helpText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },

  footer: {
    textAlign: "center",
    color: "#4A6585",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 32,
  },
});
