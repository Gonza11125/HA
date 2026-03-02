# 🚀 Solar Portal Add-on - Publikování v Home Assistant Obchodu

Kompletní návod jak dostat Solar Portal do Home Assistant Add-on Store.

## 📋 Požadavky

- ✅ GitHub účet (https://github.com)
- ✅ Git nainstalovaný (`git --version`)
- ✅ Docker nainstalovaný (pro lokální testování)
- ✅ Přístup k GitHub Actions (obsaženo v bezplatném účtu)

---

## 🔧 Krok 1: Příprava GitHub Repozitáře

### 1.1 Vytvoř nový repozitář na GitHubu

```bash
# Jdi na https://github.com/new
# Vyplň:
Repository name: solar-portal-addon
Description: Solar energy monitoring portal for Home Assistant
Visibility: **PUBLIC** (DŮLEŽITÉ!)
README: uncheck
```

### 1.2 Pushni kód na GitHub

```bash
# V root složce projektu
cd c:\Users\Honzik\Desktop\HA

# Inicializuj git (nebo přejdi do existujícího repo)
git init

# Přidej všechny soubory
git add .

# První commit
git commit -m "Initial commit: Solar Portal Add-on 0.1.0"

# Přidej GitHub remotu
git remote add origin https://github.com/TVUJ_USERNAME/solar-portal-addon.git

# Pushni na GitHub
git branch -M main
git push -u origin main
```

---

## 🏗️ Krok 2: Struktura pro Publikování

Repozitář **MUSÍ** mít tuto strukturu pro Home Assistant:

```
solar-portal-addon/
├── addon/
│   ├── addon.yaml              ← Konfigurace add-onu
│   ├── Dockerfile              ← Build image
│   ├── CHANGELOG.md            ← Changelog verzí
│   ├── README.md               ← Popis pro uživatele
│   ├── DOCS.md                 ← Technická dokumentace
│   ├── INSTALL.md              ← Instalační instrukce (tohle)
│   ├── icon.png                ← Ikona 256x256 (optional)
│   ├── logo.png                ← Logo (optional)
│   └── rootfs/
│       └── entrypoint.sh       ← Spouštěcí skript
├── backend/                    ← Backend source
├── frontend/                   ← Frontend source
├── agent/                      ← Agent source
├── .github/
│   └── workflows/
│       └── build.yaml          ← GitHub Actions CI/CD
├── README.md                   ← Projekt overview
└── .gitignore

# DŮLEŽITÉ: Neukládej node_modules, dist, build atd!
```

### 2.1 Zkontroluj `.gitignore`

```bash
# Vytvoř .gitignore v root
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*

# Build outputs
dist/
build/
.tsc/

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker
.dockerignore

# Logs
logs/
*.log
EOF

git add .gitignore && git commit -m "Add gitignore"
git push
```

---

## ✅ Krok 3: Ověření Konfigurace

Běž přes checklist aby všechno bylo správně:

### 3.1 `addon/addon.yaml`

Měl by obsahovat:
- ✅ `name: Solar Portal`
- ✅ `slug: solar_portal` (bez mezer, s podtržítky)
- ✅ `version: 0.1.0`
- ✅ `startup: application`
- ✅ `arch:` - seznam podporovaných architektur
- ✅ `ports:` - otevřené porty
- ✅ `options:` - konfigurovatelné možnosti

```bash
# Ověř YAML syntaxi
yq validate addon/addon.yaml
```

### 3.2 Dockerfile

Měl by:
- ✅ Používat `aarch64, armhf, armv7, amd64, i386` (všechny)
- ✅ Buildovat **production verzi** (ne `npm run dev`)
- ✅ Zkopírovat `entrypoint.sh`
- ✅ Копировать všechny části (backend, frontend, agent)

### 3.3 GitHub Actions Workflow

```bash
# Zkontroluj .github/workflows/build.yaml existuje
ls -la .github/workflows/build.yaml
```

---

## 🐳 Krok 4: Lokální Testování

Před publikováním otestuj lokálně:

### 4.1 Builduj Docker image

```bash
# V root projektu
docker build -f addon/Dockerfile -t solar-portal-addon:test .

# Zkontroluj velikost
docker images | grep solar-portal
```

### 4.2 Spusť lokálně

```bash
# Vytvoř test config
mkdir -p test-data
cat > test-data/options.json << 'EOF'
{
  "ha_url": "http://homeassistant:8123",
  "frontend_port": 3000,
  "backend_port": 5000,
  "log_level": "info",
  "enable_agent": false
}
EOF

# Spusť container
docker run -it \
  -p 3000:3000 \
  -p 5000:5000 \
  -v $(pwd)/test-data:/data \
  solar-portal-addon:test
```

### 4.3 Otestuj

```bash
# V novém terminálu
curl http://localhost:5000/health
curl http://localhost:3000
```

---

## 📦 Krok 5: Publikování v Home Assistant Add-on Store

Home Assistant má **oficiální** a **komunitní** store.

### Možnost A: Komunitní Store (Snadněji)

1. Jdi na https://github.com/hassio-addons/repository
2. Klikni "Add-ons" sekcí
3. Přidej tvůj repozitář:

```
https://github.com/TVUJ_USERNAME/solar-portal-addon
```

4. Vyplň formulář
5. Odeslij pull request

Typicky trvá 1-2 týdny na review.

### Možnost B: Oficiální Store (Těžší)

1. Jdi na https://github.com/home-assistant/addons
2. Procesy jsou přísněji (vyžadují testování, bezpečnostní audit)
3. Vyžaduje splnění Home Assistant kódových standardů

---

## 🔄 Krok 6: CI/CD s GitHub Actions

GitHub Actions automaticky builduje image pro všechny architektury:

### 6.1 Pushni změny

```bash
# Udělej změnu
echo "# Updated" >> addon/CHANGELOG.md

# Commituj
git add addon/CHANGELOG.md
git commit -m "Update changelog"

# Pushni
git push origin main
```

### 6.2 Sleduj build

```bash
# Na GitHubu: Tvůj repozitář → Actions
# Vidíš real-time build progress
# Když je done, máš prebuilt images v ghcr.io
```

### 6.3 Přidej image do `addon.yaml`

Po úspěšném buildu v GitHub Actions, updatuj `addon.yaml`:

```yaml
name: Solar Portal
version: 0.2.0
image: ghcr.io/{GITHUB_USER}/solar-portal-addon/{ARCH}
build: build_locally

# ... zbytek ...
```

---

## 🚀 Krok 7: Release & Version Management

### 7.1 Semantic Versioning

Aktualizuj verzi v:
1. `addon/addon.yaml` → `version: 0.2.0`
2. `backend/package.json` → `"version": "0.2.0"`
3. `frontend/package.json` → `"version": "0.2.0"`
4. `agent/package.json` → `"version": "0.2.0"`

### 7.2 Vytvoř Release na GitHubu

```bash
# Vytvoř git tag
git tag v0.2.0

# Pushni tag
git push origin v0.2.0
```

Pak na GitHubu vytvoř Release s `CHANGELOG.md` obsahem.

---

## 📝 Krok 8: Aktualizace pro Uživatele

Když je add-on v Home Assistant:

### 8.1 Uživatel ho Najde

```
Home Assistant
→ Nastavení
→ Add-ony a zálohování
→ Obchod s add-ony
→ Vyhledej "Solar Portal"
```

### 8.2 Instaluj a Spustí

```
→ Klikni na Solar Portal
→ "Instaluj"
→ Počkej (1-2 minuty na prvé spuštění)
→ "Spustit"
→ "Otevřít web"
```

---

## ❓ Troubleshooting

### Build se vždycky failne

```bash
# Zkontroluj logs na GitHub Actions
# Jdi na Actions → poslední workflow run

# Lokálně si ověř Docker build:
docker build -f addon/Dockerfile --progress=plain .
```

### Image je příliš velký

```bash
# Frontend build by měl být minifikovaný
# Backend by měl mít "npm ci --only=production"

# Zkontroluj velikost:
docker images
```

### Uživatelé nemohou stáhnout

```bash
# Zkontroluj že repozitář je PUBLIC
# Zkontroluj že addon.yaml je validní
# Zkontroluj GitHub Actions build log
```

---

## 📚 Další Zdroje

- [Home Assistant Add-ons - Dokumentace](https://developers.home-assistant.io/docs/add-ons)
- [Home Assistant Add-ons Repository](https://github.com/hassio-addons/repository)
- [Docker Buildx Multi-platform](https://docs.docker.com/build/building/multi-platform/)
- [GitHub Actions Docker Build](https://github.com/docker/build-push-action)

---

## ✨ Hotovo!

Když to všechno uděláš:

1. ✅ Máš GitHub repozitář s Solar Portal add-onem
2. ✅ Máš GitHub Actions co automaticky builduje pro všechny architektury
3. ✅ Máš návod jak publikovat v Home Assistant Obchodu
4. ✅ Uživatelé si mohou stáhnout a instalovat s jedním klikem

**Gratuluji! 🎉**


```bash
mkdir -p .github/workflows
```

**`.github/workflows/build.yml`:**
```yaml
name: Build Add-on

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t solar-portal-addon:latest .
```

## 📦 Publikace do Home Assistant Add-on Store

### 1. Add Addon Repository

Jdi na https://github.com/hassio-addons/repository a vytvořič fork.

Nebo vytvoř vlastní repozitář repository:

**`repository.yaml` v root repository:**
```yaml
name: Solar Portal Add-ons
url: https://github.com/TVUJ_USERNAME/solar-portal-addons
maintainer: TVOJE_JMENO <tvuj@email.com>
addons:
  solar_portal:
    repository: https://github.com/TVUJ_USERNAME/solar-portal-addon
    target: latest
    branch: main
```

### 2. Strukturuj Repository Pro Multiple Add-ons (Volitelně)

```
solar-portal-addons/          ← Repository
├── README.md
├── repository.yaml
└── solar-portal/             ← Tvůj add-on
    ├── addon.yaml
    ├── Dockerfile
    └── ...
```

Nebo Single Add-on (Jednodušší):
```
solar-portal-addon/           ← Repository
├── addon.yaml
├── Dockerfile
├── README.md
└── ...
```

## ✅ Ověření Add-onu

Home Assistant má validator. Pusti ho online:

https://github.com/home-assistant/addons/tree/master/tools

Nebo offline:
```bash
docker run -v $(pwd):/path homeassistant/build-env:latest \
  python3 -m script.validate /path
```

## 🎯 Přidání do Home Assistanta

### Uživatel (tvůj zákazník):

```
Home Assistant → Nastavení → Add-ony a Zálohování → Obchod s add-ony
→ ⋮ Tři tečky → Repozitáře
→ https://github.com/TVUJ_USERNAME/solar-portal-addon
→ Přidat
→ Stáhni "Solar Portal"
→ Instaluj
→ Spusť
```

## 🔑 Nejdůležitější Soubory

| Soubor | Účel |
|--------|------|
| `addon.yaml` | Metadata add-onu (povinný) |
| `Dockerfile` | Build image (povinný) |
| `README.md` | Uživatelský průvodce |
| `DOCS.md` | Technická dokumentace |
| `CHANGELOG.md` | Změny verzí |
| `LOGO.png` | 256x256px log (doporučuje se) |
| `ICON.png` | 256x256px icon (doporučuje se) |

## 🐛 Debugging

Pokud Add-on nefunguje:

1. **Zkontroluj Build Logs:**
   ```bash
   docker logs solar_portal
   ```

2. **Zkontroluj Konfiguraci:**
   ```
   Nastavení → Add-ony → Solar Portal → Logy
   ```

3. **Ověř Strukturu:**
   ```bash
   # Musí existovat:
   addon.yaml ✅
   Dockerfile ✅
   rootfs/ ✅
   ```

## 📝 README v Repozitáři

```markdown
# Solar Portal Add-on

Solar energy monitoring portal for Home Assistant.

## Installation

1. Add repository: https://github.com/TVUJ_USERNAME/solar-portal-addon
2. Install Solar Portal add-on
3. Start the add-on
4. Open http://homeassistant:3000

## Configuration

See [DOCS.md](DOCS.md) for detailed configuration.

## License

MIT License
```

## 🚀 Versioning

Když vydáš novou verzi:

```bash
# 1. Aktualizuj addon.yaml
# version: 0.2.0

# 2. Aktualizuj CHANGELOG.md

# 3. Commituj
git add .
git commit -m "Release v0.2.0"
git tag v0.2.0
git push origin main --tags
```

## ⭐ Registrace v Official Add-on Store

https://github.com/home-assistant/addons

Ale pozor - musí splňovat přísné standardy. Počítej s **měsíce čekání**.

Pro MVP stačí tvůj vlastní repozitář!

---

**Hotovo! 🎉 Tvůj Solar Portal Add-on je připraven na GitHub!**
