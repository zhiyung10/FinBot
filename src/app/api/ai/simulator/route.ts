import { NextRequest, NextResponse } from 'next/server'
import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { getBedrockClient, getModelId, isBedrockConfigured } from '@/lib/bedrock/client'
import { SIMULATOR_SYSTEM_PROMPT } from '@/lib/bedrock/prompts'
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
        error: 'What-If Simulator is not configured. Please set AWS credentials in environment variables.',
        notConfigured: true,
      }, { status: 503 })
    }

    const { scenario } = await request.json()

    if (!scenario || typeof scenario !== 'string') {
      return NextResponse.json({ error: 'Scenario description is required' }, { status: 400 })
    }

    // Build financial context
    const financialContext = await buildFinancialContext(user.id)
    const contextText = formatContextForPrompt(financialContext)

    // Calculate disposable income
    const disposableIncome = financialContext.monthlyIncome - financialContext.essentialExpenses -
      financialContext.monthlySubscriptions -
      financialContext.debts.reduce((sum, d) => sum + d.minimumPayment, 0)

    const enrichedContext = `${contextText}\nEstimated Disposable Income: RM${disposableIncome.toLocaleString()}/month\n`

    // Call Bedrock
    const client = getBedrockClient()!
    const command = new ConverseCommand({
      modelId: getModelId(),
      system: [{ text: SIMULATOR_SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [{ text: `${enrichedContext}\nSCENARIO:\n${scenario}` }],
        },
      ],
      inferenceConfig: {
        maxTokens: 3000,
        temperature: 0.5,
      },
    })

    const response = await client.send(command)
    const assistantMessage = response.output?.message?.content?.[0]?.text ?? 'Unable to analyze this scenario. Please try again.'

    return NextResponse.json({ analysis: assistantMessage })
  } catch (error) {
    console.error('Simulator Error:', error)
    return NextResponse.json(
      { error: 'An error occurred while simulating. Please try again.' },
      { status: 500 }
    )
  }
}
