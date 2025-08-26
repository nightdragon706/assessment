import { App } from '@/types'

interface DashboardStatsProps {
  apps: App[]
}

export default function DashboardStats({ apps }: DashboardStatsProps) {
  const totalApps = apps.length
  const iosApps = apps.filter(app => app.platform.toLowerCase() === 'ios').length
  const androidApps = apps.filter(app => app.platform.toLowerCase() === 'android').length
  const totalRevenue = apps.reduce((sum, app) => sum + app.revenue, 0)
  const totalPopularity = apps.reduce((sum, app) => sum + app.popularity, 0)
  const totalUaSpend = apps.reduce((sum, app) => sum + app.uaSpend, 0)

  const stats = [
    {
      name: 'Total Apps',
      value: totalApps,
      change: '+0%',
      changeType: 'positive' as const,
    },
    {
      name: 'iOS Apps',
      value: iosApps,
      change: `${((iosApps / totalApps) * 100).toFixed(1)}%`,
      changeType: 'positive' as const,
    },
    {
      name: 'Android Apps',
      value: androidApps,
      change: `${((androidApps / totalApps) * 100).toFixed(1)}%`,
      changeType: 'positive' as const,
    },
    {
      name: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: '+0%',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Downloads',
      value: totalPopularity.toLocaleString(),
      change: '+0%',
      changeType: 'positive' as const,
    },
    {
      name: 'Total UA Spend',
      value: `$${totalUaSpend.toLocaleString()}`,
      change: '+0%',
      changeType: 'positive' as const,
    },
  ]

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {item.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">
                  {item.change}
                </span>
                <span className="text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
