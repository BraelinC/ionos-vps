# IONOS VPS Setup - Instruction

## Overview
Self-hosted AI coding agent environment with VNC browser access. Alternative to Daytona/cloud sandboxes.

## Target Spec
- **Host:** 74.208.72.227
- **OS:** Ubuntu 24.04
- **CPU:** 1 vCore
- **RAM:** 848MB (+ 2GB swap)
- **Disk:** 10GB NVMe SSD (1.7GB free after setup)

## What's Installed

### System
- [x] 2GB swap file (required for low RAM)
- [x] Node.js 20.x
- [x] Git, curl, build tools

### AI CLI Tools
- [x] Claude Code 2.1.2 (`~/.local/bin/claude`)
- [ ] OpenCode (optional, can add later)

### Desktop Environment
- [x] XFCE4 (lightweight desktop)
- [x] TightVNC server (display :1, port 5901)
- [x] noVNC (browser access, port 6080)
- [x] Cloudflare tunnel (bypasses IONOS firewall)
- [x] Terminator terminal (with scrollbar, desktop shortcut)

### Terminal/Shell
- [x] tmux (mouse scroll enabled, 50k line history)
- [x] Auto-attach to `main` session on SSH login
- [x] Persistent tmux session (survives reboot)

### Browser Automation
- [x] Firefox 146.0.1 (Mozilla APT, not snap)
- [x] Playwright (native Firefox support)
- [x] Test script at `/root/automation/test-firefox.js`

## Access URLs

| Method | URL |
|--------|-----|
| **Auto-Connect (no password prompt)** | https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true |
| **Manual Connect** | https://vps.braelin.uk/vnc.html (password: daytona) |
| **Direct noVNC** | http://74.208.72.227:6080/vnc.html?password=daytona&autoconnect=true |
| **VNC Client** | 74.208.72.227:5901 (password: daytona) |

**Note:** Direct access requires opening ports in IONOS Cloud Panel firewall. The permanent Cloudflare tunnel (`vps.braelin.uk`) bypasses this and auto-starts on boot.

## Cloudflare Tunnel Details

| Setting | Value |
|---------|-------|
| Tunnel Name | ionos-vps |
| Tunnel ID | 2538bf8c-ee99-4ff6-9c9a-9138368eba29 |
| Config | /root/.cloudflared/config.yml |
| Service | cloudflared.service (auto-starts) |

## Services (Auto-start on boot)

```bash
# VNC Server
systemctl status vncserver@1

# noVNC (websockify)
systemctl status novnc

# Cloudflare Tunnel
systemctl status cloudflared

# Persistent tmux session
systemctl status tmux-main

# Check all enabled
systemctl is-enabled vncserver@1 novnc cloudflared tmux-main
```

## Key Directories

| Path | Purpose |
|------|---------|
| `/root/automation/` | Playwright scripts |
| `/root/.local/bin/claude` | Claude Code binary |
| `/root/.cache/ms-playwright/` | Playwright browsers |
| `~/.vnc/` | VNC config and password |
| `~/.tmux.conf` | tmux config (mouse scroll) |
| `~/.config/terminator/config` | Terminator config (scrollbar) |
| `~/.cloudflared/` | Cloudflare tunnel credentials |

## Constraints

| Resource | Limit | Notes |
|----------|-------|-------|
| RAM | 848MB | Always use swap for heavy tasks |
| Disk | 10GB (1.7GB free) | Monitor with `df -h` |
| CPU | 1 vCore | Expect slowness on builds |

## Best Practices

- Run heavy installs with swap enabled
- Use `df -h` before big npm installs
- Use Cloudflare tunnel for reliable access
- Use DuckDuckGo instead of Google (no CAPTCHA on datacenter IPs)
- Avoid snap packages (use Mozilla APT for Firefox)

## SSH + tmux Access

```bash
# Connect via SSH (auto-attaches to tmux)
ssh root@74.208.72.227

# Manual tmux commands
tmux ls                    # List sessions
tmux attach -t main        # Attach to main session
tmux new-session -s work   # Create new session
Ctrl+b d                   # Detach from session
```

**Features:**
- Auto-attach to `main` session on SSH login
- Mouse scroll enabled (works with Claude Code)
- 50,000 line scrollback history
- Persists across reboots (tmux-main.service)

**Config files:**
- `~/.tmux.conf` - tmux settings
- `~/.config/terminator/config` - Terminator settings

## Quick Commands

```bash
# Check resources
free -h && df -h /

# Start VNC manually
vncserver :1 -geometry 1280x800 -depth 24

# Start noVNC manually
websockify --web /opt/noVNC 6080 localhost:5901

# Start Cloudflare tunnel
cloudflared tunnel --url http://localhost:6080

# Launch browser for automation
cd /root/automation && DISPLAY=:1 node test-firefox.js

# Use Claude Code
~/.local/bin/claude
```

## Troubleshooting

### VNC shows blank/black screen
```bash
vncserver -kill :1
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1
vncserver :1 -geometry 1280x800 -depth 24
```

### Out of disk space
```bash
apt-get clean
npm cache clean --force
rm -rf /var/log/*.gz
```

### Browser won't launch
```bash
export DISPLAY=:1
xhost +local:
```
