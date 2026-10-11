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

    // Request global settings to get credentials and device list
    requestGlobalSettings();

    // Load current settings
    loadSettings();
  };

  websocket.onmessage = function(evt) {
    const message = JSON.parse(evt.data);

    switch (message.event) {
      case "didReceiveGlobalSettings":
        globalSettings = message.payload.settings || {};
        loadGlobalSettings();
        populateDeviceList();
        break;

      case "didReceiveSettings":
        settings = message.payload.settings || {};
        loadSettings();
        break;

      case "sendToPropertyInspector":
        // Handle custom messages from plugin (e.g., device list updates)
        console.log("[EcoFlow PI] Received from plugin:", message.payload);
        if (message.payload.devices) {
          updateDeviceOptions(message.payload.devices);
        }
        if (message.payload.authStatus) {
          updateAuthStatus(message.payload.authStatus, message.payload.error);
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
 * Save global settings to Stream Deck
 */
function saveGlobalSettings() {
  if (websocket) {
    websocket.send(JSON.stringify({
      event: "setGlobalSettings",
      context: pluginUUID,
      payload: globalSettings
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
 * Load global settings (credentials) into form elements
 */
function loadGlobalSettings() {
  const accessKeyInput = document.getElementById("accessKey");
  const secretKeyInput = document.getElementById("secretKey");
  const regionSelect = document.getElementById("region");

  if (accessKeyInput) {
    accessKeyInput.value = globalSettings.accessKey || "";
  }
  if (secretKeyInput) {
    secretKeyInput.value = globalSettings.secretKey || "";
  }
  if (regionSelect) {
    regionSelect.value = globalSettings.region || "us";
  }

  // Update connection status indicator
  updateConnectionStatus();
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus() {
  const statusEl = document.getElementById("connectionStatus");
  if (!statusEl) return;

  if (globalSettings.accessKey && globalSettings.secretKey) {
    statusEl.textContent = "Credentials saved";
    statusEl.className = "sdpi-status success";
  } else {
    statusEl.textContent = "Not configured";
    statusEl.className = "sdpi-status warning";
  }
}

/**
 * Update authentication status from plugin
 */
function updateAuthStatus(status, errorMessage) {
  const statusEl = document.getElementById("connectionStatus");
  if (!statusEl) return;

  if (status === "connected") {
    statusEl.textContent = "Connected";
    statusEl.className = "sdpi-status success";
  } else if (status === "error") {
    statusEl.textContent = errorMessage ? "Error: " + errorMessage.substring(0, 50) : "Connection failed";
    statusEl.className = "sdpi-status error";
  } else if (status === "disconnected") {
    statusEl.textContent = "Not configured";
    statusEl.className = "sdpi-status warning";
  } else {
    statusEl.textContent = "Connecting...";
    statusEl.className = "sdpi-status warning";
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

/**
 * Save EcoFlow API credentials
 */
function saveEcoFlowCredentials() {
  const accessKey = document.getElementById("accessKey").value.trim();
  const secretKey = document.getElementById("secretKey").value.trim();
  const regionSelect = document.getElementById("region");
  const region = regionSelect ? regionSelect.value : "us";

  if (!accessKey || !secretKey) {
    showMessage("Please enter both Access Key and Secret Key", "error");
    return;
  }

  globalSettings.accessKey = accessKey;
  globalSettings.secretKey = secretKey;
  globalSettings.region = region;

  saveGlobalSettings();
  showMessage("Credentials saved! Connecting...", "success");

  // Update status
  const statusEl = document.getElementById("connectionStatus");
  if (statusEl) {
    statusEl.textContent = "Connecting...";
    statusEl.className = "sdpi-status warning";
  }

  // Request device list after a short delay to allow plugin to authenticate
  setTimeout(() => {
    populateDeviceList();
  }, 2000);

  // Request again after more time in case first attempt was too early
  setTimeout(() => {
    populateDeviceList();
  }, 5000);
}

/**
 * Show temporary message
 */
function showMessage(text, type) {
  const msgEl = document.getElementById("statusMessage");
  if (!msgEl) return;

  msgEl.textContent = text;
  msgEl.className = "sdpi-message " + type;

  setTimeout(() => {
    msgEl.className = "sdpi-message hidden";
  }, 3000);
}

// Set up event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
  const deviceSelect = document.getElementById("deviceSerialNumber");
  if (deviceSelect) {
    deviceSelect.addEventListener("change", function() {
      sendSettings({ deviceSerialNumber: this.value });
    });
  }

  // Credentials save button
  const saveCredentialsBtn = document.getElementById("saveCredentialsBtn");
  if (saveCredentialsBtn) {
    saveCredentialsBtn.addEventListener("click", saveEcoFlowCredentials);
  }
});
