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

        // Helper to query Perplexity
        const queryPerplexity = async (query: string) => {
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
                        content: `Find current job listings in ${location} for: ${query}
    
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

            if (!response.ok) throw new Error(`Perplexity API failed: ${response.status}`);

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) throw new Error('No content in Perplexity response');

            // Clean and parse
            const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(jsonText);
        };

        // 1. Try Intelligent Query first (if available)
        let jobData = { count: 0, jobs: [] };
        let usedQuery = intelligentQuery;

        if (intelligentQuery) {
            try {
                console.log('🤖 Trying AI Query:', intelligentQuery);
                jobData = await queryPerplexity(intelligentQuery);
            } catch (e) {
                console.error('AI Query failed, falling back...');
            }
        }

        // 2. Fallback to Generic Search if no results or AI query failed
        if (!jobData.count || jobData.count === 0) {
            console.log('⚠️ No results with AI query. Falling back to generic title:', jobTitle);
            usedQuery = `${jobTitle} jobs`;
            try {
                jobData = await queryPerplexity(usedQuery);
            } catch (e) {
                console.error('Generic Query failed:', e);
            }
        }

        console.log('✅ Final Result:', jobData.count, 'jobs found');

        return NextResponse.json({
            success: true,
            jobTitle: jobTitle || 'AI-matched roles',
            location,
            count: jobData.count || 0,
            jobs: jobData.jobs || [],
            timestamp: new Date().toISOString(),
            usedQuery
        });

    } catch (error: any) {
        console.error('❌ Job count error:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch job count',
            details: error.message
        }, { status: 500 });
    }
}
