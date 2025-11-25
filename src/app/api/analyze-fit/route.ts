import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { userId, jobTitle } = await req.json();

        if (!userId || !jobTitle) {
            return NextResponse.json(
                { error: 'userId and jobTitle are required' },
                { status: 400 }
            );
        }

        console.log('🧠 Analyzing fit for:', userId, '→', jobTitle);

        // Step 1: Check cache first (within 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const cached = await prisma.careerAnalysis.findUnique({
            where: {
                userId_jobTitle: {
                    userId,
                    jobTitle
                }
            }
        });

        if (cached && cached.expiresAt > new Date()) {
            console.log('✅ Cache hit! Using saved analysis');
            return NextResponse.json({
                intelligentQuery: cached.intelligentQuery,
                reasoning: cached.reasoning,
                keyStrengths: cached.keyStrengths ? JSON.parse(cached.keyStrengths) : null,
                potentialGaps: cached.potentialGaps ? JSON.parse(cached.potentialGaps) : null,
                cached: true
            });
        }

        // Step 2: Fetch user's CV
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.parsedCV) {
            return NextResponse.json(
                { error: 'User CV not found. Please upload your CV first.' },
                { status: 404 }
            );
        }

        const parsedCV = JSON.parse(user.parsedCV);
        console.log('📄 User CV found:', parsedCV.name);

        // Step 3: Call Claude to analyze fit
        console.log('🤖 Calling Claude for deep analysis...');

        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            messages: [{
                role: 'user',
                content: `You are an expert career advisor. Analyze this person's fit for "${jobTitle}" roles.

CV Summary:
- Name: ${parsedCV.name || 'Anonymous'}
- Experience: ${JSON.stringify(parsedCV.experience || [])}
- Skills: ${JSON.stringify(parsedCV.skills || [])}
- Education: ${JSON.stringify(parsedCV.education || [])}
- Summary: ${parsedCV.summary || 'None provided'}

TASK: Generate an intelligent job search query that will find "${jobTitle}" roles SPECIFICALLY suitable for THIS person, not just generic ${jobTitle} jobs.

Consider:
1. **Transferable skills** - What from their background applies?
2. **Career trajectory** - Are they transitioning? Leveling up?
3. **Hidden strengths** - What do they bring that's unique?
4. **Level appropriateness** - Junior/Mid/Senior based on experience
5. **Industry context** - What industries match their background?
6. **Red flags to avoid** - What types of ${jobTitle} roles would be a BAD fit?

Return ONLY a JSON object (no markdown, no explanation):
{
  "intelligentQuery": "detailed search string for Perplexity that captures their unique fit",
  "reasoning": "1-2 sentence explanation of why this fits them",
  "keyStrengths": ["strength1", "strength2", "strength3"],
  "potentialGaps": ["gap1", "gap2"]
}

Be specific and actionable. The search query should help find jobs they'll ACTUALLY get interviews for.`
            }]
        });

        const content = message.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected AI response format');
        }

        // Parse Claude's analysis
        let analysis;
        try {
            const jsonText = content.text.trim();
            analysis = JSON.parse(jsonText);
            console.log('✅ Claude analysis complete');
        } catch (parseError) {
            console.error('Failed to parse Claude response:', content.text);
            throw new Error('AI returned invalid analysis');
        }

        // Step 4: Save to cache
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await prisma.careerAnalysis.upsert({
            where: {
                userId_jobTitle: { userId, jobTitle }
            },
            create: {
                userId,
                jobTitle,
                intelligentQuery: analysis.intelligentQuery,
                reasoning: analysis.reasoning,
                keyStrengths: JSON.stringify(analysis.keyStrengths || []),
                potentialGaps: JSON.stringify(analysis.potentialGaps || []),
                expiresAt
            },
            update: {
                intelligentQuery: analysis.intelligentQuery,
                reasoning: analysis.reasoning,
                keyStrengths: JSON.stringify(analysis.keyStrengths || []),
                potentialGaps: JSON.stringify(analysis.potentialGaps || []),
                expiresAt
            }
        });

        console.log('💾 Analysis saved to cache');

        return NextResponse.json({
            intelligentQuery: analysis.intelligentQuery,
            reasoning: analysis.reasoning,
            keyStrengths: analysis.keyStrengths,
            potentialGaps: analysis.potentialGaps,
            cached: false
        });

    } catch (error: any) {
        console.error('❌ Analyze fit error:', error.message);

        return NextResponse.json({
            error: 'Failed to analyze fit',
            details: error.message
        }, { status: 500 });
    }
}
