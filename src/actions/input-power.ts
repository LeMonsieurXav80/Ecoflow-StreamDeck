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
import type { PowerSettings } from "../types";

/**
 * Input Power Action
 * Displays total input power (AC + Solar)
 */
@action({ UUID: "com.ecoflow.control-deck.input-power" })
export class InputPowerAction extends SingletonAction<PowerSettings> {
  private stateCallback: ((sn: string, state: DeviceState) => void) | null = null;
  private currentAction: KeyAction<PowerSettings> | null = null;
  private currentSettings: PowerSettings = {};

  onWillAppear(ev: WillAppearEvent<PowerSettings>): void {
    this.currentAction = ev.action as KeyAction<PowerSettings>;
    this.currentSettings = ev.payload.settings;

    if (!this.stateCallback) {
      this.stateCallback = (sn, state) => {
        if (this.currentSettings.deviceSerialNumber === sn && this.currentAction) {
          this.updateDisplay(this.currentAction, state);
        }
      };
      deviceManager.onStateChange(this.stateCallback);
    }

    this.refreshDisplay();
  }

  onWillDisappear(_ev: WillDisappearEvent<PowerSettings>): void {
    if (this.stateCallback) {
      deviceManager.offStateChange(this.stateCallback);
      this.stateCallback = null;
    }
    this.currentAction = null;
  }

  onKeyDown(_ev: KeyDownEvent<PowerSettings>): void {
    this.refreshDisplay();
  }

  onDidReceiveSettings(ev: DidReceiveSettingsEvent<PowerSettings>): void {
    this.currentSettings = ev.payload.settings;
    this.refreshDisplay();
  }

  private async refreshDisplay(): Promise<void> {
    if (!this.currentAction) return;

    if (!this.currentSettings.deviceSerialNumber) {
      await this.currentAction.setTitle("IN\n---");
      return;
    }

    try {
      const state = await deviceManager.getOrRefreshState(this.currentSettings.deviceSerialNumber);
      await this.updateDisplay(this.currentAction, state);
    } catch {
      await this.currentAction.setTitle("IN\nErr");
    }
  }

  private async updateDisplay(action: KeyAction<PowerSettings>, state: DeviceState): Promise<void> {
    if (!state.online) {
      await action.setTitle("IN\n---");
      return;
    }

    const watts = state.inputWatts;
    const formatted = this.formatWatts(watts);
    await action.setTitle(`IN\n${formatted}`);
  }

  private formatWatts(watts: number): string {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(1)}kW`;
    }
    return `${Math.round(watts)}W`;
  }
}
