#!/usr/bin/env node
/**
 * Desktop Control Tool for ionos-vps
 * Controls the VNC desktop (display :5) using xte from xautomation
 *
 * Usage:
 *   node desktop_control.js screenshot [filename]    - Take screenshot
 *   node desktop_control.js click X,Y               - Click at coordinates
 *   node desktop_control.js type "text"             - Type text
 *   node desktop_control.js press Key               - Press key (Enter, Tab, Escape, etc.)
 *   node desktop_control.js move X,Y                - Move mouse to coordinates
 *   node desktop_control.js scroll N                - Scroll (positive=down, negative=up)
 *
 * Dependencies:
 *   - xautomation (xte) - downloaded to /tmp/xauto_extracted
 *   - xwd (for screenshots)
 *   - PIL/Pillow (Python) for image conversion
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DISPLAY = process.env.DISPLAY || ':5';
const XTE_PATH = '/tmp/xauto_extracted/usr/bin/xte';

// Ensure xautomation is installed
function ensureXautomation() {
  if (!fs.existsSync(XTE_PATH)) {
    console.log('Installing xautomation...');
    try {
      execSync('cd /tmp && apt-get download xautomation 2>/dev/null && dpkg -x xautomation*.deb /tmp/xauto_extracted', {
        stdio: 'inherit'
      });
    } catch (e) {
      console.error('Failed to install xautomation. Run manually:');
      console.error('cd /tmp && apt-get download xautomation && dpkg -x xautomation*.deb /tmp/xauto_extracted');
      process.exit(1);
    }
  }
}

function xte(commands) {
  ensureXautomation();
  const args = Array.isArray(commands) ? commands : [commands];
  const result = spawnSync(XTE_PATH, args, {
    env: { ...process.env, DISPLAY }
  });
  if (result.error) throw result.error;
  return result;
}

function screenshot(filename = 'screenshot.png') {
  const xwdFile = '/tmp/vnc_capture.xwd';
  const outFile = path.resolve(filename);
  const converterScript = '/tmp/xwd_to_png.py';

  // Capture with xwd
  execSync(`DISPLAY=${DISPLAY} xwd -root -out ${xwdFile}`);

  // Write Python converter script
  const pythonScript = `
import struct
import sys
from PIL import Image

xwd_file = sys.argv[1]
out_file = sys.argv[2]

with open(xwd_file, 'rb') as f:
    data = f.read()

header_size = struct.unpack('>I', data[0:4])[0]
pixmap_width = struct.unpack('>I', data[16:20])[0]
pixmap_height = struct.unpack('>I', data[20:24])[0]
ncolors = struct.unpack('>I', data[76:80])[0]
pixel_offset = header_size + (ncolors * 12)
pixel_data = data[pixel_offset:]
img = Image.frombytes('RGBA', (pixmap_width, pixmap_height), pixel_data, 'raw', 'BGRA')
img.save(out_file)
print(f'Screenshot saved: {pixmap_width}x{pixmap_height}')
`;

  fs.writeFileSync(converterScript, pythonScript.trim());
  execSync(`python3 ${converterScript} ${xwdFile} ${outFile}`);
  console.log(`Screenshot: ${outFile}`);
  return outFile;
}

function click(coords) {
  const [x, y] = coords.split(',').map(n => parseInt(n.trim()));
  if (isNaN(x) || isNaN(y)) {
    console.error('Invalid coordinates. Use: click X,Y');
    return;
  }
  xte([`mousemove ${x} ${y}`, 'mouseclick 1']);
  console.log(`Clicked at (${x}, ${y})`);
}

function rightClick(coords) {
  const [x, y] = coords.split(',').map(n => parseInt(n.trim()));
  if (isNaN(x) || isNaN(y)) {
    console.error('Invalid coordinates. Use: rightclick X,Y');
    return;
  }
  xte([`mousemove ${x} ${y}`, 'mouseclick 3']);
  console.log(`Right-clicked at (${x}, ${y})`);
}

function move(coords) {
  const [x, y] = coords.split(',').map(n => parseInt(n.trim()));
  if (isNaN(x) || isNaN(y)) {
    console.error('Invalid coordinates. Use: move X,Y');
    return;
  }
  xte(`mousemove ${x} ${y}`);
  console.log(`Moved to (${x}, ${y})`);
}

function type(text) {
  // xte str command types text
  xte(`str ${text}`);
  console.log(`Typed: "${text}"`);
}

function press(key) {
  // Map common key names to xte key names
  const keyMap = {
    'enter': 'Return',
    'return': 'Return',
    'tab': 'Tab',
    'escape': 'Escape',
    'esc': 'Escape',
    'backspace': 'BackSpace',
    'delete': 'Delete',
    'up': 'Up',
    'down': 'Down',
    'left': 'Left',
    'right': 'Right',
    'home': 'Home',
    'end': 'End',
    'pageup': 'Page_Up',
    'pagedown': 'Page_Down',
    'space': 'space',
    'ctrl': 'Control_L',
    'alt': 'Alt_L',
    'shift': 'Shift_L',
  };

  const xteKey = keyMap[key.toLowerCase()] || key;
  xte(`key ${xteKey}`);
  console.log(`Pressed: ${key}`);
}

function scroll(amount) {
  const n = parseInt(amount);
  if (isNaN(n)) {
    console.error('Invalid scroll amount. Use: scroll N (positive=down, negative=up)');
    return;
  }

  // xte uses button 4 for scroll up, button 5 for scroll down
  const button = n > 0 ? 5 : 4;
  const clicks = Math.abs(Math.round(n / 50)); // Convert pixels to scroll clicks

  for (let i = 0; i < clicks; i++) {
    xte(`mouseclick ${button}`);
  }
  console.log(`Scrolled ${n > 0 ? 'down' : 'up'} ${clicks} clicks`);
}

function hotkey(...keys) {
  // For key combinations like Ctrl+C
  const keyMap = {
    'ctrl': 'Control_L',
    'alt': 'Alt_L',
    'shift': 'Shift_L',
    'super': 'Super_L',
    'win': 'Super_L',
  };

  const mappedKeys = keys.map(k => keyMap[k.toLowerCase()] || k);

  // Build keydown/keyup sequence
  const commands = [];
  mappedKeys.forEach(k => commands.push(`keydown ${k}`));
  mappedKeys.reverse().forEach(k => commands.push(`keyup ${k}`));

  xte(commands);
  console.log(`Hotkey: ${keys.join('+')}`);
}

// Main CLI
const [,, command, ...args] = process.argv;

if (!command) {
  console.log(`
Desktop Control Tool for ionos-vps

Usage:
  node desktop_control.js screenshot [filename]   - Take screenshot (default: screenshot.png)
  node desktop_control.js click X,Y              - Click at coordinates
  node desktop_control.js rightclick X,Y         - Right-click at coordinates
  node desktop_control.js move X,Y               - Move mouse
  node desktop_control.js type "text"            - Type text
  node desktop_control.js press Key              - Press key (Enter, Tab, Escape, etc.)
  node desktop_control.js scroll N               - Scroll (positive=down, negative=up)
  node desktop_control.js hotkey Ctrl c          - Key combination

Environment:
  DISPLAY=${DISPLAY}

Examples:
  node desktop_control.js click 400,300
  node desktop_control.js type "Hello World"
  node desktop_control.js press Enter
  node desktop_control.js hotkey Ctrl a
  node desktop_control.js screenshot myshot.png
`);
  process.exit(0);
}

try {
  switch (command.toLowerCase()) {
    case 'screenshot':
    case 'shot':
      screenshot(args[0]);
      break;
    case 'click':
      click(args[0]);
      break;
    case 'rightclick':
      rightClick(args[0]);
      break;
    case 'move':
      move(args[0]);
      break;
    case 'type':
      type(args.join(' '));
      break;
    case 'press':
      press(args[0]);
      break;
    case 'scroll':
      scroll(args[0]);
      break;
    case 'hotkey':
      hotkey(...args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
