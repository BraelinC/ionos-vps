# VPS Setup - Instruction

## Goal
Self-hosted AI coding environment with VNC browser access.

## Specs

| Resource | Value |
|----------|-------|
| Host | 74.208.72.227 |
| OS | Ubuntu 24.04 |
| RAM | 848MB + 2GB swap |
| Disk | 10GB NVMe |
| Tunnel | vps.braelin.uk |

## What's Installed

- XFCE4 desktop + TightVNC + noVNC
- Cloudflare tunnel (auto-starts on boot)
- tmux (mouse scroll, 50k history, auto-attach on SSH)
- Firefox + Playwright
- Claude Code CLI

## Access

| Method | How |
|--------|-----|
| VNC | https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true |
| SSH | `ssh root@74.208.72.227` (auto-attaches tmux) |

## Constraints

⚠️ CONSTRAINT: 848MB RAM — use swap for heavy tasks

⚠️ CONSTRAINT: 10GB disk — run `df -h` before big installs

⚠️ CONSTRAINT: Avoid snap packages (use Mozilla APT for Firefox)

## Best Practices

✅ BEST PRACTICE: Use Cloudflare tunnel for reliable access

✅ BEST PRACTICE: SSH auto-attaches to tmux `main` session

✅ BEST PRACTICE: Mouse scroll works in tmux

## Services

```bash
systemctl status vncserver@1 novnc cloudflared tmux-main
```

## Implementation

VPS is live — no setup script needed. This instruction documents what exists.
