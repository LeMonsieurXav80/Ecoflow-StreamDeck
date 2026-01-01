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
import type { ToggleSettings } from "../types";

/**
 * DC/USB Output Toggle Action
 * Toggles DC and USB outputs on/off
 */
@action({ UUID: "com.ecoflow.control-deck.dc-toggle" })
export class DcToggleAction extends SingletonAction<ToggleSettings> {
  private stateCallback: ((sn: string, state: DeviceState) => void) | null = null;
  private currentAction: KeyAction<ToggleSettings> | null = null;
  private currentSettings: ToggleSettings = {};

  onWillAppear(ev: WillAppearEvent<ToggleSettings>): void {
    this.currentAction = ev.action as KeyAction<ToggleSettings>;
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

  onWillDisappear(_ev: WillDisappearEvent<ToggleSettings>): void {
    if (this.stateCallback) {
      deviceManager.offStateChange(this.stateCallback);
      this.stateCallback = null;
    }
    this.currentAction = null;
  }

  async onKeyDown(ev: KeyDownEvent<ToggleSettings>): Promise<void> {
    const action = ev.action as KeyAction<ToggleSettings>;
    const settings = ev.payload.settings;

    if (!settings.deviceSerialNumber) {
      await action.showOk();
      return;
    }

    try {
      const newState = await deviceManager.toggleDcOutput(settings.deviceSerialNumber);
      await action.setState(newState ? 1 : 0);
      await action.setTitle(newState ? "DC ON" : "DC OFF");
      await action.showOk();
    } catch (error) {
      console.error("[EcoFlow] Failed to toggle DC:", error);
      await action.showOk();
    }
  }

  onDidReceiveSettings(ev: DidReceiveSettingsEvent<ToggleSettings>): void {
    this.currentSettings = ev.payload.settings;
    this.refreshDisplay();
  }

  private async refreshDisplay(): Promise<void> {
    if (!this.currentAction) return;

    if (!this.currentSettings.deviceSerialNumber) {
      await this.currentAction.setTitle("DC\n---");
      await this.currentAction.setState(0);
      return;
    }

    try {
      const state = await deviceManager.getOrRefreshState(this.currentSettings.deviceSerialNumber);
      await this.updateDisplay(this.currentAction, state);
    } catch {
      await this.currentAction.setTitle("DC\nErr");
      await this.currentAction.setState(0);
    }
  }

  private async updateDisplay(action: KeyAction<ToggleSettings>, state: DeviceState): Promise<void> {
    if (!state.online) {
      await action.setTitle("DC\n---");
      await action.setState(0);
      return;
    }

    const isOn = state.dcOutEnabled;
    await action.setState(isOn ? 1 : 0);
    await action.setTitle(isOn ? "DC ON" : "DC OFF");
  }
}
