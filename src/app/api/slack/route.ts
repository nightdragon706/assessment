import { NextRequest, NextResponse } from 'next/server'
import type { SQLMessage } from '@/types/chat'

async function postToSlack(channel: string, text: string) {
    const token = process.env.SLACK_BOT_TOKEN
    if (!token || !channel || !text) return
    await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text })
    })
}

// Simple in-memory history per channel (ephemeral; resets on redeploy)
type SlackChannelState = {
    history: SQLMessage[]
    lastQueryResult?: {
        data: any[]
        rowCount: number
        executionTime: number
    }
    lastSqlQuery?: string
}

const slackChannelState = new Map<string, SlackChannelState>()
const MAX_HISTORY = 20

function getStateForChannel(channel: string): SlackChannelState {
    return slackChannelState.get(channel) || { history: [] }
}

function setStateForChannel(channel: string, state: SlackChannelState) {
    const trimmedHistory = state.history.slice(-MAX_HISTORY)
    slackChannelState.set(channel, { ...state, history: trimmedHistory })
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

            // Restrict to a single channel if configured
            const allowedChannel = process.env.SLACK_CHANNEL_ID
            if (allowedChannel && channel !== allowedChannel) {
                return NextResponse.json({ ok: true })
            }

            // Build conversation state for this channel
            const existingState = getStateForChannel(channel)
            const existingHistory = existingState.history
            const userMsg: SQLMessage = {
                role: 'user',
                content: text,
                timestamp: new Date().toISOString()
            }
            const historyToSend = [...existingHistory, userMsg]

            // Forward to chat API
            const base = process.env.APP_BASE_URL || 'http://localhost:3000'
            const chatRes = await fetch(`${base}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-origin': 'slack' },
                body: JSON.stringify({
                    message: text,
                    conversationHistory: historyToSend,
                    lastQueryResult: existingState.lastQueryResult,
                    lastSqlQuery: existingState.lastSqlQuery,
                    requestType: 'query'
                })
            })

            const chat = await chatRes.json().catch(() => null)
            const answer = chat?.response || "Sorry, I couldn't process that."

            // Post answer back into the same Slack channel
            await postToSlack(channel, answer)

            // Update conversation history with assistant reply
            const assistantMsg: SQLMessage = {
                role: 'assistant',
                content: answer,
                timestamp: new Date().toISOString()
            }
            setStateForChannel(channel, {
                history: [...historyToSend, assistantMsg],
                lastQueryResult: chat?.queryResult,
                lastSqlQuery: chat?.sqlQuery
            })

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