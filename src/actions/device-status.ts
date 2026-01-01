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
import type { DeviceStatusSettings } from "../types";

/**
 * Device Status Action
 * Displays online/offline status of the device
 */
@action({ UUID: "com.ecoflow.control-deck.device-status" })
export class DeviceStatusAction extends SingletonAction<DeviceStatusSettings> {
  private stateCallback: ((sn: string, state: DeviceState) => void) | null = null;
  private currentAction: KeyAction<DeviceStatusSettings> | null = null;
  private currentSettings: DeviceStatusSettings = {};

  onWillAppear(ev: WillAppearEvent<DeviceStatusSettings>): void {
    this.currentAction = ev.action as KeyAction<DeviceStatusSettings>;
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

  onWillDisappear(_ev: WillDisappearEvent<DeviceStatusSettings>): void {
    if (this.stateCallback) {
      deviceManager.offStateChange(this.stateCallback);
      this.stateCallback = null;
    }
    this.currentAction = null;
  }

  onKeyDown(_ev: KeyDownEvent<DeviceStatusSettings>): void {
    this.refreshDisplay();
  }

  onDidReceiveSettings(ev: DidReceiveSettingsEvent<DeviceStatusSettings>): void {
    this.currentSettings = ev.payload.settings;
    this.refreshDisplay();
  }

  private async refreshDisplay(): Promise<void> {
    if (!this.currentAction) return;

    if (!this.currentSettings.deviceSerialNumber) {
      await this.currentAction.setTitle("---");
      await this.currentAction.setState(0);
      return;
    }

    try {
      const state = await deviceManager.getOrRefreshState(this.currentSettings.deviceSerialNumber);
      await this.updateDisplay(this.currentAction, state);
    } catch {
      await this.currentAction.setTitle("OFFLINE");
      await this.currentAction.setState(0);
    }
  }

  private async updateDisplay(action: KeyAction<DeviceStatusSettings>, state: DeviceState): Promise<void> {
    if (state.online && !state.error) {
      await action.setTitle("ONLINE");
      await action.setState(1);
    } else {
      await action.setTitle("OFFLINE");
      await action.setState(0);
    }
  }
}
