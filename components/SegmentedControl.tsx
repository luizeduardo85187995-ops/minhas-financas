import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export interface Segment {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  activeColor?: string;
}

export function SegmentedControl({
  segments,
  value,
  onChange,
  activeColor,
}: SegmentedControlProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <Pressable
            key={seg.value}
            onPress={() => onChange(seg.value)}
            style={({ pressed }) => [
              styles.segment,
              active && {
                backgroundColor: activeColor ?? colors.card,
                shadowOpacity: 0.06,
              },
              !active && pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: active
                    ? activeColor
                      ? "#ffffff"
                      : colors.foreground
                    : colors.mutedForeground,
                  fontFamily: active
                    ? "Inter_700Bold"
                    : "Inter_500Medium",
                },
              ]}
            >
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  text: {
    fontSize: 13,
  },
});
