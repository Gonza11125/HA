# Quick Start - Lokální Test (bez remote access)

Chceš rychle vyzkoušet propojení s Home Assistantem v **lokální síti**? Tento návod ti zabere ~15 minut.

---

## ⚡ Co potřebuješ HNED

1. **Home Assistant běžící** (v lokální síti)
2. **Raspberry Pi** nebo jiný počítač Node.js
3. **Backend + Frontend už běží** (z předchozího vývoje)

---

## 🚀 3 kroky k funkčnímu systému

### KROK 1: Získej Home Assistant Token (5 minut)

#### 1.1 Otevři Home Assistant

V prohlížeči: `http://192.168.X.X:8123` (nahraď svou IP)

Nevíš IP? Zjisti ji:
```bash
# Na Raspberry Pi s Home Assistant
hostname -I
```

#### 1.2 Vytvoř Long-lived Token

1. Klikni na **své jméno** (vlevo dole)
2. Klikni na **Security** tab
3. V sekci **Long-lived access tokens** klikni **CREATE TOKEN**
4. Název: `Solar Portal Agent`
5. Klikni **OK**
6. **ZKOPÍRUJ TOKEN** (zobrazí se jen jednou!)

Ukázka tokenu:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYmNkZWYxMjM0NTY3ODkwIiwiaWF0IjoxNjc4ODg2NDAwLCJleHAiOjE5OTQyNDY0MDB9.AbCdEfGhIjKlMnOpQrStUvWxYz
```

✍️ Zapiš si: `_________________________________`

#### 1.3 Zjisti solární senzory

V Home Assistant:
1. **Developer Tools** → **States**
2. Vyhledej své solární senzory

Příklad názvů:
```
sensor.inverter_power
sensor.inverter_energy_today
sensor.battery_level
sensor.battery_voltage
```

✍️ Zapiš si: `_________________________________`

---

### KROK 2: Nastav Agent (5 minut)

#### 2.1 Vytvoř konfigurační soubor

Na počítači/Raspberry, kde poběží Agent:

```bash
cd ~/solar-agent  # nebo kam si chceš agent dát
nano config.json
```

Obsah (nahraď hodnoty):
```json
{
  "haUrl": "http://192.168.X.X:8123",
  "haToken": "tvuj-token-z-kroku-1.2",
  "haIntegrationId": "01KJMB9KVJZTJBNYGEJY2527AN",
  "backendUrl": "http://localhost:5000",
  "sensors": [
    "sensor.inverter_power",
    "sensor.inverter_energy_today",
    "sensor.battery_level",
    "sensor.battery_voltage"
  ],
  "pollInterval": 5,
  "pairingCode": "",
  "deviceToken": "",
  "deviceId": ""
}
```

**Důležité:**
- `haUrl` - IP tvého Home Assistant (bez `/` na konci)
- `haToken` - Token z kroku 1.2
- `backendUrl` - URL tvého backend serveru (lokálně `http://localhost:5000`)
- `sensors` - Názvy senzorů z kroku 1.3
- `pairingCode` - Nevyplňuj teď, doplníme v kroku 3
- `deviceToken` - Nech prázdné, agent vyplní po spárování

Ulož: `Ctrl+X`, `Y`, `Enter`

#### 2.2 Nahraj Agent kód

**Z tvého PC (Windows):**

```powershell
# Přejdi do agent složky
cd c:\Users\Honzik\Desktop\HA\agent

# Zkompiluj agent
npm run build

# Zkopíruj na Raspberry Pi (nahraď IP a user)
scp -r dist package.json config.json pi@192.168.X.X:~/solar-agent/
```

**Na Raspberry Pi:**
```bash
cd ~/solar-agent
npm install --production
```

---

### KROK 3: Spáruj zařízení (5 minut)

#### 3.1 Otevři Dashboard

V prohlížeči: `http://localhost:3000` (nebo IP serveru s frontendem)

1. **Přihlaš se** s tvým účtem
2. **Dashboard** → Klikni **"Spárovat zařízení"**
3. Zobrazí se **párovací kód**, např.: `A3B9K5`

✍️ Zapiš si kód: `__________`

#### 3.2 Doplň kód do Agent config

**Na Raspberry Pi:**
```bash
nano ~/solar-agent/config.json
```

Uprav řádek:
```json
"pairingCode": "A3B9K5",
```
(nahraď svým kódem z dashboardu)

Ulož: `Ctrl+X`, `Y`, `Enter`

#### 3.3 Spusť Agent

```bash
cd ~/solar-agent
node dist/index.js
```

**Co by ses měl/a vidět:**
```
[INFO] Solar Portal Agent starting...
[INFO] Using config file: ./config.json
[INFO] Device not paired yet. Attempting pairing with provided code...
[INFO] Pairing successful!
[INFO] Device ID: 12345678-1234-1234-1234-123456789abc
[INFO] Device token saved to config
[INFO] Testing Home Assistant connection...
[INFO] Home Assistant connection successful!
[INFO] Starting data collection...
[INFO] Collected data: power=3250W, battery=85%
[INFO] Data pushed to backend successfully
[INFO] Agent is running. Press Ctrl+C to stop.
```

✅ **Pokud vidíš tyto zprávy, vše funguje!**

#### 3.4 Zkontroluj Dashboard

V prohlížeči na Dashboard by ses měl/a vidět:
- ✅ **Zelená tečka** (Online)
- ✅ **Aktuální výkon** (čísla z HA)
- ✅ **Energie dnes**
- ✅ **Stav baterie**
- ✅ **Graf** se začne plnit daty

---

## 🎉 Hotovo! Co teď?

Máš funkční systém v **lokální síti**. Agent posílá data každých 5 sekund.

### Spustit Agent trvale (aby běžel stále)

```bash
# Vytvoř systemd service
sudo nano /etc/systemd/system/solar-agent.service
```

Obsah:
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

Aktivuj:
```bash
sudo systemctl daemon-reload
sudo systemctl enable solar-agent
sudo systemctl start solar-agent
sudo systemctl status solar-agent
```

### Vidět logy:
```bash
# Real-time
sudo journalctl -u solar-agent -f

# Poslední 50 řádků
sudo journalctl -u solar-agent -n 50
```

---

## 🌐 Přístup z internetu?

Pokud chceš přístup **odkudkoli** (ne jen z domácí WiFi), pokračuj na:

👉 **[REMOTE_ACCESS_SETUP.md](./REMOTE_ACCESS_SETUP.md)** - Fáze 5

Tam najdeš návod na:
- Doménu + SSL certifikát
- Nginx reverse proxy
- Firewall a security

---

## 🐛 Něco nefunguje?

### Problem: Agent hlásí "Cannot connect to Home Assistant"

**Zkontroluj:**
```bash
# Test HA dostupnosti
curl http://192.168.X.X:8123

# Test API s tokenem
curl -H "Authorization: Bearer tvuj-token" \
  http://192.168.X.X:8123/api/

# Mělo by vrátit JSON s informacemi o HA
```

**Možné příčiny:**
- ❌ Špatná IP adresa → Zkontroluj `haUrl` v config.json
- ❌ Špatný token → Vytvoř nový v HA (Krok 1.2)
- ❌ Home Assistant neběží → `sudo systemctl restart home-assistant`

### Problem: Agent hlásí "Pairing failed"

**Zkontroluj:**
- ❌ Backend neběží → `curl http://localhost:5000/health`
- ❌ Špatný párovací kód → Kód expiruje po 5 minutách!
- ❌ Špatná `backendUrl` → Zkontroluj v config.json

**Řešení:**
1. Vygeneruj **nový párovací kód** na Dashboardu
2. Okamžitě ho doplň do `config.json`
3. Spusť agent: `node dist/index.js`

### Problem: Dashboard ukazuje "Offline"

**Zkontroluj:**
```bash
# Je Agent spuštěný?
ps aux | grep node

# Nebo pokud systemd service:
sudo systemctl status solar-agent

# Vidíš chyby v lozích?
sudo journalctl -u solar-agent -n 20
```

**Možné příčiny:**
- ❌ Agent není spuštěný
- ❌ Agent nemá `deviceToken` (nebylo spárování úspěšné)
- ❌ Backend API nedostupný z Raspberry Pi

### Problem: Data se neukazují, status "Online"

**Zkontroluj senzory:**
```bash
# V HA Developer Tools → States
# Zkontroluj, že senzory z config.json existují
```

**Možné příčiny:**
- ❌ Špatné názvy senzorů v `sensors` poli
- ❌ Senzory vrací `unavailable` nebo `unknown` v HA

---

## ✅ Checklist

Po dokončení zkontroluj:

- [ ] Home Assistant běží a odpovídá na `http://IP:8123`
- [ ] Vytvořený Long-lived Token
- [ ] Znám názvy svých solárních senzorů
- [ ] `config.json` obsahuje správné hodnoty
- [ ] Agent zkompilován (`npm run build`)
- [ ] Agent nahrán na Raspberry Pi
- [ ] Vytvořený párovací kód na Dashboardu
- [ ] `pairingCode` doplněn do `config.json`
- [ ] Agent spuštěný (`node dist/index.js`)
- [ ] V lozích vidím "Data pushed successfully"
- [ ] Dashboard ukazuje "Online" status
- [ ] Dashboard ukazuje aktuální data z HA
- [ ] Graf se začíná plnit

---

## 📞 Potřebuješ pomoc?

**Užitečné příkazy:**

```bash
# Test HA připojení
curl -H "Authorization: Bearer TOKEN" http://IP:8123/api/states/sensor.inverter_power

# Test Backend
curl http://localhost:5000/health

# Agent logy
sudo journalctl -u solar-agent -f

# Backend logy (pokud PM2)
pm2 logs solar-backend
```

**Další dokumentace:**
- [REMOTE_ACCESS_SETUP.md](./REMOTE_ACCESS_SETUP.md) - Remote access setup
- [API.md](./API.md) - API endpoints
- [AGENT.md](./AGENT.md) - Agent configuration details

---

**Vytvořeno**: 2. března 2026  
**Čas na dokončení**: ~15 minut  
**Verze**: 0.1.0

