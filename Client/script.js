let ws = null;
let isConnected = false;
let animationId = null;
let currentGamepadIndex = null;
const serverHostInput = "bore.pub";

const serverPortInput = document.getElementById("serverPort");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const wsStatusDiv = document.getElementById("wsStatus");
const gamepadStatusDiv = document.getElementById("gamepadStatus");
const gamepadIdSpan = document.getElementById("gamepadId");
const axesCountSpan = document.getElementById("axesCount");
const buttonsCountSpan = document.getElementById("buttonsCount");
const connectionStatusSpan = document.getElementById("connectionStatus");
const axesValuesDiv = document.getElementById("axesValues");
const buttonsValuesDiv = document.getElementById("buttonsValues");
const ltValueSpan = document.getElementById("ltValue");
const rtValueSpan = document.getElementById("rtValue");
const sendStatusSpan = document.getElementById("sendStatus");

const BUTTON_NAMES = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  4: "LB",
  5: "RB",
  6: "LT",
  7: "RT",
  8: "View",
  9: "Menu",
  10: "LS",
  11: "RS",
  12: "D-Up",
  13: "D-Down",
  14: "D-Left",
  15: "D-Right",
  16: "Xbox",
};

function updateGamepadStatus(gp) {
  if (!gp) {
    gamepadStatusDiv.innerHTML =
      '<span class="status-indicator"></span>No gamepad detected';
    gamepadStatusDiv.className = "status disconnected";
    gamepadIdSpan.textContent = "-";
    axesCountSpan.textContent = "0";
    buttonsCountSpan.textContent = "0";
    connectionStatusSpan.textContent = "Disconnected";
    return;
  }

  gamepadStatusDiv.innerHTML = `<span class="status-indicator"></span>Connected: ${gp.id}`;
  gamepadStatusDiv.className = "status connected";
  gamepadIdSpan.textContent = gp.id;
  axesCountSpan.textContent = gp.axes.length;
  buttonsCountSpan.textContent = gp.buttons.length;
  connectionStatusSpan.textContent = "Active";
}

function scanGamepads() {
  const gamepads = navigator.getGamepads();

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (gp && gp.connected) {
      if (currentGamepadIndex !== i) {
        currentGamepadIndex = i;
        updateGamepadStatus(gp);
        console.log(`Gamepad connected: ${gp.id}`);
      }
      return gp;
    }
  }

  if (currentGamepadIndex !== null) {
    currentGamepadIndex = null;
    updateGamepadStatus(null);
    console.log("Gamepad disconnected");
  }
  return null;
}

function processGamepadData(gp) {
  if (!gp) return null;

  let axes = Array.from(gp.axes);

  if (axes.length > 1) {
    axes[1] = -axes[1];
  }
  if (axes.length > 3) {
    axes[3] = -axes[3];
  }

  const ltValue = gp.buttons[6] ? gp.buttons[6].value : 0;
  const rtValue = gp.buttons[7] ? gp.buttons[7].value : 0;

  while (axes.length < 6) {
    axes.push(0);
  }

  axes[4] = ltValue;
  axes[5] = rtValue;

  axes = axes.map((v) => parseFloat(v.toFixed(3)));

  const buttons = [];
  const pressedButtons = [];

  for (let i = 0; i < gp.buttons.length; i++) {
    const btn = gp.buttons[i];
    const pressed = btn.pressed;
    const value = btn.value;

    buttons.push({
      index: i,
      name: BUTTON_NAMES[i] || `Btn${i}`,
      pressed: pressed,
      value: parseFloat(value.toFixed(3)),
    });

    if (pressed || (value > 0.1 && (i === 6 || i === 7))) {
      pressedButtons.push(BUTTON_NAMES[i] || `Btn${i}`);
    }
  }

  return {
    id: gp.id,
    index: gp.index,
    axes: axes,
    axes_count: gp.axes.length,
    buttons: buttons,
    buttons_pressed: pressedButtons,
    buttons_count: gp.buttons.length,
    triggers: {
      LT: parseFloat(ltValue.toFixed(3)),
      RT: parseFloat(rtValue.toFixed(3)),
    },
    mapping: gp.mapping,
    timestamp: Date.now(),
  };
}

function updateDisplay(gamepadData) {
  if (!gamepadData) return;

  const axesStr = gamepadData.axes.map((v) => v.toFixed(3)).join(", ");
  axesValuesDiv.innerHTML = `<span style="color:#0f0">[${axesStr}]</span>`;

  const buttonsStr =
    gamepadData.buttons_pressed.length > 0
      ? gamepadData.buttons_pressed.join(", ")
      : "No buttons pressed";
  buttonsValuesDiv.innerHTML = `<span style="color:#ff0">${buttonsStr}</span>`;

  ltValueSpan.textContent = gamepadData.triggers.LT.toFixed(3);
  rtValueSpan.textContent = gamepadData.triggers.RT.toFixed(3);
}

function sendGamepadState() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    if (sendStatusSpan) sendStatusSpan.textContent = "No connection to server";
    return;
  }

  const gp = scanGamepads();
  if (!gp) {
    if (sendStatusSpan) sendStatusSpan.textContent = "Gamepad not found";
    return;
  }

  const gamepadData = processGamepadData(gp);
  if (!gamepadData) return;

  updateDisplay(gamepadData);

  const payload = {
    timestamp: Date.now(),
    gamepad: {
      id: gamepadData.id,
      index: gamepadData.index,
      axes: gamepadData.axes,
      buttons: gamepadData.buttons,
      buttons_pressed: gamepadData.buttons_pressed,
      triggers: gamepadData.triggers,
      mapping: gamepadData.mapping,
    },
  };

  try {
    ws.send(JSON.stringify(payload));
    if (sendStatusSpan) {
      sendStatusSpan.textContent = "Sent";
      setTimeout(() => {
        if (sendStatusSpan && sendStatusSpan.textContent === "Sent") {
          sendStatusSpan.textContent = "Sending...";
        }
      }, 200);
    }
  } catch (error) {
    console.error("Send error:", error);
    if (sendStatusSpan) sendStatusSpan.textContent = "Send error";
  }
}

function updateWSStatus(status, message) {
  wsStatusDiv.innerHTML = `<span class="status-indicator"></span>${message}`;
  wsStatusDiv.className = `status ${status}`;
}

function connectWebSocket() {
  const host = serverHostInput;
  const port = serverPortInput.value.trim();

  if (!host || !port) {
    alert("Please enter server port");
    return;
  }

  const wsUrl = `ws://${host}:${port}`;
  updateWSStatus("pending", `Connecting to ${host}:${port}...`);

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected = true;
    updateWSStatus("connected", `Connected to ${host}:${port}`);
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    if (sendStatusSpan) sendStatusSpan.textContent = "Connected - Sending data";

    if (!animationId) {
      animationId = setInterval(() => {
        sendGamepadState();
      }, 1000 / 60);
    }
  };

  ws.onclose = () => {
    isConnected = false;
    updateWSStatus("disconnected", "Disconnected");
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    if (sendStatusSpan) sendStatusSpan.textContent = "Disconnected";

    if (animationId) {
      clearInterval(animationId);
      animationId = null;
    }
    ws = null;
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    updateWSStatus("disconnected", "Connection error");
  };
}

function disconnectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
  isConnected = false;
}

connectBtn.addEventListener("click", connectWebSocket);
disconnectBtn.addEventListener("click", disconnectWebSocket);

document.body.addEventListener("click", () => {
  scanGamepads();
  console.log("Gamepad scan activated");
});

document.body.addEventListener("keydown", () => {
  scanGamepads();
});

window.addEventListener("gamepadconnected", (e) => {
  console.log(`Gamepad connected: ${e.gamepad.id}`);
  scanGamepads();
});

window.addEventListener("gamepaddisconnected", (e) => {
  console.log(`Gamepad disconnected: ${e.gamepad.id}`);
  currentGamepadIndex = null;
  updateGamepadStatus(null);
});

window.addEventListener("beforeunload", () => {
  if (ws) {
    ws.close();
  }
  if (animationId) {
    clearInterval(animationId);
  }
});

setTimeout(() => {
  scanGamepads();
}, 1000);

console.log("Physical Gamepad to WebSocket bridge started");
console.log("Connect your gamepad and click on the page to activate");
