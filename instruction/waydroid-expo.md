# Waydroid + Expo - Instruction

## Goal
Run Waydroid Android emulator with Expo Go for testing React Native apps on the VPS.

## Startup Sequence

### 1. Enable Network
```bash
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
sudo iptables -t nat -A POSTROUTING -s 192.168.240.0/24 -j MASQUERADE
```

### 2. Set Environment
```bash
export DISPLAY=:1
export XAUTHORITY=/home/claude1/.Xauthority
export XDG_RUNTIME_DIR=/run/user/1001
```

### 3. Start Weston
```bash
weston --backend=x11-backend.so --socket=wayland-waydroid &
sleep 5
```

### 4. Start Waydroid
```bash
export WAYLAND_DISPLAY=wayland-waydroid
waydroid show-full-ui &
sleep 12
```

### 5. Launch Expo
```bash
sudo waydroid shell -- am start -a android.intent.action.VIEW -d "exp://192.168.240.1:PORT"
```

## Quick Commands

| Action | Command |
|--------|---------|
| Screenshot | `sudo waydroid shell -- screencap -p /sdcard/screen.png` |
| Tap | `sudo waydroid shell -- input tap X Y` |
| Type | `sudo waydroid shell -- input text 'text'` |
| Key | `sudo waydroid shell -- input keyevent KEYCODE_ENTER` |
| Status | `waydroid status` |
| Stop | `waydroid session stop` |

## Network

| Host | IP |
|------|-----|
| Host (from Waydroid) | 192.168.240.1 |
| Waydroid | 192.168.240.112 |

## Constraints

⚠️ CONSTRAINT: Use 192.168.240.1 for Expo URLs (not external IP)

⚠️ CONSTRAINT: react-native-screens v4.17+ crashes on Expo SDK 54 - pin to 4.16.0

## Best Practices

✅ BEST PRACTICE: Run IP forwarding commands once per boot

✅ BEST PRACTICE: Wait 12+ seconds for Android to fully boot

## Implementation

Skill location: `~/.claude/skills/waydroid-expo/`
