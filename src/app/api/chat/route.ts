import { NextRequest, NextResponse } from 'next/server'
import { SQLExecutor } from '@/lib/sql-executor'
import { getAllTemplates, getTemplatesByCategory } from '@/lib/sql-templates'
import { prisma } from '@/lib/prisma'
import { ChatRequest, ChatResponse, SQLMessage } from '@/types/chat'
import { b } from '@/app/baml_client'
import { SQLMessage as BamlSQLMessage } from '@/app/baml_client/types'

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

        // Add conversation context for follow-up questions
        if (conversationHistory.length > 1) {
            const lastMessage = conversationHistory[conversationHistory.length - 1]
            if (lastMessage.role === 'assistant' && lastMessage.content.includes('apps')) {
                context += '. This appears to be a follow-up question about apps.'
            }
        }

        // Call the BAML SQLAssistant function
        const bamlResponse = await b.SQLAssistant(
            userQuestion,
            bamlMessages,
            context
        )

        // Debug: Log the BAML response structure
        console.log('BAML Response keys:', Object.keys(bamlResponse))
        console.log('BAML Response:', JSON.stringify(bamlResponse, null, 2))

        // Extract the response
        const response = bamlResponse.answer || "I'm here to help you analyze your app portfolio data!"

        // Extract tool calls from the response
        let toolCalls: any[] = []

        // Check if tool_calls exists in the response
        if (bamlResponse.tool_calls && Array.isArray(bamlResponse.tool_calls)) {
            toolCalls = bamlResponse.tool_calls
        }

        // Also check for tool calls in the raw response (since TypeBuilder is only for tests)
        // The LLM might include tool calls in the answer field as JSON
        if (!toolCalls.length && bamlResponse.answer) {
            try {
                // Look for JSON-like content in the answer
                const answerText = bamlResponse.answer
                if (answerText.includes('tool_calls') || answerText.includes('"tool"')) {
                    // Try to extract JSON from the answer
                    const jsonMatch = answerText.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0])
                        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
                            toolCalls = parsed.tool_calls
                        }
                    }
                }
            } catch (error) {
                console.log('Could not parse tool calls from answer:', error)
            }
        }

        // Determine if response should show as table or text based on question complexity
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
    const questionLower = question.toLowerCase()

    // Simple questions that should show as text (no table)
    const simpleQuestions = [
        'how many apps do we have',
        'how many android apps',
        'how many ios apps',
        'what about ios',
        'what about android'
    ]

    // Complex questions that should show as table
    const complexQuestions = [
        'which country generates the most revenue',
        'list all ios apps',
        'show me',
        'display',
        'compare',
        'ranking',
        'top',
        'bottom',
        'biggest change',
        'ua spend'
    ]

    // Check for simple questions first
    if (simpleQuestions.some(simple => questionLower.includes(simple))) {
        return false
    }

    // Check for complex questions
    if (complexQuestions.some(complex => questionLower.includes(complex))) {
        return true
    }

    // If it has tool calls and returns data, show as table
    if (hasToolCalls) {
        return true
    }

    // Default to text for simple responses
    return false
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

        // Handle "show me the SQL" requests in natural language
        if (message.toLowerCase().includes('show me the sql') ||
            message.toLowerCase().includes('sql you used') ||
            message.toLowerCase().includes('sql query')) {
            if (body.lastSqlQuery) {
                return NextResponse.json({
                    response: `Here's the SQL query I used:\n\n\`\`\`sql\n${body.lastSqlQuery}\n\`\`\``,
                    sqlQuery: body.lastSqlQuery,
                    shouldShowTable: false
                })
            } else {
                return NextResponse.json({
                    response: "I haven't executed any SQL queries yet. Ask me a question about your app data first!",
                    shouldShowTable: false
                })
            }
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

        let queryResult: any = null
        let sqlQuery: string | undefined = undefined

        // Execute tool calls if any
        if (llmResponse.toolCalls) {
            for (const toolCall of llmResponse.toolCalls) {
                // Handle the tool call format from BAML
                const typedToolCall = toolCall as { tool?: string; name?: string; parameters?: any; arguments?: any }
                const toolName = typedToolCall.tool || typedToolCall.name
                const toolArgs = typedToolCall.parameters || typedToolCall.arguments

                if (toolName === 'execute_sql_query') {
                    const sqlQueryText = toolArgs?.query || toolArgs?.sql_query
                    const queryDescription = toolArgs?.query_description || 'User query'

                    if (sqlQueryText) {
                        const result = await tools.execute_sql_query({
                            sql_query: sqlQueryText,
                            query_description: queryDescription
                        })

                        if (result && typeof result === 'object' && 'success' in result) {
                            queryResult = result as any
                            sqlQuery = sqlQueryText
                        }
                    }
                } else if (toolName === 'get_query_templates') {
                    await tools.get_query_templates(toolArgs || {})
                } else if (toolName === 'get_database_stats') {
                    await tools.get_database_stats()
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
