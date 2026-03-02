# Solar Portal Add-on pro Home Assistant

Monitorování solárních panelů, baterie a fotovoltaiky přímo v Home Assistantu.

## 🚀 Instalace

### 1. Přidej repozitář do Home Assistanta

```
Nastavení → Add-ony a zálohování → Obchod s add-ony
→ ⋮ (Tři tečky) → Repozitáře
→ Přidat repozitář
→ https://github.com/honzik/solar-portal-addon
```

### 2. Instaluj Solar Portal add-on

```
Obchod s add-ony → Vyhledej "Solar Portal"
→ Instaluj
```

### 3. Spusť add-on

```
Nastavení → Add-ony a zálohování → Solar Portal
→ Tlačítko "Spustit"
```

### 4. Otevři portál

```
http://192.168.X.X:3000
```

## ⚙️ Konfigurace

V nastavení Add-onu můžeš konfigurovat:

- **Frontend Port** - Port pro webové rozhraní (výchozí: 3000)
- **Backend Port** - Port pro API (výchozí: 5000)
- **Home Assistant URL** - URL Home Assistanta (výchozí: http://homeassistant:8123)
- **Log Level** - Úroveň logování (info/debug/error)

## 🔓 První Přihlášení

1. Otevři http://192.168.X.X:3000
2. Klikni "Zaregistrovat se"
3. **Instalační heslo se vygeneruje automaticky** - **ZKOPÍRUJ SI HO!**
4. Vyplň email a heslo
5. Po registraci vidíš heslo - **zapíš si ho bezpečně**
6. Zaloguj se pomocí:
   - Instalační heslo
   - Email
   - Tvoje heslo

## 🏠 Připojení Home Assistanta

Agent automaticky čte data z tvého Home Assistanta prostřednictvím vestavěné API.

**Konfigurace SolaX invertoru:**

V `agent/config.json` uprav entity_id na tvoje:

```json
{
  "haUrl": "http://homeassistant:8123",
  "entities": {
    "power": "sensor.solax_inverter_output_power",
    "energy": "sensor.solax_inverter_energy_today",
    "battery": "sensor.solax_inverter_battery_capacity",
    "voltage": "sensor.solax_inverter_battery_voltage_charge",
    "temperature": "sensor.solax_inverter_battery_temperature"
  }
}
```

## 📊 Přístupné Porty

- **Port 3000** - Frontend (webové rozhraní)
- **Port 5000** - Backend API (http://192.168.X.X:5000/api)

## 🔄 Restart / Reset

- **Restart** - V UI Add-onu klikni "Restartuj" (zachovají se data)
- **Reset** - Smaž data v Add-onu a spusť znovu (čisté heslo)

## 📝 Poznámky

- Při **prvním spuštění** se vygeneruje nové heslo
- Heslo si **MUSÍŠ zapsat** - nelze ho resetovat
- Data se ukládají v paměti Add-onu
- Při restartování se **zachovávají** uživatelské údaje

## 🐛 Logování

Logy můžeš vidět v:

```
Nastavení → Add-ony → Solar Portal → Logy
```

Nastav Log Level na "debug" pro více informací.

## ❓ Problémy?

### "Nelze se připojit k API"
- Ověř, že Backend Port je správný
- Zkontroluj logy pro chyby

### "Frontend se nenačítá"
- Někdy trvá déle první spuštění
- Čekej 30 sekund a obnov stránku

### "Agent se nepřipojuje k HA"
- Ověř `haUrl` v `agent/config.json`
- Zkontroluj, že HA běží na http://homeassistant:8123

## 📞 Support

Máš problém? Otevři issue na GitHub:
https://github.com/honzik/solar-portal-addon/issues

## 📄 Licence

MIT License

---

**Vytvořeno s ❤️ pro solární domácnosti**
