#!/usr/bin/env node
/**
 * Interactive setup script for Solar Portal Agent
 * Automatically discovers sensors and creates configuration
 */

import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'
import { discoverSensors, formatDiscoveryResults, getRecommendedSensorIds, DiscoveryResult } from './sensor-discovery'
import { Logger } from './logger'

const logger = new Logger()

interface SetupConfig {
  haUrl: string
  haToken: string
  haIntegrationId: string
  backendUrl: string
  sensors: string[]
  pollInterval: number
}

/**
 * Create readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

/**
 * Ask a question and wait for answer
 */
function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim())
    })
  })
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Main setup flow
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║        🌞 Solar Portal Agent - Setup Wizard 🌞            ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const rl = createInterface()
  const config: Partial<SetupConfig> = {}

  try {
    // Step 1: Home Assistant URL
    console.log('📡 STEP 1/5: Home Assistant Connection\n')
    
    let haUrl = await question(rl, 'Enter your Home Assistant URL (e.g., http://192.168.1.100:8123): ')
    
    // Remove trailing slash
    haUrl = haUrl.replace(/\/$/, '')
    
    // Remove /lovelace paths if user copied full URL
    haUrl = haUrl.replace(/\/lovelace.*$/, '')
    
    while (!isValidUrl(haUrl)) {
      console.log('❌ Invalid URL format. Please try again.')
      haUrl = await question(rl, 'Home Assistant URL: ')
      haUrl = haUrl.replace(/\/$/, '')
    }
    
    config.haUrl = haUrl
    console.log(`✅ URL: ${haUrl}\n`)

    // Step 2: Home Assistant Token
    console.log('🔑 STEP 2/5: Authentication\n')
    console.log('You need a Long-lived Access Token from Home Assistant:')
    console.log('  1. Open Home Assistant')
    console.log('  2. Click your name (bottom left)')
    console.log('  3. Go to Security tab')
    console.log('  4. Create Long-lived Access Token\n')
    
    const haToken = await question(rl, 'Paste your Home Assistant token: ')
    
    if (!haToken || haToken.length < 50) {
      throw new Error('Invalid token. Token should be a long string.')
    }
    
    config.haToken = haToken
    console.log('✅ Token saved\n')

    // Step 3: Test connection and discover sensors
    console.log('🔍 STEP 3/5: Discovering Sensors\n')
    console.log('Scanning your Home Assistant for solar/battery sensors...\n')

    let discovery: DiscoveryResult
    try {
      discovery = await discoverSensors(config.haUrl!, config.haToken!)
    } catch (error: any) {
      console.error(`❌ Discovery failed: ${error.message}`)
      throw error
    }

    // Show discovered sensors
    console.log(formatDiscoveryResults(discovery))

    // Get recommended sensors
    const recommendedSensors = getRecommendedSensorIds(discovery)
    
    if (recommendedSensors.length === 0) {
      console.log('⚠️  No solar/battery sensors found automatically.')
      console.log('You can add them manually later in config.json\n')
      config.sensors = []
    } else {
      console.log('💡 RECOMMENDED SENSORS:\n')
      recommendedSensors.forEach((sensor, i) => {
        console.log(`  ${i + 1}. ${sensor}`)
      })
      console.log()
      
      const useRecommended = await question(rl, 'Use these recommended sensors? (Y/n): ')
      
      if (useRecommended.toLowerCase() === 'n') {
        console.log('\nEnter sensor entity IDs (comma-separated):')
        const manualSensors = await question(rl, '> ')
        config.sensors = manualSensors.split(',').map(s => s.trim()).filter(s => s)
      } else {
        config.sensors = recommendedSensors
        console.log('✅ Using recommended sensors\n')
      }
    }

    // Step 4: Backend URL
    console.log('🌐 STEP 4/5: Backend Connection\n')
    console.log('Enter the public URL of your Solar Portal backend or reverse proxy:')
    console.log('  - Recommended production setup: https://yourdomain.com')
    console.log('  - Local network testing: http://192.168.1.50:5000')
    console.log('  - Local development only: http://localhost:5000\n')
    
    let backendUrl = await question(rl, 'Backend URL: ')
    backendUrl = backendUrl.replace(/\/$/, '')
    
    while (!isValidUrl(backendUrl)) {
      console.log('❌ Invalid URL format. Please try again.')
      backendUrl = await question(rl, 'Backend URL: ')
      backendUrl = backendUrl.replace(/\/$/, '')
    }
    
    config.backendUrl = backendUrl
    console.log(`✅ Backend: ${backendUrl}\n`)

    // Step 5: Integration ID
    console.log('🔗 STEP 5/5: Integration ID\n')
    
    const integrationId = await question(rl, 'Enter your Home Assistant Integration ID: ')
    
    config.haIntegrationId = integrationId
    console.log('✅ Integration ID saved\n')

    // Polling interval
    config.pollInterval = 5 // Default 5 seconds

    // Step 6: Save configuration
    console.log('💾 Saving Configuration...\n')

    const configObj = {
      haUrl: config.haUrl,
      haToken: config.haToken,
      haIntegrationId: config.haIntegrationId,
      backendUrl: config.backendUrl,
      sensors: config.sensors,
      pollInterval: config.pollInterval,
      pairingCode: '',
      deviceToken: '',
      deviceId: '',
    }

    const configPath = path.join(process.cwd(), 'config.json')
    fs.writeFileSync(configPath, JSON.stringify(configObj, null, 2), 'utf-8')

    console.log(`✅ Configuration saved to: ${configPath}\n`)

    // Step 7: Next steps
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                    ✅ SETUP COMPLETE!                      ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')
    
    console.log('📋 NEXT STEPS:\n')
    console.log('1. Open your Solar Portal dashboard')
    console.log('2. Go to "Pair Device" and get the pairing code')
    console.log('3. Run the agent with pairing:\n')
    console.log('   PAIRING_CODE=ABC123 node dist/index.js')
    console.log('\n   Or add pairing code to config.json and run:')
    console.log('   node dist/index.js\n')
    console.log('4. After pairing, the agent will start automatically!\n')

    if (config.sensors && config.sensors.length > 0) {
      console.log('📊 MONITORING THESE SENSORS:\n')
      config.sensors.forEach(sensor => {
        console.log(`  • ${sensor}`)
      })
      console.log()
    }

    console.log('Happy monitoring! ☀️\n')

  } catch (error: any) {
    console.error(`\n❌ Setup failed: ${error.message}\n`)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Run setup
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { main as runSetup }
