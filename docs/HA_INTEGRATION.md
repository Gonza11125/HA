# Home Assistant Integration Guide

## Architecture Overview

The Solar Portal is designed to securely fetch data from Home Assistant through a Raspberry Pi agent. Here's how the data flows:

```
Home Assistant (Local Network)
    ↓ (HTTP API, local HA token)
Raspberry Pi Agent (Local)
    ↓ (HTTPS, device token)
Cloud Backend (Express.js)
    ↓ (JSON API)
Web Frontend (React)
    ↓
User Dashboard
```

## Key Security Features

- **HA Tokens Stay Local**: Home Assistant tokens are ONLY stored on the Raspberry Pi, never in the cloud
- **Device Pairing**: Each installation gets a unique device token for authentication
- **Encrypted Connection**: Agent communicates with backend over HTTPS
- **No Token Exposure**: Frontend never sees raw HA tokens

## Setup Process

### Step 1: Install Agent on Raspberry Pi

1. Clone the repository on your Raspberry Pi:
   ```bash
   git clone <repo-url>
   cd agent
   npm install
   ```

2. Configure the agent (`agent/config.json`):
   ```json
   {
     "haUrl": "http://192.168.1.100:8123",
     "haToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "cloudUrl": "https://your-domain.com",
     "entityMappings": [
       {
         "entityId": "sensor.solar_power",
         "type": "power"
       }
     ],
     "pollingInterval": 5000
   }
   ```

3. Generate pairing code on the agent:
   ```bash
   npm run generate-pairing-code
   ```

### Step 2: Pair Device in Web Portal

1. Log in to the Solar Portal
2. Go to Dashboard → "Connect Your Solar Installation"
3. Enter the pairing code from Step 1
4. Click "Pair Device Now"
5. The device will authenticate and begin sending data

### Step 3: Verify Connection

Once paired, you should see:
- ✅ Green "Connected to Home Assistant" indicator
- 📊 Real-time data appearing in metrics cards
- 📈 Charts updating every 5 seconds

## Data Models

### SolarData Interface

Represents real-time data from Home Assistant:

```typescript
interface SolarData {
  timestamp: string           // ISO 8601 timestamp
  power: number              // Current power generation (W)
  energy: number             // Daily energy production (kWh)
  battery: number            // Battery level (%)
  inverterStatus: 'online' | 'offline'
  lastUpdate: string         // When data was last fetched from HA
}
```

### DeviceStatus Interface

Represents the pairing status:

```typescript
interface DeviceStatus {
  isPaired: boolean
  deviceId?: string
  haUrl?: string             // Home Assistant URL (obfuscated)
  lastDataSync?: string      // Last successful data fetch
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}
```

## Available Data Sources from Home Assistant

The agent can fetch data from any Home Assistant entity. Common solar entities:

```
sensor.solax_power_input_1      → Current power from inverter (W)
sensor.solax_energy_total       → Total energy produced (kWh)
sensor.battery_level            → Battery state of charge (%)
sensor.inverter_status          → Online/Offline status
sensor.solar_voltage            → PV voltage (V)
sensor.solar_current            → PV current (A)
sensor.inverter_temperature     → Inverter temperature (°C)
sensor.power_factor             → Quality of power (0-1)
```

You can configure which entities to track in `agent/config.json`.

## Backend API Endpoints

Once the agent is paired, the frontend can use these endpoints:

### Device Management

```typescript
// Pair a new device
POST /api/agent/pair
Body: { pairingCode: "ABC123DEF456" }
Response: { deviceId, deviceToken, pairedAt }

// Get device status
GET /api/agent/status
Response: { isPaired, deviceId, connectionStatus, lastSyncAt }

// Unpair device
POST /api/agent/unpair
Response: { message: "Device unpaired" }
```

### Data Fetching

```typescript
// Get current real-time data
GET /api/data/current
Response: SolarData

// Get historical data
GET /api/data/history?hours=24
Response: SolarData[]

// Get data for specific time range
GET /api/data/range?from=2026-03-01T00:00:00&to=2026-03-31T23:59:59
Response: SolarData[]
```

## Frontend Integration

### Using the Device Service

```typescript
import { deviceService, solarDataService } from '@/services/deviceService'

// Pair a device
const response = await deviceService.pairDevice('ABC123DEF456')

// Get current status
const status = await deviceService.getDeviceStatus()

// Fetch current data
const data = await solarDataService.getCurrentData()

// Setup real-time polling
const pollId = solarDataService.setupPolling((data) => {
  // Update UI with new data
  setChartData(prev => [...prev, data])
}, 5000)

// Stop polling when component unmounts
solarDataService.stopPolling(pollId)
```

### Example Dashboard Hook

```typescript
const [solarData, setSolarData] = useState<SolarData | null>(null)
const [isConnected, setIsConnected] = useState(false)

useEffect(() => {
  const checkConnection = async () => {
    const status = await deviceService.getDeviceStatus()
    setIsConnected(status.isPaired)
  }
  
  checkConnection()
  
  if (isConnected) {
    const pollId = solarDataService.setupPolling(setSolarData)
    return () => solarDataService.stopPolling(pollId)
  }
}, [isConnected])
```

## Troubleshooting

### Agent Can't Connect to Home Assistant
- Check HA URL is correct and accessible on local network
- Verify the HA token is valid
- Ensure no firewall blocking the connection

### Pairing Code Not Working
- Generate a fresh pairing code on the Raspberry Pi
- Make sure to enter the code within 5 minutes
- Check that the agent is running: `npm run dev`

### No Data Showing in Dashboard
- Verify device shows "Connected" status
- Check that Home Assistant entities are configured correctly
- Look at agent logs for errors: `npm run dev`
- Confirm entities exist in HA: Settings → Devices & Services → Entities

### Connection Drops Frequently
- Check network stability between Raspberry Pi and Cloud
- Verify internet bandwidth is sufficient
- Check agent logs for timeout errors
- Increase polling timeout if network is slow

## Future Enhancements

- [ ] Multiple site support (single user, multiple installations)
- [ ] Automatic entity discovery from Home Assistant
- [ ] Data export to CSV/JSON
- [ ] Predictive analytics (ML-based forecasting)
- [ ] Mobile app notifications
- [ ] Integration with energy billing systems

## Security Considerations

- **Token Rotation**: Implement automatic token refresh
- **Rate Limiting**: Backend limits polling to prevent abuse
- **Data Encryption**: All data in transit is HTTPS encrypted
- **Access Control**: Only authenticated users can see their data
- **Audit Logging**: All API calls are logged for security

## Support

For issues or questions:
1. Check this guide thoroughly
2. Review agent logs for error messages
3. Check Home Assistant documentation
4. Open an issue on GitHub

---

**Last Updated**: March 2, 2026
**Version**: 0.1.0
