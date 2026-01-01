import {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  KeyAction,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import { deviceManager, DeviceState } from "../api";
import type { BatteryStatusSettings } from "../types";

/**
 * Battery Status Action
 * Displays current battery percentage with visual indicators
 */
@action({ UUID: "com.ecoflow.control-deck.battery-status" })
export class BatteryStatusAction extends SingletonAction<BatteryStatusSettings> {
  private stateCallback: ((sn: string, state: DeviceState) => void) | null = null;
  private currentAction: KeyAction<BatteryStatusSettings> | null = null;
  private currentSettings: BatteryStatusSettings = {};

  onWillAppear(ev: WillAppearEvent<BatteryStatusSettings>): void {
    this.currentAction = ev.action as KeyAction<BatteryStatusSettings>;
    this.currentSettings = ev.payload.settings;

    if (!this.stateCallback) {
      this.stateCallback = (sn, state) => {
        if (this.currentSettings.deviceSerialNumber === sn && this.currentAction) {
          this.updateDisplay(this.currentAction, state, this.currentSettings);
        }
      };
      deviceManager.onStateChange(this.stateCallback);
    }

    this.refreshDisplay();
  }

  onWillDisappear(_ev: WillDisappearEvent<BatteryStatusSettings>): void {
    if (this.stateCallback) {
      deviceManager.offStateChange(this.stateCallback);
      this.stateCallback = null;
    }
    this.currentAction = null;
  }

  onKeyDown(_ev: KeyDownEvent<BatteryStatusSettings>): void {
    this.refreshDisplay();
  }

  onDidReceiveSettings(ev: DidReceiveSettingsEvent<BatteryStatusSettings>): void {
    this.currentSettings = ev.payload.settings;
    this.refreshDisplay();
  }

  private async refreshDisplay(): Promise<void> {
    if (!this.currentAction) return;

    if (!this.currentSettings.deviceSerialNumber) {
      await this.currentAction.setTitle("Setup\nRequired");
      return;
    }

    try {
      const state = await deviceManager.getOrRefreshState(this.currentSettings.deviceSerialNumber);
      await this.updateDisplay(this.currentAction, state, this.currentSettings);
    } catch {
      await this.currentAction.setTitle("Offline");
    }
  }

  private async updateDisplay(
    action: KeyAction<BatteryStatusSettings>,
    state: DeviceState,
    settings: BatteryStatusSettings
  ): Promise<void> {
    if (!state.online) {
      await action.setTitle("Offline");
      return;
    }

    const soc = Math.round(state.soc);
    const threshold = settings.lowBatteryThreshold ?? 20;

    let title = `${soc}%`;

    if (state.chargingState === "charging") {
      title = `⚡${soc}%`;
    } else if (state.chargingState === "discharging") {
      title = `${soc}%▼`;
    }

    if (settings.showRemainingTime && state.remainTime > 0) {
      const hours = Math.floor(state.remainTime / 60);
      const mins = state.remainTime % 60;
      title += `\n${hours}h${mins}m`;
    }

    await action.setTitle(title);

    if (soc <= threshold && state.chargingState !== "charging") {
      await action.showOk();
    }
  }
}
