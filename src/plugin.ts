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

// Handle global settings (API credentials)
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>(async (ev) => {
  const { accessKey, secretKey, region } = ev.settings;

  if (accessKey && secretKey) {
    try {
      await deviceManager.initialize({ accessKey, secretKey }, region || "us");
      streamDeck.logger.info("[EcoFlow] Device manager initialized");

      // Start polling for updates
      deviceManager.startPolling(30000);
    } catch (error) {
      streamDeck.logger.error("[EcoFlow] Failed to initialize:", error);
    }
  }
});

// Connect to Stream Deck
streamDeck.connect();
