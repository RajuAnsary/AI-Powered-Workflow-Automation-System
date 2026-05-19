import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts'

const SHIFT_COLORS = ['#3b82f6', '#f59e0b', '#10b981']
const BAR_COLOR = '#3b82f6'

export function ShiftPieChart({ data = {} }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name: `${name} Shift`, value }))
  if (chartData.length === 0) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {chartData.map((_, i) => <Cell key={i} fill={SHIFT_COLORS[i % SHIFT_COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MachineBarChart({ data = {} }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }))
  if (chartData.length === 0) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Bar dataKey="value" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DailyLineChart({ data = [] }) {
  if (data.length === 0) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
