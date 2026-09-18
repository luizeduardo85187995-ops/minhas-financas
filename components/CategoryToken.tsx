import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CategoryTokenProps {
  label: string;
  tone: "income" | "expense";
  onRemove?: () => void;
}

export function CategoryToken({ label, tone, onRemove }: CategoryTokenProps) {
  const colors = useColors();
  const bg = tone === "income" ? colors.incomeSoft : colors.expenseSoft;
  const fg = tone === "income" ? colors.income : colors.expense;
  return (
    <View style={[styles.token, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [
            styles.remove,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Feather name="x" size={12} color={fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  token: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  remove: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
