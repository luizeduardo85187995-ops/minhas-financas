import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function Card({ children, style }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  tag?: string;
  tagColor?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  tag,
  tagColor,
}: SectionHeaderProps) {
  const colors = useColors();
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerText}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
      </View>
      {tag ? (
        <View
          style={[
            styles.tag,
            {
              backgroundColor: tagColor
                ? `${tagColor}22`
                : colors.secondary,
              borderColor: tagColor ?? colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.tagText,
              {
                color: tagColor ?? colors.mutedForeground,
              },
            ]}
            numberOfLines={1}
          >
            {tag}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 170,
  },
  tagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
});
