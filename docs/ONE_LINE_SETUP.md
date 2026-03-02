# 🚀 ONE-LINE SETUP pro Raspberry Pi

**Ultra rychlý setup s auto-discovery - stačí 1 příkaz!**

---

## 🎯 Pro rychlé nasazení

### Příprava (na Windows PC)

```powershell
# 1. Build agent
cd c:\Users\Honzik\Desktop\HA\agent
npm run build

# 2. Zkopíruj config s TVÝMI údaji
Copy-Item config.example.json solar-agent-ready.tar -Force

# 3. Vytvoř balík pro Raspberry
tar -czf solar-agent-ready.tar dist package.json package-lock.json config.example.json
```

### Nasazení (na Raspberry Pi)

```bash
# Stáhni a rozbal (nahraď IP Windows PC)
scp tvuj-user@192.168.X.X:c:/Users/Honzik/Desktop/HA/agent/solar-agent-ready.tar ~/
tar -xzf solar-agent-ready.tar -C ~/solar-agent

# Instaluj a spusť setup
cd ~/solar-agent
npm install --production
npm run setup:prod

# Setup se ptá pouze na párovací kód - vše ostatní už je nastevené!
```

✅ **Hotovo za 2 minuty!**

---

## 📦 Co obsahuje config.example.json

Tvé údaje jsou už v souboru:

```json
{
  "haUrl": "http://192.168.254.39:8123",
  "haToken": "eyJhbGc...",  // Tvůj token
  "haIntegrationId": "01KJMB9KVJZTJBNYGEJY2527AN",
  "backendUrl": "http://localhost:5000",
  "sensors": [],  // Auto-discovery je najde
  "pollInterval": 5
}
```

Setup **automaticky**:
- ✅ Otestuje připojení na http://192.168.254.39:8123
- ✅ Ověří token
- ✅ Najde všechny solární senzory
- ✅ Doporučí nejlepší senzory
- ✅ Vytvoří finální config.json

---

## 🔄 Pro každé další Raspberry Pi

Stejný postup - balík je univerzální!

```bash
# Stáhni stejný tar
scp tvuj-user@IP:path/solar-agent-ready.tar ~/

# Rozbal a setup
tar -xzf solar-agent-ready.tar -C ~/solar-agent
cd ~/solar-agent
npm install --production
npm run setup:prod

# Zadej nový párovací kód z dashboardu
# Auto-discovery znovu najde senzory
```

---

## ⚡ Super rychlá varianta (bez setup wizardu)

Pokud už víš jaké senzory chceš monitorovat:

```bash
# Na Raspberry Pi:
cd ~/solar-agent

# Zkopíruj config.example.json na config.json
cp config.example.json config.json

# Uprav config - přidej senzory a párovací kód
nano config.json
# Doplň:
# "sensors": ["sensor.inverter_power", "sensor.battery_soc"],
# "pairingCode": "A3B9K5"

# Spusť!
node dist/index.js
```

✅ **Hotovo za 1 minutu!**

---

## 🎬 Video tutoriál (představa)

```
1. [00:00] Build na Windows: npm run build
2. [00:15] Zkopíruj na Raspberry: scp ...
3. [00:30] Na Raspberry: npm install
4. [00:45] Spusť setup: npm run setup:prod
5. [01:00] Setup najde senzory automaticky
6. [01:15] Získej párovací kód z dashboardu
7. [01:30] Doplň kód do config.json
8. [01:45] Spusť agent: node dist/index.js
9. [02:00] ✅ Dashboard ukazuje live data!
```

**Celkový čas: 2 minuty**

---

**Vytvořeno**: 2. března 2026  
**Setup rychlost**: ⚡⚡⚡ Ultra fast

