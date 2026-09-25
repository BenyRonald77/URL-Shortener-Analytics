import { DeviceType } from "@/lib/constants";

/**
 * Parsing User-Agent ringan berbasis regex — sengaja tidak memakai
 * dependensi berat (mis. ua-parser-js) untuk kebutuhan klasifikasi dasar
 * (desktop/mobile/tablet/bot) yang cukup untuk analytics ini.
 */
export function detectDevice(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (!ua) return DeviceType.UNKNOWN;

  if (/bot|crawl|spider|slurp|facebookexternalhit|bingpreview/.test(ua)) {
    return DeviceType.BOT;
  }
  if (/ipad|tablet/.test(ua) && !/mobile/.test(ua)) {
    return DeviceType.TABLET;
  }
  if (/mobi|iphone|ipod|android.*mobile/.test(ua)) {
    return DeviceType.MOBILE;
  }
  if (/android/.test(ua)) {
    return DeviceType.TABLET;
  }
  return DeviceType.DESKTOP;
}

export function detectBrowser(userAgent: string): string {
  if (!userAgent) return "Unknown";

  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) return "Opera";
  if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) return "Chrome";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return "Safari";
  return "Other";
}
