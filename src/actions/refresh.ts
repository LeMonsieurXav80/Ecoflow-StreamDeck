import {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  KeyAction,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";
import { deviceManager } from "../api";
import type { RefreshSettings } from "../types";

/**
 * Manual Refresh Action
 * Forces a refresh of device data from the EcoFlow API
 */
@action({ UUID: "com.ecoflow.control-deck.refresh" })
export class RefreshAction extends SingletonAction<RefreshSettings> {
  onWillAppear(ev: WillAppearEvent<RefreshSettings>): void {
    const action = ev.action as KeyAction<RefreshSettings>;
    action.setTitle("Refresh");
  }

  async onKeyDown(ev: KeyDownEvent<RefreshSettings>): Promise<void> {
    const action = ev.action as KeyAction<RefreshSettings>;
    const settings = ev.payload.settings;

    if (!settings.deviceSerialNumber) {
      // Refresh all devices
      try {
        await action.setTitle("...");
        await deviceManager.refreshDeviceList();

        for (const device of deviceManager.getDevices()) {
          await deviceManager.refreshDeviceStatus(device.sn);
        }

        await action.setTitle("Refresh");
        await action.showOk();
      } catch (error) {
        console.error("[EcoFlow] Refresh failed:", error);
        await action.setTitle("Refresh");
        await action.showOk();
      }
    } else {
      // Refresh specific device
      try {
        await action.setTitle("...");
        await deviceManager.refreshDeviceStatus(settings.deviceSerialNumber);
        await action.setTitle("Refresh");
        await action.showOk();
      } catch (error) {
        console.error("[EcoFlow] Refresh failed:", error);
        await action.setTitle("Refresh");
        await action.showOk();
      }
    }
  }

  onDidReceiveSettings(_ev: DidReceiveSettingsEvent<RefreshSettings>): void {
    // Nothing specific to update on settings change
  }
}
