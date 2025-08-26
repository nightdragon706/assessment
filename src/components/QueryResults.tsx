'use client'

import { SQLQueryResult } from '@/types/chat'

interface QueryResultsProps {
    data?: any[]
    rowCount?: number
    shouldShowTable?: boolean
    sqlQuery?: string
}

export default function QueryResults({ data, rowCount, shouldShowTable, sqlQuery }: QueryResultsProps) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8">
                <p>No data to display</p>
            </div>
        )
    }

    // Format numbers for better display
    const formatNumber = (value: any) => {
        if (typeof value === 'number') {
            if (value >= 1000000) {
                return `$${(value / 1000000).toFixed(1)}M`
            } else if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K`
            }
            return value.toLocaleString()
        }
        return value
    }

    // Get column headers from first row
    const headers = Object.keys(data[0])

    if (shouldShowTable) {
        return (
            <div className="space-y-4">
                {/* Results Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-medium text-blue-900">Query Results</h4>
                            <p className="text-sm text-blue-700">
                                Found {rowCount} row{rowCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                        {sqlQuery && (
                            <div className="text-xs text-blue-600">
                                <details>
                                    <summary className="cursor-pointer hover:text-blue-800">
                                        View SQL Query
                                    </summary>
                                    <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
                                        {sqlQuery}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                {headers.map((header) => (
                                    <th
                                        key={header}
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                                    >
                                        {header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    {headers.map((header) => (
                                        <td
                                            key={header}
                                            className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100"
                                        >
                                            {formatNumber(row[header])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Data Insights */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Quick Insights</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Total Rows:</span>
                            <span className="ml-1 font-medium">{rowCount}</span>
                        </div>
                        {data[0].inAppRevenue !== undefined && (
                            <div>
                                <span className="text-gray-600">Total Revenue:</span>
                                <span className="ml-1 font-medium">
                                    ${data.reduce((sum, row) => sum + (row.inAppRevenue || 0) + (row.adsRevenue || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {data[0].installs !== undefined && (
                            <div>
                                <span className="text-gray-600">Total Installs:</span>
                                <span className="ml-1 font-medium">
                                    {data.reduce((sum, row) => sum + (row.installs || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {data[0].uaCost !== undefined && (
                            <div>
                                <span className="text-gray-600">Total UA Cost:</span>
                                <span className="ml-1 font-medium">
                                    ${data.reduce((sum, row) => sum + (row.uaCost || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    } else {
        // Text response for simple queries
        return (
            <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900">Simple Answer</h4>
                    <p className="text-sm text-green-700 mt-1">
                        This query returned a simple result that doesn't need a table display.
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-lg font-medium text-gray-900 mb-2">
                        Result: {formatNumber(data[0][headers[0]])}
                    </div>
                    <p className="text-sm text-gray-600">
                        {headers[0].replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                </div>

                {sqlQuery && (
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">SQL Query Used</h5>
                        <pre className="text-sm text-gray-700 bg-white p-3 rounded border overflow-x-auto">
                            {sqlQuery}
                        </pre>
                    </div>
                )}
            </div>
        )
    }
}
