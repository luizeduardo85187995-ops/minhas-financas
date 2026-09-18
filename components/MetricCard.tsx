import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatBRL } from "@/lib/format";

interface MetricCardProps {
  label: string;
  value: number;
  hint?: string;
  tone: "balance" | "income" | "expense" | "net" | "invest";
}

export function MetricCard({
  label,
  value,
  hint,
  tone,
}: MetricCardProps) {
  const colors = useColors();

  const palette = {
    balance: { bar: colors.saldo, text: colors.foreground },
    income: { bar: colors.income, text: colors.foreground },
    expense: { bar: colors.expense, text: colors.foreground },
    invest: { bar: colors.invest, text: "#ffffff" },
    net: { bar: "transparent", text: value >= 0 ? colors.net : colors.expense },
  }[tone];

  const isPlain = tone === "net";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {isPlain ? (
        <Text
          style={[styles.plainValue, { color: palette.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatBRL(value)}
        </Text>
      ) : (
        <View style={[styles.bar, { backgroundColor: palette.bar }]}>
          <Text
            style={[styles.barText, { color: "#06121f" }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatBRL(value)}
          </Text>
        </View>
      )}
      {hint ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  bar: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  barText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  plainValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    paddingVertical: 4,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 14,
  },
});
