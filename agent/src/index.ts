import dotenv from 'dotenv'
import { DataCollector } from './data-collector'
import { Logger } from './logger'

dotenv.config()

const logger = new Logger()

async function main() {
  try {
    logger.info('Solar Portal Agent starting...')

    // Get config file path
    const configPath = process.env.CONFIG_PATH || './config.json'
    logger.info(`Using config file: ${configPath}`)

    // Initialize data collector
    const collector = new DataCollector(configPath)

    // Check pairing
    const config = collector.getConfig()
    if (!config.deviceToken) {
      if (config.pairingCode) {
        logger.info('Device not paired yet. Attempting pairing with provided code...')
        const paired = await collector.pair(config.pairingCode)
        if (!paired) {
          logger.error('Pairing failed')
          process.exit(1)
        }
      } else {
        logger.error('Device not paired. Please provide a pairing code in config.json')
        logger.info('Example: { "pairingCode": "YOUR-PAIRING-CODE" }')
        process.exit(1)
      }
    }

    // Test HA connection
    const haConnected = await collector.testHAConnection()
    if (!haConnected) {
      logger.error('Cannot connect to Home Assistant. Check configuration and ensure HA is running.')
      process.exit(1)
    }

    // Start data collection
    logger.info('Starting data collection...')
    await collector.startPolling()

    logger.info('Agent is running. Press Ctrl+C to stop.')

  } catch (error) {
    logger.error('Fatal error:', error)
    process.exit(1)
  }
}

main()
