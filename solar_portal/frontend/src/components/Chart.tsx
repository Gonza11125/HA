import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartData {
  time: string
  power: number
  energy?: number
  battery?: number
  gridImport?: number
  solarProduction?: number
  selfConsumptionPercent?: number
}

interface ChartProps {
  title: string
  data: ChartData[]
  type?: 'line' | 'bar'
  dataKey?: 'power' | 'energy' | 'battery' | 'gridImport' | 'solarProduction' | 'selfConsumptionPercent'
  color?: string
  unit?: string
  height?: number
}

export const Chart = ({
  title,
  data,
  type = 'line',
  dataKey = 'power',
  color = '#3b82f6',
  unit = 'W',
  height = 360,
}: ChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500" style={{ height }}>
          No data yet
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                name={`${title} (${unit})`}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill={color} name={`${title} (${unit})`} radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Chart
