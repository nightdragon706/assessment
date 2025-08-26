import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/apps - Get all apps
export async function GET() {
  try {
    const apps = await prisma.app.findMany({
      include: {
        metrics: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    return NextResponse.json(apps)
  } catch (error) {
    console.error('Error fetching apps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    )
  }
}

// POST /api/apps - Create a new app
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, platform, country, revenue, popularity, uaSpend } = body

    // Validate required fields
    if (!name || !platform || !country) {
      return NextResponse.json(
        { error: 'Name, platform, and country are required' },
        { status: 400 }
      )
    }

    const app = await prisma.app.create({
      data: {
        name,
        platform,
        country,
        revenue: revenue || 0,
        popularity: popularity || 0,
        uaSpend: uaSpend || 0,
      },
    })

    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    console.error('Error creating app:', error)
    return NextResponse.json(
      { error: 'Failed to create app' },
      { status: 500 }
    )
  }
}
