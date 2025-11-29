import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getOrCreateUser } from '@/lib/clerkAuth';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        // Check for API key
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: 'Interview coach is not configured (missing API key)' },
                { status: 500 }
            );
        }

        const user = await getOrCreateUser();
        const { messages, jobTitle, company, jobDescription } = await req.json();

        // Get user's CV data
        const parsedCV = user.parsedCV ? JSON.parse(user.parsedCV) : null;

        const cvSummary = parsedCV ? `
Candidate Name: ${parsedCV.name}
Summary: ${parsedCV.summary || 'N/A'}
Skills: ${parsedCV.skills?.join(', ') || 'N/A'}
Experience: ${parsedCV.experience?.map((exp: any) => `${exp.role} at ${exp.company}`).join('; ') || 'N/A'}
        `.trim() : 'No CV provided.';

        const systemPrompt = `You are an experienced, professional, yet encouraging hiring manager conducting a job interview.

JOB DETAILS:
Role: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

CANDIDATE INFO:
${cvSummary}

YOUR GOAL:
Conduct a realistic interview. 
1. Start by introducing yourself and asking the candidate to introduce themselves.
2. Ask relevant questions based on the job description and their CV.
3. Dive deeper into their responses if they are vague.
4. Keep your responses concise (spoken conversation style).
5. After the candidate answers, briefly acknowledge their answer before moving to the next question.
6. If the user asks for feedback, provide constructive criticism on their last answer.

Output ONLY your spoken response. Do not include "Interviewer:" prefix.`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages: messages || [],
        });

        const aiResponse = response.content[0].type === 'text'
            ? response.content[0].text
            : '';

        return NextResponse.json({
            response: aiResponse,
            success: true
        });

    } catch (error: any) {
        console.error('❌ Error in interview coach:', error);
        return NextResponse.json({
            error: 'Failed to generate interview response',
            details: error.message
        }, { status: 500 });
    }
}
