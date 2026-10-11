import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { deviceManager } from "./api";
import type { GlobalSettings } from "./types";
import {
  BatteryStatusAction,
  InputPowerAction,
  OutputPowerAction,
  SolarPowerAction,
  AcToggleAction,
  DcToggleAction,
  ChargeToggleAction,
  RefreshAction,
  DeviceStatusAction,
} from "./actions";

// Configure logging
streamDeck.logger.setLevel(LogLevel.DEBUG);

// Register all actions
streamDeck.actions.registerAction(new BatteryStatusAction());
streamDeck.actions.registerAction(new InputPowerAction());
streamDeck.actions.registerAction(new OutputPowerAction());
streamDeck.actions.registerAction(new SolarPowerAction());
streamDeck.actions.registerAction(new AcToggleAction());
streamDeck.actions.registerAction(new DcToggleAction());
streamDeck.actions.registerAction(new ChargeToggleAction());
streamDeck.actions.registerAction(new RefreshAction());
streamDeck.actions.registerAction(new DeviceStatusAction());

// Track connection status
let connectionStatus: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
let lastError: string = "";

// Initialize with stored credentials
async function initializeWithCredentials(accessKey: string, secretKey: string, region: "us" | "eu") {
  if (connectionStatus === "connecting") return; // Already connecting

  connectionStatus = "connecting";
  lastError = "";
  streamDeck.logger.info("[EcoFlow] Attempting to connect with API credentials...");

  try {
    await deviceManager.initialize({ accessKey, secretKey }, region);
    connectionStatus = "connected";
    streamDeck.logger.info("[EcoFlow] Device manager initialized successfully");
    streamDeck.logger.info(`[EcoFlow] Found ${deviceManager.getDevices().length} devices`);

    // Start polling for updates
    deviceManager.startPolling(30000);
  } catch (error) {
    connectionStatus = "error";
    lastError = error instanceof Error ? error.message : String(error);
    streamDeck.logger.error("[EcoFlow] Failed to initialize:", lastError);
  }
}

// Handle global settings (API credentials)
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>(async (ev) => {
  const { accessKey, secretKey, region } = ev.settings;
  streamDeck.logger.info("[EcoFlow] Received global settings");

  if (accessKey && secretKey) {
    await initializeWithCredentials(accessKey, secretKey, region || "us");
  } else {
    connectionStatus = "disconnected";
    streamDeck.logger.info("[EcoFlow] No credentials configured");
  }
});

// Handle messages from Property Inspector
streamDeck.ui.onSendToPlugin(async (ev) => {
  const payload = ev.payload as Record<string, unknown> | null;
  streamDeck.logger.info("[EcoFlow] Received message from PI:", JSON.stringify(payload));

  if (payload && payload.action === "getDeviceList") {
    // Send device list to Property Inspector
    const devices = deviceManager.getDevices();
    streamDeck.logger.info(`[EcoFlow] Sending ${devices.length} devices to PI, status: ${connectionStatus}`);

    // Use the action from the event to send back to PI
    await (ev.action as unknown as { sendToPropertyInspector: (payload: unknown) => Promise<void> }).sendToPropertyInspector({
      devices: devices,
      authStatus: connectionStatus,
      error: lastError
    });
  }
});

// Connect to Stream Deck
streamDeck.connect();
