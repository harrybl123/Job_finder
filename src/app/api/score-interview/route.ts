import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
    try {
        const { messages, jobTitle, jobDescription } = await req.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: 'No conversation to score' }, { status: 400 });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Build conversation for analysis
        const conversationText = messages
            .map((msg: any) => `${msg.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${msg.content}`)
            .join('\n\n');

        const prompt = `You are an expert interview coach analyzing a practice interview session.

JOB CONTEXT:
Position: ${jobTitle || 'General Role'}
Description: ${jobDescription || 'N/A'}

CONVERSATION TRANSCRIPT:
${conversationText}

ANALYZE THIS INTERVIEW AND PROVIDE SCORES:

Score the candidate's performance in these categories (0-100):

1. STRUCTURE & FOCUS (40% weight)
   - Organization and clarity of answers
   - Conciseness without rambling
   - Staying on topic
   - Logical flow

2. CONTENT & IMPACT (40% weight)
   - Depth and relevance of experience shared
   - Specific examples and quantification
   - Alignment with job requirements
   - Value demonstrated

3. LANGUAGE & TONE (20% weight)
   - Professional communication
   - Confident and positive tone
   - Use of "I" statements (ownership)
   - Grammar and articulation

For each category, provide:
- Score (0-100)
- 2-3 specific strengths
- 2-3 specific areas for improvement

Then provide:
- Overall Readiness Score (weighted average)
- Top 3 action items to improve

Return ONLY valid JSON in this exact format:
{
  "categories": [
    {
      "name": "Structure & Focus",
      "weight": 40,
      "score": 85,
      "strengths": ["Clear STAR format", "Concise responses"],
      "improvements": ["Add more context upfront", "Reduce filler words"]
    },
    {
      "name": "Content & Impact", 
      "weight": 40,
      "score": 78,
      "strengths": ["Quantified results well", "Relevant examples"],
      "improvements": ["More technical depth", "Connect to job requirements"]
    },
    {
      "name": "Language & Tone",
      "weight": 20,
      "score": 82,
      "strengths": ["Confident delivery", "Professional tone"],
      "improvements": ["Vary pace", "More enthusiasm"]
    }
  ],
  "overallScore": 81,
  "actionItems": [
    "Practice STAR method for behavioral questions",
    "Prepare 3-4 quantified achievements",
    "Research company values more deeply"
  ]
}`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type');
        }

        // Parse JSON from response
        let scoreData;
        try {
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                scoreData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            console.error('JSON parse error:', e);
            return NextResponse.json({ error: 'Failed to parse score data' }, { status: 500 });
        }

        return NextResponse.json(scoreData);

    } catch (error: any) {
        console.error('Score Interview Error:', error);
        return NextResponse.json({
            error: 'Failed to score interview',
            details: error.message
        }, { status: 500 });
    }
}
