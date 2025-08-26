export interface App {
    id: string
    name: string
    platform: string
    country: string
    revenue: number
    popularity: number
    uaSpend: number
    createdAt: string
    updatedAt: string
    metrics?: Metric[]
}

export interface Metric {
    id: string
    appId: string
    date: string
    metricType: string
    value: number
    createdAt: string
    app?: App
}

export interface Query {
    id: string
    userId?: string
    appId?: string
    queryText: string
    sqlGenerated: string
    result?: string
    timestamp: string
    app?: App
}

export interface CreateAppData {
    name: string
    platform: string
    country: string
    revenue?: number
    popularity?: number
    uaSpend?: number
}

export interface CreateMetricData {
    appId: string
    date: string
    metricType: string
    value: number
}
