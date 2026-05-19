import { useState, useEffect } from 'react'
import { CloudUpload, FileCheck, AlertTriangle, Eye, TrendingUp, Clock, Bell, Moon, Settings } from 'lucide-react'
import { ShiftPieChart, MachineBarChart, DailyLineChart } from '../components/Charts'
import RecordTable from '../components/RecordTable'
import { getDashboard, getRecords } from '../services/api'

function StatCard({ icon: Icon, label, value, sub, subUp = true, color = 'blue' }) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600' },
  }
  const c = colors[color]
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5">{value ?? '—'}</p>
          {sub && (
            <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${subUp ? 'text-green-600' : 'text-red-500'}`}>
              {subUp ? '↑' : '↓'} {sub}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} flex-shrink-0`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, children, action }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboard(), getRecords()])
      .then(([d, r]) => { setData(d.data); setRecords(r.data.slice(0, 5)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const avgTime = records.length
    ? (records.reduce((s, r) => s + (parseFloat(r.extractedData?.timeTaken) || 0), 0) / records.length).toFixed(2)
    : '—'

  const processed = data ? data.totalRecords - data.reviewRequiredCount : 0

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI-Powered Workflow Automation System</h1>
          <p className="text-xs text-gray-500 mt-0.5">Digitize handwritten operational documents and convert into structured, reviewable records</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><Moon size={17} /></button>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors relative">
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Logout</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={CloudUpload} label="Total Uploads" value={data?.totalRecords ?? 0} sub="12% this week" color="blue" />
          <StatCard icon={FileCheck} label="Processed Records" value={processed} sub="8% this week" color="green" />
          <StatCard icon={AlertTriangle} label="Validation Failures" value={data?.reviewRequiredCount ?? 0} sub="5% this week" subUp={false} color="red" />
          <StatCard icon={Eye} label="Needs Review" value={data?.reviewRequiredCount ?? 0} sub="10% this week" color="orange" />
          <StatCard icon={TrendingUp} label="Total Qty Produced" value={data?.totalQuantityProduced?.toLocaleString() ?? 0} sub="15% this week" color="purple" />
          <StatCard icon={Clock} label="Avg. Time Taken" value={avgTime !== '—' ? `${avgTime}h` : '—'} sub="5% this week" color="teal" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <ChartCard title="Shift-wise Quantity Produced">
            <ShiftPieChart data={data?.byShift || {}} />
          </ChartCard>
          <ChartCard title="Machine-wise Quantity Produced">
            <MachineBarChart data={data?.byMachine || {}} />
          </ChartCard>
          <ChartCard title="Daily Uploads"
            action={<span className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-1">Last 7 Days</span>}>
            <DailyLineChart data={data?.dailyCounts || []} />
          </ChartCard>
          <ChartCard title="Top Operations">
            {loading ? (
              <div className="space-y-2 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-7 bg-gray-100 rounded" />)}</div>
            ) : (
              <div>
                <div className="flex text-xs font-semibold text-gray-400 mb-2 px-1 uppercase tracking-wide">
                  <span className="flex-1">Operation Code</span>
                  <span>Total Quantity</span>
                </div>
                {records.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-1 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{r.extractedData?.operationCode || '—'}</span>
                    <span className="text-sm font-semibold text-gray-900">{r.extractedData?.quantityProduced?.toLocaleString() || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        {/* Recent records */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Recent Operational Records</h2>
            <button className="text-xs text-blue-600 hover:underline">View All</button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading records…</div>
          ) : (
            <RecordTable records={records} />
          )}
        </div>
      </div>
    </div>
  )
}
