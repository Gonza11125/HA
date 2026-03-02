# 🌞 Solar Portal Agent - Auto-Discovery Edition

Automatický agent pro sběr dat z Home Assistant s **inteligentní detekcí senzorů**.

## ✨ Klíčové funkce

- ✅ **Auto-Discovery** - Automaticky najde všechny solární a battery senzory
- ✅ **Jednoduchý setup** - Interaktivní wizard pro konfiguraci
- ✅ **Univerzální** - Funguje na jakémkoliv Home Assistant setup
- ✅ **Plug & Play** - Nasaď na více Raspberry Pi bez úprav
- ✅ **Real-time monitoring** - Data každých 5 sekund

---

## 🚀 Rychlý start (5 minut)

### 1. Zkopíruj na Raspberry Pi

**Z Windows PC:**
```powershell
cd c:\Users\Honzik\Desktop\HA\agent
npm run build
scp -r dist package*.json pi@192.168.X.X:~/solar-agent/
```

**Na Raspberry Pi:**
```bash
cd ~/solar-agent
npm install --production
```

### 2. Spusť automatický setup

```bash
npm run setup:prod
```

**Setup se zeptá:**
- Home Assistant URL
- Long-lived Token
- Integration ID
- Backend URL

**Setup automaticky:**
- ✅ Otestuje Home Assistant připojení
- ✅ Najde všechny relevantní senzory
- ✅ Doporučí nejlepší senzory pro monitoring
- ✅ Vytvoří `config.json`

### 3. Získej párovací kód

Dashboard → **"Spárovat zařízení"** → Zobrazí se 6-místný kód

### 4. Spusť Agent

```bash
# Doplň párovací kód do config.json
nano config.json  # doplň "pairingCode": "A3B9K5"

# Spusť
node dist/index.js
```

✅ **Hotovo!** Agent posílá data do cloudu.

---

## 📋 Detailní dokumentace

- **[AUTO_DISCOVERY_SETUP.md](../docs/AUTO_DISCOVERY_SETUP.md)** - Kompletní návod s auto-discovery
- **[QUICK_START.md](../docs/QUICK_START.md)** - Lokální test (15 min)
- **[REMOTE_ACCESS_SETUP.md](../docs/REMOTE_ACCESS_SETUP.md)** - Remote access přes internet

---

## 🔧 Konfigurace

### config.json

```json
{
  "haUrl": "http://192.168.254.39:8123",
  "haToken": "eyJhbGc...",
  "haIntegrationId": "01KJMB9KVJZTJBNYGEJY2527AN",
  "backendUrl": "http://localhost:5000",
  "sensors": [
    "sensor.inverter_power",
    "sensor.energy_today",
    "sensor.battery_soc",
    "sensor.battery_voltage",
    "sensor.inverter_temperature"
  ],
  "pollInterval": 5,
  "pairingCode": "A3B9K5",
  "deviceToken": "auto-filled-after-pairing",
  "deviceId": "auto-filled-after-pairing"
}
```

### Environment Variables (volitelné)

Můžeš použít `.env` místo config.json:

```env
HA_URL=http://192.168.254.39:8123
HA_TOKEN=eyJhbGc...
HA_INTEGRATION_ID=01KJMB9KVJZTJBNYGEJY2527AN
BACKEND_URL=http://localhost:5000
POLL_INTERVAL=5
SENSORS=sensor.inverter_power,sensor.energy_today,sensor.battery_soc
PAIRING_CODE=A3B9K5
```

Pak spusť: `node dist/index.js` (přečte .env automaticky)

---

## 🤖 Auto-Discovery

Agent automaticky hledá senzory podle keywords:

### Kategorie

**Power** (W):
- Keywords: `power`, `watt`, `w`, `výkon`, `inverter`
- Příklad: `sensor.inverter_power`, `sensor.solar_power`

**Energy** (kWh):
- Keywords: `energy`, `kwh`, `wh`, `total`, `today`, `dnes`
- Příklad: `sensor.energy_today`, `sensor.energy_total`

**Battery** (%):
- Keywords: `battery`, `baterie`, `soc`, `charge`
- Příklad: `sensor.battery_soc`, `sensor.battery_level`

**Voltage** (V):
- Keywords: `voltage`, `volt`, `napětí`
- Příklad: `sensor.battery_voltage`

**Current** (A):
- Keywords: `current`, `ampere`, `amp`, `proud`
- Příklad: `sensor.battery_current`

**Temperature** (°C):
- Keywords: `temperature`, `temp`, `teplota`
- Příklad: `sensor.inverter_temperature`

### Relevance Score

Každý senzor dostane skóre podle:
- Obsahuje "solar" nebo "inverter" → +10 bodů
- Obsahuje "power", "energy", "battery" → +5 bodů
- Začíná "sensor." → +2 body
- Obsahuje "_power" nebo "_energy" → +3 body

Setup zobrazí senzory seřazené podle relevance:

```
POWER (3):
  [██████████] Inverter Power (score: 18)
  [████████  ] Solar Power (score: 15)
  [█████     ] House Power (score: 8)
```

---

## 🔄 Systemd Service (automatický start)

```bash
sudo nano /etc/systemd/system/solar-agent.service
```

```ini
[Unit]
Description=Solar Portal Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/solar-agent
ExecStart=/usr/bin/node /home/pi/solar-agent/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable solar-agent
sudo systemctl start solar-agent
```

**Logy:**
```bash
sudo journalctl -u solar-agent -f
```

---

## 🌐 Nasazení na více zařízení

### Varianta A: Stejný Home Assistant

```bash
# Zkopíruj config.json z prvního Raspberry na další
scp pi@192.168.X.X:~/solar-agent/config.json ~/solar-agent/

# Vymaž device-specific údaje
nano config.json
# Smaž hodnoty: "pairingCode", "deviceToken", "deviceId"

# Získej nový párovací kód z dashboardu
# Doplň do config.json
# Spusť agent
node dist/index.js
```

### Varianta B: Jiný Home Assistant

```bash
# Spusť setup znovu
npm run setup:prod
# Auto-discovery najde senzory v novém HA
```

---

## 🐛 Troubleshooting

### "Cannot connect to Home Assistant"

```bash
# Test HA
curl http://192.168.254.39:8123

# Test API
curl -H "Authorization: Bearer TOKEN" \
  http://192.168.254.39:8123/api/
```

**Řešení:**
- Zkontroluj IP adresu (`hostname -I` na HA Raspberry)
- Vytvoř nový Long-lived Token v HA

### "No sensors found"

**Auto-discovery nenašla žádné senzory?**

```bash
# Zobraz všechny HA senzory
curl -H "Authorization: Bearer TOKEN" \
  http://192.168.254.39:8123/api/states | grep sensor
```

**Ručně přidej do config.json:**
```json
{
  "sensors": [
    "sensor.tvuj_nestandardni_senzor_1",
    "sensor.tvuj_nestandardni_senzor_2"
  ]
}
```

### "Pairing failed"

**Zkontroluj:**
- Backend běží? `curl http://BACKEND_IP:5000/health`
- Párovací kód je čerstvý? (expiruje za 5 minut)
- `backendUrl` v config.json je správná?

**Řešení:**
Vygeneruj nový párovací kód a zkus znovu.

---

## 📊 Development

### Vývoj s hot-reload

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Lint & Format

```bash
npm run lint
npm run format
```

---

## 🛠️ Struktura projektu

```
agent/
├── src/
│   ├── index.ts              # Main entry point
│   ├── setup.ts              # Interactive setup wizard ✨
│   ├── sensor-discovery.ts   # Auto-discovery engine ✨
│   ├── data-collector.ts     # Data collection logic
│   ├── ha-client.ts          # Home Assistant API client
│   ├── cloud-client.ts       # Backend API client
│   └── logger.ts             # Logging utility
├── dist/                     # Compiled JavaScript
├── config.json               # Runtime configuration
├── config.example.json       # Example with your HA data
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

---

## 📖 API Reference

### DiscoverSensors

```typescript
import { discoverSensors } from './sensor-discovery'

const discovered = await discoverSensors(
  'http://192.168.254.39:8123',
  'eyJhbGc...'
)

console.log(discovered.power)    // Power sensors
console.log(discovered.energy)   // Energy sensors
console.log(discovered.battery)  // Battery sensors
```

### Get Best Sensors

```typescript
import { getBestSensors } from './sensor-discovery'

const best = getBestSensors(discovered)
console.log(best.power?.entityId)  // Top power sensor
```

---

## 🔐 Security

⚠️ **NIKDY** necommituj do Gitu:
- `config.json` (obsahuje token)
- `.env` (obsahuje credentials)

✅ Soubory jsou v `.gitignore`

✅ Pro sdílení použij `config.example.json`

---

## 📈 Performance

- **Polling interval**: 5 sekund (konfigurovatelné)
- **CPU usage**: ~1-2% na Raspberry Pi 4
- **Memory**: ~50 MB
- **Network**: ~1 KB za request (každých 5s)

---

## 🆘 Podpora

**Dokumentace:**
- [AUTO_DISCOVERY_SETUP.md](../docs/AUTO_DISCOVERY_SETUP.md)
- [QUICK_START.md](../docs/QUICK_START.md)
- [REMOTE_ACCESS_SETUP.md](../docs/REMOTE_ACCESS_SETUP.md)

**Logy:**
```bash
# Systemd service
sudo journalctl -u solar-agent -f

# Direct run
node dist/index.js  # výstup jde do konzole
```

---

**Verze**: 0.1.0  
**Auto-Discovery**: ✅ Enabled  
**Vytvořeno**: 2. března 2026

