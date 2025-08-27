import { NextRequest, NextResponse } from 'next/server'

// Helper: Post a message to Slack channel using bot token
async function postToSlackChannel(text: string) {
    const token = process.env.SLACK_BOT_TOKEN
    const channel = process.env.SLACK_CHANNEL_ID
    if (!token || !channel) {
        console.log('Slack not configured - skipping message')
        return
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channel, text })
    })
    const json = await response.json()
    if (!json.ok) {
        console.error('Error sending to Slack:', json)
    }
}

// POST /api/slack - Slack Events endpoint
export async function POST(request: NextRequest) {
    try {
        const data = await request.json()

        // Slack URL verification
        if (data?.type === 'url_verification') {
            const challenge = data?.challenge
            return NextResponse.json({ challenge })
        }

        return new NextResponse('', { status: 200, headers: { 'Content-Type': 'application/json' } })
    } catch (e: any) {
        if (e?.type === 'invalid-json' || e instanceof SyntaxError) {
            console.log('JSON decode error:', e?.message || e)
            return new NextResponse('', { status: 400 })
        }
        console.error('Error in /api/slack:', e)
        return new NextResponse('', { status: 500 })
    }
}


