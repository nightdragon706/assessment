import { NextRequest, NextResponse } from 'next/server'
import { SQLExecutor } from '@/lib/sql-executor'
import { getAllTemplates, getTemplatesByCategory } from '@/lib/sql-templates'
import { prisma } from '@/lib/prisma'
import { ChatRequest, ChatResponse, SQLMessage } from '@/types/chat'
import { b } from '@/app/baml_client'
import { SQLMessage as BamlSQLMessage } from '@/app/baml_client/types'
import TypeBuilder from '@/app/baml_client/type_builder'

// Tool functions for BAML integration
const tools = {
    async execute_sql_query(args: { sql_query: string; query_description: string }) {
        try {
            const result = await SQLExecutor.executeQuery(args.sql_query)

            // Log the query execution
            await prisma.query.create({
                data: {
                    queryText: args.query_description,
                    sqlGenerated: args.sql_query,
                    result: JSON.stringify(result.data || []),
                    timestamp: new Date()
                }
            })

            return {
                success: result.success,
                data: result.data,
                error: result.error,
                executionTime: result.executionTime,
                rowCount: result.rowCount
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    },

    async get_query_templates(args: { category?: string }) {
        try {
            if (args.category) {
                return getTemplatesByCategory(args.category as 'revenue' | 'downloads' | 'performance' | 'comparison' | 'trends')
            }
            return getAllTemplates()
        } catch {
            return []
        }
    },

    async get_database_stats() {
        try {
            return await SQLExecutor.getQueryStats()
        } catch {
            return {
                totalApps: 0,
                totalRevenue: 0,
                totalInstalls: 0,
                totalUaCost: 0
            }
        }
    }
}

// Enhanced LLM response generation with context awareness
async function generateLLMResponse(
    userQuestion: string,
    conversationHistory: SQLMessage[],
    lastQueryResult?: any,
    lastSqlQuery?: string
): Promise<{ response: string; toolCalls?: unknown[]; shouldShowTable: boolean; sqlQuery?: string }> {
    try {
        // Convert conversation history to BAML format
        const bamlMessages: BamlSQLMessage[] = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || null
        }))

        // Add context about last query if available
        let context = "User is asking about app portfolio analytics data"
        if (lastQueryResult && lastSqlQuery) {
            context += `. Last query returned ${lastQueryResult.rowCount} rows and used SQL: ${lastSqlQuery}`
        }

        // Create TypeBuilder instance
        const tb = new TypeBuilder()

        // Call the BAML SQLAssistant function with TypeBuilder
        const bamlResponse = await b.withOptions({ tb }).SQLAssistant(
            userQuestion,
            bamlMessages,
            context
        )

        // Debug: Log the BAML response structure
        console.log('BAML Response keys:', Object.keys(bamlResponse))
        console.log('BAML Response:', JSON.stringify(bamlResponse, null, 2))

        // Extract the response and any tool calls
        const response = bamlResponse.answer || "I'm here to help you analyze your app portfolio data!"

        // Check if the response contains tool calls (they would be in the dynamic properties)
        const toolCalls: unknown[] = []

        // Look for tool calls in the dynamic properties of the response
        for (const [key, value] of Object.entries(bamlResponse)) {
            if (key !== 'answer' && Array.isArray(value)) {
                toolCalls.push(...value)
            }
        }

        // Also check for tool_calls property specifically
        if (bamlResponse.tool_calls && Array.isArray(bamlResponse.tool_calls)) {
            toolCalls.push(...bamlResponse.tool_calls)
        }

        // If BAML didn't generate tool calls for a data question, modify the response
        const isDataQuestion = /(how many|count|total|revenue|installs|apps|platform|country|which|what|list|show|display)/i.test(userQuestion)

        if (isDataQuestion && toolCalls.length === 0) {
            // BAML didn't generate tool calls for a data question - this is not ideal
            // but we'll return the response as-is since you don't want manual fallbacks
            console.log('BAML did not generate tool calls for data question:', userQuestion)
        }

        // Determine if response should show as table or text
        const shouldShowTable = shouldDisplayAsTable(userQuestion, toolCalls.length > 0)

        return {
            response,
            toolCalls: toolCalls.length > 0 ? toolCalls as unknown[] : undefined,
            shouldShowTable
        }
    } catch (error) {
        console.error('Error calling BAML SQLAssistant:', error)

        // Fallback response if BAML call fails
        return {
            response: `I can help you analyze your app portfolio data! You can ask me about:
      - Revenue analysis (in-app and ads revenue)
      - Install metrics
      - Platform comparisons (iOS vs Android)
      - Country performance
      - UA cost analysis
      
      What specific data would you like to explore?`,
            shouldShowTable: false
        }
    }
}

// Determine if response should be displayed as table or text
function shouldDisplayAsTable(question: string, hasToolCalls: boolean): boolean {
    const tableKeywords = [
        'list', 'show', 'display', 'table', 'chart', 'compare', 'ranking', 'top', 'bottom',
        'country', 'platform', 'revenue', 'installs', 'cost', 'performance'
    ]

    const simpleKeywords = [
        'how many', 'count', 'total', 'sum', 'average', 'mean'
    ]

    const questionLower = question.toLowerCase()

    // If it has tool calls (SQL execution), likely needs table
    if (hasToolCalls) return true

    // Check for table keywords
    if (tableKeywords.some(keyword => questionLower.includes(keyword))) {
        return true
    }

    // Check for simple keywords (text response)
    if (simpleKeywords.some(keyword => questionLower.includes(keyword))) {
        return false
    }

    // Default to table for complex queries
    return true
}

// Generate CSV from query results
function generateCSV(data: any[]): string {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row =>
        headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`
            }
            return value
        }).join(',')
    )

    return [csvHeaders, ...csvRows].join('\n')
}



export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json()
        const { message, conversationHistory, requestType = 'query' } = body

        // Handle different request types
        if (requestType === 'export_csv' && body.lastQueryResult) {
            const csvData = generateCSV(body.lastQueryResult.data || [])
            return new NextResponse(csvData, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="app_analytics.csv"'
                }
            })
        }

        if (requestType === 'show_sql' && body.lastSqlQuery) {
            return NextResponse.json({
                response: `Here's the SQL query I used:\n\n\`\`\`sql\n${body.lastSqlQuery}\n\`\`\``,
                sqlQuery: body.lastSqlQuery,
                shouldShowTable: false
            })
        }

        // Check for off-topic questions
        const offTopicKeywords = ['weather', 'news', 'sports', 'politics', 'joke', 'funny', 'music', 'movie']
        const isOffTopic = offTopicKeywords.some(keyword =>
            message.toLowerCase().includes(keyword)
        )

        if (isOffTopic) {
            return NextResponse.json({
                response: "I'm focused on helping you with app portfolio analytics. I can help you analyze revenue, installs, platform performance, and other app metrics. What would you like to know about your apps?",
                shouldShowTable: false
            })
        }

        // Get last query context for follow-ups
        const lastQuery = conversationHistory.length > 0 ?
            conversationHistory[conversationHistory.length - 1] : null
        const lastQueryResult = body.lastQueryResult
        const lastSqlQuery = body.lastSqlQuery

        // Generate LLM response
        const llmResponse = await generateLLMResponse(
            message,
            conversationHistory,
            lastQueryResult,
            lastSqlQuery
        )

        let queryResult = null
        let sqlQuery = null

        // Execute tool calls if any
        if (llmResponse.toolCalls) {
            for (const toolCall of llmResponse.toolCalls) {
                const typedToolCall = toolCall as { name: string; arguments: Record<string, unknown> }
                const tool = tools[typedToolCall.name as keyof typeof tools]
                if (tool) {
                    const result = await tool(typedToolCall.arguments as any)

                    if (typedToolCall.name === 'execute_sql_query' && result && typeof result === 'object' && 'success' in result) {
                        queryResult = result as any
                        sqlQuery = (typedToolCall.arguments as any).sql_query
                    }
                }
            }
        }

        const response: ChatResponse = {
            response: llmResponse.response,
            queryResult,
            sqlQuery,
            shouldShowTable: llmResponse.shouldShowTable
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error in chat API:', error)
        return NextResponse.json(
            { error: 'Failed to process chat message' },
            { status: 500 }
        )
    }
}
