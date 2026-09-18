import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function AdBanner() {
  const colors = useColors();

  if (process.env.EXPO_PUBLIC_ENABLE_ADS === "0") {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Publicidade
      </Text>
      <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
        Espaco reservado para anuncio no aplicativo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    padding: 12,
  },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  placeholder: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
