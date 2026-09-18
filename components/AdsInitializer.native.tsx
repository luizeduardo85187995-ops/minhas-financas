import { useEffect } from "react";

const adsModule =
  process.env.EXPO_PUBLIC_ENABLE_ADS === "0"
    ? null
    : require("react-native-google-mobile-ads");

export function AdsInitializer() {
  useEffect(() => {
    if (!adsModule) return;

    const mobileAds = adsModule.default;
    mobileAds()
      .setRequestConfiguration({
        maxAdContentRating: adsModule.MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: ["EMULATOR"],
      })
      .then(() => mobileAds().initialize())
      .catch(() => {});
  }, []);

  return null;
}
