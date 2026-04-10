import { useMemo } from 'react'
import Header from '../components/Header'
import useDashboardStore from '../hooks/useDashboardStore'

const TEMPERATURE_ENTITY = 'sensor.shellyhtg3_e4b32332c5e8_temperature'
const HUMIDITY_ENTITY = 'sensor.shellyhtg3_e4b32332c5e8_humidity'
const BOJLER_SWITCH_ENTITY = 'switch.shellypro3_ece334ed4534_switch_0'
const HDO_SWITCH_ENTITY = 'switch.shellypro3_ece334ed4534_switch_1'
const KOTEL_SWITCH_ENTITY = 'switch.shellypro3_ece334ed4534_switch_2'

const normalizeEntityMetricKey = (entityId: string) => entityId.toLowerCase().replace(/[^a-z0-9_]/g, '_')

const toBooleanFromMetric = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return parsed > 0
}

const toNumberFromMetric = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const resolveMetric = (rawMetrics: Record<string, number | string> | undefined, candidates: string[]) => {
  if (!rawMetrics) {
    return null
  }

  for (const key of candidates) {
    if (rawMetrics[key] !== undefined) {
      return rawMetrics[key]
    }
  }

  return null
}

const StatusPill = ({ ok, text }: { ok: boolean | null; text: string }) => {
  const toneClass =
    ok === null
      ? 'bg-slate-100 text-slate-700'
      : ok
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-rose-100 text-rose-700'

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{text}</span>
}

export const AutomationPage = () => {
  const store = useDashboardStore()
  const rawData = store.currentData || {}
  const rawMetrics = rawData.rawMetrics as Record<string, number | string> | undefined

  const temperatureCandidates = [
    'room_temperature',
    'temperature',
    normalizeEntityMetricKey(TEMPERATURE_ENTITY),
    'shellyhtg3_e4b32332c5e8_temperature',
  ]

  const humidityCandidates = [
    'room_humidity',
    'humidity',
    normalizeEntityMetricKey(HUMIDITY_ENTITY),
    'shellyhtg3_e4b32332c5e8_humidity',
  ]

  const bojlerSwitchCandidates = [
    'bojler_switch',
    normalizeEntityMetricKey(BOJLER_SWITCH_ENTITY),
    'shellypro3_ece334ed4534_switch_0',
  ]

  const hdoSwitchCandidates = [
    'hdo_switch',
    normalizeEntityMetricKey(HDO_SWITCH_ENTITY),
    'shellypro3_ece334ed4534_switch_1',
  ]

  const kotelSwitchCandidates = [
    'kotel_switch',
    normalizeEntityMetricKey(KOTEL_SWITCH_ENTITY),
    'shellypro3_ece334ed4534_switch_2',
  ]

  const roomTemperature = useMemo(() => {
    const metricValue = resolveMetric(rawMetrics, temperatureCandidates)
    if (metricValue !== null) {
      return toNumberFromMetric(metricValue)
    }
    return toNumberFromMetric(rawData.temperature)
  }, [rawData.temperature, rawMetrics])

  const roomHumidity = useMemo(() => {
    const metricValue = resolveMetric(rawMetrics, humidityCandidates)
    return toNumberFromMetric(metricValue)
  }, [rawMetrics])

  const bojlerSwitchOn = useMemo(() => {
    const metricValue = resolveMetric(rawMetrics, bojlerSwitchCandidates)
    return toBooleanFromMetric(metricValue)
  }, [rawMetrics])

  const hdoSwitchOn = useMemo(() => {
    const metricValue = resolveMetric(rawMetrics, hdoSwitchCandidates)
    return toBooleanFromMetric(metricValue)
  }, [rawMetrics])

  const kotelSwitchOn = useMemo(() => {
    const metricValue = resolveMetric(rawMetrics, kotelSwitchCandidates)
    return toBooleanFromMetric(metricValue)
  }, [rawMetrics])

  const cheapTariffActive = hdoSwitchOn
  const heatingAllowedByTariff = cheapTariffActive === true

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Automatizace vytápění</h1>
          <p className="mt-1 text-slate-600">Monitoring relé a tarifního povolení vytápění ze solárů a baterie.</p>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Stav rozhodnutí</h2>
            <StatusPill
              ok={heatingAllowedByTariff}
              text={
                heatingAllowedByTariff
                  ? 'Tarif povoluje vytápění'
                  : heatingAllowedByTariff === false
                    ? 'Tarif nepovoluje vytápění'
                    : 'Tarif zatím není dostupný'
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Teplota místnosti</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {roomTemperature === null ? 'N/A' : `${roomTemperature.toFixed(1)} °C`}
              </p>
              <p className="mt-2 text-xs text-slate-500">{TEMPERATURE_ENTITY}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Vlhkost místnosti</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {roomHumidity === null ? 'N/A' : `${roomHumidity.toFixed(1)} %`}
              </p>
              <p className="mt-2 text-xs text-slate-500">{HUMIDITY_ENTITY}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Připojení portálu</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{store.isOnline ? 'Online' : 'Offline'}</p>
              <p className="mt-2 text-xs text-slate-500">Aktualizace každých 5 s</p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Stavy relé</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Bojler relé</p>
                <p className="text-xs text-slate-500">{BOJLER_SWITCH_ENTITY}</p>
              </div>
              <StatusPill
                ok={bojlerSwitchOn}
                text={bojlerSwitchOn === null ? 'Neznámý stav' : bojlerSwitchOn ? 'SEPNUTO' : 'VYPNUTO'}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">HDO relé (levná sazba)</p>
                <p className="text-xs text-slate-500">{HDO_SWITCH_ENTITY}</p>
              </div>
              <StatusPill
                ok={hdoSwitchOn}
                text={hdoSwitchOn === null ? 'Neznámý stav' : hdoSwitchOn ? 'LEVNÁ ELEKTŘINA' : 'DRAHÁ ELEKTŘINA'}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Kotel relé</p>
                <p className="text-xs text-slate-500">{KOTEL_SWITCH_ENTITY}</p>
              </div>
              <StatusPill
                ok={kotelSwitchOn}
                text={kotelSwitchOn === null ? 'Neznámý stav' : kotelSwitchOn ? 'KOTEL TOPÍ' : 'KOTEL STOJÍ'}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-900">Poznámka k logice</h2>
          <p className="mt-2 text-sm text-amber-900">
            Tarifní logika levná/drahá elektřina je řízena v Home Assistantu. Tato záložka ji pouze bezpečně zobrazuje a
            nezasahuje do existující automatizace teploty.
          </p>
        </section>
      </main>
    </div>
  )
}

export default AutomationPage
