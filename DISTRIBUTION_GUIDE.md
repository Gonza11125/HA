# 📦 Solar Portal - Home Assistant Add-on Distribution Guide

**Jak je Solar Portal balíčkován jako Home Assistant add-on a jak ho distribuovat uživatelům.**

---

## 🎯 Co je Home Assistant Add-on?

Home Assistant add-ony jsou:
- **Docker kontenery** běžící v Home Assistant
- **Jednoduše instalovatelné** jedním kliknutím
- **Bezpečně izolované** od hlavního systému
- **Automaticky aktualizovatelné** když nová verze je k dispozici

Solar Portal je **full-stack add-on** obsahující:
- 🌐 **React Frontend** (port 3000)
- 📡 **Express.js Backend API** (port 5000)
- 🤖 **Node.js Agent** (optional, pro sběr dat)

---

## 📦 Struktura Balíčku

\`\`\`
solar-portal-addon/
├── addon/
│   ├── addon.yaml              # Konfigurace add-onu (KRITICKÉ)
│   ├── Dockerfile              # Build image pro všechny architektury
│   ├── README.md               # Pro koncové uživatele
│   ├── DOCS.md                 # Technická dokumentace
│   ├── CHANGELOG.md            # Changelog verzí
│   ├── INSTALL.md              # Jak publikovat (tohle)
│   ├── icon.png                # Ikona v obchodu (256x256)
│   └── rootfs/
│       └── entrypoint.sh       # Start script
├── backend/src/                # Backend TypeScript
├── frontend/src/               # React komponenty
├── agent/src/                  # Data collection agent
├── .github/workflows/
│   └── build.yaml              # GitHub Actions CI/CD
├── docker-compose.yml          # Jen pro development
└── docs/                       # Technické docs
\`\`\`

---

## 🔧 Key Files Explained

### **addon.yaml** - Konfigurace

```yaml
name: Solar Portal
description: ...
version: 0.1.0
slug: solar_portal           # Unique identifier
codeowners:
  - "@honzik"
startup: application         # Starts automatically with HA
boot: auto                   # Spustit při startu
arch:                        # Podporované architektury
  - aarch64  (RPi 4/5 - 64bit)
  - armhf    (RPi Zero - 32bit)
  - armv7    (RPi 3 - 32bit)
  - amd64    (Intel/AMD Linux server)
  - i386     (Old Intel 32bit)
ports:
  3000/tcp: Frontend         # Viditelný uživateli v HA UI
  5000/tcp: Backend API
options:                     # Konfigurovatelné v HA Settings
  log_level: info
  ha_url: "http://homeassistant:8123"
schema:
  log_level:
    selector:
      select:
        options: ["debug", "info", "warn", "error"]
  ha_url:
    selector:
      text:
        type: url
```

### **Dockerfile** - Build

```dockerfile
FROM ghcr.io/hassio-addons/base:latest

# Install dependencies
RUN apk add --no-cache nodejs npm curl bash jq

# Copy source code
COPY backend ./backend
COPY frontend ./frontend
COPY agent ./agent

# Build all components
RUN cd backend && npm ci --only=production && npm run build
RUN cd frontend && npm ci && npm run build
RUN cd agent && npm ci --only=production && npm run build

# Setup entry script
COPY rootfs/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Spuštění (Home Assistant zavolá /init z base image)
```

### **entrypoint.sh** - Startup

```bash
#!/bin/bash

# Přečti konfiguraci z /data/options.json
CONFIG_PATH="/data/options.json"
HA_URL=$(jq -r '.ha_url' $CONFIG_PATH)
FRONTEND_PORT=$(jq -r '.frontend_port' $CONFIG_PATH)
BACKEND_PORT=$(jq -r '.backend_port' $CONFIG_PATH)

# Vytvoř .env soubory
echo "NODE_ENV=production
BACKEND_PORT=$BACKEND_PORT
..." > /app/backend/.env

# Spustí backend, frontend, agent
exec /init  # Home Assistant s6-init systém
```

---

## 🚀 Jak To Funguje?

### **U Uživatele**

```
1. Home Assistant → Nastavení → Add-ony
2. Klikne "+" → Přidej Repozitář
   → https://github.com/honzik/solar-portal-addon
3. Vyhledá "Solar Portal"
4. Klikne "Instaluj"
5. Čeká 2-3 minuty (Docker build/download)
6. Klikne "Spustit"
7. Otevře http://192.168.1.X:3000
```

### **Co Se Stane Pozadí**

```
Home Assistant
  ↓ (detects new add-on repo)
  ↓ (checks GitHub for updates)
  ↓ (downloads Dockerfile)
Docker
  ↓ (builds image from Dockerfile)
  ↓ (copies backend, frontend, agent - builds them)
  ↓ (creates container)
Container Start
  ↓ (executes entrypoint.sh)
  ↓ (reads configuration)
  ↓ (starts backend on port 5000)
  ↓ (starts frontend on port 3000)
  ↓ (optional: starts agent)
User
  ↓ (opens http://192.168.X.X:3000)
  ↓ (sees Solar Portal UI)
✅ Done!
```

---

## 🐳 Docker Build Details

### **Multi-platform Build**

Home Assistant supports multiple architectures:

| Arch | Devices | Notes |
|------|---------|-------|
| aarch64 | RPi 4, RPi 5 | Most common now |
| armhf | RPi Zero, Zero W | Minimal resources |
| armv7 | RPi 3, RPi 3B+ | Older RPis |
| amd64 | Intel/AMD Linux | Server deployments |
| i386 | Very old Intel | Rarely used |

**GitHub Actions builds all at once:**

```yaml
matrix:
  arch: [aarch64, armhf, armv7, amd64, i386]

# For each: docker build --platform linux/aarch64 ...
```

### **Image Size Optimization**

Dockerfile optimizations:

```dockerfile
# ❌ BAD - Includes development files
RUN npm ci && npm run build
# Size: 500MB+

# ✅ GOOD - Only production files
RUN npm ci --only=production && npm run build
# Size: 150MB
```

**For Frontend:**
- Production build minifies everything
- Old node_modules removed after build
- Result: 30-50MB instead of 300MB

---

## 📍 Distribution Flow

### **Your GitHub Repo Structure**

```
solar-portal-addon/  (GitHub)
  ├── addon/         ← Home Assistant reads this
  ├── backend/       ← Copied to Docker image
  ├── frontend/      ← Built in Docker
  └── agent/         ← Optional component
```

### **Home Assistant Integration**

```
Home Assistant Add-ons Registry
  ├── Official Store (strict requirements)
  └── Community Store (easier publish)
       └── Your Repo → solar-portal-addon

User Interface:
  Settings → Add-ons → Store
    → Shows: Solar Portal + icon + description
    → Klikne Install → Downloads from your GitHub
```

### **Update Cycle**

```
You push to GitHub
  ↓
GitHub Actions builds all architectures
  ↓
Images stored in ghcr.io (GitHub Container Registry)
  ↓
Home Assistant checks for updates daily
  ↓
User sees "Update available"
  ↓
Clicks "Update" → Downloads new version
  ↓
Automatically restarts with new code
```

---

## 🔄 Version Management

### **Updating Add-on**

```bash
# 1. Make changes to backend/frontend/agent
# 2. Update versions:

# addon/addon.yaml
version: 0.2.0

# backend/package.json
"version": "0.2.0"

# frontend/package.json
"version": "0.2.0"

# agent/package.json
"version": "0.2.0"

# 3. Changelog
echo "## 0.2.0 - 2026-03-02\n- Feature X\n- Fix Y" >> addon/CHANGELOG.md

# 4. Commit & Push
git add .
git commit -m "Release v0.2.0"
git tag v0.2.0
git push origin main --tags

# 5. GitHub Actions automatically builds all architectures
# 6. Home Assistant users see "Update available" within 24h
```

---

## 📋 Checklist pro Publikování

### **Before Publishing to Store**

- [ ] `addon/addon.yaml` has valid syntax (YAML)
- [ ] `name`, `slug`, `version` are set
- [ ] `arch` includes at least `aarch64`, `armhf`
- [ ] `startup: application` is set
- [ ] `README.md` has user-friendly installation steps
- [ ] Dockerfile builds without errors
- [ ] All 3 (backend, frontend, agent) parts are included
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `.env`
- [ ] GitHub repo is **PUBLIC**
- [ ] `entrypoint.sh` is executable: `chmod +x addon/rootfs/entrypoint.sh`

### **GitHub Actions**

- [ ] `.github/workflows/build.yaml` exists
- [ ] Builds trigger on `push` to `main`
- [ ] Builds all architectures in `matrix`
- [ ] Images are pushed to `ghcr.io`

### **Store Information** (for community store)

- [ ] Icon file: `addon/icon.png` (256x256)
- [ ] Logo file: `addon/logo.png` (optional, 362x108)
- [ ] Repository description mentions Home Assistant
- [ ] Repository is set to public

---

## 🌐 Future: Cloud Sync (Out of Scope Now)

When you implement user accounts + cloud backend:

```
Home Assistant (local)
  ↓ (collects solar data)
  └→ Agent (on RPi or HA itself)
       ↓ (HTTPS with device token)
       └→ Cloud Backend (your server)
            ↓
            └→ User Portal (web.example.com)
                 ↓
                 Cloud UI (access from anywhere)
```

For now: **Portal is inside HA only** (local network only).

---

## 🎓 Resources

- [Home Assistant Add-ons - Official Docs](https://developers.home-assistant.io/docs/add-ons/)
- [HA Add-ons Repository Template](https://github.com/hassio-addons/repository-template)
- [Docker Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [GitHub Actions for Docker](https://github.com/docker/build-push-action)

---

## ✉️ Support

Add-on ready! See `addon/INSTALL.md` for step-by-step publishing guide.

**Need help?**
- Check GitHub Issues
- Review Home Assistant forum
- See HA Add-ons documentation

---

**Last Updated:** March 2, 2026
**Version:** 0.1.0
