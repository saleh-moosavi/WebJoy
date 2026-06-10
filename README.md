# 🎮 WebJoy

**WebJoy** is a remote gamepad control system. It allows a client to connect their physical gamepad to a host computer over a network (or localhost) and control it as a virtual Xbox 360 controller.

The project has two parts:

- **Host (Server)**: Runs the Python script, opens a WebSocket port, and creates a virtual Xbox 360 controller.
- **Client (Browser)**: Connects to the host via the provided port, connects their physical gamepad, and every button press or stick movement is applied to the host system in real time.

---

## ✨ Features

- 🕹️ **Full remote control**: Client's gamepad controls host's virtual Xbox 360 controller
- 🌐 **Works over network**: Client and host don't need to be on the same machine
- ⚡ **60 FPS transmission**: Smooth, low-latency input
- 🎮 **Supports all gamepads**: Xbox, PlayStation, and generic gamepads
- 📊 **Real-time feedback**: Both host console and client browser show live button/axis data

---

## 🏗️ How It Works

1. **Host** runs the Python server script. Open `cmd` in the project folder and enter:
   ```bash
   py .\host.py
   ```
2. Open another `cmd` in the project folder and enter:
   ```bash
     .\bore.exe local 8765 --to bore.pub
   ```
3. Host shares the port number with the client.
4. Client opens the web page and enters the host's IP address and port.
5. Client connects their physical gamepad to their computer.
6. Client clicks "Connect" — now any button press or stick movement on the client's gamepad is sent to the host.
7. Host receives the data and applies it to a virtual Xbox 360 controller.
8. The host system (games, emulators, etc.) sees this as a real controller.

## 📋 Prerequisites

### On the Host (Server)

| Prerequisite             | Details                                              |
| :----------------------- | :--------------------------------------------------- |
| **Windows 10 or 11**     | (Due to ViGEmBus dependency)                         |
| **Python 3.7 or higher** | [Download Python](https://www.python.org/downloads/) |
| **ViGEmBus**             | Virtual input device driver                          |
| **Python packages**      | `websockets` and `vgamepad`                          |

### On the Client

- Any modern browser (Chrome, Edge, Brave, Opera)
- A physical gamepad (USB or Bluetooth)
- Network access to the host (same Wi-Fi or internet)

---

## 🚀 Installation & Setup

### Step 1: Install ViGEmBus (Host only)

1. Go to the [ViGEmBus releases page](https://github.com/nefarius/ViGEmBus/releases)
2. Download and install the latest `ViGEmBus_Setup_x64.msi`
3. **Restart your system** after installation

### Step 2: Install Python packages (Host only)

```bash
pip install websockets vgamepad
```

<div align="center">Made With ❤️ For Gamers</div>
