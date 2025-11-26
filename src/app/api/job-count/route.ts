import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to log to file
const logToFile = (message: string, data?: any) => {
    try {
        const logPath = path.join(process.cwd(), 'debug-job-search.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
        fs.appendFileSync(logPath, logEntry);
    } catch (e) {
        console.error('Failed to write to log file:', e);
    }
};

export async function POST(req: NextRequest) {
    try {
        const { jobTitle, intelligentQuery, location = 'United Kingdom' } = await req.json();

        logToFile('=== NEW SEARCH REQUEST ===');
        logToFile('Request params:', { jobTitle, intelligentQuery, location });

        // Accept either intelligentQuery (AI-generated) or jobTitle (generic)
        const searchQuery = intelligentQuery || jobTitle;

        if (!searchQuery) {
            logToFile('❌ Missing search query');
            return NextResponse.json(
                { error: 'jobTitle or intelligentQuery is required' },
                { status: 400 }
            );
        }

        const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

        if (!PERPLEXITY_API_KEY) {
            logToFile('❌ PERPLEXITY_API_KEY missing');
            throw new Error('PERPLEXITY_API_KEY not configured');
        }

        // Helper to query Perplexity
        const queryPerplexity = async (query: string) => {
            logToFile('🔍 Querying Perplexity with:', query);

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

            if (!response.ok) {
                const errorText = await response.text();
                logToFile('❌ Perplexity API Error:', { status: response.status, text: errorText });
                throw new Error(`Perplexity API failed: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            logToFile('✅ Perplexity Raw Response:', content ? content.substring(0, 200) + '...' : 'Empty');

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
                logToFile('🤖 Attempting AI Query');
                jobData = await queryPerplexity(intelligentQuery);
                logToFile('🤖 AI Query Result:', { count: jobData.count });
            } catch (e: any) {
                logToFile('❌ AI Query Failed:', e.message);
            }
        }

        // 2. Fallback to Generic Search if no results or AI query failed
        if (!jobData.count || jobData.count === 0) {
            logToFile('⚠️ No results. Falling back to generic query.');
            usedQuery = `${jobTitle} jobs`;
            try {
                jobData = await queryPerplexity(usedQuery);
                logToFile('🔎 Generic Query Result:', { count: jobData.count });
            } catch (e: any) {
                logToFile('❌ Generic Query Failed:', e.message);
            }
        }

        logToFile('✅ Final Response:', { count: jobData.count, jobs: jobData.jobs?.length });

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
        logToFile('❌ CRITICAL ERROR:', error.message);
        console.error('❌ Job count error:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch job count',
            details: error.message
        }, { status: 500 });
    }
}
