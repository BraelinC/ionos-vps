# Local APK Build - Instruction

## Overview

Build Android APKs for React Native/Expo projects on the local machine via SSH tunnel. The VPS has no Android SDK - all builds happen on the local machine.

## Connection

```bash
# SSH command (use for all remote operations)
ssh -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    braelin@build.braelin.uk

# SCP command (use for file transfers)
scp -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    [source] braelin@build.braelin.uk:[dest]
```

| Setting | Value |
|---------|-------|
| SSH Key | `/etc/ssh/shared_keys/vps_shared` |
| Hostname | `build.braelin.uk` |
| User | `braelin` |
| Android SDK | `/home/braelin/Android/Sdk` |
| Build Dir | `~/local-apk/` |

## Build Steps

### 1. Copy project to local machine

```bash
scp -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    -r /path/to/project \
    braelin@build.braelin.uk:~/local-apk/
```

### 2. Set Android SDK path

```bash
ssh -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    braelin@build.braelin.uk \
    "echo 'sdk.dir=/home/braelin/Android/Sdk' > ~/local-apk/PROJECT/android/local.properties"
```

### 3. Install dependencies (if needed)

```bash
ssh -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    braelin@build.braelin.uk \
    "cd ~/local-apk/PROJECT && npm install"
```

### 4. Build APK

```bash
# Release build
ssh -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    braelin@build.braelin.uk \
    "cd ~/local-apk/PROJECT/android && ./gradlew assembleRelease"

# Debug build (faster, no signing)
ssh -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    braelin@build.braelin.uk \
    "cd ~/local-apk/PROJECT/android && ./gradlew assembleDebug"
```

### 5. Copy APK back to VPS

```bash
# Release
scp -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    braelin@build.braelin.uk:~/local-apk/PROJECT/android/app/build/outputs/apk/release/app-release.apk \
    ./

# Debug
scp -i /etc/ssh/shared_keys/vps_shared \
    -o ProxyCommand="cloudflared access ssh --hostname %h" \
    braelin@build.braelin.uk:~/local-apk/PROJECT/android/app/build/outputs/apk/debug/app-debug.apk \
    ./
```

## APK Output Paths

| Build Type | Path |
|------------|------|
| Release | `android/app/build/outputs/apk/release/app-release.apk` |
| Debug | `android/app/build/outputs/apk/debug/app-debug.apk` |

## After Build

Upload APK to distribution site - see `/home/claude1/apk-distribution/APK-RELEASE.md`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection timeout | Cloudflare tunnel not running on local machine |
| SDK not found | Set `sdk.dir=/home/braelin/Android/Sdk` in `android/local.properties` |
| Memory error | Add `org.gradle.jvmargs=-Xmx4096m` to `android/gradle.properties` |
| gradlew permission denied | `chmod +x android/gradlew` |

## Prerequisites

- Cloudflare Tunnel running on local machine
- Android SDK at `/home/braelin/Android/Sdk`
- SSH key at `/etc/ssh/shared_keys/vps_shared`
- `cloudflared` on VPS

---

*Related: instruction/waydroid-expo.md (testing)*
*Upload: /home/claude1/apk-distribution/APK-RELEASE.md*
