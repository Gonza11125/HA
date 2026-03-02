const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

type LogLevel = keyof typeof LOG_LEVELS

export class Logger {
  private level: LogLevel

  constructor(level: LogLevel = 'info') {
    const envLevel = process.env.LOG_LEVEL as LogLevel
    this.level = envLevel || level
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const dataStr = data ? ' ' + JSON.stringify(data) : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`
  }

  debug(message: string, data?: any): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
      console.log(this.formatMessage('debug', message, data))
    }
  }

  info(message: string, data?: any): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
      console.log(this.formatMessage('info', message, data))
    }
  }

  warn(message: string, data?: any): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
      console.warn(this.formatMessage('warn', message, data))
    }
  }

  error(message: string, error?: any): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
      console.error(this.formatMessage('error', message, error))
    }
  }
}
