import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { jobTitle, intelligentQuery, location = 'United Kingdom' } = await req.json();

        // Accept either intelligentQuery (AI-generated) or jobTitle (generic)
        const searchQuery = intelligentQuery || jobTitle;

        if (!searchQuery) {
            return NextResponse.json(
                { error: 'jobTitle or intelligentQuery is required' },
                { status: 400 }
            );
        }

        console.log('🔍 Fetching jobs:', intelligentQuery ? '(AI-powered)' : '(generic)');
        console.log('  Query:', searchQuery.substring(0, 100) + '...');

        const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

        if (!PERPLEXITY_API_KEY) {
            throw new Error('PERPLEXITY_API_KEY not configured');
        }

        // Query Perplexity with intelligent search
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [{
                    role: 'user',
                    content: `Find current job listings in ${location} for: ${searchQuery}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "count": <total number of jobs found>,
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "url": "https://...",
      "salary": "Salary range or null"
    }
  ]
}

Include up to 10 recent, relevant job listings. If no jobs found, return count: 0 and empty jobs array.`
                }],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Perplexity API error:', errorText);
            throw new Error(`Perplexity API failed: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in Perplexity response');
        }

        // Parse the JSON response
        let jobData;
        try {
            // Clean up potential markdown formatting
            const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            jobData = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('Failed to parse Perplexity response:', content);
            // Return a fallback
            jobData = {
                count: 0,
                jobs: [],
                note: 'Could not parse job data'
            };
        }

        console.log('✅ Found', jobData.count, 'jobs');

        return NextResponse.json({
            success: true,
            jobTitle: jobTitle || 'AI-matched roles',
            location,
            count: jobData.count || 0,
            jobs: jobData.jobs || [],
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Job count error:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch job count',
            details: error.message
        }, { status: 500 });
    }
}
