import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getOrCreateUser } from '@/lib/clerkAuth';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        console.log('📝 Cover letter generation started');

        // Check for API key first
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('❌ ANTHROPIC_API_KEY is not set in environment variables');
            return NextResponse.json(
                {
                    error: 'Cover letter generation is not configured',
                    details: 'Missing ANTHROPIC_API_KEY environment variable. Please add it to your .env.local file.'
                },
                { status: 500 }
            );
        }

        console.log('✅ API key found');

        // Get authenticated user
        const user = await getOrCreateUser();
        console.log('✅ User authenticated:', user.id);

        const { jobTitle, company, jobDescription, additionalNotes } = await req.json();
        console.log('✅ Request parsed - Job:', jobTitle, 'Company:', company);

        if (!jobTitle || !company || !jobDescription) {
            console.error('❌ Missing required fields');
            return NextResponse.json(
                { error: 'Job title, company, and job description are required' },
                { status: 400 }
            );
        }

        // Get user's CV data from database
        const parsedCV = user.parsedCV ? JSON.parse(user.parsedCV) : null;

        if (!parsedCV) {
            console.error('❌ No CV found for user');
            return NextResponse.json(
                { error: 'Please upload your CV first from the Career Galaxy' },
                { status: 400 }
            );
        }

        console.log('✅ CV data retrieved');

        // Build CV summary
        const cvSummary = `
Name: ${parsedCV.name}
Summary: ${parsedCV.summary || 'N/A'}
Skills: ${parsedCV.skills?.join(', ') || 'N/A'}
Experience: ${parsedCV.experience?.map((exp: any) => `${exp.role} at ${exp.company} (${exp.duration})`).join('; ') || 'N/A'}
Education: ${parsedCV.education?.map((edu: any) => `${edu.degree} from ${edu.institution}`).join('; ') || 'N/A'}
    `.trim();

        // Generate cover letter with Claude
        console.log('🤖 Generating cover letter with Claude...');

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [{
                role: 'user',
                content: `You are an expert career advisor helping to write a compelling cover letter.

User's CV Summary:
${cvSummary}

User's Career Level: ${user.currentLevel ? `Level ${user.currentLevel}` : 'N/A'}
Years of Experience: ${user.yearsExperience || 'N/A'}

Job Details:
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}

Create a professional cover letter that:
1. Highlights relevant experience and skills from the CV
2. Addresses key requirements in the job description
3. Shows genuine interest in the role and company
4. Is professional yet personable
5. Is 250-350 words
6. Includes proper formatting with paragraphs

Cover Letter:`
            }]
        });

        const coverLetter = message.content[0].type === 'text'
            ? message.content[0].text
            : '';

        console.log('✅ Cover letter generated successfully');

        return NextResponse.json({
            coverLetter,
            success: true
        });

    } catch (error: any) {
        console.error('❌ Error generating cover letter:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        return NextResponse.json({
            error: 'Failed to generate cover letter',
            details: error.message
        }, { status: 500 });
    }
}
