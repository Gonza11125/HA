# 🚀 RYCHLÝ START - Auto-Discovery Setup

**Čas:** ~5 minut  
**Pro:** Nasazení na Raspberry Pi s automatickou detekcí senzorů

---

## ⚡ Jednoduchý postup

### Krok 1: Zkopíruj Agent na Raspberry Pi

**Z Windows PC:**
```powershell
# Zkompiluj agent
cd c:\Users\Honzik\Desktop\HA\agent
npm run build

# Zkopíruj na Raspberry (nahraď IP adresu)
scp -r dist package*.json pi@192.168.X.X:~/solar-agent/
```

**Na Raspberry Pi:**
```bash
ssh pi@192.168.X.X

cd ~/solar-agent
npm install --production
```

---

### Krok 2: Spusť automatický setup

```bash
npm run setup:prod
```

**Setup wizard se tě zeptá:**

1. **Home Assistant URL**: `http://192.168.254.39:8123`
2. **Long-lived Token**: *(tvůj token)*
3. **Integration ID**: `01KJMB9KVJZTJBNYGEJY2527AN`
4. **Backend URL**: `http://localhost:5000` (nebo IP tvého backendu)

**Setup automaticky:**
- ✅ Otestuje připojení k Home Assistant
- ✅ Najde všechny solární/battery senzory
- ✅ Ukáže ti doporučené senzory
- ✅ Vytvoří `config.json` s vším nastaveným

**Příklad výstupu:**
```
🔍 STEP 3/5: Discovering Sensors

Scanning your Home Assistant for solar/battery sensors...

=== DISCOVERED SENSORS ===

POWER (3):
  [██████████] Inverter Power
      ID: sensor.inverter_power
      Current: 3250 W

  [████████  ] Solar Panel Power
      ID: sensor.solar_power
      Current: 2800 W

ENERGY (2):
  [██████████] Energy Today
      ID: sensor.energy_today
      Current: 45.2 kWh

BATTERY (2):
  [██████████] Battery Level
      ID: sensor.battery_soc
      Current: 85 %

💡 RECOMMENDED SENSORS:

  1. sensor.inverter_power
  2. sensor.energy_today
  3. sensor.battery_soc
  4. sensor.battery_voltage
  5. sensor.inverter_temperature

Use these recommended sensors? (Y/n):
```

Stiskni `Y` → Hotovo! ✅

---

### Krok 3: Získej párovací kód

V prohlížeči:
1. Otevři `http://localhost:3000` (nebo IP tvého backendu)
2. Přihlaš se
3. Klikni **"Spárovat zařízení"**
4. Zobrazí se 6-místný kód, např.: `A3B9K5`

---

### Krok 4: Spusť Agent s párovacím kódem

**Na Raspberry Pi:**
```bash
cd ~/solar-agent

# Doplň párovací kód do config.json
nano config.json
# Najdi řádek: "pairingCode": ""
# Změň na: "pairingCode": "A3B9K5"
# Ulož: Ctrl+X, Y, Enter

# Spusť agent
node dist/index.js
```

**Měl bys vidět:**
```
[INFO] Solar Portal Agent starting...
[INFO] Device not paired yet. Attempting pairing...
[INFO] Pairing successful!
[INFO] Device token saved to config
[INFO] Testing Home Assistant connection...
[INFO] Home Assistant connection successful!
[INFO] Starting data collection...
[INFO] Collected: power=3250W, battery=85%, energy=45.2kWh
[INFO] Data pushed to backend successfully
[INFO] Agent is running. Press Ctrl+C to stop.
```

✅ **HOTOVO!** Dashboard by měl ukazovat live data!

---

## 🔄 Automatický start při bootování

Aby agent běžel stále:

```bash
# Vytvoř systemd service
sudo nano /etc/systemd/system/solar-agent.service
```

**Obsah:**
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

**Aktivuj:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable solar-agent
sudo systemctl start solar-agent
sudo systemctl status solar-agent
```

**Logy:**
```bash
# Real-time
sudo journalctl -u solar-agent -f

# Poslední 50 řádků
sudo journalctl -u solar-agent -n 50
```

---

## 🎯 Pro více Raspberry Pi

**Chceš nasadit na další Raspberry?**

```bash
# Na novém Raspberry Pi
cd ~/solar-agent
npm run setup:prod
```

Setup znovu automaticky najde senzory na daném Home Assistantu!

**Nebo zkopíruj config:**
```bash
# Z prvního Raspberry na druhý (pokud mají stejný HA)
scp pi@192.168.X.X:~/solar-agent/config.json ~/solar-agent/

# Smaž specific údaje (nechej najít znovu)
nano config.json
# Vymaž: "pairingCode", "deviceToken", "deviceId"
# Uložení

# Pak běžný postup: získej nový párovací kód a spusť
node dist/index.js
```

---

## 🐛 Troubleshooting

### Problem: "Cannot connect to Home Assistant"

```bash
# Test HA dostupnosti
curl http://192.168.254.39:8123

# Test s tokenem
curl -H "Authorization: Bearer TVUJ_TOKEN" \
  http://192.168.254.39:8123/api/
```

**Řešení:**
- Zkontroluj IP adresu Home Assistant (`hostname -I` na HA)
- Zkontroluj, že HA běží (`sudo systemctl status home-assistant`)
- Vytvoř nový token v HA (možná expiroval)

### Problem: "No sensors found"

**Možné příčiny:**
- Senzory jsou pojmenovány nestandardně
- Senzory vracejí `unavailable`

**Řešení:**
```bash
# Zobraz všechny senzory v HA
curl -H "Authorization: Bearer TVUJ_TOKEN" \
  http://192.168.254.39:8123/api/states | grep sensor

# Ručně přidej do config.json
nano config.json
# V sekci "sensors": [
#   "sensor.твůj_senzor_1",
#   "sensor.твůj_senzor_2"
# ]
```

### Problem: "Pairing failed"

**Zkontroluj:**
- Backend běží? `curl http://localhost:5000/health`
- Párovací kód není starší než 5 minut?
- `backendUrl` v config.json správná?

**Řešení:**
Vygeneruj nový párovací kód a zkus znovu.

---

## 📊 Co se monitoruje?

Agent automaticky detekuje a monitoruje:

✅ **Power sensors** (W)
- Aktuální výkon inverteru
- Výkon fotovoltaiky
- Výkon domácnosti

✅ **Energy sensors** (kWh)
- Energie dnes
- Celková energie
- Spotřeba

✅ **Battery sensors** (%, V)
- Stav nabití baterie (SOC)
- Napětí baterie
- Nabíjecí/vybíjecí proud

✅ **Other sensors**
- Teplota inverteru
- Frekvence sítě
- Stav připojení

---

## ✅ Checklist

Po dokončení zkontroluj:

- [ ] Agent zkompilovaný (`npm run build`)
- [ ] Agent nahrán na Raspberry Pi
- [ ] Setup wizard dokončen (`npm run setup:prod`)
- [ ] `config.json` obsahuje nalezené senzory
- [ ] Párovací kód získán z Dashboardu
- [ ] Párovací kód doplněn do `config.json`
- [ ] Agent spuštěný (`node dist/index.js`)
- [ ] V lozích vidím "Data pushed successfully"
- [ ] Dashboard ukazuje "Online"
- [ ] Dashboard ukazuje aktuální hodnoty z HA
- [ ] Systemd service vytvořená (volitelné)
- [ ] Agent se spouští po restartu (volitelné)

---

## 🌐 Remote Access

Pokud chceš přístup odkudkoli z internetu, pokračuj na:

👉 **[REMOTE_ACCESS_SETUP.md](./REMOTE_ACCESS_SETUP.md)**

---

**Vytvořeno**: 2. března 2026  
**Čas na dokončení**: ~5 minut  
**Auto-discovery**: ✅ Enabled

