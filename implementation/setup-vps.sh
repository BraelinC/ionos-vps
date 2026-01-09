#!/bin/bash
# IONOS VPS Setup Script
# Reproduces the full setup for AI coding agents with browser VNC access
# Target: Ubuntu 24.04 with 1GB RAM, 10GB disk

set -e

echo "=== IONOS VPS Setup ==="
echo "Target: Ubuntu 24.04 with 1GB RAM"
echo ""

# 1. Add swap (required for low-memory VPS)
echo "[1/8] Adding 2GB swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap created"
else
    echo "Swap already exists"
fi

# 2. Install Node.js 20
echo "[2/8] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# 3. Install Claude Code
echo "[3/8] Installing Claude Code..."
if [ ! -f ~/.local/bin/claude ]; then
    curl -fsSL https://claude.ai/install.sh | bash
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
fi
echo "Claude Code: $(~/.local/bin/claude --version 2>/dev/null || echo 'installed')"

# 4. Install XFCE desktop + VNC
echo "[4/8] Installing XFCE desktop and TightVNC..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y xfce4 xfce4-goodies tightvncserver

# 5. Configure VNC
echo "[5/8] Configuring VNC..."
mkdir -p ~/.vnc

# Set VNC password (change 'daytona' to your preferred password)
echo 'daytona' | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Create VNC startup script
cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
xrdb $HOME/.Xresources
startxfce4 &
EOF
chmod +x ~/.vnc/xstartup

# Create VNC systemd service
cat > /etc/systemd/system/vncserver@.service << 'EOF'
[Unit]
Description=VNC Server for display %i
After=syslog.target network.target

[Service]
Type=forking
User=root
ExecStartPre=-/usr/bin/vncserver -kill :%i > /dev/null 2>&1
ExecStart=/usr/bin/vncserver :%i -geometry 1280x800 -depth 24
ExecStop=/usr/bin/vncserver -kill :%i

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vncserver@1
systemctl start vncserver@1

# 6. Install and configure noVNC (browser access)
echo "[6/8] Setting up noVNC..."
apt-get install -y python3-websockify git
if [ ! -d /opt/noVNC ]; then
    git clone https://github.com/novnc/noVNC.git /opt/noVNC
fi

# Create noVNC systemd service
cat > /etc/systemd/system/novnc.service << 'EOF'
[Unit]
Description=noVNC websocket proxy
After=network.target vncserver@1.service

[Service]
Type=simple
ExecStart=/usr/bin/websockify --web /opt/noVNC 6080 localhost:5901
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable novnc
systemctl start novnc

# 7. Install Firefox (Mozilla APT, not snap) + Playwright
echo "[7/8] Installing Firefox and Playwright..."

# Remove snap if present (saves 5GB+)
systemctl stop snapd 2>/dev/null || true
apt-get purge -y snapd 2>/dev/null || true
rm -rf /snap /var/snap /var/lib/snapd

# Add Mozilla APT repo
install -d -m 0755 /etc/apt/keyrings
wget -q https://packages.mozilla.org/apt/repo-signing-key.gpg -O- | tee /etc/apt/keyrings/packages.mozilla.org.asc > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" | tee /etc/apt/sources.list.d/mozilla.list > /dev/null
echo -e 'Package: *\nPin: origin packages.mozilla.org\nPin-Priority: 1000' | tee /etc/apt/preferences.d/mozilla

apt-get update
apt-get install -y firefox

# Setup Playwright
mkdir -p /root/automation
cd /root/automation
npm init -y
npm install playwright
npx playwright install firefox
npx playwright install-deps firefox

# Create test browser script
cat > /root/automation/test-firefox.js << 'EOF'
const { firefox } = require('playwright');

(async () => {
  console.log('Launching Firefox...');
  const browser = await firefox.launch({
    headless: false
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 700 }
  });

  const page = await context.newPage();

  console.log('Navigating to DuckDuckGo...');
  await page.goto('https://duckduckgo.com', { timeout: 120000 });
  console.log('Page loaded!');

  // Keep open for 10 minutes
  await new Promise(r => setTimeout(r, 600000));
})();
EOF

# 8. Install tmux + Terminator terminal
echo "[8/11] Setting up tmux and Terminator..."
apt-get install -y tmux terminator

# Configure tmux with mouse scrolling
cat > ~/.tmux.conf << 'EOF'
# Enable mouse mode for scrolling
set -g mouse on

# Increase scrollback buffer
set -g history-limit 50000
EOF

# Configure Terminator with scrollbar
mkdir -p ~/.config/terminator
cat > ~/.config/terminator/config << 'EOF'
[global_config]
[keybindings]
[profiles]
  [[default]]
    scrollbar_position = right
    scroll_on_output = false
    scrollback_lines = 10000
[layouts]
  [[default]]
    [[[window0]]]
      type = Window
    [[[child1]]]
      type = Terminal
[plugins]
EOF

# Create Terminator desktop shortcut
mkdir -p /root/Desktop
cat > /root/Desktop/Terminator.desktop << 'EOF'
[Desktop Entry]
Name=Terminator
Exec=terminator
Icon=terminator
Type=Application
Terminal=false
EOF
chmod +x /root/Desktop/Terminator.desktop

# Create tmux systemd service (auto-start main session)
cat > /etc/systemd/system/tmux-main.service << 'EOF'
[Unit]
Description=Persistent tmux session
After=network.target

[Service]
Type=forking
User=root
ExecStart=/usr/bin/tmux new-session -d -s main
ExecStop=/usr/bin/tmux kill-session -t main
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tmux-main
systemctl start tmux-main

# 9. Configure Claude Code PATH and auto-attach tmux
echo "[9/11] Configuring shell environment..."
cat >> ~/.bashrc << 'EOF'

# Claude Code PATH
export PATH="$HOME/.local/bin:$PATH"

# Auto-attach to tmux session on SSH login
if [[ -z "$TMUX" ]] && [[ -n "$SSH_CONNECTION" ]]; then
    tmux attach-session -t main 2>/dev/null || tmux new-session -s main
fi
EOF

echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile

# 10. Install Cloudflare tunnel
echo "[10/11] Installing Cloudflare tunnel..."
if ! command -v cloudflared &> /dev/null; then
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-archive-keyring.gpg > /dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/cloudflared.list
    apt-get update
    apt-get install -y cloudflared
fi

# 11. Cleanup
echo "[11/11] Cleaning up..."
apt-get autoremove -y
apt-get clean
npm cache clean --force

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Disk usage: $(df -h / | tail -1 | awk '{print $5 " used, " $4 " free"}')"
echo ""
echo "Next steps:"
echo "  1. Run: cloudflared tunnel login"
echo "  2. Create tunnel: cloudflared tunnel create ionos-vps"
echo "  3. Route DNS: cloudflared tunnel route dns ionos-vps vps.YOUR-DOMAIN.com"
echo "  4. Configure /root/.cloudflared/config.yml"
echo "  5. Install service: cloudflared service install"
echo ""
echo "Access:"
echo "  VNC (after tunnel): https://vps.YOUR-DOMAIN.com/vnc.html?password=daytona&autoconnect=true"
echo "  SSH: ssh root@$(hostname -I | awk '{print $1}')"
echo ""
echo "Tools:"
echo "  Claude Code: claude (or ~/.local/bin/claude)"
echo "  Browser automation: cd /root/automation && DISPLAY=:1 node test-firefox.js"
echo "  Terminal: Terminator (desktop icon)"
echo ""
echo "tmux: Auto-attaches on SSH login. Mouse scroll enabled."
