# Solar Portal - Dokumentace

## O Add-onu

**Solar Portal** je kompletní systém pro monitorování solární energie v domácnosti přímo prostřednictvím Home Assistanta.

**Komponenty:**
- 🌐 **Frontend** - React webové rozhraní
- 🚀 **Backend** - Express.js API
- 📡 **Agent** - Sběr dat z Home Assistanta

## Architektura

```
Home Assistant (na Raspberry Pi)
├─ Solar Portal (Add-on)
│  ├─ Frontend (React) :3000
│  ├─ Backend (API) :5000
│  └─ Agent (Sběr dat)
└─ Tvůj invertor (např. SolaX)
```

## Bezpečnost

### 🔐 Instalační Heslo

**Generuje se JEDINKRÁT** při první registraci:
- 20 znaků (A-Z, a-z, 0-9, !@#$%^&*)
- Zobrazí se jen jednou
- **NEMŮŽE se resetovat**
- Musíš si ho **zapsat a uschovat**

### 🔒 Ověřování

1. **Instalační heslo** - Sdílené pro všechny uživatele
2. **E-mail** - Identifikace uživatele
3. **Heslo účtu** - Osobní přístupové heslo

```
Login Flow:
┌─────────────────────────┐
│ Instalační heslo        │ ← Ze první registrace
├─────────────────────────┤
│ E-mail                  │ ← Tvůj e-mail
├─────────────────────────┤
│ Heslo                   │ ← Tvůj login
└─────────────────────────┘
       ↓
  ✅ Vstup do systému
```

## Konfigurace Entity

Add-on se konfiguruje přes UI Home Assistanta, ale **agent čte entity podle `config.json`**.

### Příklad pro SolaX:

**`agent/config.json`:**
```json
{
  "haUrl": "http://homeassistant:8123",
  "haToken": "core-token",
  "cloudUrl": "http://localhost:5000/api",
  "entities": {
    "power": "sensor.solax_inverter_output_power",
    "energy": "sensor.solax_inverter_energy_today",
    "battery": "sensor.solax_inverter_battery_capacity",
    "voltage": "sensor.solax_inverter_battery_voltage_charge",
    "temperature": "sensor.solax_inverter_battery_temperature"
  }
}
```

### Jak najít tvoje entity?

1. Home Assistant → Nástroje pro vývojáře → Stavy
2. Vyhledej své entity (např. `sensor.solax`)
3. Kopíruj `entity_id` do `config.json`

## Porty a Přístup

| Služba | Port | Přístup |
|--------|------|---------|
| Frontend | 3000 | http://192.168.X.X:3000 |
| Backend API | 5000 | http://192.168.X.X:5000/api |
| Health Check | 5000 | http://192.168.X.X:5000/health |

## Úkony v Rozhraní

### Dashboard
- Zobrazení aktuálního výkonu (W)
- Denní energii (kWh)
- Stav baterie (%)
- Teplotu a napětí

### Přihlášení
- Instalační heslo (ze první registrace)
- E-mail
- Heslo na účet

### Registrace
- Jen **první registrace** vygeneruje heslo
- Další uživatelé potřebují instalační heslo

## Data a Jednotky

```
Výkon: Watty (W)
Energie: Kilowatthod (kWh)
Baterie: Procenta (%)
Teplota: Stupně Celsia (°C)
Napětí: Volty (V)
```

## Restart a Reset

### Restart (zachová data)
```
Nastavení → Add-ony → Solar Portal → Restartuj
```

### Reset (čistý start)
```
Nastavení → Add-ony → Solar Portal
→ Odinstaluj
→ Smaž všechna seznamovací doplňková data
→ Přeinstaluj
→ Spusť
→ Nové heslo!
```

## Troubleshooting

### Frontend se nenačítá

**Příčina:** Dlouhý startup, network timeout

**Řešení:**
```bash
# Čekej 30-60 sekund po spuštění
# Obnov stránku (F5)
# Zkontroluj logy v UI Add-onu
```

### "Nelze se připojit k Backend API"

**Příčina:** Backend není připravený

**Řešení:**
```bash
# 1. Zkontroluj logy Add-onu
# 2. Ověř Backend Port v konfiguraci
# 3. Restartuj Add-on
```

### Agent se nepřipojuje

**Příčina:** Špatná URL Home Assistanta

**Řešení:**
```json
// Ověř v agent/config.json:
"haUrl": "http://homeassistant:8123"  // ✅ Správně
"haUrl": "http://192.168.X.X:8123"    // ❌ Z Add-onu!
```

## Proměnné Prostředí

Add-on automaticky vytvoří `.env` soubory:

**Backend (.env):**
```env
NODE_ENV=production
BACKEND_PORT=5000
CORS_ORIGIN=*
HA_URL=http://homeassistant:8123
```

**Agent (.env):**
```env
HA_URL=http://homeassistant:8123
CLOUD_URL=http://localhost:5000/api
```

## Performance

- **CPU:** Minimální (polling 5 sekund)
- **RAM:** ~200-300 MB
- **Disk:** ~500 MB (bez logů)

## Aktualizace

Add-on se aktualizuje automaticky:
```
Nastavení → Add-ony → Solar Portal
→ Pokud je dostupná aktualizace
→ Aktualizuj
```

## Bezpečnostní Tipy

1. ✅ **Zapiš si heslo** - nelze resetovat
2. ✅ **Chraň heslo** - přístup do tvého solárního systému
3. ✅ **Updatuj** - bezpečnostní záplaty
4. ✅ **HTTPS** - v produkci nasaď reverzní proxy

## Návrhované Setup

```
Raspberry Pi (localní síť)
└─ Home Assistant
   └─ Solar Portal Add-on
      └─ Přístup: http://192.168.X.X:3000

(Z venku přes VPN/Proxy)
```

## Autor

Vytvořeno s ❤️ pro solární komunitu.

GitHub: https://github.com/honzik/solar-portal-addon
