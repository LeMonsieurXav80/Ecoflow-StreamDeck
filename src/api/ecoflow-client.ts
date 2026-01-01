import crypto from "node:crypto";

/**
 * EcoFlow API Client
 * Handles authentication and communication with EcoFlow Cloud API
 */

export interface EcoFlowCredentials {
  accessKey: string;
  secretKey: string;
}

export interface EcoFlowDevice {
  sn: string;
  deviceName: string;
  online: boolean;
  productName: string;
}

export interface EcoFlowDeviceStatus {
  sn: string;
  online: boolean;
  soc: number; // Battery percentage (0-100)
  inputWatts: number; // Total input power
  outputWatts: number; // Total output power
  solarWatts: number; // Solar input power
  acOutEnabled: boolean;
  dcOutEnabled: boolean;
  acChargingEnabled: boolean;
  remainTime: number; // Minutes remaining
  chargingState: "idle" | "charging" | "discharging";
}

export interface ApiError {
  code: string;
  message: string;
}

interface ApiResponse {
  code: string | number;
  message?: string;
  data?: unknown;
}

const API_BASE_URL = "https://api-e.ecoflow.com";
const API_BASE_URL_EU = "https://api-e.ecoflow.com"; // EU endpoint

export class EcoFlowClient {
  private accessKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(credentials: EcoFlowCredentials, region: "us" | "eu" = "us") {
    this.accessKey = credentials.accessKey;
    this.secretKey = credentials.secretKey;
    this.baseUrl = region === "eu" ? API_BASE_URL_EU : API_BASE_URL;
  }

  /**
   * Generate HMAC-SHA256 signature for API authentication
   */
  private generateSignature(
    params: Record<string, string>,
    timestamp: string,
    nonce: string
  ): string {
    // Sort parameters alphabetically and create query string
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    // Create signature base string
    const signatureBase = `${sortedParams}&accessKey=${this.accessKey}&nonce=${nonce}&timestamp=${timestamp}`;

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac("sha256", this.secretKey);
    hmac.update(signatureBase);
    return hmac.digest("hex");
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" = "GET",
    params: Record<string, string> = {},
    body?: Record<string, unknown>
  ): Promise<T> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    const signature = this.generateSignature(params, timestamp, nonce);

    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      accessKey: this.accessKey,
      timestamp,
      nonce,
      sign: signature,
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiResponse;

    if (data.code !== "0" && data.code !== 0) {
      throw new Error(`EcoFlow API error: ${data.message || "Unknown error"} (code: ${data.code})`);
    }

    return data.data as T;
  }

  /**
   * Get list of devices associated with the account
   */
  async getDevices(): Promise<EcoFlowDevice[]> {
    const response = await this.request<{ devices: EcoFlowDevice[] }>(
      "/iot-open/sign/device/list"
    );
    return response.devices || [];
  }

  /**
   * Get device quota/status data
   */
  async getDeviceStatus(serialNumber: string): Promise<EcoFlowDeviceStatus> {
    const response = await this.request<Record<string, unknown>>(
      "/iot-open/sign/device/quota/all",
      "GET",
      { sn: serialNumber }
    );

    // Map EcoFlow API response to our normalized structure
    return this.normalizeDeviceStatus(serialNumber, response);
  }

  /**
   * Set AC output state
   */
  async setAcOutput(serialNumber: string, enabled: boolean): Promise<void> {
    await this.request(
      "/iot-open/sign/device/quota",
      "PUT",
      { sn: serialNumber },
      {
        cmdCode: "WN511_SET_AC_OUT",
        params: { enabled: enabled ? 1 : 0 },
      }
    );
  }

  /**
   * Set DC output state
   */
  async setDcOutput(serialNumber: string, enabled: boolean): Promise<void> {
    await this.request(
      "/iot-open/sign/device/quota",
      "PUT",
      { sn: serialNumber },
      {
        cmdCode: "WN511_SET_DC_OUT",
        params: { enabled: enabled ? 1 : 0 },
      }
    );
  }

  /**
   * Set AC charging state
   */
  async setAcCharging(serialNumber: string, enabled: boolean): Promise<void> {
    await this.request(
      "/iot-open/sign/device/quota",
      "PUT",
      { sn: serialNumber },
      {
        cmdCode: "WN511_SET_AC_CHARGING",
        params: { enabled: enabled ? 1 : 0 },
      }
    );
  }

  /**
   * Normalize device status from various EcoFlow device types
   * Different devices (DELTA, RIVER, etc.) have different API response structures
   */
  private normalizeDeviceStatus(
    sn: string,
    data: Record<string, unknown>
  ): EcoFlowDeviceStatus {
    // Handle nested data structure
    const deviceData = (data as Record<string, Record<string, unknown>>).data || data;

    // Common field mappings across device types
    const soc = this.extractNumber(deviceData, ["soc", "bms_bmsStatus.soc", "pd.soc"]);
    const inputWatts = this.extractNumber(deviceData, [
      "wattsInSum",
      "pd.wattsInSum",
      "inv.inputWatts",
    ]);
    const outputWatts = this.extractNumber(deviceData, [
      "wattsOutSum",
      "pd.wattsOutSum",
      "inv.outputWatts",
    ]);
    const solarWatts = this.extractNumber(deviceData, [
      "mppt.inWatts",
      "pd.mpptInWatts",
      "pv1InputWatts",
      "pv2InputWatts",
    ]);

    const acOutEnabled = this.extractBoolean(deviceData, [
      "inv.cfgAcEnabled",
      "pd.acAutoOutConfig",
      "acOutState",
    ]);
    const dcOutEnabled = this.extractBoolean(deviceData, [
      "pd.dcOutState",
      "mppt.dcChgCurrent",
    ]);
    const acChargingEnabled = this.extractBoolean(deviceData, [
      "inv.cfgAcChgModeFlg",
      "pd.acChgState",
    ]);

    let chargingState: "idle" | "charging" | "discharging" = "idle";
    if (inputWatts > outputWatts && inputWatts > 0) {
      chargingState = "charging";
    } else if (outputWatts > inputWatts && outputWatts > 0) {
      chargingState = "discharging";
    }

    return {
      sn,
      online: true, // If we got data, device is online
      soc,
      inputWatts,
      outputWatts,
      solarWatts,
      acOutEnabled,
      dcOutEnabled,
      acChargingEnabled,
      remainTime: this.extractNumber(deviceData, ["pd.remainTime", "bms_bmsStatus.remainTime"]),
      chargingState,
    };
  }

  /**
   * Extract numeric value from nested object using multiple possible paths
   */
  private extractNumber(data: Record<string, unknown>, paths: string[]): number {
    for (const path of paths) {
      const value = this.getNestedValue(data, path);
      if (typeof value === "number") {
        return value;
      }
    }
    return 0;
  }

  /**
   * Extract boolean value from nested object using multiple possible paths
   */
  private extractBoolean(data: Record<string, unknown>, paths: string[]): boolean {
    for (const path of paths) {
      const value = this.getNestedValue(data, path);
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "number") {
        return value === 1;
      }
    }
    return false;
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }
}
