import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    salary: string;
    url: string;
}

interface RankingRequest {
    jobs: Job[];
    cvText: string;
}

export async function POST(req: NextRequest) {
    try {
        const { jobs, cvText }: RankingRequest = await req.json();

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({ rankedJobs: [] });
        }

        // Create a prompt for Claude to rank jobs
        const rankingPrompt = `You are a career advisor helping someone find the best job matches based on their CV.

CV Summary:
${cvText.substring(0, 2000)}

Jobs to evaluate:
${jobs.map((job, idx) => `
Job ${idx + 1}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description.substring(0, 300)}
`).join('\n---\n')}

For each job, provide:
1. Overall match score (0-100)
2. Breakdown scores:
   - Skills Match (0-40): How well candidate's skills align with job requirements
   - Experience Fit (0-30): Whether experience level matches (entry/mid/senior)
   - Role Relevance (0-20): How relevant the role is to career goals
   - Other Factors (0-10): Location, company type, etc.
3. Matching skills (list of 2-3 key skills that match)
4. Missing skills (list of 1-2 skills candidate should develop)
5. Brief reason (max 12 words)

Return ONLY a JSON array with this exact format:
[
  {
    "jobIndex": 0,
    "score": 85,
    "breakdown": {
      "skills": 35,
      "experience": 25,
      "relevance": 18,
      "other": 7
    },
    "matchingSkills": ["Python", "React", "AWS"],
    "missingSkills": ["Kubernetes"],
    "reason": "Strong technical match, great growth opportunity"
  }
]

Be concise and accurate.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 3072,
            messages: [{ role: 'user', content: rankingPrompt }],
        });

        const responseText = (response.content[0] as any).text;

        // Extract JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Failed to parse ranking response');
            return NextResponse.json({ rankedJobs: jobs });
        }

        const rankings = JSON.parse(jsonMatch[0]);

        // Merge scores with jobs
        const rankedJobs = jobs.map((job, idx) => {
            const ranking = rankings.find((r: any) => r.jobIndex === idx);
            return {
                ...job,
                matchScore: ranking?.score || 50,
                matchReason: ranking?.reason || 'Potential match',
                scoreBreakdown: ranking?.breakdown || {
                    skills: 20,
                    experience: 15,
                    relevance: 10,
                    other: 5,
                },
                matchingSkills: ranking?.matchingSkills || [],
                missingSkills: ranking?.missingSkills || [],
            };
        });

        // Sort by score descending
        rankedJobs.sort((a, b) => b.matchScore - a.matchScore);

        return NextResponse.json({ rankedJobs });
    } catch (error) {
        console.error('Error ranking jobs:', error);
        return NextResponse.json({ error: 'Failed to rank jobs' }, { status: 500 });
    }
}
