interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  icon: string
  trend?: number
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

export const MetricCard = ({
  title,
  value,
  unit = '',
  icon,
  trend,
  color = 'blue'
}: MetricCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200'
  }

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600'
  }

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-gray-600 text-sm">{unit}</span>}
          </div>
          {trend !== undefined && (
            <p className={`text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)} % oproti minulé hodině
            </p>
          )}
        </div>
        <span className={`text-4xl ${iconColorClasses[color]}`}>{icon}</span>
      </div>
    </div>
  )
}

export default MetricCard
