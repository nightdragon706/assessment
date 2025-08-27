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
            console.log('Found tool_calls in response:', toolCalls)
        }

        // Also check for tool calls in the raw response (since TypeBuilder is only for tests)
        // The LLM might include tool calls in the answer field as JSON
        if (!toolCalls.length && bamlResponse.answer) {
            try {
                // Look for JSON-like content in the answer
                const answerText = bamlResponse.answer
                console.log('Checking answer text for tool calls:', answerText)

                // Check if the entire answer is JSON
                if (answerText.trim().startsWith('{') && answerText.trim().endsWith('}')) {
                    try {
                        const parsed = JSON.parse(answerText)
                        console.log('Parsed entire answer as JSON:', parsed)
                        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
                            toolCalls = parsed.tool_calls
                            console.log('Found tool_calls in entire answer JSON:', toolCalls)
                        }
                    } catch (e) {
                        console.log('Could not parse entire answer as JSON')
                    }
                }

                // Also check for embedded JSON
                if (!toolCalls.length && (answerText.includes('tool_calls') || answerText.includes('"tool"'))) {
                    // Try to extract JSON from the answer
                    const jsonMatch = answerText.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0])
                        console.log('Parsed JSON from answer:', parsed)
                        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
                            toolCalls = parsed.tool_calls
                            console.log('Found tool_calls in parsed JSON:', toolCalls)
                        }
                    }
                }
            } catch (error) {
                console.log('Could not parse tool calls from answer:', error)
            }
        }

        console.log('Final toolCalls extracted:', toolCalls)
        console.log('Tool calls length:', toolCalls.length)
        console.log('Tool calls type:', typeof toolCalls)

        // If no tool calls found, log it for debugging
        if (toolCalls.length === 0) {
            const isDataQuestion = /(how many|count|total|revenue|installs|apps|platform|country|which|what|list|show|display|top|bottom|highest|lowest|average|sum|most|least)/i.test(userQuestion)
            if (isDataQuestion) {
                console.log('WARNING: No tool calls found for data question:', userQuestion)
                console.log('This should not happen - the LLM should generate execute_sql_query tool calls')
            }
        }

        // Determine if response should show as table or text based on question complexity
        const shouldShowTable = shouldDisplayAsTable(userQuestion, toolCalls.length > 0)

        console.log('About to return from generateLLMResponse:')
        console.log('- toolCalls:', toolCalls)
        console.log('- toolCalls.length:', toolCalls.length)
        console.log('- toolCalls.length > 0:', toolCalls.length > 0)

        return {
            response,
            toolCalls: toolCalls as unknown[],
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



// Generate final response based on query results
async function generateFinalResponse(
    userQuestion: string,
    initialResponse: string,
    queryResult: any,
    sqlQuery: string
): Promise<string> {
    try {
        // Format the results for better LLM understanding
        let resultsText = ''
        if (queryResult.data && Array.isArray(queryResult.data)) {
            if (queryResult.data.length === 1) {
                // Single result - show the value directly
                const row = queryResult.data[0]
                const values = Object.values(row).join(', ')
                resultsText = `The query returned 1 result: ${values}`
            } else {
                // Multiple results - show count and sample
                resultsText = `The query returned ${queryResult.data.length} results. Sample data: ${JSON.stringify(queryResult.data.slice(0, 3))}`
            }
        } else {
            resultsText = `The query returned: ${JSON.stringify(queryResult.data)}`
        }

        // Create a follow-up message to the LLM with the query results
        const followUpMessage = `Based on the SQL query results, please provide a natural language answer to: "${userQuestion}"

        ${resultsText}
        
        Rules:
        - If it's a simple count (like "how many apps"), provide the direct number
        - If it's a list of items, provide a summary and mention the data is available
        - If it's revenue or financial data, format it nicely with currency (e.g., "$1,234.56")
        - If it's a comparison or ranking, highlight the top performers
        - If it's multiple rows, provide insights and mention the full data is available
        - Do NOT include the SQL query in your response
        - Keep the response conversational and helpful
        - For single values, be direct and clear
        - For multiple values, provide context and insights`

        // Instead of calling BAML again, create a simple, direct response based on the data
        if (queryResult.data && Array.isArray(queryResult.data)) {
            if (queryResult.data.length === 1) {
                const row = queryResult.data[0]
                const country = row.country || row.appName || row.platform || 'Unknown'
                const revenue = row.total_revenue || row.revenue || row.inAppRevenue || row.adsRevenue || 0

                // Format the response based on the question type
                if (userQuestion.toLowerCase().includes('country') && userQuestion.toLowerCase().includes('revenue')) {
                    return `The country generating the most revenue is ${country}, with a total revenue of $${revenue.toLocaleString()}.`
                } else if (userQuestion.toLowerCase().includes('how many')) {
                    return `You have ${revenue} ${country.toLowerCase()} apps.`
                } else {
                    return `Based on the data: ${country} has ${revenue.toLocaleString()}.`
                }
            } else {
                // Multiple results - provide a summary
                return `The query returned ${queryResult.data.length} results. The top performers are: ${queryResult.data.slice(0, 3).map((row: any) => {
                    const name = row.country || row.appName || row.platform || 'Unknown'
                    const value = row.total_revenue || row.revenue || row.installs || 0
                    return `${name} (${value.toLocaleString()})`
                }).join(', ')}.`
            }
        }

        return `Based on the query results: ${resultsText}`
    } catch (error) {
        console.error('Error generating final response:', error)
        // Fallback to initial response if follow-up fails
        return initialResponse
    }
}

// Determine if response should be displayed as table or text
function shouldDisplayAsTable(question: string, hasToolCalls: boolean): boolean {
    const questionLower = question.toLowerCase()

    // Simple questions that should show as text (no table) - single value responses
    const simpleQuestions = [
        'how many apps',
        'how many android',
        'how many ios',
        'what about ios',
        'what about android',
        'total revenue',
        'total installs',
        'total ua cost',
        'average revenue',
        'average installs',
        'average ua cost'
    ]

    // Complex questions that should show as table - multiple rows or detailed data
    const complexQuestions = [
        'which country',
        'list all',
        'show me',
        'display',
        'compare',
        'ranking',
        'top',
        'bottom',
        'highest',
        'lowest',
        'most',
        'least',
        'by country',
        'by platform',
        'performance',
        'analysis',
        'breakdown'
    ]

    // Check for simple questions first (single value responses)
    if (simpleQuestions.some(simple => questionLower.includes(simple))) {
        return false
    }

    // Check for complex questions (multiple rows or detailed data)
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

        // Execute tool calls if any and get final response
        let finalResponse = llmResponse.response
        let queryResult: any = null
        let sqlQuery: string | undefined = undefined

        console.log('Checking for tool calls in llmResponse:', llmResponse.toolCalls)
        console.log('llmResponse.toolCalls type:', typeof llmResponse.toolCalls)
        console.log('llmResponse.toolCalls length:', llmResponse.toolCalls?.length)

        if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
            console.log('Found tool calls, executing them...')
            // Execute SQL queries and get results
            for (const toolCall of llmResponse.toolCalls) {
                console.log('Processing tool call:', toolCall)
                const typedToolCall = toolCall as { tool?: string; name?: string; parameters?: any; arguments?: any }
                const toolName = typedToolCall.tool || typedToolCall.name
                const toolArgs = typedToolCall.parameters || typedToolCall.arguments

                console.log('Tool name:', toolName)
                console.log('Tool args:', toolArgs)

                if (toolName === 'execute_sql_query') {
                    // Extract SQL query and description from the tool call
                    const executeToolCall = toolCall as { sql_query?: string; query_description?: string;[key: string]: any }
                    const sqlQueryText = executeToolCall.sql_query || toolArgs?.query || toolArgs?.sql_query
                    const queryDescription = executeToolCall.query_description || toolArgs?.query_description || 'User query'

                    console.log('Executing SQL query:', sqlQueryText)

                    if (sqlQueryText) {
                        const result = await tools.execute_sql_query({
                            sql_query: sqlQueryText,
                            query_description: queryDescription
                        })

                        console.log('SQL execution result:', result)

                        if (result && typeof result === 'object' && 'success' in result) {
                            queryResult = result as any
                            sqlQuery = sqlQueryText

                            console.log('Generating final response with results...')
                            // Pass the query results back to LLM for final response
                            if (sqlQuery) {
                                const finalLLMResponse = await generateFinalResponse(
                                    message,
                                    llmResponse.response,
                                    queryResult,
                                    sqlQuery
                                )
                                finalResponse = finalLLMResponse
                                console.log('Final response generated:', finalResponse)
                            }
                        }
                    }
                } else if (toolName === 'get_query_templates') {
                    await tools.get_query_templates(toolArgs || {})
                } else if (toolName === 'get_database_stats') {
                    await tools.get_database_stats()
                }
            }
        } else {
            console.log('No tool calls found in llmResponse')
        }

        const response: ChatResponse = {
            response: queryResult !== null ? finalResponse : llmResponse.response,
            queryResult,
            sqlQuery,
            shouldShowTable: llmResponse.shouldShowTable,
            // Add flag to indicate if this was a two-step process
            isTwoStepResponse: queryResult !== null,
            // Add initial response for two-step process
            initialResponse: queryResult !== null ? llmResponse.response : undefined
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
