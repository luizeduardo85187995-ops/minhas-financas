import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdBanner } from "@/components/AdBanner";
import { useColors } from "@/hooks/useColors";

interface ScreenProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
}

export function Screen({ title, subtitle, eyebrow, children }: ScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {Platform.OS === "android" ? (
        <StatusBar
          backgroundColor={colors.background}
          barStyle="light-content"
        />
      ) : null}
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPad + 8,
            paddingBottom: 110 + insets.bottom,
          },
        ]}
      >
        {title || subtitle || eyebrow ? (
          <View style={styles.header}>
            {eyebrow ? (
              <Text style={[styles.eyebrow, { color: colors.primary }]}>
                {eyebrow.toUpperCase()}
              </Text>
            ) : null}
            {title ? (
              <Text style={[styles.title, { color: colors.foreground }]}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.body}>
          {children}
          <AdBanner />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    gap: 16,
  },
});
