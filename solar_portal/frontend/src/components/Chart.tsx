import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartData {
  time: string
  power: number
  energy?: number
  battery?: number
}

interface ChartProps {
  title: string
  data: ChartData[]
  type?: 'line' | 'bar'
}

export const Chart = ({ title, data, type = 'line' }: ChartProps) => {
  const firstPoint = data[0]

  if (!firstPoint) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">No data yet</div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="power" stroke="#3b82f6" strokeWidth={2} name="Power (W)" />
            {firstPoint.energy !== undefined && (
              <Line type="monotone" dataKey="energy" stroke="#10b981" strokeWidth={2} name="Energy (kWh)" />
            )}
            {firstPoint.battery !== undefined && (
              <Line type="monotone" dataKey="battery" stroke="#f59e0b" strokeWidth={2} name="Battery (%)" />
            )}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="power" fill="#3b82f6" name="Power (W)" />
            {firstPoint.energy !== undefined && <Bar dataKey="energy" fill="#10b981" name="Energy (kWh)" />}
            {firstPoint.battery !== undefined && <Bar dataKey="battery" fill="#f59e0b" name="Battery (%)" />}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default Chart
