# ✅ Solar Portal - Publishing Checklist

**Zkontroluj vše než publikuješ v Home Assistant Obchodu.**

---

## 🔍 Pre-Publish Checks

### **GitHub Repository Setup**

- [ ] Repository je vytvořený na GitHub
- [ ] Repository je **PUBLIC** (Settings → make public if needed)
- [ ] Repository má jméno: `solar-portal-addon`
- [ ] README.md je v root s jasným popisem
- [ ] LICENSE je přidaný (MIT by měl být)

### **Code & Structure**

- [ ] Složka `addon/` existuje a obsahuje:
  - [ ] `addon.yaml` (konfigurace)
  - [ ] `Dockerfile` (build image)
  - [ ] `README.md` (user instructions)
  - [ ] `CHANGELOG.md` (version history)
  - [ ] `rootfs/entrypoint.sh` (executable)
  
- [ ] Složky existují:
  - [ ] `backend/` (Express API)
  - [ ] `frontend/` (React UI)
  - [ ] `agent/` (data collector)

- [ ] `.gitignore` obsahuje:
  - [ ] `node_modules/`
  - [ ] `dist/`
  - [ ] `.env`
  - [ ] `*.log`

### **addon.yaml Validation**

```yaml
✓ name: Solar Portal
✓ slug: solar_portal                    (bez mezer, lowercase)
✓ version: 0.1.0                        (semver)
✓ description: Solar energy monitoring
✓ startup: application                  (ne "system")
✓ boot: auto
✓ arch:                                 (všechny!)
  - aarch64
  - armhf
  - armv7
  - amd64
  - i386
✓ ports:
  3000/tcp: Frontend
  5000/tcp: Backend API
✓ options:                              (uživatelsky konfigurovatelné)
  log_level: info
  ...
✓ codeowners:
  - "@TVUJ_GITHUB_USERNAME"
```

**Ověř YAML?** ```bash
python -m yaml addon/addon.yaml
# nebo online: https://www.yamllint.com/
```

### **Dockerfile Validation**

- [ ] `FROM ghcr.io/hassio-addons/base:latest`
- [ ] Installuje Node.js: `apk add --no-cache nodejs npm`
- [ ] Copyuje všechny tři části: `COPY backend`, `COPY frontend`, `COPY agent`
- [ ] Builduje production: `npm run build` (ne `npm run dev`)
- [ ] Copyuje `entrypoint.sh`: `COPY rootfs/entrypoint.sh /entrypoint.sh`
- [ ] Nastaví executable: `RUN chmod +x /entrypoint.sh`
- [ ] Nepřidává `node_modules` do image (odstranit je!)

**Test lokálně:**
```bash
docker build -f addon/Dockerfile -t test:latest .
docker run -it -p 3000:3000 -p 5000:5000 test:latest
# Měl by běžet bez chyb
```

### **entrypoint.sh**

- [ ] Je executable: `chmod +x addon/rootfs/entrypoint.sh`
- [ ] Čte config z `/data/options.json`
- [ ] Vytváří `.env` soubory správně
- [ ] Spouští `exec /init` na konci (Home Assistant)
- [ ] Nepoužívá `npm run dev` (vede k chybám)
- [ ] Logguje správně (aby uživatel viděl co se děje)

**Check syntax:**
```bash
bash -n addon/rootfs/entrypoint.sh
```

### **package.json Files**

#### backend/package.json
- [ ] `"main": "dist/index.js"`
- [ ] `"build": "tsc"`
- [ ] `"start": "node dist/index.js"`
- [ ] Má `dist/` scriptu (build)
- [ ] `dependencies` jsou pro production

#### frontend/package.json
- [ ] `"build": "tsc && vite build"`
- [ ] `"preview": "vite preview"`
- [ ] `dependencies` nejsou dev-only

#### agent/package.json
- [ ] `"build": "tsc"`
- [ ] `"start": "node dist/index.js"`

### **GitHub Actions Workflow**

- [ ] `.github/workflows/build.yaml` existuje
- [ ] Builduje na push do `main`
  ```yaml
  on:
    push:
      branches: [main]
  ```
- [ ] Má matrix pro všechny architektury:
  ```yaml
  matrix:
    arch: [aarch64, armhf, armv7, amd64, i386]
  ```
- [ ] Publishuje images

### **Documentation**

- [ ] `addon/README.md`:
  - [ ] Installation steps
  - [ ] Configuration options
  - [ ] How to access the portal
  - [ ] Troubleshooting

- [ ] `addon/CHANGELOG.md`:
  - [ ] Version history
  - [ ] Release dates
  - [ ] What's new in each version

- [ ] `addon/DOCS.md` (optional):
  - [ ] Technical details
  - [ ] API endpoints
  - [ ] Database schema

### **Icons & Images** (optional but recommended)

- [ ] `addon/icon.png` (256x256 px)
  - [ ] PNG format
  - [ ] Good on light & dark background
  - [ ] Represents "Solar Energy"

- [ ] `addon/logo.png` (optional)
  - [ ] Landscape format
  - [ ] Resolution: ~360x108px

### **First Git Push**

```bash
# 1. Initialize git
cd /path/to/solar-portal-addon
git init

# 2. Add all files
git add .

# 3. First commit
git commit -m "Initial commit: Solar Portal Add-on v0.1.0"

# 4. Add GitHub remote
git remote add origin https://github.com/TVUJ_USERNAME/solar-portal-addon.git

# 5. Push to main
git branch -M main
git push -u origin main

# Result: All code is now on GitHub!
```

### **GitHub Pages (optional)**

- [ ] Consider enabling GitHub Pages for documentation
- [ ] Better UX for users reading docs

---

## 🏪 Publishing to Home Assistant

### **Option A: Community Add-on Store** (Recommended for first release)

1. [ ] Go to: https://github.com/hassio-addons/repository
2. [ ] Click: "Add your add-on repository"
3. [ ] Fill in your GitHub URL: `https://github.com/TVUJ_USERNAME/solar-portal-addon`
4. [ ] Submit request
5. [ ] Wait for review (1-2 weeks typically)
6. [ ] Approved! Users can now install from HA

### **Option B: Official Store** (Stricter requirements)

1. [ ] Fork: https://github.com/home-assistant/addons
2. [ ] Create `solar_portal/` folder with your `addon.yaml`, `Dockerfile`, etc.
3. [ ] Submit PR
4. [ ] HA team reviews (stricter requirements)
5. [ ] If approved: appears in official store
6. [ ] More visibility = more users

### **Option C: Self-hosted** (Most control)

1. [ ] Host your own repository
2. [ ] Users add: https://github.com/TVUJ_USERNAME/solar-portal-addon
3. [ ] Works immediately (no waiting)
4. [ ] Full control over updates

---

## 🔄 Version Updates

When you release v0.2.0:

1. [ ] Update `addon/addon.yaml`:
   ```yaml
   version: 0.2.0
   ```

2. [ ] Update all package.json files:
   - backend/package.json
   - frontend/package.json
   - agent/package.json

3. [ ] Update `addon/CHANGELOG.md`:
   ```markdown
   ## 0.2.0 - 2026-03-02
   - New feature X
   - Bug fix Y
   - Security improvement Z
   ```

4. [ ] Commit & Push:
   ```bash
   git add .
   git commit -m "Release v0.2.0"
   git tag v0.2.0          # Create tag
   git push origin main    # Push changes
   git push origin v0.2.0  # Push tag
   ```

5. [ ] GitHub Actions automatically builds for all architectures
6. [ ] Home Assistant checks for updates (daily)
7. [ ] Users see "Update available" notification
8. [ ] They click Update → automatic upgrade!

---

## ❌ Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Build failed" | `npm ci` needs package.json | Verify package.json exists |
| Image too big (>500MB) | node_modules in image | Add `RUN npm ci --only=production` |
| Port not accessible | Not in `addon.yaml` ports | Add `ports: { 3000/tcp: ... }` |
| Can't start | entrypoint.sh error | Check: `bash -n addon/rootfs/entrypoint.sh` |
| Missing dependencies | npm not installed | Add `apk add nodejs npm` in Dockerfile |
| Wrong architecture | Dockerfile doesn't support all | Add all 5: aarch64, armhf, armv7, amd64, i386 |

---

## ✅ Final Checklist Before Publishing

```
GitHub:
  ☐ Repo is public
  ☐ Code pushed to main
  ☐ All branches merged

Code:
  ☐ All TypeScript builds (no errors)
  ☐ Dockerfile builds locally
  ☐ entrypoint.sh is executable
  ☐ addon.yaml is valid YAML

Documentation:
  ☐ README has installation steps
  ☐ CHANGELOG lists changes
  ☐ Icons/logos added (optional)

GitHub Actions:
  ☐ build.yaml exists
  ☐ Builds configured for all architectures
  ☐ First build succeeded

Ready to Publish:
  ☐ All above checked ✓
  ☐ Submitted to Add-on Store
  ☐ Waiting for approval
```

---

## 🚀 Success!

When everything is checked:

1. Users can install with one click in Home Assistant
2. Automatic updates work
3. All architectures supported
4. Professional-grade add-on!

**Gratuluji!** 🎉

---

**Last Updated:** March 2, 2026
