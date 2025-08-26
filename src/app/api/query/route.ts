import { NextRequest, NextResponse } from 'next/server'
import { SQLExecutor } from '@/lib/sql-executor'
import { getTemplateById, getAllTemplates } from '@/lib/sql-templates'
import { prisma } from '@/lib/prisma'

// GET /api/query - Get available templates
export async function GET() {
    try {
        const templates = getAllTemplates()
        const stats = await SQLExecutor.getQueryStats()

        return NextResponse.json({
            templates,
            stats,
            message: 'Query templates and stats retrieved successfully'
        })
    } catch (error) {
        console.error('Error fetching templates:', error)
        return NextResponse.json(
            { error: 'Failed to fetch templates' },
            { status: 500 }
        )
    }
}

// POST /api/query - Execute a query
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { templateId, customSql, options = {} } = body

        let result

        if (templateId) {
            // Execute a template
            result = await SQLExecutor.executeTemplate(templateId, options)
        } else if (customSql) {
            // Execute a custom SQL query
            const validation = SQLExecutor.validateQuery(customSql)
            if (!validation.isValid) {
                return NextResponse.json(
                    { error: validation.error },
                    { status: 400 }
                )
            }
            result = await SQLExecutor.executeQuery(customSql, options)
        } else {
            return NextResponse.json(
                { error: 'Either templateId or customSql must be provided' },
                { status: 400 }
            )
        }

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        // Log the query execution
        await prisma.query.create({
            data: {
                queryText: templateId ? `Template: ${templateId}` : customSql,
                sqlGenerated: result.sql || '',
                result: JSON.stringify(result.data),
                timestamp: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            data: result.data,
            sql: result.sql,
            executionTime: result.executionTime,
            rowCount: result.rowCount
        })
    } catch (error) {
        console.error('Error executing query:', error)
        return NextResponse.json(
            { error: 'Failed to execute query' },
            { status: 500 }
        )
    }
}
