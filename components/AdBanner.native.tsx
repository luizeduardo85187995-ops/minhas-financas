import Constants from "expo-constants";
import React, { useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const adsModule =
  process.env.EXPO_PUBLIC_ENABLE_ADS === "0"
    ? null
    : require("react-native-google-mobile-ads");
const useAdsForeground: (callback: () => void) => void =
  adsModule?.useForeground ?? (() => {});

type AdmobExtra = {
  admob?: {
    androidBannerUnitId?: string;
    iosBannerUnitId?: string;
  };
};

function getBannerUnitId(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as AdmobExtra;
  const configured =
    Platform.OS === "ios"
      ? extra.admob?.iosBannerUnitId
      : extra.admob?.androidBannerUnitId;
  return (
    process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID ||
    configured ||
    adsModule?.TestIds.ADAPTIVE_BANNER ||
    ""
  );
}

function isTestUnit(unitId: string): boolean {
  return (
    unitId.includes("3940256099942544") ||
    unitId === adsModule?.TestIds.ADAPTIVE_BANNER
  );
}

export function AdBanner() {
  const colors = useColors();
  const bannerRef = useRef<{ load: () => void } | null>(null);
  const unitId = useMemo(getBannerUnitId, []);

  useAdsForeground(() => {
    if (Platform.OS === "ios") {
      bannerRef.current?.load();
    }
  });

  const Banner = adsModule?.BannerAd;
  if (!adsModule || !Banner || process.env.EXPO_PUBLIC_ENABLE_ADS === "0") {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Publicidade{isTestUnit(unitId) ? " de teste" : ""}
      </Text>
      <Banner
        ref={bannerRef}
        unitId={unitId}
        size={adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    overflow: "hidden",
    paddingVertical: 10,
  },
  label: {
    alignSelf: "flex-start",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    paddingHorizontal: 12,
  },
});
