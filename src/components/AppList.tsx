import { App } from '@/types'

interface AppListProps {
  apps: App[]
  onDelete: (id: string) => void
}

export default function AppList({ apps, onDelete }: AppListProps) {
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this app?')) {
      onDelete(id)
    }
  }

  if (apps.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No apps</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new app.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {apps.map((app) => (
          <li key={app.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {app.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {app.name}
                      </p>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        app.platform.toLowerCase() === 'ios' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {app.platform}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{app.country}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${app.revenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Revenue</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {app.popularity.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Downloads</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${app.uaSpend.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">UA Spend</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
