import { NextRequest, NextResponse } from 'next/server'
import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { getBedrockClient, getModelId, isBedrockConfigured } from '@/lib/bedrock/client'
import { FINANCIAL_ADVISOR_SYSTEM_PROMPT } from '@/lib/bedrock/prompts'
import { buildFinancialContext, formatContextForPrompt } from '@/lib/bedrock/context'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Bedrock configuration
    if (!isBedrockConfigured()) {
      return NextResponse.json({
        error: 'AI advisor is not configured. Please set AWS credentials in environment variables.',
        notConfigured: true,
      }, { status: 503 })
    }

    const { message, conversationHistory } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build financial context
    const financialContext = await buildFinancialContext(user.id)
    const contextText = formatContextForPrompt(financialContext)

    // Build conversation messages
    const messages: { role: string; content: { text: string }[] }[] = []

    // Add conversation history if available
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-10).forEach((msg: { role: string; content: string }) => {
        messages.push({
          role: msg.role,
          content: [{ text: msg.content }],
        })
      })
    }

    // Add the current user message with financial context
    messages.push({
      role: 'user',
      content: [{ text: `${contextText}\n\nUSER QUESTION:\n${message}` }],
    })

    // Call Bedrock
    const client = getBedrockClient()!
    const command = new ConverseCommand({
      modelId: getModelId(),
      system: [{ text: FINANCIAL_ADVISOR_SYSTEM_PROMPT }],
      messages: messages as ConverseCommand['input']['messages'],
      inferenceConfig: {
        maxTokens: 2048,
        temperature: 0.7,
      },
    })

    const response = await client.send(command)

    const assistantMessage = response.output?.message?.content?.[0]?.text ?? 'I was unable to generate a response. Please try again.'

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error('AI Advisor Error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    )
  }
}
