import asyncio
import websockets
import json
import sys
import os

try:
    import vgamepad as vg
    VGAMEPAD_AVAILABLE = True
except ImportError:
    VGAMEPAD_AVAILABLE = False
    print("vgamepad not installed. Run: pip install vgamepad")
    sys.exit(1)

connected_clients = set()
gamepad = None
last_error_shown = False

def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')

def init_virtual_gamepad():
    global gamepad
    try:
        gamepad = vg.VX360Gamepad()
        return True
    except Exception as e:
        print(f"Failed to create virtual gamepad: {e}")
        return False

def update_virtual_gamepad(data):
    global gamepad, last_error_shown
    
    if not VGAMEPAD_AVAILABLE or gamepad is None:
        return
    
    try:
        gamepad_data = data.get('gamepad', {})
        axes = gamepad_data.get('axes', [])
        buttons = gamepad_data.get('buttons', [])
        
        if len(axes) >= 2:
            gamepad.left_joystick_float(x_value_float=axes[0], y_value_float=axes[1])
        
        if len(axes) >= 4:
            gamepad.right_joystick_float(x_value_float=axes[2], y_value_float=axes[3])
        
        if len(axes) >= 5:
            gamepad.left_trigger_float(value_float=axes[4])
        
        if len(axes) >= 6:
            gamepad.right_trigger_float(value_float=axes[5])
        
        button_mapping = {
            0: 'XUSB_GAMEPAD_A',
            1: 'XUSB_GAMEPAD_B',
            2: 'XUSB_GAMEPAD_X',
            3: 'XUSB_GAMEPAD_Y',
            4: 'XUSB_GAMEPAD_LEFT_SHOULDER',
            5: 'XUSB_GAMEPAD_RIGHT_SHOULDER',
            8: 'XUSB_GAMEPAD_BACK',
            9: 'XUSB_GAMEPAD_START',
            10: 'XUSB_GAMEPAD_LEFT_THUMB',
            11: 'XUSB_GAMEPAD_RIGHT_THUMB',
            12: 'XUSB_GAMEPAD_DPAD_UP',
            13: 'XUSB_GAMEPAD_DPAD_DOWN',
            14: 'XUSB_GAMEPAD_DPAD_LEFT',
            15: 'XUSB_GAMEPAD_DPAD_RIGHT',
            16: 'XUSB_GAMEPAD_GUIDE',
        }
        
        for i, btn in enumerate(buttons):
            if i in button_mapping:
                if isinstance(btn, dict):
                    pressed = btn.get('pressed', False)
                else:
                    pressed = btn
                
                button_attr = getattr(vg.XUSB_BUTTON, button_mapping[i], None)
                if button_attr is not None:
                    if pressed:
                        gamepad.press_button(button_attr)
                    else:
                        gamepad.release_button(button_attr)
        
        gamepad.update()
        last_error_shown = False
        
    except Exception as e:
        if not last_error_shown:
            print(f"\nError: {e}")
            last_error_shown = True

def format_gamepad_status(gamepad_data):
    axes = gamepad_data.get('axes', [])
    buttons = gamepad_data.get('buttons', [])
    
    pressed = []
    for i, btn in enumerate(buttons):
        if isinstance(btn, dict):
            if btn.get('pressed', False):
                pressed.append(i)
        else:
            if btn:
                pressed.append(i)
    
    button_names = {0:"A",1:"B",2:"X",3:"Y",4:"LB",5:"RB",6:"LT",7:"RT",
                    8:"View",9:"Menu",10:"LS",11:"RS",12:"D-Up",13:"D-Down",14:"D-Left",15:"D-Right",16:"Xbox"}
    
    pressed_names = [button_names.get(i, str(i)) for i in pressed if i not in [6,7]]
    axes_display = []
    for i, a in enumerate(axes[:6]):
        axes_display.append(f'{a:5.2f}')
    axes_str = ' '.join(axes_display) if axes_display else '0.00 0.00 0.00 0.00 0.00 0.00'
    buttons_str = f'Buttons: [{",".join(pressed_names[:10])}]' if pressed_names else 'Buttons: []'
    
    return f"{axes_str} | {buttons_str}"

async def handler(websocket):
    connected_clients.add(websocket)
    clear_console()
    print("*"*20)
    print("WebJoy Server")
    print("*"*20)
    print(f"\nServer: ws://0.0.0.0:8765")
    print(f"Client connected. Total: {len(connected_clients)}")
    print("\nLive Data:")
    print("-"*20)
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                update_virtual_gamepad(data)
                status_line = format_gamepad_status(data.get('gamepad', {}))
                print(f"\r{status_line}", end='', flush=True)
                await websocket.send(json.dumps({"status": "ok"}))
            except:
                pass
    except websockets.exceptions.ConnectionClosed:
        print(f"\n\nClient disconnected")
    finally:
        connected_clients.remove(websocket)

async def main():
    clear_console()
    print("*"*20)
    print("WebJoy Server")
    print("*"*20)
    
    if not init_virtual_gamepad():
        print("\nFailed to create virtual gamepad")
        print("Install ViGEmBus: https://github.com/nefarius/ViGEmBus/releases")
        sys.exit(1)
    
    print(f"\nVirtual Xbox 360 controller created")
    
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print(f"\nServer running on: ws://0.0.0.0:8765")
        print("Waiting for connections...\n")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear_console()
        print("\nServer stopped")
        sys.exit(0)