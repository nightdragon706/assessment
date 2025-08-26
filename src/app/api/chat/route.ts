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
                totalDownloads: 0,
                totalUaSpend: 0
            }
        }
    }
}

// Replace the mock LLM response generation with BAML client
async function generateLLMResponse(
    userQuestion: string,
    conversationHistory: SQLMessage[]
): Promise<{ response: string; toolCalls?: unknown[] }> {
    try {
        // Convert conversation history to BAML format
        const bamlMessages: BamlSQLMessage[] = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || null
        }))

        // Call the BAML SQLAssistant function
        const bamlResponse = await b.SQLAssistant(
            userQuestion,
            bamlMessages,
            "User is asking about app portfolio analytics data"
        )

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

        return {
            response,
            toolCalls: toolCalls.length > 0 ? toolCalls as unknown[] : undefined
        }
    } catch (error) {
        console.error('Error calling BAML SQLAssistant:', error)

        // Fallback response if BAML call fails
        return {
            response: `I can help you analyze your app portfolio data! You can ask me about:
      - Revenue analysis
      - Download/popularity metrics
      - Platform comparisons (iOS vs Android)
      - Country performance
      - ROI and UA spend analysis
      
      What specific data would you like to explore?`
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: ChatRequest = await request.json()
        const { message, conversationHistory } = body

        // Generate LLM response
        const llmResponse = await generateLLMResponse(message, conversationHistory)

        let queryResult = null
        let sqlQuery = null

        // Execute tool calls if any
        if (llmResponse.toolCalls) {
            for (const toolCall of llmResponse.toolCalls) {
                const typedToolCall = toolCall as { name: string; arguments: Record<string, unknown> }
                const tool = tools[typedToolCall.name as keyof typeof tools]
                if (tool) {
                    const result = await tool(typedToolCall.arguments as any)

                    if (typedToolCall.name === 'execute_sql_query') {
                        queryResult = result
                        sqlQuery = (typedToolCall.arguments as any).sql_query
                    }
                }
            }
        }

        const response: ChatResponse = {
            response: llmResponse.response,
            queryResult,
            sqlQuery
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
