import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatBRL } from "@/lib/format";

interface HeroHeaderProps {
  balance: number;
  movementsCount: number;
}

export function HeroHeader({ balance, movementsCount }: HeroHeaderProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          ORGANIZAÇÃO FINANCEIRA PESSOAL
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Você no controle das suas finanças
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Um espaço simples para organizar a vida financeira, guardar dinheiro
          com mais constância e transformar metas soltas em planos reais.
        </Text>
      </View>
      <View
        style={[
          styles.snapshot,
          {
            backgroundColor: colors.cardElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.snapshotEyebrow, { color: colors.mutedForeground }]}>
          Sua visão de agora
        </Text>
        <Text
          style={[styles.snapshotValue, { color: colors.foreground }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatBRL(balance)}
        </Text>
        <Text style={[styles.snapshotMeta, { color: colors.mutedForeground }]}>
          {movementsCount} {movementsCount === 1 ? "movimentação registrada" : "movimentações registradas"}
        </Text>
        <Text style={[styles.snapshotCopy, { color: colors.mutedForeground }]}>
          Quando sobra dinheiro com intenção, a vida financeira começa a respirar.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 18,
  },
  left: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  snapshot: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  snapshotEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  snapshotValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    paddingVertical: 2,
  },
  snapshotMeta: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  snapshotCopy: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
