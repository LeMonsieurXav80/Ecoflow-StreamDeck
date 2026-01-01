/**
 * Common Property Inspector functionality
 * Handles Stream Deck communication and device list population
 */

let websocket = null;
let pluginUUID = null;
let actionInfo = null;
let settings = {};
let globalSettings = {};

/**
 * Called by Stream Deck to initialize the Property Inspector
 */
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
  pluginUUID = inPropertyInspectorUUID;
  actionInfo = JSON.parse(inActionInfo);
  settings = actionInfo.payload.settings || {};

  websocket = new WebSocket("ws://127.0.0.1:" + inPort);

  websocket.onopen = function() {
    // Register with Stream Deck
    const registerMessage = {
      event: inRegisterEvent,
      uuid: pluginUUID
    };
    websocket.send(JSON.stringify(registerMessage));

    // Request global settings to get device list
    requestGlobalSettings();

    // Load current settings
    loadSettings();
  };

  websocket.onmessage = function(evt) {
    const message = JSON.parse(evt.data);

    switch (message.event) {
      case "didReceiveGlobalSettings":
        globalSettings = message.payload.settings || {};
        populateDeviceList();
        break;

      case "didReceiveSettings":
        settings = message.payload.settings || {};
        loadSettings();
        break;

      case "sendToPropertyInspector":
        // Handle custom messages from plugin (e.g., device list updates)
        if (message.payload.devices) {
          updateDeviceOptions(message.payload.devices);
        }
        break;
    }
  };
}

/**
 * Request global settings from Stream Deck
 */
function requestGlobalSettings() {
  if (websocket) {
    websocket.send(JSON.stringify({
      event: "getGlobalSettings",
      context: pluginUUID
    }));
  }
}

/**
 * Send settings to Stream Deck
 */
function sendSettings(newSettings) {
  settings = { ...settings, ...newSettings };

  if (websocket && actionInfo) {
    websocket.send(JSON.stringify({
      event: "setSettings",
      context: pluginUUID,
      payload: settings
    }));
  }
}

/**
 * Load settings into form elements
 */
function loadSettings() {
  const deviceSelect = document.getElementById("deviceSerialNumber");
  if (deviceSelect && settings.deviceSerialNumber) {
    deviceSelect.value = settings.deviceSerialNumber;
  }

  // Call custom load function if defined
  if (typeof loadActionSettings === "function") {
    loadActionSettings(settings);
  }
}

/**
 * Populate device dropdown with available devices
 * This is a placeholder - actual device list comes from plugin
 */
function populateDeviceList() {
  // Send message to plugin to request device list
  if (websocket) {
    websocket.send(JSON.stringify({
      event: "sendToPlugin",
      context: pluginUUID,
      payload: {
        action: "getDeviceList"
      }
    }));
  }
}

/**
 * Update device dropdown options
 */
function updateDeviceOptions(devices) {
  const deviceSelect = document.getElementById("deviceSerialNumber");
  if (!deviceSelect) return;

  // Keep the first option (placeholder)
  const firstOption = deviceSelect.options[0];
  deviceSelect.innerHTML = "";
  deviceSelect.appendChild(firstOption);

  // Add devices
  for (const device of devices) {
    const option = document.createElement("option");
    option.value = device.sn;
    option.textContent = device.deviceName || device.productName || device.sn;
    deviceSelect.appendChild(option);
  }

  // Restore selected value
  if (settings.deviceSerialNumber) {
    deviceSelect.value = settings.deviceSerialNumber;
  }
}

// Set up event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
  const deviceSelect = document.getElementById("deviceSerialNumber");
  if (deviceSelect) {
    deviceSelect.addEventListener("change", function() {
      sendSettings({ deviceSerialNumber: this.value });
    });
  }
});
