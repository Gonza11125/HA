import { useCallback, useMemo, useState } from 'react'
import haService, { HACommandStatus, HAEntityDomain, HAEntityView } from '../services/haService'

const SUPPORTED_DOMAINS: HAEntityDomain[] = ['automation', 'climate', 'scene', 'script', 'switch']
const DEFAULT_DEVICE_ID = 'demo-device'

export type HAFilter = 'all' | 'active' | 'inactive' | 'error'

export function useHAAutomationStore() {
  const [entities, setEntities] = useState<HAEntityView[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isActionLoading, setIsActionLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [commandStatuses, setCommandStatuses] = useState<Record<string, HACommandStatus>>({})

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await haService.getEntities(SUPPORTED_DOMAINS)
      setEntities(result)
      setErrors(null)
      setLastRefresh(new Date().toISOString())
    } catch (error) {
      setErrors('Nepodařilo se načíst Home Assistant entity.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const executeAction = useCallback(
    async (entity: HAEntityView, action: string, payload?: Record<string, unknown>) => {
      setIsActionLoading((prev) => ({ ...prev, [entity.entityId]: true }))

      try {
        const command = await haService.createCommand({
          deviceId: DEFAULT_DEVICE_ID,
          entityId: entity.entityId,
          action,
          payload,
        })

        setCommandStatuses((prev) => ({ ...prev, [entity.entityId]: command.status }))

        let status: HACommandStatus = command.status
        let pollAttempts = 0
        while ((status === 'pending' || status === 'running') && pollAttempts < 8) {
          pollAttempts += 1
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const updated = await haService.getCommand(command.id)
          status = updated.status
          setCommandStatuses((prev) => ({ ...prev, [entity.entityId]: status }))
        }

        await refresh()
      } catch (error) {
        setErrors('Příkaz se nepodařilo odeslat nebo dokončit.')
      } finally {
        setIsActionLoading((prev) => ({ ...prev, [entity.entityId]: false }))
      }
    },
    [refresh],
  )

  const byDomain = useMemo(() => {
    const grouped: Record<HAEntityDomain, HAEntityView[]> = {
      automation: [],
      climate: [],
      scene: [],
      script: [],
      switch: [],
    }

    entities.forEach((entity) => {
      grouped[entity.domain].push(entity)
    })

    return grouped
  }, [entities])

  return {
    entities,
    byDomain,
    isLoading,
    isActionLoading,
    commandStatuses,
    errors,
    lastRefresh,
    refresh,
    executeAction,
  }
}

export default useHAAutomationStore