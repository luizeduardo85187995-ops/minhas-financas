import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.pie", selected: "chart.pie.fill" }} />
        <Label>Visão geral</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="banks">
        <Icon sf={{ default: "building.columns", selected: "building.columns.fill" }} />
        <Label>Bancos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>Lançamentos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="investments">
        <Icon
          sf={{ default: "chart.line.uptrend.xyaxis", selected: "chart.line.uptrend.xyaxis" }}
        />
        <Label>Investir</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="game">
        <Icon sf={{ default: "gamecontroller", selected: "gamecontroller.fill" }} />
        <Label>Jogo</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Relatórios</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planning">
        <Icon sf={{ default: "slider.horizontal.3", selected: "slider.horizontal.3" }} />
        <Label>Planejar</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Inter_700Bold",
          fontSize: 11,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Visão geral",
          tabBarIcon: ({ color }) => (
            <Feather name="pie-chart" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="banks"
        options={{
          title: "Bancos",
          tabBarIcon: ({ color }) => (
            <Feather name="credit-card" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Lançamentos",
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="investments"
        options={{
          title: "Investir",
          tabBarIcon: ({ color }) => (
            <Feather name="trending-up" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: "Jogo",
          tabBarIcon: ({ color }) => (
            <Feather name="target" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Relatórios",
          tabBarIcon: ({ color }) => (
            <Feather name="file-text" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: "Planejar",
          tabBarIcon: ({ color }) => (
            <Feather name="sliders" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
