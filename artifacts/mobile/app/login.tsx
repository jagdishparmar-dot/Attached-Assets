import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [employeeId, setEmployeeId] = useState("CV-DRV-001");
  const [password, setPassword] = useState("cold@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!employeeId.trim() || !password.trim()) {
      setError("Please enter your Employee ID and password");
      return;
    }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const success = await login(employeeId.trim(), password);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Invalid Employee ID or password");
      setLoading(false);
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
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../assets/images/icon.png")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.brandName}>COLDVERSE</Text>
            <Text style={styles.brandTagline}>Supply Chain Pvt. Ltd.</Text>
            <Text style={styles.appLabel}>Driver Portal</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.cardTitle, { color: "#0A1628" }]}>Driver Login</Text>
            <Text style={[styles.cardSubtitle, { color: "#6B7A8D" }]}>
              Enter your credentials to access deliveries
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>Employee ID</Text>
              <View style={[styles.inputWrap, { borderColor: "#DDE3ED", backgroundColor: "#F0F4F9" }]}>
                <MaterialIcons name="badge" size={20} color="#6B7A8D" />
                <TextInput
                  style={[styles.input, { color: "#0A1628" }]}
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  placeholder="e.g. CV-DRV-001"
                  placeholderTextColor="#9BACC4"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: "#1A3A6B" }]}>Password</Text>
              <View style={[styles.inputWrap, { borderColor: "#DDE3ED", backgroundColor: "#F0F4F9" }]}>
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
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color="#6B7A8D" />
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
              style={[styles.loginBtn, { backgroundColor: "#1A3A6B" }, loading && styles.loginBtnDisabled]}
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
                Demo: ID <Text style={{ fontFamily: "Inter_600SemiBold", color: "#1A3A6B" }}>CV-DRV-001</Text> · PW <Text style={{ fontFamily: "Inter_600SemiBold", color: "#1A3A6B" }}>cold@123</Text>
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>Coldverse Supply Chain Pvt. Ltd. · v1.0.0</Text>
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
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2E6BE6",
  },
  logoImage: { width: "100%", height: "100%" },
  brandName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  brandTagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8BAFC7", marginTop: 2 },
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
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 24 },
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
  errorText: { color: "#DC2626", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
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
  footer: {
    textAlign: "center",
    color: "#4A6585",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 32,
  },
});
