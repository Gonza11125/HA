import { useState } from 'react'
import Header from '../components/Header'

interface User {
  id: string
  email: string
  fullName: string
  role: 'customer' | 'admin'
  createdAt: string
}

export const AdminPage = () => {
  const [users] = useState<User[]>([
    {
      id: '1',
      email: 'customer1@example.com',
      fullName: 'John Doe',
      role: 'customer',
      createdAt: '2026-01-15'
    },
    {
      id: '2',
      email: 'customer2@example.com',
      fullName: 'Jane Smith',
      role: 'customer',
      createdAt: '2026-02-10'
    }
  ])

  const [stats] = useState({
    totalUsers: 24,
    activeDevices: 19,
    totalEnergy: 12450,
    systemUptime: 99.8
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Active Devices</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeDevices}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Energy</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEnergy} kWh</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">System Uptime</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.systemUptime}%</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{user.fullName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.createdAt}</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-indigo-600 hover:text-indigo-900 font-medium mr-4">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900 font-medium">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Server</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">Running</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Web Server</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">Running</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                Send Announcement
              </button>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                View System Logs
              </button>
              <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium">
                Export Data
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminPage
