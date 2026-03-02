# 🚀 Solar Portal Add-on - HOTOVÝ BALÍČEK

Tvůj Home Assistant Add-on je připravený! Zde je mapa co máš:

```
c:\Users\Honzik\Desktop\HA\addon\
├── addon.yaml              ← Konfigurace add-onu
├── Dockerfile              ← Docker image
├── README.md               ← Pro uživatele
├── DOCS.md                 ← Technická dokumentace
├── CHANGELOG.md            ← Changelog verzí
├── INSTALL.md              ← Jak publikovat na GitHub
├── .gitignore
└── rootfs/
    └── entrypoint.sh       ← Spuštění služeb
```

## 📋 Co to Má?

✅ **Frontend** - React UI (port 3000)
✅ **Backend** - Express.js API (port 5000)
✅ **Agent** - Sběr dat z HA
✅ **Bezpečnost** - Instalační heslo (neresetovatelné)
✅ **In-memory DB** - Čistý start bez dat
✅ **HA Integration** - Automatický přístup k HA API
✅ **Česká lokalizace** - Všechno v češtině

## 🔄 Jak To Funguje?

1. **Uživatel stáhne Add-on z HA Store**
   ```
   Nastavení → Add-ony → Obchod
   → "Solar Portal" → Instaluj
   ```

2. **Spustí Add-on**
   ```
   Tlačítko "Spustit"
   ```

3. **Otevře portál**
   ```
   http://192.168.X.X:3000
   ```

4. **Zaregistruje se**
   ```
   - Heslo se vygeneruje AUTOMATICKY
   - Zobrazí se s varováním
   - Musí si ho zapsat
   ```

5. **Přihlásí se**
   ```
   Instalační heslo + Email + Heslo = Vstup
   ```

## 📦 Jak To Publikovat?

### Nejjednoduší Cesta - GitHub

```bash
# 1. Vytvoř repozitář na https://github.com/new
   Name: solar-portal-addon
   Visibility: Public (DŮLEŽITÉ!)

# 2. Push na GitHub
cd c:\Users\Honzik\Desktop\HA\addon
git init
git add .
git commit -m "Initial Solar Portal Add-on"
git remote add origin https://github.com/TVUJE_USERNAME/solar-portal-addon.git
git branch -M main
git push -u origin main

# 3. Uživatelé přidají repo
Settings → Add-ons & Backups → Add-on Store
→ ⋮ Repositories
→ Add: https://github.com/TVUJE_USERNAME/solar-portal-addon
→ Install Solar Portal
```

## 🔧 Dočasný Test (Bez Publikace)

Pokud chceš test přímo na Raspberry:

```bash
# Na Raspberry Pi:
git clone https://github.com/TVUJE_USERNAME/solar-portal-addon.git
cd solar-portal-addon

# Build
docker build -t solar_portal:latest .

# Run
docker run -d \
  -p 3000:3000 \
  -p 5000:5000 \
  --name solar_portal \
  solar_portal:latest
```

## 📝 Checklist Před Publikací

- [ ] GitHub repozitář vytvořen (public!)
- [ ] `addon.yaml` - má správné metadata
- [ ] `Dockerfile` - buildované bez chyb
- [ ] `README.md` - jasné instrukce
- [ ] `.gitignore` - ignoruje node_modules
- [ ] Logo 256x256px (volitelné)
- [ ] Icon 256x256px (volitelné)

## ❓ Co Pokud?

### "Chci test na Raspberry bez GitHub"

Zkopíruj složku `addon/` přímo na Raspberry a builduj:
```bash
scp -r ./addon pi@192.168.1.X:/home/pi/solar-portal
ssh pi@192.168.1.X
cd /home/pi/solar-portal
docker build -t solar_portal .
docker run -d -p 3000:3000 -p 5000:5000 solar_portal
```

### "Chci změnit něco v Add-onu"

**Soubory k úpravě:**
- `addon.yaml` - Porty, metadata, verze
- `DOCS.md` - Dokumentace uživatele
- `README.md` - Český průvodce
- `rootfs/entrypoint.sh` - Spuštění služeb

**NEMĚŇ:**
- `Dockerfile` - Pokud nevíš co dělá (komplexní)
- `backend/`, `frontend/`, `agent/` - To je tvůj původní kód

### "Chci vyšší verzi (0.2.0)"

```bash
# 1. Uprav addon.yaml
version: 0.2.0

# 2. Uprav CHANGELOG.md
## [0.2.0] - 2026-03-03
### Přidáno
- Nová feature

# 3. Commituj
git add .
git commit -m "Release v0.2.0"
git tag v0.2.0
git push origin main --tags
```

## 🎯 Finální Status

| Kontrola | Status |
|----------|--------|
| ✅ Frontend (React) | HOTOVÝ |
| ✅ Backend (API) | HOTOVÝ |
| ✅ Agent (sběr dat) | HOTOVÝ |
| ✅ Bezpečnost (heslo) | HOTOVÝ |
| ✅ Home Assistant Add-on | HOTOVÝ |
| ✅ Dokumentace | HOTOVÁ |
| ⏳ Publikace na GitHub | NA TOBĚ |

## 🚀 Další Kroky

### Možnost 1: Publikuj na GitHub (Doporučeno)
```
1. Vytvoř public GitHub repo
2. Push soubory z /addon/
3. Uživatelé si přidají repozitář do HA
4. Instalují a spouští 1 klikem
```

### Možnost 2: Distribuuj ZIP
```
1. Zazipuj /addon/ složku
2. Pošli uživateli
3. Uživatel extrahuje a déployuje na Raspi
```

### Možnost 3: Nasaď na Registr (Budoucnost)
```
- Docker Hub
- GitHub Container Registry
- Vlastní registr
```

## 💡 Pro Pokročilé

Chceš PostgreSQL místo in-memory?

Uprav `Dockerfile` a `addon.yaml`:

```yaml
# addon.yaml
services:
  - postgresql
  
environment:
  DATABASE_URL: postgresql://user:pass@db:5432/solar
```

Chceš HTTPS/TLS?

Postav reverzní proxy (Nginx) přes Add-on.

---

**🎉 HOTOVO! Tvůj Solar Portal Add-on je připravený k nasazení!**

Máš otázky? Projdi si:
- 📖 [DOCS.md](addon/DOCS.md) - Technické detaily
- 📝 [README.md](addon/README.md) - Uživatelský průvodce
- ⚙️ [INSTALL.md](addon/INSTALL.md) - Publikace na GitHub
