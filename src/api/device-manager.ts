import { EcoFlowClient, EcoFlowCredentials, EcoFlowDevice, EcoFlowDeviceStatus } from "./ecoflow-client";

/**
 * Manages EcoFlow device connections and state caching
 * Handles rate limiting, error recovery, and state updates
 */

export interface DeviceState extends EcoFlowDeviceStatus {
  lastUpdate: number;
  error?: string;
}

export interface ThresholdConfig {
  lowBattery: number; // Percentage threshold for low battery warning
  highDischarge: number; // Watts threshold for high discharge warning
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  lowBattery: 20,
  highDischarge: 1500,
};

const CACHE_TTL_MS = 30000; // 30 seconds cache
const MIN_POLL_INTERVAL_MS = 10000; // Minimum 10 seconds between API calls
const ERROR_RETRY_DELAY_MS = 60000; // Wait 1 minute after errors

export class DeviceManager {
  private client: EcoFlowClient | null = null;
  private devices: Map<string, EcoFlowDevice> = new Map();
  private deviceStates: Map<string, DeviceState> = new Map();
  private lastPollTime: number = 0;
  private isPolling: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private thresholds: ThresholdConfig = DEFAULT_THRESHOLDS;
  private errorCount: number = 0;
  private lastErrorTime: number = 0;

  private stateChangeCallbacks: ((sn: string, state: DeviceState) => void)[] = [];

  /**
   * Initialize the device manager with EcoFlow API credentials
   */
  async initialize(credentials: EcoFlowCredentials, region: "us" | "eu" = "us"): Promise<void> {
    this.client = new EcoFlowClient(credentials, region);
    await this.refreshDeviceList();
    this.errorCount = 0;
  }

  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get list of available devices
   */
  getDevices(): EcoFlowDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get cached device state
   */
  getDeviceState(serialNumber: string): DeviceState | undefined {
    return this.deviceStates.get(serialNumber);
  }

  /**
   * Register callback for state changes
   */
  onStateChange(callback: (sn: string, state: DeviceState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Remove state change callback
   */
  offStateChange(callback: (sn: string, state: DeviceState) => void): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Set alert thresholds
   */
  setThresholds(thresholds: Partial<ThresholdConfig>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): ThresholdConfig {
    return { ...this.thresholds };
  }

  /**
   * Check if battery is low based on threshold
   */
  isBatteryLow(state: DeviceState): boolean {
    return state.soc <= this.thresholds.lowBattery;
  }

  /**
   * Check if discharge is high based on threshold
   */
  isHighDischarge(state: DeviceState): boolean {
    return state.outputWatts >= this.thresholds.highDischarge;
  }

  /**
   * Refresh the device list from API
   */
  async refreshDeviceList(): Promise<EcoFlowDevice[]> {
    if (!this.client) {
      throw new Error("DeviceManager not initialized");
    }

    try {
      const devices = await this.client.getDevices();
      this.devices.clear();
      for (const device of devices) {
        this.devices.set(device.sn, device);
      }
      this.errorCount = 0;
      return devices;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Refresh status for a specific device
   */
  async refreshDeviceStatus(serialNumber: string): Promise<DeviceState> {
    if (!this.client) {
      throw new Error("DeviceManager not initialized");
    }

    // Check rate limiting
    const now = Date.now();
    if (now - this.lastPollTime < MIN_POLL_INTERVAL_MS) {
      const cached = this.deviceStates.get(serialNumber);
      if (cached) {
        return cached;
      }
    }

    // Check if we should back off after errors
    if (this.errorCount > 3 && now - this.lastErrorTime < ERROR_RETRY_DELAY_MS) {
      const cached = this.deviceStates.get(serialNumber);
      if (cached) {
        return { ...cached, error: "Rate limited after errors" };
      }
      throw new Error("Too many errors, waiting before retry");
    }

    try {
      this.lastPollTime = now;
      const status = await this.client.getDeviceStatus(serialNumber);
      const state: DeviceState = {
        ...status,
        lastUpdate: now,
      };

      const previousState = this.deviceStates.get(serialNumber);
      this.deviceStates.set(serialNumber, state);

      // Notify callbacks if state changed
      if (this.hasStateChanged(previousState, state)) {
        this.notifyStateChange(serialNumber, state);
      }

      this.errorCount = 0;
      return state;
    } catch (error) {
      this.handleError(error);

      // Return cached state with error flag if available
      const cached = this.deviceStates.get(serialNumber);
      if (cached) {
        const errorState: DeviceState = {
          ...cached,
          online: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        this.deviceStates.set(serialNumber, errorState);
        this.notifyStateChange(serialNumber, errorState);
        return errorState;
      }

      throw error;
    }
  }

  /**
   * Get cached state or refresh if stale
   */
  async getOrRefreshState(serialNumber: string): Promise<DeviceState> {
    const cached = this.deviceStates.get(serialNumber);
    const now = Date.now();

    if (cached && now - cached.lastUpdate < CACHE_TTL_MS) {
      return cached;
    }

    return this.refreshDeviceStatus(serialNumber);
  }

  /**
   * Toggle AC output
   */
  async toggleAcOutput(serialNumber: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("DeviceManager not initialized");
    }

    const state = await this.getOrRefreshState(serialNumber);
    const newState = !state.acOutEnabled;

    await this.client.setAcOutput(serialNumber, newState);

    // Update cached state
    const updatedState: DeviceState = {
      ...state,
      acOutEnabled: newState,
      lastUpdate: Date.now(),
    };
    this.deviceStates.set(serialNumber, updatedState);
    this.notifyStateChange(serialNumber, updatedState);

    return newState;
  }

  /**
   * Toggle DC output
   */
  async toggleDcOutput(serialNumber: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("DeviceManager not initialized");
    }

    const state = await this.getOrRefreshState(serialNumber);
    const newState = !state.dcOutEnabled;

    await this.client.setDcOutput(serialNumber, newState);

    const updatedState: DeviceState = {
      ...state,
      dcOutEnabled: newState,
      lastUpdate: Date.now(),
    };
    this.deviceStates.set(serialNumber, updatedState);
    this.notifyStateChange(serialNumber, updatedState);

    return newState;
  }

  /**
   * Toggle AC charging
   */
  async toggleAcCharging(serialNumber: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("DeviceManager not initialized");
    }

    const state = await this.getOrRefreshState(serialNumber);
    const newState = !state.acChargingEnabled;

    await this.client.setAcCharging(serialNumber, newState);

    const updatedState: DeviceState = {
      ...state,
      acChargingEnabled: newState,
      lastUpdate: Date.now(),
    };
    this.deviceStates.set(serialNumber, updatedState);
    this.notifyStateChange(serialNumber, updatedState);

    return newState;
  }

  /**
   * Start automatic polling for all configured devices
   */
  startPolling(intervalMs: number = 30000): void {
    if (this.pollInterval) {
      return;
    }

    const safeInterval = Math.max(intervalMs, MIN_POLL_INTERVAL_MS);

    this.pollInterval = setInterval(async () => {
      if (this.isPolling) return;

      this.isPolling = true;
      try {
        for (const sn of this.devices.keys()) {
          await this.refreshDeviceStatus(sn);
        }
      } finally {
        this.isPolling = false;
      }
    }, safeInterval);
  }

  /**
   * Stop automatic polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopPolling();
    this.stateChangeCallbacks = [];
    this.devices.clear();
    this.deviceStates.clear();
    this.client = null;
  }

  private handleError(error: unknown): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();
    console.error("[EcoFlow] API Error:", error);
  }

  private hasStateChanged(previous: DeviceState | undefined, current: DeviceState): boolean {
    if (!previous) return true;

    return (
      previous.soc !== current.soc ||
      previous.inputWatts !== current.inputWatts ||
      previous.outputWatts !== current.outputWatts ||
      previous.solarWatts !== current.solarWatts ||
      previous.acOutEnabled !== current.acOutEnabled ||
      previous.dcOutEnabled !== current.dcOutEnabled ||
      previous.acChargingEnabled !== current.acChargingEnabled ||
      previous.online !== current.online ||
      previous.chargingState !== current.chargingState
    );
  }

  private notifyStateChange(sn: string, state: DeviceState): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(sn, state);
      } catch (error) {
        console.error("[EcoFlow] State change callback error:", error);
      }
    }
  }
}

// Singleton instance
export const deviceManager = new DeviceManager();
