'use client'

import { useState } from 'react'
import { SQLMessage, ChatRequest, ChatResponse } from '@/types/chat'

interface ChatProps {
    onQueryResult?: (result: any) => void
}

export default function Chat({ onQueryResult }: ChatProps) {
    const [messages, setMessages] = useState<SQLMessage[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [lastQueryResult, setLastQueryResult] = useState<any>(null)
    const [lastSqlQuery, setLastSqlQuery] = useState<string>('')

    const sendMessage = async (message: string, requestType: 'query' | 'export_csv' | 'show_sql' = 'query') => {
        if (!message.trim()) return

        setIsLoading(true)
        const userMessage: SQLMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')

        try {
            const requestBody: ChatRequest = {
                message,
                conversationHistory: messages,
                requestType,
                lastQueryResult,
                lastSqlQuery
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })

            if (requestType === 'export_csv') {
                // Handle CSV download
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'app_analytics.csv'
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                setIsLoading(false)
                return
            }

            const data: ChatResponse = await response.json()

            if (data.isTwoStepResponse && data.queryResult) {
                // Two-step process: Show initial response, then final response
                
                // Step 1: Show initial acknowledgment (the first response from LLM)
                const initialMessage: SQLMessage = {
                    role: 'assistant',
                    content: data.initialResponse!, // Use the initial response
                    timestamp: new Date().toISOString()
                }
                setMessages(prev => [...prev, initialMessage])

                // Step 2: Show "Thinking..." message
                const thinkingMessage: SQLMessage = {
                    role: 'assistant',
                    content: 'Thinking...',
                    timestamp: new Date().toISOString()
                }
                setMessages(prev => [...prev, thinkingMessage])

                // Step 3: Replace "Thinking..." with final response (the second response from LLM)
                setTimeout(() => {
                    setMessages(prev => {
                        const newMessages = [...prev]
                        // Replace the "Thinking..." message with the final response
                        const thinkingIndex = newMessages.findIndex(msg => msg.content === 'Thinking...')
                        if (thinkingIndex !== -1) {
                            newMessages[thinkingIndex] = {
                                role: 'assistant',
                                content: data.response, // This is the final response from generateFinalResponse
                                timestamp: new Date().toISOString()
                            }
                        }
                        return newMessages
                    })
                }, 1000) // Small delay to show the thinking state

                // Store query context for follow-ups
                setLastQueryResult(data.queryResult)
                setLastSqlQuery(data.sqlQuery || '')
                
                // Notify parent component about query result
                if (onQueryResult) {
                    onQueryResult({
                        data: data.queryResult.data,
                        rowCount: data.queryResult.rowCount,
                        shouldShowTable: data.shouldShowTable,
                        sqlQuery: data.sqlQuery
                    })
                }
            } else {
                // Single-step process: Show response directly
                const assistantMessage: SQLMessage = {
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString()
                }
                setMessages(prev => [...prev, assistantMessage])

                // Store query context for follow-ups
                if (data.queryResult) {
                    setLastQueryResult(data.queryResult)
                    setLastSqlQuery(data.sqlQuery || '')
                    
                    // Notify parent component about query result
                    if (onQueryResult) {
                        onQueryResult({
                            data: data.queryResult.data,
                            rowCount: data.queryResult.rowCount,
                            shouldShowTable: data.shouldShowTable,
                            sqlQuery: data.sqlQuery
                        })
                    }
                }
            }
        } catch (error) {
            console.error('Error sending message:', error)
            const errorMessage: SQLMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleExportCSV = () => {
        if (lastQueryResult && lastQueryResult.data) {
            sendMessage('export this as csv', 'export_csv')
        }
    }

    const handleShowSQL = () => {
        if (lastSqlQuery) {
            sendMessage('show me the SQL you used', 'show_sql')
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        <p>Ask me about your app portfolio analytics!</p>
                        <p className="text-sm mt-2">Examples:</p>
                        <ul className="text-sm mt-1 space-y-1">
                            <li>• "How many apps do we have?"</li>
                            <li>• "Which country generates the most revenue?"</li>
                            <li>• "List all iOS apps sorted by installs"</li>
                        </ul>
                    </div>
                )}
                
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                            <p>Thinking...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons for CSV export and SQL display */}
            {(lastQueryResult || lastSqlQuery) && (
                <div className="border-t p-4 space-y-2">
                    <div className="flex gap-2">
                        {lastQueryResult && lastQueryResult.data && (
                            <button
                                onClick={handleExportCSV}
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                                📊 Export CSV
                            </button>
                        )}
                        {lastSqlQuery && (
                            <button
                                onClick={handleShowSQL}
                                className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                            >
                                🔍 Show SQL
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="border-t p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        sendMessage(input)
                    }}
                    className="flex gap-2"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your app portfolio..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    )
}
