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
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Administrátorský panel</h1>
          <p className="mt-1 text-gray-600">Správa uživatelů, zařízení a nastavení systému</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Celkem uživatelů</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Aktivní zařízení</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.activeDevices}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Celková energie</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalEnergy} kWh</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Dostupnost systému</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.systemUptime}%</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">Uživatelé</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Jméno</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">E-mail</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Registrován</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Akce</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 transition hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.fullName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.createdAt}</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="mr-4 font-medium text-blue-600 transition hover:text-blue-700">
                        Upravit
                      </button>
                      <button className="font-medium text-red-600 transition hover:text-red-700">
                        Smazat
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stav systému</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Databáze</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">V pořádku</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API server</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">Běží</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Web server</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">Běží</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rychlé akce</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                Poslat oznámení
              </button>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                Zobrazit systémové logy
              </button>
              <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium">
                Exportovat data
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminPage
