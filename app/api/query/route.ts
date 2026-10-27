import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { query, visitSummary } = await req.json()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are VaazH, a field sales intelligence assistant. Answer this manager's query based on the visit data below. Be concise — 2-3 sentences max.

Visit Data:
${visitSummary}

Manager Query: ${query}`
    }]
  })

  const answer = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ answer })
}

