import type { JsonObject } from "@elgato/streamdeck";

/**
 * Base settings interface for all EcoFlow actions
 */
export interface EcoFlowActionSettings extends JsonObject {
  deviceSerialNumber?: string;
}

/**
 * Settings for Battery Status action
 */
export interface BatteryStatusSettings extends JsonObject {
  deviceSerialNumber?: string;
  showRemainingTime?: boolean;
  lowBatteryThreshold?: number;
}

/**
 * Settings for Output Power action
 */
export interface OutputPowerSettings extends JsonObject {
  deviceSerialNumber?: string;
  highOutputThreshold?: number;
}

/**
 * Settings for power display actions (Input, Solar)
 */
export interface PowerSettings extends JsonObject {
  deviceSerialNumber?: string;
}

/**
 * Settings for toggle actions (AC, DC, Charge)
 */
export interface ToggleSettings extends JsonObject {
  deviceSerialNumber?: string;
}

/**
 * Settings for Refresh action
 */
export interface RefreshSettings extends JsonObject {
  deviceSerialNumber?: string;
}

/**
 * Settings for Device Status action
 */
export interface DeviceStatusSettings extends JsonObject {
  deviceSerialNumber?: string;
}

/**
 * Global plugin settings
 */
export interface GlobalSettings extends JsonObject {
  accessKey?: string;
  secretKey?: string;
  region?: "us" | "eu";
}
