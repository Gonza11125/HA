# Agent Setup & Deployment

The Solar Portal Agent runs on Raspberry Pi and collects data from Home Assistant, securely sending it to the cloud backend.

## Architecture

```
┌──────────────────────────┐
│   Agent (Node.js)        │
│   - Reads HA locally     │
│   - Collects metrics     │
│   - Pushes to cloud      │
└──────────────────────────┘
         │
         │ HTTPS + Device Token
         ▼
┌──────────────────────────┐
│   Cloud Backend          │
│   - Stores data          │
│   - Serves portal        │
└──────────────────────────┘
```

## Installation

### Option 1: Docker (Recommended)

#### Prerequisites
- Docker installed on Raspberry Pi
- Home Assistant running locally

#### Steps

```bash
# Create app directory
mkdir -p ~/solar-agent
cd ~/solar-agent

# Copy Docker files
curl -O https://example.com/agent/Dockerfile
curl -O https://example.com/agent/package.json
curl -O https://example.com/agent/tsconfig.json

# Copy source directory (or clone from git)
git clone https://github.com/yourrepo/solar-portal-agent.git src

# Copy config template
cp src/config.example.json config.json

# Edit config
nano config.json
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  agent:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    environment:
      LOG_LEVEL: info
      CONFIG_PATH: /config/config.json
    volumes:
      - ./config.json:/config/config.json
    networks:
      - host  # Allows localhost:8123 access to HA
```

Then start:

```bash
docker-compose up -d
docker-compose logs -f
```

### Option 2: Node.js Direct Installation

#### Prerequisites
- Node.js 18+ on Raspberry Pi
- Home Assistant running

#### Steps

```bash
# Clone or download agent
git clone https://github.com/yourrepo/solar-portal-agent.git
cd solar-portal-agent

# Install dependencies
npm install

# Configure
cp config.example.json config.json
nano config.json

# Start in background (using pm2)
npm install -g pm2
pm2 start src/index.ts --name solar-agent
pm2 save
pm2 startup
```

## Configuration

### config.json

```json
{
  "haUrl": "http://localhost:8123",
  "haToken": "YOUR_LONG_LIVED_TOKEN",
  "cloudUrl": "https://solarportal.example.com/api",
  "pollingInterval": 30000,
  "entityMappings": [
    {
      "type": "power_now",
      "entityId": "sensor.solar_power",
      "friendlyName": "Solar Power",
      "unit": "W"
    },
    {
      "type": "energy_today",
      "entityId": "sensor.solar_energy_today",
      "friendlyName": "Energy Today",
      "unit": "kWh"
    },
    {
      "type": "battery_soc",
      "entityId": "sensor.battery_soc",
      "friendlyName": "Battery SOC",
      "unit": "%"
    }
  ]
}
```

### First Pairing

1. **Create Site in Portal**
   - Log into admin dashboard or as customer
   - Create new "Site"
   - Get pairing code (e.g., `ABC123DEF456`)
   - Code expires in 15 minutes

2. **Add Pairing Code to Agent Config**
   ```json
   {
     "pairingCode": "ABC123DEF456",
     ...
   }
   ```

3. **Start Agent**
   - Agent reads config
   - Calls `POST /api/agent/pair` with pairing code
   - Receives device token
   - Stores token locally

4. **Verify Pairing**
   - Check portal: Site shows device as "online"
   - Agent logs: "Device paired successfully"
   - Remove `pairingCode` from config.json (optional, auto-removed after use)

### Home Assistant Long-Lived Token

1. Go to Home Assistant UI (http://raspberry-ip:8123)
2. Click your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Create token: "Solar Portal Agent"
5. Copy token
6. Add to config.json: `"haToken": "eyJ0eXAiOiJKV1QiLCJhbGc..."`
7. **Keep secure** - token gives full HA access

### Entity Mappings

The agent needs to know which Home Assistant entities to read.

**Finding Entity IDs:**

1. Home Assistant → Developer Tools → States
2. Filter by your integration (e.g., "solar", "battery")
3. Use entity IDs like:
   - `sensor.solar_power` (current power in W)
   - `sensor.solar_energy_today` (daily total in kWh)
   - `sensor.battery_percentage` (SOC in %)

**Example integrations:**
- SolarEdge: `sensor.solaredge_current_power`
- Victron: `sensor.battery_soc`
- Tesla: `sensor.powerwall_percentage`
- Custom templates: Create in Home Assistant

**Supported Metric Types:**
- `power_now` - Current power (W) - *required for MVP*
- `energy_today` - Daily energy (kWh) - *required for MVP*
- `battery_soc` - Battery state of charge (%) - *required for MVP*
- `voltage` - Voltage (V)
- `current` - Current (A)
- `temperature` - Temperature (°C)

## Running & Management

### Check Status

```bash
# Docker
docker-compose ps
docker-compose logs

# pm2
pm2 status
pm2 logs solar-agent

# systemctl (if installed as service)
systemctl status solar-agent
sudo journalctl -u solar-agent -f
```

### Restart Agent

```bash
# Docker
docker-compose restart agent

# pm2
pm2 restart solar-agent

# systemctl
sudo systemctl restart solar-agent
```

### View Logs

```bash
# Last 50 lines
docker-compose logs --tail 50 agent

# Follow live
docker-compose logs -f agent

# pm2
pm2 logs --lines 100
```

### Update Configuration

**After editing config.json:**

```bash
# Docker: Restart to pick up changes
docker-compose restart agent

# pm2: Also just restart
pm2 restart solar-agent

# Then check logs
pm2 logs solar-agent
```

## Troubleshooting

### Issue: Agent Not Starting

**Check Docker logs:**
```bash
docker-compose logs agent
```

**Common errors:**
1. Config file not found
   - Ensure `config.json` exists in volume path
   
2. Invalid JSON
   - Validate: `python3 -m json.tool config.json`
   
3. Port already in use
   - Not an issue for agent (doesn't listen on port)

### Issue: Can't Connect to Home Assistant

**Test connection:**
```bash
curl http://localhost:8123/api/
```

**If fails:**
1. HA URL wrong in config
2. HA not running (check `docker ps` or `systemctl status homeassistant`)
3. Firewall blocking (agent must reach HA locally)

**Check logs:**
```
agent    | [ERROR] Failed to connect to Home Assistant
```

### Issue: Entity Not Found

**In logs:**
```
agent    | [WARN] Entity not found: sensor.solar_power
```

**Solution:**
1. Verify entity exists in HA States
2. Check exact entity ID (case-sensitive)
3. Ensure HA token has access to entity
4. Update config.json with correct ID
5. Restart agent

### Issue: Data Not Appearing in Portal

**Checklist:**
1. ✓ Agent logs show "Data pushed successfully"
2. ✓ Portal shows Site as "online"
3. ✓ HA token is valid
4. ✓ Entity IDs are correct
5. ✓ Cloud URL is correct

**Check:**
```bash
# Agent logs
docker-compose logs agent | grep "Data pushed"

# Portal logs
docker-compose logs backend | grep "agent\|push"

# Database (if accessible)
docker-compose exec postgres psql -U postgres -d solar_portal -c \
  "SELECT COUNT(*) FROM data_points WHERE created_at > NOW() - INTERVAL '10 minutes';"
```

### Issue: Agent Stops After Period of Time

**Cause:** Network timeout or out of memory

**Check:**
```bash
# Docker
docker stats

# Free memory
free -h

# Pi system health
cat /proc/cpuinfo
```

**Fixes:**
1. Increase polling interval in config.json
2. Run in Docker with memory limit
3. Check Raspberry Pi disk space
4. Update Node.js to latest

## Advanced Configuration

### Polling Interval

Reduce for more frequent updates (but more bandwidth):
```json
{
  "pollingInterval": 15000  // 15 seconds instead of 30
}
```

### Batch Uploads

Upload multiple data points at once:
```json
{
  "batchSize": 10,
  "pollingInterval": 30000,
  // = uploads every 5 minutes with batched data
}
```

### Retry Logic

Agent automatically retries failed uploads:
```json
{
  "maxRetries": 3,
  "retryDelay": 5000  // 5 seconds between retries
}
```

## Security

**Important:**
- ✓ HA token only stored on Raspberry Pi
- ✓ Device token used for cloud communication
- ✓ All traffic uses HTTPS
- ✓ Config file has restrictive permissions

```bash
# Secure config file permissions
chmod 600 config.json
```

## Autostart on Reboot

### Docker (recommended)

```bash
# Enable docker service
sudo systemctl enable docker

# Auto-start container
docker-compose up -d --restart always
```

### pm2

```bash
# Save pm2 state
pm2 save

# Enable startup
pm2 startup

# Restart after reboot
sudo systemctl enable pm2-root
```

### systemd Service

Create `/etc/systemd/system/solar-agent.service`:

```ini
[Unit]
Description=Solar Portal Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/solar-agent
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable solar-agent
sudo systemctl start solar-agent
sudo systemctl status solar-agent
```

## Updating Agent

```bash
# Stop agent
docker-compose down
# or
pm2 stop solar-agent

# Get new version
git pull
# or download updated files

# Rebuild (Docker)
docker-compose build --no-cache

# Restart
docker-compose up -d
pm2 start solar-agent

# Check
docker-compose logs -f
pm2 logs
```

---

**Last Updated**: March 1, 2026
**Version**: 0.1.0
