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
import type { OutputPowerSettings } from "../types";

/**
 * Output Power Action
 * Displays total output power consumption
 */
@action({ UUID: "com.ecoflow.control-deck.output-power" })
export class OutputPowerAction extends SingletonAction<OutputPowerSettings> {
  private stateCallback: ((sn: string, state: DeviceState) => void) | null = null;
  private currentAction: KeyAction<OutputPowerSettings> | null = null;
  private currentSettings: OutputPowerSettings = {};

  onWillAppear(ev: WillAppearEvent<OutputPowerSettings>): void {
    this.currentAction = ev.action as KeyAction<OutputPowerSettings>;
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

  onWillDisappear(_ev: WillDisappearEvent<OutputPowerSettings>): void {
    if (this.stateCallback) {
      deviceManager.offStateChange(this.stateCallback);
      this.stateCallback = null;
    }
    this.currentAction = null;
  }

  onKeyDown(_ev: KeyDownEvent<OutputPowerSettings>): void {
    this.refreshDisplay();
  }

  onDidReceiveSettings(ev: DidReceiveSettingsEvent<OutputPowerSettings>): void {
    this.currentSettings = ev.payload.settings;
    this.refreshDisplay();
  }

  private async refreshDisplay(): Promise<void> {
    if (!this.currentAction) return;

    if (!this.currentSettings.deviceSerialNumber) {
      await this.currentAction.setTitle("OUT\n---");
      return;
    }

    try {
      const state = await deviceManager.getOrRefreshState(this.currentSettings.deviceSerialNumber);
      await this.updateDisplay(this.currentAction, state, this.currentSettings);
    } catch {
      await this.currentAction.setTitle("OUT\nErr");
    }
  }

  private async updateDisplay(
    action: KeyAction<OutputPowerSettings>,
    state: DeviceState,
    settings: OutputPowerSettings
  ): Promise<void> {
    if (!state.online) {
      await action.setTitle("OUT\n---");
      return;
    }

    const watts = state.outputWatts;
    const formatted = this.formatWatts(watts);
    const threshold = settings.highOutputThreshold ?? 1500;

    await action.setTitle(`OUT\n${formatted}`);

    if (watts >= threshold) {
      await action.showOk();
    }
  }

  private formatWatts(watts: number): string {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(1)}kW`;
    }
    return `${Math.round(watts)}W`;
  }
}
