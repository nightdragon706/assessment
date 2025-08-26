export interface SQLMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
}

export interface ChatRequest {
    message: string
    conversationHistory: SQLMessage[]
}

export interface ChatResponse {
    response: string
    queryResult?: any
    sqlQuery?: string
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
