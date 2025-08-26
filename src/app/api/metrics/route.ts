import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/metrics - Get all metrics
export async function GET() {
  try {
    const metrics = await prisma.metric.findMany({
      include: {
        app: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

// POST /api/metrics - Create a new metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appId, date, metricType, value } = body

    // Validate required fields
    if (!appId || !date || !metricType || value === undefined) {
      return NextResponse.json(
        { error: 'App ID, date, metric type, and value are required' },
        { status: 400 }
      )
    }

    const metric = await prisma.metric.create({
      data: {
        appId,
        date: new Date(date),
        metricType,
        value,
      },
      include: {
        app: true,
      },
    })

    return NextResponse.json(metric, { status: 201 })
  } catch (error) {
    console.error('Error creating metric:', error)
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    )
  }
}
