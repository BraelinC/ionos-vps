"use client";

import { useState, useCallback } from "react";

// IONOS VPS VNC URL (via Cloudflare tunnel)
const VPS_VNC_URL = "https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true&resize=scale";

// SSH command for VPS access
const SSH_COMMAND = "ssh root@74.208.72.227";

// VPS Info
const VPS_INFO = {
  host: "74.208.72.227",
  tunnel: "vps.braelin.uk",
  cpu: "1 vCore",
  ram: "848MB + 2GB swap",
  disk: "10GB NVMe",
  os: "Ubuntu 24.04",
};

// Tab types
type TabType = "vnc" | "ssh";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("vnc");
  const [copiedSsh, setCopiedSsh] = useState(false);

  // Copy SSH command
  const handleCopySsh = useCallback(() => {
    navigator.clipboard.writeText(SSH_COMMAND);
    setCopiedSsh(true);
    setTimeout(() => setCopiedSsh(false), 2000);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#f0f6fc]">IONOS VPS Agent</h1>
          <span className="px-2 py-0.5 bg-[#238636] text-white text-xs rounded font-medium">
            ONLINE
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#8b949e]">
          <span>{VPS_INFO.tunnel}</span>
          <span className="hidden md:inline">{VPS_INFO.cpu} / {VPS_INFO.ram}</span>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex bg-[#161b22] border-b border-[#30363d] shrink-0">
        <button
          onClick={() => setActiveTab("vnc")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "vnc"
              ? "text-[#f0f6fc] border-b-2 border-[#f78166]"
              : "text-[#8b949e] hover:text-[#c9d1d9]"
          }`}
        >
          VNC Desktop
        </button>
        <button
          onClick={() => setActiveTab("ssh")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "ssh"
              ? "text-[#f0f6fc] border-b-2 border-[#f78166]"
              : "text-[#8b949e] hover:text-[#c9d1d9]"
          }`}
        >
          SSH Access
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {/* VNC Tab */}
        {activeTab === "vnc" && (
          <div className="h-full flex flex-col">
            {/* VNC Header */}
            <div className="px-4 py-2 bg-[#21262d] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[#7ee787] text-sm font-mono">
                  vps.braelin.uk
                </span>
              </div>
              <a
                href={VPS_VNC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d]
                           text-[#8b949e] text-xs font-semibold rounded border border-[#30363d]"
              >
                Fullscreen
              </a>
            </div>
            {/* VNC iframe */}
            <div className="flex-1 min-h-0">
              <iframe
                src={VPS_VNC_URL}
                className="w-full h-full border-0"
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          </div>
        )}

        {/* SSH Tab */}
        {activeTab === "ssh" && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#21262d] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#f0f6fc] mb-2">SSH Access</h2>
                <p className="text-sm text-[#8b949e]">Connect via terminal with tmux auto-attach</p>
              </div>

              {/* SSH Command */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <code className="flex-1 text-sm text-[#7ee787] font-mono bg-[#0d1117] px-3 py-2 rounded">
                    {SSH_COMMAND}
                  </code>
                  <button
                    onClick={handleCopySsh}
                    className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold rounded"
                  >
                    {copiedSsh ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* VPS Info */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[#f0f6fc] mb-3">VPS Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[#8b949e]">Host:</span>
                    <span className="ml-2 text-[#c9d1d9] font-mono">{VPS_INFO.host}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">OS:</span>
                    <span className="ml-2 text-[#c9d1d9]">{VPS_INFO.os}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">CPU:</span>
                    <span className="ml-2 text-[#c9d1d9]">{VPS_INFO.cpu}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">RAM:</span>
                    <span className="ml-2 text-[#c9d1d9]">{VPS_INFO.ram}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">Disk:</span>
                    <span className="ml-2 text-[#c9d1d9]">{VPS_INFO.disk}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e]">Tunnel:</span>
                    <span className="ml-2 text-[#58a6ff]">{VPS_INFO.tunnel}</span>
                  </div>
                </div>
              </div>

              {/* SSH Tips */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[#f0f6fc] mb-2">Tips</h3>
                <ul className="text-xs text-[#8b949e] space-y-1">
                  <li>Auto-attaches to tmux session on login</li>
                  <li>Mouse scroll enabled in tmux</li>
                  <li>Claude Code: <code className="text-[#7ee787]">claude</code></li>
                  <li>Detach tmux: <code className="text-[#7ee787]">Ctrl+b d</code></li>
                </ul>
              </div>

              {/* Browser Automation */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[#f0f6fc] mb-2">Browser Automation</h3>
                <p className="text-xs text-[#8b949e] mb-2">Run Playwright scripts on VPS:</p>
                <code className="block text-xs text-[#7ee787] font-mono bg-[#161b22] px-2 py-1 rounded">
                  cd /root/automation && DISPLAY=:1 node test-firefox.js
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-2 bg-[#161b22] border-t border-[#30363d] text-center shrink-0">
        <span className="text-xs text-[#6e7681]">
          IONOS VPS | VNC via Cloudflare Tunnel | Claude Code + Playwright
        </span>
      </footer>
    </div>
  );
}
