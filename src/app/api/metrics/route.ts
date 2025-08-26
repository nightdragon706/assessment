import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/metrics - Get dashboard statistics
export async function GET() {
  try {
    // Calculate dashboard stats from the apps table
    const result = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(DISTINCT appName) as totalApps,
        SUM(inAppRevenue + adsRevenue) as totalRevenue,
        SUM(installs) as totalInstalls,
        SUM(uaCost) as totalUaCost
      FROM apps
    `) as any[]

    const stats = result[0]

    return NextResponse.json({
      totalApps: Number(stats.totalApps) || 0,
      totalRevenue: Number(stats.totalRevenue) || 0,
      totalInstalls: Number(stats.totalInstalls) || 0,
      totalUaCost: Number(stats.totalUaCost) || 0
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      {
        totalApps: 0,
        totalRevenue: 0,
        totalInstalls: 0,
        totalUaCost: 0
      },
      { status: 200 } // Return default values instead of error
    )
  }
}

// POST /api/metrics - This endpoint is no longer needed since metrics are part of the app data
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Metrics are now part of the app data. Use the apps API instead.' },
    { status: 400 }
  )
}
