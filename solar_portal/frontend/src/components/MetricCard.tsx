interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  icon: string
  trend?: number
  trendText?: string
  trendEpsilon?: number
  subtitle?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  onClick?: () => void
}

export const MetricCard = ({
  title,
  value,
  unit = '',
  icon,
  trend,
  trendText,
  trendEpsilon = 0.01,
  subtitle,
  onClick,
  color = 'blue'
}: MetricCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    purple: 'bg-purple-50 border-purple-200'
  }

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600'
  }

  const trendState =
    trend === undefined
      ? null
      : Math.abs(trend) <= trendEpsilon
        ? 'flat'
        : trend > 0
          ? 'up'
          : 'down'

  const trendMeta = {
    up: { symbol: '↑', className: 'text-emerald-600' },
    down: { symbol: '↓', className: 'text-rose-600' },
    flat: { symbol: '—', className: 'text-amber-600' },
  } as const

  const defaultTrendText =
    trend === undefined
      ? ''
      : trendState === 'flat'
        ? 'Stagnuje oproti minulemu bodu'
        : `${Math.abs(trend).toFixed(2)} oproti minulemu bodu`

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${colorClasses[color]} w-full border rounded-xl p-6 text-left shadow-sm transition-shadow ${
        onClick ? 'hover:shadow-md' : 'cursor-default'
      }`}
      disabled={!onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-gray-600 text-sm">{unit}</span>}
          </div>
          {subtitle && <p className="mt-2 text-xs text-gray-500">{subtitle}</p>}
          {trend !== undefined && trendState && (
            <p className={`text-sm mt-2 ${trendMeta[trendState].className}`}>
              {trendMeta[trendState].symbol} {trendText || defaultTrendText}
            </p>
          )}
        </div>
        <span className={`text-4xl ${iconColorClasses[color]}`}>{icon}</span>
      </div>
    </button>
  )
}

export default MetricCard
