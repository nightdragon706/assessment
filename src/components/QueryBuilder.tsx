'use client'

import { useState, useEffect } from 'react'
import { SQLTemplate } from '@/lib/sql-templates'

interface QueryResult {
  success: boolean
  data?: any[]
  error?: string
  sql?: string
  executionTime?: number
  rowCount?: number
}

interface QueryBuilderProps {
  onResult?: (result: QueryResult) => void
}

export default function QueryBuilder({ onResult }: QueryBuilderProps) {
  const [templates, setTemplates] = useState<SQLTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customSql, setCustomSql] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/query')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const executeQuery = async () => {
    setLoading(true)
    setResult(null)

    try {
      const payload = selectedTemplate 
        ? { templateId: selectedTemplate }
        : { customSql: customSql.trim() }

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        onResult?.(data)
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to execute query' 
      })
    } finally {
      setLoading(false)
    }
  }

  const getTemplatesByCategory = (category: string) => {
    return templates.filter(template => template.category === category)
  }

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
      <h2 className="text-xl font-semibold text-gray-900 mb-4">SQL Query Builder</h2>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Query Templates
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Custom SQL
          </button>
        </nav>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Query Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a template...</option>
              {['revenue', 'downloads', 'performance', 'comparison', 'trends'].map(category => (
                <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                  {getTemplatesByCategory(category).map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">
                {templates.find(t => t.id === selectedTemplate)?.name}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {templates.find(t => t.id === selectedTemplate)?.description}
              </p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                {templates.find(t => t.id === selectedTemplate)?.sql}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom SQL Tab */}
      {activeTab === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom SQL Query
          </label>
          <textarea
            value={customSql}
            onChange={(e) => setCustomSql(e.target.value)}
            placeholder="SELECT * FROM apps LIMIT 10"
            rows={6}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <p className="mt-2 text-xs text-gray-500">
            Only SELECT queries are allowed for security reasons.
          </p>
        </div>
      )}

      {/* Execute Button */}
      <div className="mt-6">
        <button
          onClick={executeQuery}
          disabled={loading || (!selectedTemplate && !customSql.trim())}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Executing...' : 'Execute Query'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Query Results</h3>
          
          {result.success ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Rows: {result.rowCount}</span>
                <span>Execution time: {result.executionTime}ms</span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded text-sm font-mono mb-4">
                {result.sql}
              </div>
              
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
      )}
    </div>
  )
}
