# 🚀 Complete Project Setup Guide

I'll guide you through building this robot control system from **absolute zero** to **working prototype**.

---

## 📋 Pre-Flight Checklist

### What You Need

#### Software

- [ ] **Node.js 20+** → [Download](https://nodejs.org/)
- [ ] **VS Code** → [Download](https://code.visualstudio.com/)
- [ ] **Git** → [Download](https://git-scm.com/)
- [ ] **Arduino IDE** or **PlatformIO** → [PlatformIO Guide](https://platformio.org/install/ide?install=vscode)

#### Hardware (Minimum Viable)

- [ ] ESP32 Dev Board
- [ ] L298N Motor Driver
- [ ] 2× DC Motors (with wheels)
- [ ] HC-SR04 Ultrasonic Sensor
- [ ] SG90 Servo Motor
- [ ] 7.4V Battery (2S LiPo or 6× AA holder)
- [ ] Jumper wires
- [ ] Breadboard
- [ ] Voltage divider resistors (2× 10kΩ)

#### Network

- [ ] WiFi router/hotspot
- [ ] Laptop on same network as ESP32

---

## 🎯 Phase 1: Environment Setup (15 min)

### Step 1.1: Install Node.js & pnpm

```bash
# Verify Node installation
node --version  # Should show v20.x.x or higher

# Install pnpm globally
npm install -g pnpm

# Verify pnpm
pnpm --version
```

### Step 1.2: Install VS Code Extensions

Open VS Code → Extensions (Ctrl+Shift+X):

- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **PlatformIO IDE** (platformio.platformio-ide) ← For ESP32

### Step 1.3: Create Project Directory

```bash
# Create project root
mkdir robot-control
cd robot-control

# Open in VS Code
code .
```

---

## 🏗️ Phase 2: Backend Setup (20 min)

### Step 2.1: Initialize Monorepo

In VS Code terminal (Ctrl+`):

```bash
# Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "robot-control",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "dev:api": "pnpm --filter @robot-control/api dev",
    "dev:web": "pnpm --filter @robot-control/web dev",
    "build": "turbo run build"
  },
  "devDependencies": {
    "turbo": "^1.13.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
EOF

# Create turbo config
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "outputs": ["dist/**", ".next/**"],
      "dependsOn": ["^build"]
    }
  }
}
EOF

# Create directory structure
mkdir -p apps/{web,api} firmware/robot-client packages/types
```

### Step 2.2: Create Shared Types Package

```bash
cd packages/types
pnpm init -y
```

Create `packages/types/src/index.ts`:Update `packages/types/package.json`:

```json
{
  "name": "@robot-control/types",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

### Step 2.3: Create Fastify Backend

```bash
cd ../../apps/api
pnpm init -y
pnpm add fastify @fastify/websocket @fastify/cors ws
pnpm add -D typescript @types/node @types/ws tsx pino-pretty
```

Update `apps/api/package.json`:

```json
{
  "name": "@robot-control/api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@robot-control/types": "workspace:*",
    "fastify": "^4.26.2",
    "@fastify/websocket": "^10.0.1",
    "@fastify/cors": "^9.0.1",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "@types/ws": "^8.5.10",
    "tsx": "^4.7.1",
    "typescript": "^5.4.3",
    "pino-pretty": "^11.0.0"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create the server file `apps/api/src/server.ts` - I'll provide this as an artifact:Create `.env` file in `apps/api/`:

```bash
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**Test the backend:**

```bash
cd apps/api
pnpm install
pnpm dev
```

You should see:

```
🚀 Fastify server running
📡 WebSocket (ESP32):  ws://localhost:3001/ws/robot
💻 WebSocket (Client): ws://localhost:3001/ws/client
```

---

## 🎨 Phase 3: Frontend Setup (30 min)

### Step 3.1: Create Next.js App

```bash
cd ../../apps/web
pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Answer prompts:

- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ App Router
- ❌ `src/` directory
- ✅ Import alias `@/*`

### Step 3.2: Install Dependencies

```bash
pnpm add @robot-control/types@workspace:* zustand konva react-konva lucide-react
pnpm add -D @types/react-konva
```

### Step 3.3: Setup shadcn/ui

```bash
npx shadcn@latest init -d
```

Choose:

- Style: **Default**
- Color: **Slate**
- CSS variables: **Yes**

```bash
npx shadcn@latest add button card slider badge separator
```

### Step 3.4: Create Environment File

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws/client
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Step 3.5: Create WebSocket Hook

Create `apps/web/hooks/use-websocket.ts`:### Step 3.6: Create State Store

Create `apps/web/lib/robot-store.ts`:### Step 3.7: Create UI Components

I'll create the main components as artifacts.
First, the robot canvas:
Now the joystick control:
Finally, the main dashboard page:

Now update the layout file:

```typescript
// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Robot Control Dashboard",
  description: "Real-time robot monitoring and control",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Test the frontend:**

```bash
cd apps/web
pnpm install
pnpm dev
```

Open http://localhost:3000 - you should see the dashboard! (It will show "Disconnected" until we connect the ESP32)

---

## 🤖 Phase 4: ESP32 Firmware (45 min)

### Step 4.1: Hardware Wiring

**CRITICAL SAFETY NOTES:**

- ⚡ **Never** connect 5V HC-SR04 ECHO directly to ESP32 - use voltage divider!
- 🔋 Keep battery disconnected until code is uploaded
- 🔌 Use common ground between all components

**Wiring Diagram:**

```
ESP32 Pin Layout:
┌─────────────────────────────────┐
│  GPIO 14 ───► IN1 (L298N)       │
│  GPIO 12 ───► IN2 (L298N)       │
│  GPIO 27 ───► IN3 (L298N)       │
│  GPIO 26 ───► IN4 (L298N)       │
│  GPIO 25 ───► ENA (L298N)       │
│  GPIO 33 ───► ENB (L298N)       │
│                                  │
│  GPIO 4  ───► TRIG (HC-SR04)    │
│  GPIO 16 ───┬► 10kΩ ─┬─ ECHO    │
│             └─ 10kΩ ─┴─ GND     │ ← Voltage divider!
│                                  │
│  GPIO 13 ───► Servo Signal      │
│  GPIO 34 ───► Battery (ADC)     │
│                                  │
│  GND ────────► Common Ground    │
│  VIN/5V ─────► L298N Logic      │
└─────────────────────────────────┘

L298N Connections:
┌──────────────────┐
│ Motor A (Left)   │ ──► DC Motor 1
│ Motor B (Right)  │ ──► DC Motor 2
│                  │
│ 12V Input        │ ──► 7.4V Battery +
│ GND              │ ──► Battery - & ESP32 GND
│                  │
│ 5V Output        │ ──► ESP32 VIN (if no USB)
└──────────────────┘

Servo: Red(5V), Brown(GND), Orange(GPIO13)
```

### Step 4.2: Install Arduino/PlatformIO

**Option A: PlatformIO (Recommended)**

1. In VS Code, install **PlatformIO IDE** extension
2. Reload VS Code
3. Click PlatformIO icon in sidebar
4. Click "New Project"
   - Name: `robot-client`
   - Board: `Espressif ESP32 Dev Module`
   - Framework: `Arduino`
   - Location: Choose `firmware/robot-client`

**Option B: Arduino IDE**

1. Download from https://www.arduino.cc/en/software
2. Install ESP32 board:
   - File → Preferences → Additional Boards URLs:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
   - Tools → Board → Boards Manager → Search "ESP32" → Install

### Step 4.3: Install Required Libraries

**For PlatformIO:**

Create `firmware/robot-client/platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

monitor_speed = 115200
monitor_filters = esp32_exception_decoder

lib_deps =
    links2004/WebSockets@^2.4.1
    bblanchon/ArduinoJson@^6.21.5

build_flags =
    -DCORE_DEBUG_LEVEL=3

upload_speed = 921600
```

**For Arduino IDE:**

Sketch → Include Library → Manage Libraries:

- Search "WebSockets" by Markus Sattler → Install
- Search "ArduinoJson" by Benoit Blanchon → Install (v6.x)

### Step 4.4: Create ESP32 Code

Create `firmware/robot-client/robot-client.ino`:### Step 4.5: Configure & Upload

**Before uploading:**

1. **Find your laptop's IP address:**

```bash
# Windows
ipconfig
# Look for "IPv4 Address" under your WiFi adapter

# Mac/Linux
ifconfig
# Look for "inet" under en0 or wlan0
```

2. **Update the code:**

Open `robot-client.ino` and change:

```cpp
const char* WIFI_SSID = "YourWiFiName";      // Your WiFi name
const char* WIFI_PASSWORD = "YourPassword";  // Your WiFi password
const char* WS_HOST = "192.168.1.XXX";       // Your laptop IP
```

3. **Upload to ESP32:**

**PlatformIO:**

- Click checkmark (✓) to build
- Click arrow (→) to upload
- Click plug icon to open serial monitor

**Arduino IDE:**

- Select board: Tools → Board → ESP32 Dev Module
- Select port: Tools → Port → (your ESP32 port)
- Click Upload button (→)
- Open Serial Monitor (Ctrl+Shift+M)

### Step 4.6: Verify Upload

In Serial Monitor, you should see:

```
🤖 Robot Client Starting...
Connecting to WiFi: YourWiFiName
..........
✅ WiFi connected
IP Address: 192.168.1.123
Connecting to WebSocket: ws://192.168.1.100:3001/ws/robot
✅ Connected to 192.168.1.100
🚀 Setup complete
```

---

## 🎉 Phase 5: Final Integration & Testing (15 min)

### Step 5.1: Start Everything

Open **3 terminals**:

```bash
# Terminal 1: Backend
cd apps/api
pnpm dev

# Terminal 2: Frontend
cd apps/web
pnpm dev

# Terminal 3: Monitor ESP32
cd firmware/robot-client
pio device monitor  # or use Arduino Serial Monitor
```

### Step 5.2: Verify Connection Chain

1. **Backend logs** should show:

   ```
   🤖 ESP32 connected
   💻 Web client connected
   ```

2. **Frontend** (http://localhost:3000) should show:

   - Green "Connected" badge
   - "Robot connected" message
   - Live telemetry data updating

3. **ESP32 Serial Monitor** should show:
   ```
   ✅ Connected to 192.168.1.100
   ```

### Step 5.3: Test Manual Control

1. Move the **Linear Speed** slider to 0.10
2. Click **"Send Command"**
3. Robot should move forward slowly
4. Click **"Stop"** - robot stops

### Step 5.4: Test Autopilot

1. Place an obstacle 30cm in front of robot
2. Click **"Enable Autopilot"**
3. Robot should:
   - Move forward
   - Detect obstacle
   - Stop and turn right
   - Continue forward

### Step 5.5: Test Sweep Scan

1. Click **"Trigger Sweep Scan"**
2. Servo sweeps -90° to +90°
3. Red dots appear on canvas showing detected obstacles

---

## 🐛 Troubleshooting Guide

### Problem: ESP32 Won't Connect to WiFi

**Solution:**

1. Check WiFi credentials (case-sensitive!)
2. Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
3. Try hotspot from phone if router has issues
4. Check Serial Monitor for error messages

### Problem: "Disconnected" in Web Dashboard

**Solution:**

1. Verify backend is running: `curl http://localhost:3001/health`
2. Check `.env.local` has correct WebSocket URL
3. Open browser console (F12) for WebSocket errors
4. Try different browser (Chrome/Edge recommended)

### Problem: Robot Doesn't Move

**Solution:**

1. Check battery voltage (should be >6V)
2. Verify motor wiring:
   ```cpp
   // Test individual motors
   digitalWrite(IN1, HIGH);
   digitalWrite(IN2, LOW);
   ledcWrite(PWM_CH_LEFT, 150);
   ```
3. Ensure L298N jumpers are in place
4. Check common ground connection
5. Try swapping IN1/IN2 if motor spins backward

### Problem: Ultrasonic Sensor Returns -1

**Solution:**

1. **CRITICAL:** Verify voltage divider on ECHO pin
2. Check wiring: TRIG→GPIO4, ECHO→Divider→GPIO16
3. Ensure obstacle is 2cm-400cm away
4. Test sensor standalone:
   ```cpp
   Serial.println(measureDistanceCm());
   ```

### Problem: High Latency (>200ms)

**Solution:**

1. Ensure ESP32 and laptop on same WiFi network
2. Close bandwidth-heavy apps
3. Reduce telemetry rate in firmware:
   ```cpp
   const unsigned long TELEMETRY_INTERVAL = 200; // 5 Hz
   ```
4. Check WiFi signal strength

---

## 📊 Success Checklist

- [ ] Backend running without errors
- [ ] Frontend shows "Connected" badge
- [ ] ESP32 connected (check backend logs)
- [ ] Telemetry updating every 100ms
- [ ] Canvas shows robot position
- [ ] Manual control works (sliders + buttons)
- [ ] Autopilot avoids obstacles
- [ ] Sweep scan displays red dots
- [ ] Battery voltage displayed correctly

---

## 🚀 Next Steps & Enhancements

### Quick Wins (1-2 hours each)

1. **Add Wheel Encoders**
   - Better odometry (accurate positioning)
   - Required parts: 2× rotary encoders
2. **Camera Stream**

   - Use ESP32-CAM module
   - Add MJPEG stream to dashboard

3. **Path Recording**
   - Save telemetry to CSV
   - Replay routes

### Production Upgrades (1-2 days each)

1. **Database Logging**
   - Add SQLite/PostgreSQL
   - Historical data analysis
2. **Multi-Robot Support**

   - Robot ID system
   - Separate WebSocket rooms

3. **Mobile App**

   - React Native wrapper
   - Native controls

4. **ROS2 Integration**
   - micro-ROS on ESP32
   - Standard robot interface

---

## 📚 Additional Resources

- **ESP32 Docs:** https://docs.espressif.com/projects/esp-idf/en/latest/esp32/
- **Next.js Docs:** https://nextjs.org/docs
- **Fastify Docs:** https://fastify.dev/
- **ArduinoJson:** https://arduinojson.org/
- **Konva (Canvas):** https://konvajs.org/

---

## 💡 Action Items Summary

1. ✅ Install Node.js, pnpm, VS Code
2. ✅ Create monorepo structure
3. ✅ Setup shared types package
4. ✅ Build Fastify backend
5. ✅ Build Next.js frontend
6. ✅ Wire ESP32 hardware (voltage divider!)
7. ✅ Upload ESP32 firmware
8. ✅ Test end-to-end connection
9. ✅ Verify manual control
10. ✅ Test autopilot mode

---

**🎊 Congratulations!** You now have a working robot control system!

Need help with any step? Let me know which phase you're stuck on and I'll provide detailed debugging guidance.
