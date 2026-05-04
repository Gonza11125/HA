import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import useHAAutomationStore, { HAFilter } from '../hooks/useHAAutomationStore'
import { HAEntityView } from '../services/haService'

const FILTERS: Array<{ key: HAFilter; label: string }> = [
  { key: 'all', label: 'Vše' },
  { key: 'active', label: 'Aktivní' },
  { key: 'inactive', label: 'Neaktivní' },
  { key: 'error', label: 'Chyba' },
]

const ACTIVE_STATES = new Set(['on', 'home', 'heat', 'cool', 'running', 'triggered'])
const INACTIVE_STATES = new Set(['off', 'idle', 'unavailable'])

const AUTOMATION_ON_STATES = new Set(['on'])
const AUTOMATION_OFF_STATES = new Set(['off'])

const formatRelativeDate = (isoDate?: string) => {
  if (!isoDate) {
    return 'N/A'
  }

  const value = new Date(isoDate)
  if (Number.isNaN(value.getTime())) {
    return 'N/A'
  }

  return value.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toDate = (value?: string) => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

const formatLastTriggered = (isoDate?: string) => {
  const value = toDate(isoDate)
  if (!value) {
    return 'Nikdy'
  }

  const diffMs = Date.now() - value.getTime()
  if (diffMs < 0) {
    return formatRelativeDate(value.toISOString())
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 1) {
    return 'právě teď'
  }

  if (diffMinutes < 60) {
    return `před ${diffMinutes} ${formatCzechMinutes(diffMinutes)}`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `před ${diffHours} ${formatCzechHours(diffHours)}`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `před ${diffDays} dny`
  }

  return formatRelativeDate(value.toISOString())
}

const getAutomationEnabledStateLabel = (entity: HAEntityView) => {
  if (entity.domain !== 'automation') {
    return entity.state
  }

  const normalized = entity.state.toLowerCase()
  if (AUTOMATION_ON_STATES.has(normalized)) {
    return 'Zapnuto'
  }

  if (AUTOMATION_OFF_STATES.has(normalized)) {
    return 'Vypnuto'
  }

  return entity.state
}

const getAutomationLastTriggeredValue = (entity: HAEntityView) => {
  if (entity.domain !== 'automation') {
    return null
  }

  const raw = entity.attributes.last_triggered
  if (typeof raw !== 'string') {
    return null
  }

  return raw
}

const formatCzechMinutes = (value: number) => {
  if (value === 1) {
    return 'minutou'
  }

  if (value >= 2 && value <= 4) {
    return 'minutami'
  }

  return 'minutami'
}

const formatCzechHours = (value: number) => {
  if (value === 1) {
    return 'hodinou'
  }

  if (value >= 2 && value <= 4) {
    return 'hodinami'
  }

  return 'hodinami'
}

const getLastTriggeredDisplay = (entity: HAEntityView) => {
  const explicitLastTriggered = getAutomationLastTriggeredValue(entity)
  if (explicitLastTriggered) {
    return formatLastTriggered(explicitLastTriggered)
  }

  return formatLastTriggered(entity.lastChanged)
}

const getAutomationCurrentRuns = (entity: HAEntityView) => {
  const raw = entity.attributes.current
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 0
  }

  return raw
}

const isAutomationCurrentlyActive = (entity: HAEntityView) => {
  if (entity.domain !== 'automation') {
    return false
  }

  const state = entity.state.toLowerCase()
  if (state === 'triggered' || state === 'running') {
    return true
  }

  return getAutomationCurrentRuns(entity) > 0
}

const getEntityStateBadgeClass = (entity: HAEntityView) => {
  if (entity.domain === 'automation') {
    return isAutomationCurrentlyActive(entity) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
  }

  const normalized = entity.state.toLowerCase()
  if (ACTIVE_STATES.has(normalized)) {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (INACTIVE_STATES.has(normalized)) {
    return 'bg-slate-200 text-slate-700'
  }

  if (normalized === 'error' || normalized === 'failed') {
    return 'bg-rose-100 text-rose-700'
  }

  return 'bg-amber-100 text-amber-800'
}

const getEntityStateLabel = (entity: HAEntityView) => {
  if (entity.domain === 'automation') {
    return isAutomationCurrentlyActive(entity) ? 'Aktivní' : 'Neaktivní'
  }

  return entity.state
}

const matchesFilter = (entity: HAEntityView, filter: HAFilter) => {
  if (filter === 'all') {
    return true
  }

  const state = entity.state.toLowerCase()
  if (filter === 'active') {
    if (entity.domain === 'automation') {
      return isAutomationCurrentlyActive(entity)
    }

    return ACTIVE_STATES.has(state)
  }

  if (filter === 'inactive') {
    if (entity.domain === 'automation') {
      return !isAutomationCurrentlyActive(entity)
    }

    return INACTIVE_STATES.has(state)
  }

  return state === 'error' || state === 'failed'
}

const ActionButton = ({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {label}
  </button>
)

export const AutomationPage = () => {
  const { entities, isLoading, errors, commandStatuses, isActionLoading, lastRefresh, refresh, executeAction } = useHAAutomationStore()
  const [activeFilter, setActiveFilter] = useState<HAFilter>('all')
  const [climateSetpoints, setClimateSetpoints] = useState<Record<string, string>>({})

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => {
      void refresh()
    }, 10000)

    return () => clearInterval(interval)
  }, [refresh])

  const filteredEntities = useMemo(() => entities.filter((entity) => matchesFilter(entity, activeFilter)), [entities, activeFilter])

  const groupedByDomain = useMemo(() => {
    return filteredEntities.reduce<Record<string, HAEntityView[]>>((acc, entity) => {
      if (!acc[entity.domain]) {
        acc[entity.domain] = []
      }
      acc[entity.domain].push(entity)
      return acc
    }, {})
  }, [filteredEntities])

  const renderEntityActions = (entity: HAEntityView) => {
    const loading = Boolean(isActionLoading[entity.entityId])

    if (entity.domain === 'climate') {
      const value = climateSetpoints[entity.entityId] || ''

      return (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={10}
            max={35}
            step={0.5}
            value={value}
            onChange={(event) => setClimateSetpoints((prev) => ({ ...prev, [entity.entityId]: event.target.value }))}
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800"
            placeholder="°C"
          />
          <ActionButton
            label="Nastavit teplotu"
            disabled={loading || !value}
            onClick={() => {
              const parsed = Number(value)
              if (!Number.isFinite(parsed)) {
                return
              }

              void executeAction(entity, 'set_temperature', { temperature: parsed })
            }}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        {entity.availableActions.map((action) => (
          <ActionButton
            key={`${entity.entityId}:${action}`}
            label={action}
            disabled={loading}
            onClick={() => {
              void executeAction(entity, action)
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Home Assistant Automatizace</h1>
          <p className="mt-1 text-slate-600">Přehled a ovládání automatizací, scén, skriptů, klimatizace a switchů.</p>
        </div>

        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    activeFilter === filter.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500">Poslední aktualizace: {formatRelativeDate(lastRefresh || undefined)}</div>
          </div>
        </section>

        {errors && (
          <section className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {errors}
          </section>
        )}

        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Načítám entity...</section>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedByDomain).map(([domain, domainEntities]) => (
              <section key={domain} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold capitalize text-slate-900">{domain}</h2>
                <div className="mt-4 space-y-3">
                  {domainEntities.map((entity) => (
                    <article key={entity.entityId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{entity.friendlyName}</p>
                          <p className="text-xs text-slate-500">{entity.entityId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getEntityStateBadgeClass(entity)}`}>
                            {getEntityStateLabel(entity)}
                          </span>
                          {commandStatuses[entity.entityId] && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              {commandStatuses[entity.entityId]}
                            </span>
                          )}
                        </div>
                      </div>

                      {entity.domain === 'automation' ? (
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          <p>Povolení: {getAutomationEnabledStateLabel(entity)}</p>
                          <p>Naposledy spuštěno: {getLastTriggeredDisplay(entity)}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Poslední změna: {formatRelativeDate(entity.lastChanged)}</p>
                      )}

                      <div className="mt-3">{renderEntityActions(entity)}</div>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {filteredEntities.length === 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                Pro zvolený filtr nejsou dostupné žádné entity.
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default AutomationPage
