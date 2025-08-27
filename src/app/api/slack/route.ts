import { NextRequest, NextResponse } from 'next/server'

async function postToSlack(channel: string, text: string) {
    const token = process.env.SLACK_BOT_TOKEN
    if (!token || !channel || !text) return
    await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text })
    })
}

export async function POST(request: NextRequest) {
    try {
        // Ignore Slack retry deliveries to prevent duplicates
        const retryNum = request.headers.get('x-slack-retry-num')
        if (retryNum) {
            return new NextResponse('', { status: 200, headers: { 'Content-Type': 'application/json' } })
        }

        const data = await request.json()

        // Slack URL verification
        if (data?.type === 'url_verification') {
            return NextResponse.json({ challenge: data?.challenge })
        }

        if (data?.type === 'event_callback') {
            console.log('Slack event callback received:', data)
            const event = data.event || {}
            const text: string = event.text || ''
            const channel: string = event.channel
            const user = event.user
            const subtype = event.subtype
            const botId = event.bot_id
            const botUserIdFromAuth = Array.isArray(data.authorizations) && data.authorizations.length > 0 ? data.authorizations[0]?.user_id : undefined
            const botUserIdFromEnv = process.env.SLACK_BOT_USER_ID
            const isFromThisBot = (user && (user === botUserIdFromAuth || user === botUserIdFromEnv)) || Boolean(botId)

            // Ignore non-user events and bot messages
            if (!text || !channel || !user || subtype || isFromThisBot) {
                return NextResponse.json({ ok: true })
            }

            // Forward to chat API
            const base = process.env.APP_BASE_URL || 'http://localhost:3000'
            const chatRes = await fetch(`${base}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-origin': 'slack' },
                body: JSON.stringify({
                    message: text,
                    conversationHistory: [],
                    requestType: 'query'
                })
            })

            const chat = await chatRes.json().catch(() => null)
            const answer = chat?.response || "Sorry, I couldn't process that."

            // Post answer back into the same channel
            await postToSlack(channel, answer)

            return NextResponse.json({ ok: true })
        }

        return new NextResponse('', { status: 200, headers: { 'Content-Type': 'application/json' } })
    } catch (e: any) {
        if (e?.type === 'invalid-json' || e instanceof SyntaxError) {
            return new NextResponse('', { status: 400 })
        }
        return new NextResponse('', { status: 500 })
    }
}