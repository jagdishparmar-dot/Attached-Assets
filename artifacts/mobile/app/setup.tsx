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

export default function ServerSetupScreen() {
  const insets = useSafeAreaInsets();
  const { setApiUrl } = useAuth();

  const [url, setUrl] = useState(DEFAULT_URL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) {
      setError("Please enter the server URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError('URL must start with "https://" (HTTP is not supported for security).');
      return;
    }
    setError("");
    setSaving(true);
    try {
      await setApiUrl(trimmed);
      // Stack.Protected guard in _layout.tsx transitions to login automatically
      // once isApiConfigured becomes true — no explicit router.push needed.
    } catch {
      setError("Could not save the URL. Please try again.");
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: "#0A2540" }]}>
      <View style={styles.topBlob} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 40,
            },
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
            <Text style={styles.appLabel}>First Time Setup</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.iconRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="dns" size={28} color="#1A3A6B" />
              </View>
            </View>

            <Text style={[styles.cardTitle, { color: "#0A1628" }]}>
              Connect to Server
            </Text>
            <Text style={[styles.cardSubtitle, { color: "#6B7A8D" }]}>
              Enter your Coldverse API server URL. This is a one-time setup —
              the URL will be saved on your device permanently.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>
                Server URL
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
                  placeholder="https://yourapp.replit.app"
                  placeholderTextColor="#9BACC4"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  textContentType="URL"
                />
              </View>
              <Text style={styles.fieldHint}>
                No trailing slash — e.g.&nbsp;https://yourapp.replit.app
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: "#1A3A6B" },
                saving && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveBtnText}>Save & Connect</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={14} color="#1A3A6B" />
              <Text style={[styles.infoText, { color: "#4A6585" }]}>
                Contact your admin for the correct server URL. You can update
                it later from Profile → Server URL.
              </Text>
            </View>
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
  iconRow: { alignItems: "center", marginBottom: 16 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#EEF3FB",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
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
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#9BACC4",
    marginTop: 6,
  },
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
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 16,
    backgroundColor: "#EEF3FB",
    padding: 10,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },
  footer: {
    textAlign: "center",
    color: "#4A6585",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 32,
  },
});
