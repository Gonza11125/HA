#!/bin/bash
set -e

echo "[INFO] ========================================="
echo "[INFO] Solar Portal Add-on Starting..."
echo "[INFO] ========================================="

# Initialize and start PostgreSQL
echo "[INFO] Initializing PostgreSQL database..."
mkdir -p /data/postgres
chown postgres:postgres /data/postgres

# Initialize database if not exists
if [ ! -d "/data/postgres/base" ]; then
    su postgres -c "initdb -D /data/postgres"
    echo "[INFO] PostgreSQL initialized"
fi

# Start PostgreSQL
su postgres -c "postgres -D /data/postgres" &
POSTGRES_PID=$!
echo "[INFO] PostgreSQL started with PID $POSTGRES_PID"

# Wait for PostgreSQL to be ready
echo "[INFO] Waiting for PostgreSQL to be ready..."
sleep 5

# Create database if not exists
su postgres -c "psql -lqt" | cut -d \| -f 1 | grep -qw solar_portal || su postgres -c "createdb solar_portal"
echo "[INFO] Database 'solar_portal' ready"

# Build agent config from Home Assistant add-on options
echo "[INFO] Building agent configuration from add-on options..."
AGENT_CONFIG_PATH="/data/agent-config.json"

node <<'NODE'
const fs = require('fs')

const optionsPath = '/data/options.json'
const outputPath = '/data/agent-config.json'

const defaults = {
    ha_url: 'http://homeassistant.local:8123',
    polling_interval: 5000,
    ha_automations: '[]',
    entity_power_now: 'sensor.solax_inverter_output_power',
    entity_energy_today: 'sensor.solax_inverter_energy_today',
    entity_battery_soc: 'sensor.solax_inverter_battery_capacity',
    entity_battery_voltage: 'sensor.solax_inverter_battery_voltage_charge',
    entity_grid_import: '',
    entity_grid_export: '',
    entity_solar_production: ''
}

let options = {}
let existingConfig = {}

if (fs.existsSync(optionsPath)) {
    try {
        options = JSON.parse(fs.readFileSync(optionsPath, 'utf-8'))
    } catch (error) {
        console.error('[WARN] Failed to parse /data/options.json:', error.message)
    }
}

if (fs.existsSync(outputPath)) {
    try {
        existingConfig = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
    } catch (error) {
        console.error('[WARN] Failed to parse existing agent config:', error.message)
    }
}

const haUrl = String(options.ha_url || defaults.ha_url).replace(/\/+$/, '')
const haToken = String(options.ha_token || '').trim()
const pairingCodeRaw = String(options.pairing_code || '').trim()
const pollingInterval = Number(options.polling_interval || defaults.polling_interval)
const rawHaAutomations = typeof options.ha_automations === 'string' ? options.ha_automations : defaults.ha_automations

const parseAutomationDefinitions = (raw) => {
    try {
        const parsed = JSON.parse(raw)
        const list = Array.isArray(parsed) ? parsed : [parsed]

        return list
            .filter((item) => typeof item === 'object' && item !== null)
            .map((item, index) => {
                const mode = item.mode === 'manual' ? 'manual' : 'auto'
                return {
                    id: String(item.id || `ha-auto-${index + 1}`),
                    name: String(item.name || item.alias || `HA automatizace ${index + 1}`),
                    enabled: Boolean(item.enabled ?? false),
                    mode,
                    source: 'HA settings',
                    lastRun: String(item.lastRun || 'N/A')
                }
            })
    } catch (error) {
        console.error('[WARN] Failed to parse ha_automations JSON from add-on options:', error.message)
        return []
    }
}

const haAutomations = parseAutomationDefinitions(rawHaAutomations)

const entityMappings = [
    { type: 'power_now', entityId: String(options.entity_power_now || defaults.entity_power_now), friendlyName: 'Power Now', unit: 'W' },
    { type: 'energy_today', entityId: String(options.entity_energy_today || defaults.entity_energy_today), friendlyName: 'Energy Today', unit: 'kWh' },
    { type: 'battery_soc', entityId: String(options.entity_battery_soc || defaults.entity_battery_soc), friendlyName: 'Battery SOC', unit: '%' }
]

const batteryVoltage = String(options.entity_battery_voltage || defaults.entity_battery_voltage).trim()
if (batteryVoltage) {
    entityMappings.push({ type: 'battery_voltage', entityId: batteryVoltage, friendlyName: 'Battery Voltage', unit: 'V' })
}

const gridImport = String(options.entity_grid_import || defaults.entity_grid_import).trim()
if (gridImport) {
    entityMappings.push({ type: 'grid_import', entityId: gridImport, friendlyName: 'Grid Import', unit: 'kWh' })
}

const gridExport = String(options.entity_grid_export || defaults.entity_grid_export).trim()
if (gridExport) {
    entityMappings.push({ type: 'grid_export', entityId: gridExport, friendlyName: 'Grid Export', unit: 'kWh' })
}

const solarProduction = String(options.entity_solar_production || defaults.entity_solar_production).trim()
if (solarProduction) {
    entityMappings.push({ type: 'solar_production', entityId: solarProduction, friendlyName: 'Solar Production', unit: 'kWh' })
}

const config = {
    ...existingConfig,
    haUrl,
    haToken,
    cloudUrl: 'http://localhost:5000/api',
    pollingInterval,
    haAutomations,
    entityMappings
}

if (pairingCodeRaw) {
    config.pairingCode = pairingCodeRaw
} else if (existingConfig.pairingCode) {
    config.pairingCode = existingConfig.pairingCode
}

if (!haToken) {
    console.error('[WARN] Home Assistant token is empty. Set ha_token in add-on Configuration tab.')
}

fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8')
console.log('[INFO] Agent config written to /data/agent-config.json')
NODE

# Start backend
cd /app/backend
echo "[INFO] Starting backend on port 5000..."
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_NAME=solar_portal NODE_ENV=production PORT=5000 npm start &
BACKEND_PID=$!
echo "[INFO] Backend started with PID $BACKEND_PID"

# Give backend time to start
sleep 3

# Start frontend
cd /app/frontend
echo "[INFO] Starting frontend on port 3000..."
serve -s dist -l 3000 &
FRONTEND_PID=$!
echo "[INFO] Frontend started with PID $FRONTEND_PID"

# Give frontend time to start
sleep 2

# Start agent (data collector)
cd /app/agent
echo "[INFO] Starting agent (data collector)..."
CONFIG_PATH="$AGENT_CONFIG_PATH" node dist/index.js &
AGENT_PID=$!
echo "[INFO] Agent started with PID $AGENT_PID"

echo "[INFO] ========================================="
echo "[INFO] Solar Portal is running!"
echo "[INFO] Frontend: http://YOUR_IP:3000"
echo "[INFO] Backend:  http://YOUR_IP:5000"
echo "[INFO] Agent:    Collecting data from Home Assistant"
echo "[INFO] ========================================="

# Wait for all processes
wait $POSTGRES_PID $BACKEND_PID $FRONTEND_PID $AGENT_PID
