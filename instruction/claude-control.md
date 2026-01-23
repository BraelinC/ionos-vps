# Claude Control - Instruction

## Goal
Control Claude Code instances, VNC desktops, and enable inter-Claude communication on the IONOS VPS.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    vmi3015746 Server                     │
├─────────────────────────────────────────────────────────┤
│  claude1 (VNC :1)  │  claude2 (VNC :2)  │  claude5      │
│  ├─ tmux: claude1  │  ├─ tmux: claude2  │  └─ Clawdbot  │
│  └─ Claude Code    │  ├─ expo-claude2   │     (Discord) │
│                    │  └─ Claude Code    │               │
├─────────────────────────────────────────────────────────┤
│  Waydroid instances for Android emulation               │
└─────────────────────────────────────────────────────────┘
```

## VNC Control

| User    | Display | Port |
|---------|---------|------|
| claude1 | :1      | 5901 |
| claude2 | :2      | 5902 |

```bash
# Type text
sudo -u claude2 DISPLAY=:2 xdotool type "text"

# Press key
sudo -u claude2 DISPLAY=:2 xdotool key Return

# Click
sudo -u claude2 DISPLAY=:2 xdotool mousemove 500 300 click 1

# Screenshot
sudo -u claude2 DISPLAY=:2 import -window root /tmp/screenshot.png
```

## tmux Control

```bash
# List sessions
sudo -u claude2 tmux list-sessions

# Send message
sudo -u claude2 tmux send-keys -t claude2:0.0 "message" Enter

# Read output
sudo -u claude2 tmux capture-pane -p -J -t claude2:0.0 -S -100

# Interrupt
sudo -u claude2 tmux send-keys -t claude2:0.0 C-c
```

## Inter-Claude Communication

```bash
# Send task to another Claude
sudo -u claude2 tmux send-keys -t claude2:0.0 "Please help with X" Enter
sleep 15
sudo -u claude2 tmux capture-pane -p -J -t claude2:0.0 -S -50
```

## Constraints

⚠️ CONSTRAINT: Always include `Enter` at end to submit message

⚠️ CONSTRAINT: Use `-J` flag to join wrapped lines in capture

## Best Practices

✅ BEST PRACTICE: Name sessions `claude-PROJECTNAME` for clarity

✅ BEST PRACTICE: Use `-S -N` to capture last N lines of scrollback

## Implementation

Location on VPS: `/home/shared/docs/CLAUDE-CONTROL-GUIDE.md`
