'use client'

import { useState, useEffect } from 'react'
import { App } from '@/types'
import { appsApi } from '@/lib/api'
import AppList from '@/components/AppList'
import CreateAppForm from '@/components/CreateAppForm'
import DashboardStats from '@/components/DashboardStats'
import QueryBuilder from '@/components/QueryBuilder'

export default function Home() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadApps()
  }, [])

  const loadApps = async () => {
    try {
      setLoading(true)
      const data = await appsApi.getAll()
      setApps(data)
    } catch (error) {
      console.error('Error loading apps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApp = async (appData: any) => {
    try {
      await appsApi.create(appData)
      await loadApps()
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating app:', error)
    }
  }

  const handleDeleteApp = async (id: string) => {
    try {
      await appsApi.delete(id)
      await loadApps()
    } catch (error) {
      console.error('Error deleting app:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            App Portfolio Analytics
          </h1>
          <p className="mt-2 text-gray-600">
            Manage and analyze your app portfolio data
          </p>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats apps={apps} />

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Apps</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add New App
          </button>
        </div>

        {/* Create App Form Modal */}
        {showCreateForm && (
          <CreateAppForm
            onSubmit={handleCreateApp}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Apps List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <AppList apps={apps} onDelete={handleDeleteApp} />
        )}

        {/* Query Builder Section */}
        <div className="mt-12">
          <QueryBuilder />
        </div>
      </div>
    </div>
  )
}
