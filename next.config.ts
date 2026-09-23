import type { NextConfig } from "next";
import { lanAddresses } from "./lib/lan";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi load the dev server, e.g. to scan a device-link QR code.
  allowedDevOrigins: lanAddresses(),
  // The floating dev badge sits on the mobile tab bar, and tapping it throws in iOS Safari.
  // Errors still surface as overlays without it.
  devIndicators: false,
  experimental: {
    // Keep visited trip tabs in the browser for 30s so switching back is instant.
    // Our own writes clear this immediately (see refreshTrip); other people's
    // changes can take up to 30s to show.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
