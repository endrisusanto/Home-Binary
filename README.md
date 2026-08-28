# 🏠 Build HomeBinary

<div align="center">

![Build HomeBinary Logo](Google_Home_Logo_(2025).svg)

**High-Performance Desktop Automation, Web Hub & Batch Submission Orchestrator for Samsung QuickBuild Portal**

[![Release](https://img.shields.io/github/v/release/endrisusanto/Home-Binary?style=flat-square&color=blue)](https://github.com/endrisusanto/Home-Binary/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/endrisusanto/Home-Binary/release.yml?branch=main&style=flat-square)](https://github.com/endrisusanto/Home-Binary/actions)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-24C8D5?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Full--Duplex%20Sync-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://homebinary.endrisusanto.my.id/)
[![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)

**Public Web Portal**: 👉 **[https://homebinary.endrisusanto.my.id/](https://homebinary.endrisusanto.my.id/)**

</div>

---

## 📖 Overview

**Build HomeBinary** is a unified automation platform engineered with **Tauri v2 (Rust)**, **React 19**, **Tailwind CSS v4**, and **Node.js Playwright** to orchestrate high-throughput batch form submissions to the Samsung QuickBuild (QB) portal.

It operates seamlessly as a **native Windows / Linux Desktop application** and as a **centralized Docker Web Application**, linked by a **100% full-duplex WebSocket mirroring engine**.

---

## ✨ Key Features

### 🔄 Real-time Bidirectional WebSocket Synchronization (100% Mirroring)
- **Full-Duplex TCP WebSocket Relay (`/ws`)**:
  - Live state mirroring between Desktop (Tauri) and Web (Browser/Mobile) with sub-millisecond latency.
  - Every queue addition, status transition, retry, deletion, and process log streams instantly across all connected devices.
- **Cross-Device Remote Execution Dispatching**:
  - Clicking **"Run Batch"** on your smartphone or web browser automatically dispatches the execution command to your active **Windows Desktop client**.
  - Desktop executes the batch using its local browser & Windows SSO session, streaming real-time progress and logs directly back to your mobile web interface.

### 📱 Mobile-First Responsive Design & Grid Menu Modal
- **Ultra-Compact Typography (`text-[8px]` – `text-[10px]`)** optimized for narrow smartphone screens.
- **Interactive Mobile Grid Menu Modal**: Access quick batch actions, update triggers, search, and settings from a clean touch grid.
- **Micro-Grid Metric Cards & Responsive Tables**: High-density display maximizing visibility on mobile viewports.

### ⚡ Multi-Format Batch Input Parser
- Automatically parses multi-line text pasted in **TSV, CSV, Pipe-delimited, Whitespace, or Key-Value Block** format.
- Extracts `Build ID`, `Build Fingerprint`, `PDA Version`, `CSC Version`, and `Baseband / Phone Version`.

### 📊 QuickBuild Dashboard & Interactive Tables
- 5 ambient metric cards with customized radial glow and OLED Dark Mode.
- Sectioned accordion tables: *Fetched builds*, *In-progress submissions*, *Submissions completed*, and *Submissions failed*.
- **Interactive Build ID Cell**:
  - **Left-Click**: Direct navigation to Samsung QB Build page (`https://android.qb.sec.samsung.net/build/<id>`).
  - **Right-Click**: Instant clipboard copy with visual checkmark indicator.
- **Failed Submissions Recovery**: Per-row re-check buttons, batch re-check all, retry all, and automatic 4-day build expiry detection.

### 🚀 Remote 1-Click Auto-Updater
- **Web-to-Desktop Remote Trigger**: Trigger background auto-updates and app relaunches on all running Windows Desktop instances directly from the Web App.
- **Server 1-Click Update**: Pulls latest git commits, rebuilds Vite frontend, and performs a graceful Docker container restart automatically.

### 🛡️ System Tray & Background Daemon
- Closing the desktop window minimizes the app to the **System Tray**, keeping background sync and automation active without desktop clutter.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend GUI** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons |
| **Desktop Runtime** | Tauri v2, Rust (tokio, serde, tauri-plugin-updater, tauri-plugin-process) |
| **Central Server & Web App** | Node.js, WebSocket Server (`ws`), Server-Sent Events (SSE), Cloudflare Tunnel |
| **Automation Engine** | Node.js, Playwright, Chromium |
| **Containerization** | Docker, Docker Compose (`mcr.microsoft.com/playwright:v1.51.0-noble`) |
| **CI / CD** | GitHub Actions (Multi-Platform Matrix: Windows `.msi`/`.exe`, Linux `.AppImage`/`.deb`) |

---

## 🚀 Getting Started

### 🖥️ Running Desktop App (Development)

```bash
# 1. Clone the repository
git clone https://github.com/endrisusanto/Home-Binary.git
cd "Home Binary"

# 2. Install dependencies
npm install
cd engine && npm install && cd ..

# 3. Install Playwright browser binaries
npx playwright install chromium

# 4. Start Tauri Desktop in Dev Mode
npm run tauri dev
```

---

### 🐳 Running Web App via Docker (Server Deployment)

The web application runs on port `14300` and integrates with Cloudflare Tunnel:

```bash
# Build and run container in background
docker compose build --no-cache && docker compose up -d

# Check live logs
docker compose logs -f
```

The Web App will be accessible at:
- **Local**: `http://localhost:14300`
- **Public**: `https://homebinary.endrisusanto.my.id`
- **WebSocket Endpoint**: `wss://homebinary.endrisusanto.my.id/ws`

---

## 📋 Portal Form Properties Reference

The automation engine automatically maps and fills the following Wicket form selectors:

| Property Name | Form Input Selector |
|---|---|
| **Build Fingerprint** | `input[name="editor:content:basicProperties:0:property:editor:editor:wrapper:input"]` |
| **PDA Version** | `input[name="editor:content:basicProperties:1:property:editor:editor:wrapper:input"]` |
| **CSC Version** | `input[name="editor:content:basicProperties:2:property:editor:editor:wrapper:input"]` |
| **Baseband / Phone** | `input[name="editor:content:basicProperties:3:property:editor:editor:wrapper:input"]` |

**Target Endpoints**:
- Overview: `https://android.qb.sec.samsung.net/overview/28905`
- Form: `https://android.qb.sec.samsung.net/wicket/page?6`

---

## 📦 Releasing New Versions

To publish a new version and automatically trigger multi-platform binary builds on GitHub Actions:

```bash
# Bump patch version (e.g. 0.5.3 -> 0.5.4)
./release.sh patch

# Bump minor version (e.g. 0.5.0 -> 0.6.0)
./release.sh minor

# Release an explicit version
./release.sh 1.0.0
```

The script synchronizes `package.json`, `tauri.conf.json`, and `Cargo.toml`, creates a git tag, and pushes to GitHub.

---

## 📄 License

Internal tool for Samsung Android QuickBuild automated workflow.
