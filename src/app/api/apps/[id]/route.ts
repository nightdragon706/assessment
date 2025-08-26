import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/apps/[id] - Get a specific app
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const app = await prisma.app.findUnique({
      where: { id },
      include: {
        metrics: true,
      },
    })

    if (!app) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(app)
  } catch (error) {
    console.error('Error fetching app:', error)
    return NextResponse.json(
      { error: 'Failed to fetch app' },
      { status: 500 }
    )
  }
}

// PUT /api/apps/[id] - Update a specific app
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, platform, country, revenue, popularity, uaSpend } = body

    const app = await prisma.app.update({
      where: { id },
      data: {
        name,
        platform,
        country,
        revenue,
        popularity,
        uaSpend,
      },
    })

    return NextResponse.json(app)
  } catch (error) {
    console.error('Error updating app:', error)
    return NextResponse.json(
      { error: 'Failed to update app' },
      { status: 500 }
    )
  }
}

// DELETE /api/apps/[id] - Delete a specific app
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.app.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'App deleted successfully' })
  } catch (error) {
    console.error('Error deleting app:', error)
    return NextResponse.json(
      { error: 'Failed to delete app' },
      { status: 500 }
    )
  }
}
