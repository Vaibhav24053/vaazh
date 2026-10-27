import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/app/lib/supabase-admin'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

created_at: new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Bolna webhook received:', JSON.stringify(body, null, 2))
    const transcript = body?.data?.transcript || 
                       body?.transcript || 
                       body?.call_transcript || ''

    if (!transcript) {
      return NextResponse.json({ 
        success: false, 
        error: 'No transcript found' 
      })
    }

    // Extract structured data using Claude
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are extracting field sales visit data from a voice transcript.

Extract the following fields from this transcript. Return ONLY valid JSON, nothing else.

Transcript: "${transcript}"

Return this exact JSON structure:
{
  "chemist_name": "name of chemist/pharmacy or null",
  "area": "area/location mentioned or null",
  "products_discussed": "products mentioned or null",
  "outcome": "interested/not interested/order placed/follow up needed or null",
  "competitor_mention": "any competitor brand mentioned or null",
  "followup_date": "follow up date if mentioned or null",
  "rep_name": "rep name if mentioned or null"
}`
      }]
    })

    const rawText = extraction.content[0].type === 'text' 
      ? extraction.content[0].text 
      : ''
    
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const extracted = JSON.parse(cleanText)
    console.log('Extracted data:', extracted)

    // Save to Supabase
    const { data, error } = await supabaseAdmin
      .from('visits')
      .insert({
        chemist_name: extracted.chemist_name,
        area: extracted.area,
        products_discussed: extracted.products_discussed,
        outcome: extracted.outcome,
        competitor_mention: extracted.competitor_mention,
        followup_date: extracted.followup_date,
        raw_transcript: transcript
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error })
    }

    // Flag competitor intel separately
    if (extracted.competitor_mention && data?.[0]?.id) {
      await supabaseAdmin
        .from('competitor_intel')
        .insert({
          visit_id: data[0].id,
          brand_mentioned: extracted.competitor_mention,
          detail: `Mentioned in visit at ${extracted.chemist_name}`
        })
    }

    return NextResponse.json({ success: true, data })

  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ success: false, error: String(err) })
  }
}

