import { prisma } from './prisma'
import { SQLTemplate, getTemplateById } from './sql-templates'

export interface QueryResult {
    success: boolean
    data?: any[]
    error?: string
    sql?: string
    executionTime?: number
    rowCount?: number
}

export interface QueryExecutionOptions {
    limit?: number
    timeout?: number
}

export class SQLExecutor {
    /**
     * Execute a SQL template by ID
     */
    static async executeTemplate(
        templateId: string,
        options: QueryExecutionOptions = {}
    ): Promise<QueryResult> {
        const template = getTemplateById(templateId)
        if (!template) {
            return {
                success: false,
                error: `Template with ID '${templateId}' not found`
            }
        }

        return this.executeQuery(template.sql, options)
    }

    /**
     * Execute a custom SQL query
     */
    static async executeQuery(
        sql: string,
        options: QueryExecutionOptions = {}
    ): Promise<QueryResult> {
        const startTime = Date.now()

        try {
            // Basic SQL injection prevention - only allow SELECT statements
            const trimmedSql = sql.trim().toLowerCase()
            if (!trimmedSql.startsWith('select')) {
                return {
                    success: false,
                    error: 'Only SELECT queries are allowed for security reasons',
                    sql
                }
            }

            // Add LIMIT if specified and not already present
            let finalSql = sql
            if (options.limit && !trimmedSql.includes('limit')) {
                finalSql = `${sql} LIMIT ${options.limit}`
            }

            // Execute the query using Prisma's raw query
            const result = await prisma.$queryRawUnsafe(finalSql)

            const executionTime = Date.now() - startTime
            const data = Array.isArray(result) ? result : [result]

            return {
                success: true,
                data,
                sql: finalSql,
                executionTime,
                rowCount: data.length
            }
        } catch (error) {
            const executionTime = Date.now() - startTime

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                sql,
                executionTime
            }
        }
    }

    /**
     * Execute multiple queries and return results
     */
    static async executeMultipleQueries(
        queries: string[],
        options: QueryExecutionOptions = {}
    ): Promise<QueryResult[]> {
        const results: QueryResult[] = []

        for (const query of queries) {
            const result = await this.executeQuery(query, options)
            results.push(result)
        }

        return results
    }

    /**
     * Validate SQL query syntax (basic validation)
     */
    static validateQuery(sql: string): { isValid: boolean; error?: string } {
        const trimmedSql = sql.trim().toLowerCase()

        // Check if it's a SELECT statement
        if (!trimmedSql.startsWith('select')) {
            return {
                isValid: false,
                error: 'Only SELECT queries are allowed'
            }
        }

        // Check for basic SQL injection patterns
        const dangerousPatterns = [
            'drop table',
            'delete from',
            'insert into',
            'update ',
            'create table',
            'alter table',
            'truncate',
            '--',
            '/*',
            '*/'
        ]

        for (const pattern of dangerousPatterns) {
            if (trimmedSql.includes(pattern)) {
                return {
                    isValid: false,
                    error: `Query contains forbidden pattern: ${pattern}`
                }
            }
        }

        return { isValid: true }
    }

    /**
     * Get query statistics
     */
    static async getQueryStats(): Promise<{
        totalApps: number
        totalRevenue: number
        totalDownloads: number
        totalUaSpend: number
    }> {
        try {
            const result = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as totalApps,
          SUM(revenue) as totalRevenue,
          SUM(popularity) as totalDownloads,
          SUM(uaSpend) as totalUaSpend
        FROM apps
      `) as any[]

            const stats = result[0]
            return {
                totalApps: Number(stats.totalApps) || 0,
                totalRevenue: Number(stats.totalRevenue) || 0,
                totalDownloads: Number(stats.totalDownloads) || 0,
                totalUaSpend: Number(stats.totalUaSpend) || 0
            }
        } catch (error) {
            return {
                totalApps: 0,
                totalRevenue: 0,
                totalDownloads: 0,
                totalUaSpend: 0
            }
        }
    }
}
