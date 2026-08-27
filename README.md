# 🏠 Build HomeBinary

<div align="center">

![Build HomeBinary Logo](Google_Home_Logo_(2025).svg)

**High-Performance Desktop Automation & Batch Submission Orchestrator for Samsung QuickBuild Portal**

[![Release](https://img.shields.io/github/v/release/endrisusanto/Home-Binary?style=flat-square&color=blue)](https://github.com/endrisusanto/Home-Binary/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/endrisusanto/Home-Binary/release.yml?branch=main&style=flat-square)](https://github.com/endrisusanto/Home-Binary/actions)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-24C8D5?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)

</div>

---

## 📖 Overview

**Build HomeBinary** is a desktop application engineered with **Tauri v2 (Rust)**, **React 19**, and **Tailwind CSS v4** to orchestrate high-throughput batch form submissions to the Samsung QuickBuild (QB) portal.

Powered by a headless **Playwright** browser automation engine, it eliminates repetitive manual entries by parsing multi-line build configurations, maintaining SSO session states, and streaming real-time telemetry back to an interactive dashboard.

---

## ✨ Key Features

- **⚡ Multi-Format Batch Input Parser**:
  - Automatically parses raw text pasted in TSV, CSV, pipe-delimited, whitespace, or Key-Value block format.
  - Recognizes `Build ID`, `Build Fingerprint`, `PDA Version`, `CSC Version`, and `Baseband/Phone Version`.
- **📊 QuickBuild-Style Metric Cards & Progress Tables**:
  - 5 ambient metric cards with customized top-left radial glow and sleek OLED Obsidian Dark mode.
  - Sectioned accordion tables: *Fetched builds*, *In-progress submissions*, *Submissions completed*, and *Submissions failed*.
- **🔗 Interactive Build ID Column**:
  - **Left-Click**: Instantly redirects to the build page (`https://android.qb.sec.samsung.net/build/<id>`).
  - **Right-Click**: Automatically copies the portal URL to the clipboard with an instant visual indicator.
- **🤖 Resilient Automation Engine**:
  - Headless & Headful browser execution modes.
  - Persistent SSO cookies & authentication (`auth.json`).
  - Real-time line-by-line JSON IPC streaming between Node.js, Rust Tauri backend, and the React UI.
  - Live simulation / mock mode for local testing without intranet connectivity.
- **🔄 Built-in Software Auto-Updater**:
  - One-click update check and automatic background downloading & relaunching.
- **🚀 Automated CI/CD GitHub Releases**:
  - Multi-platform GitHub Actions building Linux (`.AppImage`, `.deb`) and Windows (`.msi`, `.exe`) binaries.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend GUI** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons |
| **Desktop Runtime** | Tauri v2, Rust (tokio, serde, tauri-plugin-updater, process) |
| **Automation Engine** | Node.js, Playwright, Chromium |
| **CI / CD** | GitHub Actions, Multi-platform Matrix Build |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Rust & Cargo](https://rustup.rs/) (v1.77.2+)
- Linux system dependencies (for Ubuntu/Debian):
  ```bash
  sudo apt-get update
  sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
  ```

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/endrisusanto/Home-Binary.git
   cd "Home Binary"
   ```

2. **Install Root & Engine Dependencies**:
   ```bash
   npm install
   cd engine && npm install && cd ..
   ```

3. **Install Playwright Browsers**:
   ```bash
   npx playwright install chromium
   ```

### Development

Run the desktop application in live development mode (Hot Module Replacement):

```bash
npm run tauri dev
```

Or run standalone web preview (Mock mode):
```bash
npm run dev
```

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

To publish a new version and automatically trigger multi-platform binary builds on GitHub:

```bash
# Bump patch version (e.g. 0.1.0 -> 0.1.1)
./release.sh patch

# Bump minor version (e.g. 0.1.0 -> 0.2.0)
./release.sh minor

# Release an explicit version
./release.sh 1.0.0
```

The script automatically synchronizes `package.json`, `tauri.conf.json`, and `Cargo.toml`, creates a git tag, and pushes to remote. GitHub Actions will then compile the installers and publish the release.

---

## 📄 License

Internal tool for Samsung Android QuickBuild automated workflow.
