'use client'

import { SQLQueryResult } from '@/types/chat'

interface QueryResultsProps {
  result: SQLQueryResult | null
  sqlQuery?: string
}

export default function QueryResults({ result, sqlQuery }: QueryResultsProps) {
  if (!result) return null

  const formatResult = (data: any[]) => {
    if (!data || data.length === 0) return 'No results found'
    
    const columns = Object.keys(data[0])
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map(column => (
                  <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {typeof row[column] === 'number' 
                      ? row[column].toLocaleString() 
                      : String(row[column] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Results</h3>
      
      {result.success ? (
        <div className="space-y-4">
          {/* Query Info */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Rows: {result.rowCount}</span>
            <span>Execution time: {result.executionTime}ms</span>
          </div>
          
          {/* SQL Query */}
          {sqlQuery && (
            <div className="bg-gray-50 p-3 rounded text-sm font-mono mb-4">
              {sqlQuery}
            </div>
          )}
          
          {/* Results Table */}
          {result.data && formatResult(result.data)}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <strong>Error:</strong> {result.error}
          </div>
        </div>
      )}
    </div>
  )
}
