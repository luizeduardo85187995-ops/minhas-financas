import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface InputProps extends TextInputProps {
  label: string;
  containerStyle?: ViewStyle | ViewStyle[];
  hint?: string;
  prefix?: string;
}

export function Input({
  label,
  containerStyle,
  hint,
  prefix,
  style,
  ...rest
}: InputProps) {
  const colors = useColors();
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {prefix ? (
          <Text style={[styles.prefix, { color: colors.mutedForeground }]}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...rest}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }, style]}
        />
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  prefix: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 12,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
});
