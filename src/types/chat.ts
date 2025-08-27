export interface SQLMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp?: string
}

export interface ChatRequest {
    message: string
    conversationHistory: SQLMessage[]
    requestType?: 'query' | 'export_csv' | 'show_sql'
    lastQueryResult?: {
        data: any[]
        rowCount: number
        executionTime: number
    }
    lastSqlQuery?: string
}

export interface ChatResponse {
    response: string
    queryResult?: {
        success: boolean
        data?: any[]
        error?: string
        sql?: string
        executionTime?: number
        rowCount?: number
    }
    sqlQuery?: string
    shouldShowTable: boolean
    isTwoStepResponse?: boolean
    initialResponse?: string
}

export interface ToolCall {
    name: string
    arguments: Record<string, any>
}

export interface SQLQueryResult {
    success: boolean
    data?: any[]
    error?: string
    sql?: string
    executionTime?: number
    rowCount?: number
}
