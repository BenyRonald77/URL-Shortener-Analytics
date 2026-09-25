export const DeviceType = {
  DESKTOP: "desktop",
  MOBILE: "mobile",
  TABLET: "tablet",
  BOT: "bot",
  UNKNOWN: "unknown",
} as const;
export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];
