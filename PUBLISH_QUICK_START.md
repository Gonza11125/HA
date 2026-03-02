# 🚀 Solar Portal - 5-Minute Publish Guide

**Jak publikovat Solar Portal add-on v Home Assistantu - ASAP verzé.**

---

## ✅ 5 Kroků do Obchodu

### **1. Vytvoř GitHub Repozitář** (2 min)

```bash
# Jdi na https://github.com/new
# Vyplň: 
#   Name: solar-portal-addon
#   Visibility: PUBLIC ⭐ DŮLEŽITÉ!
# Klikni: Create repository
```

### **2. Pushni Code** (2 min)

```bash
# V root c:\Users\Honzik\Desktop\HA
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TVUJ_USERNAME/solar-portal-addon.git
git branch -M main
git push -u origin main
```

### **3. Ověř Soubory** (1 min)

Zkontroluj že máš:
```
addon/
  ├── addon.yaml              ✅
  ├── Dockerfile              ✅
  ├── README.md               ✅
  ├── CHANGELOG.md            ✅
  └── rootfs/
      └── entrypoint.sh       ✅
```

### **4. Zkontroluj addon.yaml**

```yaml
name: Solar Portal
slug: solar_portal              # Bez mezer!
version: 0.1.0
startup: application
boot: auto
arch:
  - aarch64
  - armhf
  - armv7
  - amd64
  - i386
```

### **5. Publikuj** (Depends)

#### **Varianta A: Fastest (Komunitní obchod)**

Jdi na: https://github.com/hassio-addons/repository

1. Klikni: "Add your add-on repository"
2. Vyplň: `https://github.com/TVUJ_USERNAME/solar-portal-addon`
3. Odeslij request

**Výsledek:** Za 1-2 týdny vidí uživatelé tvůj add-on v obchodu.

#### **Varianta B: Build-it-yourself**

Pokud chceš GitHub Actions (auto-build):

1. Zkopíruj `.github/workflows/build.yaml` do svého repo
2. Push na GitHub
3. GitHub Actions automaticky builduje všechny architektury
4. Images jsou dostupné v `ghcr.io/TVUJ_USERNAME/solar-portal-addon`

---

## 🎯 Co se Stane?

```
TY:                          HOME ASSISTANT USERS:
↓                            ↓
Pushneš na GitHub     →      Vidí "Solar Portal" v obchodu
      ↓                             ↓
Vytvoříš verzi       →       Kliknou "Instaluj"
      ↓                             ↓
                        →    Automaticky se stáhne a builduje
                             (Docker si vezme všechny tři části)
                                    ↓
                             Add-on se spustí
                                    ↓
                             Otevřou http://192.168.X.X:3000
```

---

## 📋 Minimální Requirements

Aby to fungovalo:

1. ✅ `addon.yaml` - Valid YAML
2. ✅ `Dockerfile` - Buildable
3. ✅ Repo public
4. ✅ Folder `addon/` v root

Hotovo! 🎉

---

## ❌ Common Mistakes

| Mistake | Fix |
|---------|-----|
| Repo je private | Jdi Settings → Change to public |
| `addon.yaml` nepodraží | Kontroluj YAML syntax (bez zavináčů) |
| Dockerfile failne | ZkUS lokálně: `docker build -f addon/Dockerfile .` |
| Port není otevřený | Přidej do `addon.yaml`: `ports: { 3000/tcp: Frontend }` |
| Node moduly jsou v repo | Přidej do `.gitignore`: `node_modules/` |

---

## 🔗 Next Steps

Až to budeš mít hotovo:

- [ ] Repo on GitHub + Public
- [ ] Push all code
- [ ] Add to community repository
- [ ] Wait for approval (1-2 weeks)
- [ ] Users see it in Home Assistant Store
- [ ] Users click Install + enjoy!

---

**Hotovo!** Jdi nahoru na `addon/INSTALL.md` pro detaily. 🚀
