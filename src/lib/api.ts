import { App, Metric, CreateAppData, CreateMetricData } from '@/types'

const API_BASE = '/api'

// Apps API
export const appsApi = {
    getAll: async (): Promise<App[]> => {
        const response = await fetch(`${API_BASE}/apps`)
        if (!response.ok) throw new Error('Failed to fetch apps')
        return response.json()
    },

    getById: async (id: string): Promise<App> => {
        const response = await fetch(`${API_BASE}/apps/${id}`)
        if (!response.ok) throw new Error('Failed to fetch app')
        return response.json()
    },

    create: async (data: CreateAppData): Promise<App> => {
        const response = await fetch(`${API_BASE}/apps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to create app')
        return response.json()
    },

    update: async (id: string, data: Partial<CreateAppData>): Promise<App> => {
        const response = await fetch(`${API_BASE}/apps/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to update app')
        return response.json()
    },

    delete: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/apps/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete app')
    },
}
