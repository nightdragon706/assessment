'use client'

import { useState } from 'react'
import Chat from '@/components/Chat'
import QueryResults from '@/components/QueryResults'
import DashboardStats from '@/components/DashboardStats'

export default function Home() {
    const [queryResult, setQueryResult] = useState<any>(null)

    const handleQueryResult = (result: any) => {
        setQueryResult(result)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        App Portfolio Analytics
                    </h1>
                    <p className="text-lg text-gray-600">
                        Your AI-powered data analytics assistant
                    </p>
                </div>

                {/* Dashboard Stats */}
                <div className="mb-8">
                    <DashboardStats />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Chat Interface */}
                    <div className="bg-white rounded-lg shadow-lg">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Analytics Chatbot
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Ask questions about your app portfolio data
                            </p>
                        </div>
                        <div className="h-96">
                            <Chat onQueryResult={handleQueryResult} />
                        </div>
                    </div>

                    {/* Results Display */}
                    <div className="bg-white rounded-lg shadow-lg">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Query Results
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                View and analyze your data
                            </p>
                        </div>
                        <div className="p-6">
                            {queryResult ? (
                                <QueryResults 
                                    data={queryResult.data} 
                                    rowCount={queryResult.rowCount}
                                    shouldShowTable={queryResult.shouldShowTable}
                                    sqlQuery={queryResult.sqlQuery}
                                />
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <p>No query results yet</p>
                                    <p className="text-sm mt-2">
                                        Ask a question in the chat to see results here
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Supported Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-4">
                            <div className="text-2xl mb-2">💬</div>
                            <h4 className="font-medium text-gray-900">Natural Language</h4>
                            <p className="text-sm text-gray-600">Ask questions in plain English</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="text-2xl mb-2">📊</div>
                            <h4 className="font-medium text-gray-900">Smart Tables</h4>
                            <p className="text-sm text-gray-600">Automatic table or text responses</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="text-2xl mb-2">📥</div>
                            <h4 className="font-medium text-gray-900">CSV Export</h4>
                            <p className="text-sm text-gray-600">Download results as CSV files</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="text-2xl mb-2">🔍</div>
                            <h4 className="font-medium text-gray-900">SQL View</h4>
                            <p className="text-sm text-gray-600">See the generated SQL queries</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
