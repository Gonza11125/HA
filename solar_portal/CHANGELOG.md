# Changelog

## [0.2.0] - 2026-03-02

### ✨ Přidáno
- 🚀 Kompletní aplikační kód (backend + frontend + agent)
- 📊 Frontend React aplikace běžící na portu 3000
- ⚡ Backend Express API server na portu 5000
- 🗄️ PostgreSQL database integrace přes Home Assistant Supervisor
- 🔐 Konfigurace JWT a session secrets v options
- 📝 Multi-stage Docker build pro optimalizaci velikosti image

### 🔧 Změněno
- 🏗️ Dockerfile kompletně přepsán pro produkční deployment
- ⚙️ Přidány s6-overlay services pro backend a frontend
- 🎯 Aktualizována config.json s database services a options schema

## [0.1.5] - 2026-03-02

### Opraveno
- 🧱 Opraveny base image registry cesty v build.yaml
- ✅ Opraven ARG BUILD_FROM default v Dockerfile

## [0.1.4] - 2026-03-02

### Opraveno
- 🛠️ Opraven Docker build context (addon-only)
- ✅ Docker image nyní buildí bez chyb typu ".../agent not found"

## [0.1.3] - 2026-03-02

### Opraveno
- 🔄 Navýšení verze pro vynucené obnovení repozitáře v Home Assistant
- 🧹 Vyčištění metadat kvůli cache konfliktům při instalaci add-onu

## [0.1.0] - 2026-03-02

### Přidáno
- 🚀 Počáteční vydání Solar Portal Add-onu
- 🌐 React Frontend s českou lokalizací
- 🚀 Express.js Backend API
- 📡 Agent pro sběr dat z Home Assistanta
- 🔐 Bezpečné ověřování s instalačním heslem
- 📊 Dashboard s reálnými daty
- 🔄 Správa uživatelů
- 📱 Responsivní design
- 🎨 Tmavý/Světlý režim
- 📈 Monitoring solární produkce
- 🔋 Monitoring baterie
- 🌡️ Monitoring teploty a napětí
- 📝 Podrobná dokumentace
- 🐳 Docker containerizace

### Známá Omezení
- V-paměti databáze (data se ztratí po restartu)
- Bez persistentního úložiště
- Bez exportu historických dat

---

Více informací: [DOCS.md](DOCS.md)
