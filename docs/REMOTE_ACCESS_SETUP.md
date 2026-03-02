# Remote Access Setup Guide - Solar Portal

**Datum**: 2. března 2026  
**Verze**: 0.1.0  
**Tvoje Home Assistant Integration ID**: `01KJMB9KVJHTJBNYGEJY2527AN`

## 🎯 Cíl

Připojit Solar Portal k tvému Home Assistantu tak, abys měl přístup k solárním datům odkudkoli na světě přes internet.

---

## 📋 Co budeš potřebovat

### Hardware
- ✅ **Raspberry Pi** (nebo jakýkoli server pro Agent)
- ✅ **Home Assistant** (běžící a dostupný v lokální síti)
- ✅ **VPS Server** (pro backend/frontend) nebo místní server s veřejnou IP

### Software
- ✅ Node.js 18+ (na Raspberry Pi)
- ✅ PostgreSQL databáze (pro backend)
- ✅ Domain (např. solar.example.com) - volitelné, ale doporučené
- ✅ SSL certifikát (Let's Encrypt zdarma)

### Údaje z Home Assistant
- 🔑 **Integration ID**: `01KJMB9KVJHTJBNYGEJY2527AN` (máš)
- 🔑 **Long-lived Access Token** (vytvoříme)
- 🌐 **Home Assistant URL** (zjistíme)

---

## 🚀 Postup krok za krokem

### FÁZE 1: Příprava Home Assistant

#### Krok 1.1: Zjisti URL svého Home Assistant

V lokální síti:
```
http://192.168.X.X:8123
nebo
http://homeassistant.local:8123
```

**Jak zjistit IP:**
```bash
# Na Raspberry Pi s Home Assistant
hostname -I

# Nebo v Home Assistant:
# Nastavení → Systém → Síť
```

Zapiš si: `____________________________`

#### Krok 1.2: Vytvoř Long-lived Access Token

1. **Přihlaš se do Home Assistant**
2. **Klikni na své jméno** (vlevo dole)
3. **Security** tab
4. **Long-lived access tokens** sekce
5. **CREATE TOKEN**
   - Name: `Solar Portal Agent`
   - Klikni **OK**
6. **ZKOPÍRUJ TOKEN** (zobrazí se jen jednou!)

```
Ukázka tokenu:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhYmNkZWYxMjM0NTY3ODkwIiwiaWF0IjoxNjc4ODg2NDAwLCJleHAiOjE5OTQyNDY0MDB9.AbCdEfGhIjKlMnOpQrStUvWxYz
```

Zapiš si bezpečně: `____________________________`

⚠️ **NIKDY TENTO TOKEN NEVKLÁDEJ DO GITHUB ANI DO CLOUDU!**

#### Krok 1.3: Zjisti entity tvých solárních senzorů

V Home Assistant:
1. **Developer Tools** → **States**
2. Najdi své solární senzory, např.:
   ```
   sensor.inverter_power
   sensor.inverter_energy_total
   sensor.battery_level
   sensor.battery_voltage
   sensor.battery_temperature
   ```

Zapiš si názvy entit, které chceš sledovat:
```
1. _______________________________
2. _______________________________
3. _______________________________
4. _______________________________
5. _______________________________
```

---

### FÁZE 2: Nastavení Backend (Cloud)

#### Krok 2.1: Nastav PostgreSQL databázi

Pokud už máš backend běžící s PostgreSQL, přeskoč. Jinak:

```bash
# Docker compose už je připravený
cd c:\Users\Honzik\Desktop\HA
docker compose up -d postgres
```

Ověř připojení:
```bash
docker exec -it ha-postgres-1 psql -U postgres -d solar_portal
# Pokud se připojíš, databáze běží
\q  # pro exit
```

#### Krok 2.2: Nastav environment proměnné

Uprav `c:\Users\Honzik\Desktop\HA\backend\.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/solar_portal

# Server
NODE_ENV=production
BACKEND_PORT=5000
CORS_ORIGIN=https://tvadomaina.cz  # Změň na svou doménu

# JWT Secret (vygeneruj náhodný string)
JWT_SECRET=tvuj-velmi-dlouhy-nahodny-retezec-min-64-znaku-abc123xyz

# Email (pokud chceš email verifikaci)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tvuj.email@gmail.com
SMTP_PASS=tvoje-app-password

# Frontend URL
FRONTEND_URL=https://tvadomaina.cz
```

#### Krok 2.3: Spusť backend na serveru

**Na VPS/serveru:**
```bash
# Nahraj projekt na server
git clone https://github.com/tvuj-repo/solar-portal.git
cd solar-portal/backend

# Instaluj dependencies
npm install

# Build
npm run build

# Spusť v produkci (s PM2 pro auto-restart)
npm install -g pm2
pm2 start dist/index.js --name solar-backend
pm2 save
pm2 startup  # aby se spouštěl po restartu
```

Ověř, že běží:
```bash
curl http://localhost:5000/health
# Mělo by vrátit: {"status":"healthy"}
```

---

### FÁZE 3: Nastavení Agent (Raspberry Pi)

#### Krok 3.1: Nahraj Agent na Raspberry Pi

**Z tvého PC:**
```bash
# Zkompiluj agent
cd c:\Users\Honzik\Desktop\HA\agent
npm run build

# Zkopíruj na Raspberry Pi (nahraď IP a user)
scp -r dist/ package.json pi@192.168.X.X:~/solar-agent/
```

**Na Raspberry Pi:**
```bash
ssh pi@192.168.X.X

cd ~/solar-agent
npm install --production
```

#### Krok 3.2: Vytvoř konfigurační soubor

Na Raspberry Pi vytvoř `.env`:
```bash
nano ~/solar-agent/.env
```

Obsah:
```env
# Home Assistant připojení
HA_URL=http://192.168.X.X:8123
HA_TOKEN=tvuj-long-lived-token-z-kroku-1.2
HA_INTEGRATION_ID=01KJMB9KVJZTJBNYGEJY2527AN

# Backend API
BACKEND_URL=https://tvadomaina.cz/api
# nebo pro vývoj: http://localhost:5000/api

# Device Info (nevyplňuj, vygeneruje se při párování)
DEVICE_TOKEN=
DEVICE_ID=

# Polling interval (seconds)
POLL_INTERVAL=5

# Senzory k monitorování (čárkami oddělené)
SENSORS=sensor.inverter_power,sensor.inverter_energy_total,sensor.battery_level,sensor.battery_voltage,sensor.battery_temperature

# Logging
LOG_LEVEL=info
```

Ulož: `Ctrl+X`, `Y`, `Enter`

#### Krok 3.3: Otestuj Agent lokálně

```bash
cd ~/solar-agent
node dist/index.js
```

Měl bys vidět:
```
[INFO] Solar Portal Agent starting...
[INFO] Connecting to Home Assistant: http://192.168.X.X:8123
[INFO] Backend API: https://tvadomaina.cz/api
[INFO] Waiting for device pairing...
```

Pokud vidíš chyby:
- ❌ `Connection refused` → Zkontroluj HA_URL a že HA běží
- ❌ `Unauthorized` → Zkontroluj HA_TOKEN
- ❌ `Cannot connect to backend` → Zkontroluj BACKEND_URL

---

### FÁZE 4: Párování zařízení

#### Krok 4.1: V prohlížeči otevři Solar Portal

Otevři: `https://tvadomaina.cz` (nebo `http://localhost:3000` pro vývoj)

1. **Přihlaš se** s tvým účtem
2. **Dashboard** → klikni na **"Spárovat zařízení"**
3. Zobrazí se **6-místný párovací kód**, např.: `A3B9K5`

#### Krok 4.2: Spáruj Agent

**Volba A: Automatické párování (doporučeno)**

Agent by měl automaticky detekovat kód a spárovat se. Pokud ne, přejdi na Volbu B.

**Volba B: Ruční párování**

Na Raspberry Pi:
```bash
cd ~/solar-agent

# Spusť agent s párovacím kódem
PAIRING_CODE=A3B9K5 node dist/index.js
```

Měl bys vidět:
```
[INFO] Pairing with code: A3B9K5
[INFO] Device paired successfully!
[INFO] Device ID: 12345678-1234-1234-1234-123456789abc
[INFO] Device token saved to .env
[INFO] Starting data collection...
[INFO] Pushing data to backend... (power: 3250W, battery: 85%)
```

#### Krok 4.3: Ověř na Dashboard

V prohlížeči na Dashboard by ses měl/a vidět:
- ✅ **Online** status (zelená tečka)
- ✅ **Aktuální výkon** (např. 3250 W)
- ✅ **Energie dnes** (např. 45 kWh)
- ✅ **Stav baterie** (např. 85%)
- ✅ **Grafy** se historickými daty

#### Krok 4.4: Nastav Agent jako službу (aby běžel stále)

Na Raspberry Pi:
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
StandardOutput=journal
StandardError=journal
SyslogIdentifier=solar-agent

[Install]
WantedBy=multi-user.target
```

Ulož a aktivuj:
```bash
sudo systemctl daemon-reload
sudo systemctl enable solar-agent
sudo systemctl start solar-agent

# Zkontroluj status
sudo systemctl status solar-agent
```

Logy:
```bash
# Real-time logy
sudo journalctl -u solar-agent -f

# Poslední 100 řádků
sudo journalctl -u solar-agent -n 100
```

---

### FÁZE 5: Remote Access (Přístup odkudkoli)

Teď máš funkční systém v **lokální síti**. Pro přístup z internetu:

#### Krok 5.1: Kup doménu (pokud nemáš)

Doporučené registrátory:
- **Wedos.cz** (CZ, levné)
- **Cloudflare** (rychlý DNS)
- **Namecheap** (mezinárodní)

Cena: ~100-500 Kč/rok

Zapiš si: `____________________________`

#### Krok 5.2: Nastav DNS záznamy

V administraci domény vytvoř:

```
Type    Name        Value                   TTL
A       @           123.456.789.0           300
A       www         123.456.789.0           300
CNAME   api         tvadomaina.cz          300
```

Kde `123.456.789.0` je **veřejná IP tvého VPS serveru**.

**Jak zjistit IP VPS:**
```bash
curl ifconfig.me
```

#### Krok 5.3: Nastav Nginx jako Reverse Proxy

Na VPS serveru:
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

Vytvoř config:
```bash
sudo nano /etc/nginx/sites-available/solar-portal
```

Obsah:
```nginx
server {
    listen 80;
    server_name tvadomaina.cz www.tvadomaina.cz;

    # Frontend (React build)
    location / {
        root /var/www/solar-portal/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
    }
}
```

Aktivuj:
```bash
sudo ln -s /etc/nginx/sites-available/solar-portal /etc/nginx/sites-enabled/
sudo nginx -t  # test konfigurace
sudo systemctl restart nginx
```

#### Krok 5.4: Získej SSL certifikát (HTTPS)

```bash
sudo certbot --nginx -d tvadomaina.cz -d www.tvadomaina.cz
```

Odpověz na otázky:
- Email: tvuj@email.cz
- Agree to terms: `Y`
- Share email: `N`
- Redirect HTTP to HTTPS: `2` (YES)

Certbot automaticky upraví Nginx config pro HTTPS.

Ověř:
```bash
curl https://tvadomaina.cz/health
# Mělo by vrátit: {"status":"healthy"}
```

#### Krok 5.5: Nahraj Frontend na server

**Z tvého PC:**
```bash
cd c:\Users\Honzik\Desktop\HA\frontend

# Build pro produkci
npm run build

# Upload na VPS
scp -r dist/* root@tva-vps-ip:/var/www/solar-portal/frontend/dist/
```

#### Krok 5.6: Ověř remote přístup

Otevři v prohlížeči: `https://tvadomaina.cz`

Měl/a bys vidět login stránku Solar Portal! 🎉

---

## 🔒 Zabezpečení (IMPORTANT!)

### 1. Firewall na VPS
```bash
# Povolit pouze HTTP, HTTPS, SSH
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. Home Assistant Token Security

❌ **NIKDY:**
- Nevkládej token do GitHub/GitLab
- Nesdílej token přes email/chat
- Neloguj token do souborů

✅ **VžDY:**
- Ukládej v `.env` souborech (ignorované v .gitignore)
- Používej environment variables
- Rotuj token každých 6 měsíců

### 3. Raspberry Pi Security

```bash
# Změň výchozí heslo
passwd

# Aktualizuj systém
sudo apt update && sudo apt upgrade -y

# Zakaz root SSH
sudo nano /etc/ssh/sshd_config
# Nastav: PermitRootLogin no
sudo systemctl restart sshd
```

### 4. Backend Security

V `backend/.env`:
- Silné JWT_SECRET (min 64 znaků)
- Výchozí databázové heslo **ZMĚŇ**
- CORS_ORIGIN nastav na tvou doménu (ne `*`)

---

## 📊 Testování celého systému

### Test 1: Backend Health
```bash
curl https://tvadomaina.cz/health
# Očekáváno: {"status":"healthy"}
```

### Test 2: Login
```bash
curl -X POST https://tvadomaina.cz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tvuj@email.cz","password":"tvoje-heslo"}'
# Očekáváno: JWT token v cookies
```

### Test 3: Live Data
```bash
curl https://tvadomaina.cz/api/data/current \
  -H "Cookie: token=tvuj-jwt-token"
# Očekáváno: JSON s power, energy, battery...
```

### Test 4: Agent Push (z Raspberry Pi)
```bash
sudo journalctl -u solar-agent -f
# Očekáváno: Regular logs ala "Pushing data... success"
```

---

## 🐛 Troubleshooting

### Problem: Agent nemůže poslat data na backend

**Symptomy:** Dashboard shows "Offline", agent logs show connection errors

**Řešení:**
```bash
# Na Raspberry Pi zkontroluj network
ping tvadomaina.cz

# Zkontroluj backend URL v .env
cat ~/solar-agent/.env | grep BACKEND_URL

# Test backend dostupnosti
curl https://tvadomaina.cz/health

# Zkontroluj DEVICE_TOKEN je nastaven
cat ~/solar-agent/.env | grep DEVICE_TOKEN
```

### Problem: Home Assistant nedostupný

**Symptomy:** Agent logs: "HA connection failed"

**Řešení:**
```bash
# Zkontroluj HA běží
curl http://192.168.X.X:8123

# Test API tokenu
curl -H "Authorization: Bearer tvuj-token" \
  http://192.168.X.X:8123/api/

# Pokud vrátí info o HA, token funguje
```

### Problem: Frontend shows "No data"

**Příčiny:**
1. Backend neběží → `sudo systemctl status solar-backend`
2. Agent nepárován → Zkontroluj DEVICE_TOKEN v Raspberry `.env`
3. Agent neposílá data → `sudo journalctl -u solar-agent -n 50`

### Problem: SSL certifikát error

```bash
# Obnov certifikát
sudo certbot renew

# Zkontroluj expiraci
sudo certbot certificates
```

---

## 📝 Checklist: Mám vše hotové?

Po dokončení všech kroků zkontroluj:

- [ ] Home Assistant běží a má vytvořený Long-lived Token
- [ ] Backend běží na VPS/serveru (PM2/systemd)
- [ ] PostgreSQL databáze běží a připojení funguje
- [ ] Agent běží na Raspberry Pi jako systemd service
- [ ] Agent je spárován (DEVICE_TOKEN v .env)
- [ ] DNS A záznamy ukazují na VPS IP
- [ ] Nginx reverse proxy nastavený
- [ ] SSL certifikát nainstalován (Certbot)
- [ ] Frontend nahrán na `/var/www/solar-portal/frontend/dist`
- [ ] Dashboard v prohlížeči ukazuje live data
- [ ] Status je "Online" (zelená tečka)
- [ ] Grafy zobrazují historii
- [ ] Přístup funguje z mobilní sítě (mimo domácí WiFi)

---

## 🚀 Co dál?

Po úspěšném spuštění můžeš:

1. **Přidat další senzory** - Uprav `SENSORS` v agent `.env`
2. **Nastavit alerting** - Email notifikace při offline/kritický stav
3. **Mobilní aplikace** - PWA support už v projektu
4. **Backup** - Automatický backup PostgreSQL databáze
5. **Monitoring** - Uptime monitoring (UptimeRobot, Pingdom)

---

## 📞 Potřebuješ pomoc?

**Logy ke kontrole:**

```bash
# Backend
pm2 logs solar-backend

# Agent
sudo journalctl -u solar-agent -f

# Nginx
sudo tail -f /var/log/nginx/error.log

# PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**Dokumentace:**
- [API.md](./API.md) - API endpoint reference
- [DATABASE.md](./DATABASE.md) - Database schema
- [SECURITY.md](./SECURITY.md) - Security best practices
- [AGENT.md](./AGENT.md) - Agent configuration details

---

**Vytvořeno**: 2. března 2026  
**Pro**: Home Assistant Solar Portal  
**Verze**: 0.1.0

