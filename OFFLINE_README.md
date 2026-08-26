# Madigun Hotel Eleven - Requisitions Hub
## Offline Deployment & PM2 Process Management Guide

This document provides a comprehensive step-by-step guide to run **Madigun Hotel Eleven - Requisitions Hub** as a self-hosted, offline-resilient local server. It details how to set up **PM2 (Process Manager 2)**, allow incoming connections from other devices (computers, tablets, smartphones) on your local network (LAN/Wi-Fi), and manage the system for robust, long-term offline operations.

---

## 📋 Table of Contents
1. [App Exporting & Local Setup](#1-app-exporting--local-setup)
2. [Prerequisites (Node.js & PM2 Installation)](#2-prerequisites-nodejs--pm2-installation)
3. [Building & Running the App](#3-building--running-the-app)
4. [PM2 Control Commands](#4-pm2-control-commands)
5. [Sharing the App with Other Devices (LAN)](#5-sharing-the-app-with-other-devices-lan)
6. [Firewall Configuration (Allowing Port 3000)](#6-firewall-configuration-allowing-port-3000)
7. [Firestore Offline Persistence & Cache Protection](#7-firestore-offline-persistence--cache-protection)

---

## 1. App Exporting & Local Setup

To extract this system from AI Studio onto your local machine or local hotel server:
1. Open the **Settings** menu at the top-right of your AI Studio screen.
2. Click on **Export to ZIP** to download the complete, self-contained project code.
3. Unzip the downloaded file into a folder on your server computer (e.g., `C:\madigun-hotel-requisitions` or `/home/user/madigun-hotel-requisitions`).

---

## 2. Prerequisites (Node.js & PM2 Installation)

To run the server offline, you need to have Node.js and PM2 installed on the server machine.

### Step A: Install Node.js
- **Windows / macOS**: Download and run the recommended installer (LTS Version) from [nodejs.org](https://nodejs.org/).
- **Linux (Ubuntu/Debian)**: Run the following commands in your terminal:
  ```bash
  sudo apt update
  sudo apt install -y nodejs npm
  ```

### Step B: Install PM2 Globally
Once Node.js is installed, open your command prompt, terminal, or PowerShell, and install the PM2 process manager globally:
```bash
npm install -g pm2
```
*Tip: On Linux/macOS, you may need to prefix this command with `sudo` (`sudo npm install -g pm2`).*

---

## 3. Building & Running the App

Navigate to the project directory in your terminal and run these commands to install dependencies, compile the production assets, and start the system under PM2:

### Step 1: Install Local Dependencies
```bash
npm install
```

### Step 2: Build the High-Performance Production App
This compiles all React components and Tailwind CSS into minimized, fast-loading, static assets inside the `/dist` directory:
```bash
npm run build
```

### Step 3: Launch with PM2
Launch the high-performance local server with PM2:
```bash
npm run pm2:start
```
This loads our `ecosystem.config.cjs` to start the app in a **fully cluster-balanced mode**, automatically allocating processes to use all available CPU cores for zero lag and long-term stability.

---

## 4. PM2 Control Commands

PM2 keeps your application running 24/7. Even if the application crashes or encounters an unexpected error, PM2 will automatically reboot the service instantly.

You can manage the server easily with these terminal scripts:

- **Check Server Status**:
  ```bash
  npm run pm2:status
  ```
  *(Displays uptime, memory usage, CPU load, and instance counts)*

- **View Live Application Logs**:
  ```bash
  npm run pm2:logs
  ```
  *(Displays errors, incoming requests, and active local URLs)*

- **Restart the Server**:
  ```bash
  npm run pm2:restart
  ```
  *(Performs a safe reload of the application instances)*

- **Stop the Server**:
  ```bash
  npm run pm2:stop
  ```
  *(Pauses the service)*

---

## 5. Sharing the App with Other Devices (LAN)

When started, the production server will detect and output the local network IP address of your host machine. Any device (smartphone, tablet, or secondary PC) connected to the **same Wi-Fi or local area network (LAN)** can access the system!

### How to Find Your Server's IP Manually:
- **Windows**: Open Command Prompt (`cmd`) and type `ipconfig`. Look for your **IPv4 Address** (usually starts with `192.168.x.x` or `10.x.x.x`).
- **macOS**: Open Terminal and type `ipconfig getifaddr en0` or look under **System Settings > Wi-Fi > Details**.
- **Linux**: Open Terminal and type `hostname -I` or `ip route`.

### Connecting:
If your server computer's IP address is `192.168.1.15`, then other users can simply open their mobile/tablet browsers and visit:
```text
http://192.168.1.15:3000
```

---

## 6. Firewall Configuration (Allowing Port 3000)

If other devices on your local network are unable to load the page, the server machine's firewall is likely blocking incoming requests on Port `3000`. Here is how to unblock it:

### Windows Defender Firewall:
1. Search for **Windows Defender Firewall with Advanced Security** in the Start Menu.
2. Click on **Inbound Rules** in the left sidebar, then click **New Rule...** in the right actions panel.
3. Choose **Port** and click Next.
4. Select **TCP** and type `3000` in the **Specific local ports** input. Click Next.
5. Select **Allow the connection**. Click Next.
6. Keep Domain, Private, and Public checked. Click Next.
7. Name the rule `Madigun Requisition Server (Port 3000)` and click **Finish**.

### macOS Firewall:
1. Go to **System Settings > Network > Firewall**.
2. If turned on, click **Options...** and make sure Node.js/Express is allowed to receive incoming connections, or add terminal permissions.

### Linux Firewall (ufw):
If you are running on an Ubuntu or Debian machine, open your terminal and run:
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

---

## 7. Firestore Offline Persistence & Cache Protection

The system is fully optimized for **Offline-First Resilience**:
- We have enabled **Firestore Persistent Local Cache (Multi-Tab)**.
- When users access the page, the browser automatically caches the entire active requisitions list, inventories, and department configurations in their local browser's **IndexedDB** storage.
- If your hotel loses internet connectivity, the system will **never crash**. Users can still browse, read, and manage requisitions seamlessly out of their local browser cache.
- The system keeps tracking operations offline and automatically synchronizes updates back to the live database the moment network connectivity is restored.

---

### 🛡️ Booting PM2 Automatically on Server Startup (Optional)
To make sure the Requisitions Hub automatically starts whenever your server computer reboots, run this command:
```bash
pm2 startup
```
This will print a command customized for your operating system. Copy and paste that printed command into your terminal to enable automatic system-level boot service.
Once done, run the following to lock in your current process list:
```bash
pm2 save
```
Your system is now fully bulletproof, offline-resilient, and optimized for long-term production use!
