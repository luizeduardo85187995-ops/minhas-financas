import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatBRL } from "@/lib/format";

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  color?: string;
}

export function ProgressBar({
  label,
  current,
  target,
  color,
}: ProgressBarProps) {
  const colors = useColors();
  const accent = color ?? colors.primary;
  const safeTarget = target > 0 ? target : 0;
  const ratio =
    safeTarget > 0 ? Math.max(0, Math.min(1, current / safeTarget)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.mutedForeground }]}>
          {formatBRL(Math.max(0, current))} de {formatBRL(safeTarget)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: accent,
              width: `${percent}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.percent, { color: colors.mutedForeground }]}>
        {safeTarget > 0
          ? `${percent}% concluído`
          : "Defina uma meta para acompanhar o progresso"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    flex: 1,
  },
  value: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "right",
  },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  percent: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
});
