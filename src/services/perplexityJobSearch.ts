import Anthropic from '@anthropic-ai/sdk';

interface PerplexitySearchParams {
    queries: string[];
    location: string;
    experienceLevel: string;
    limit: number;
}

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    salary: string;
    url: string;
    source: string;
}

export class PerplexityJobSearchService {
    private static readonly API_URL = 'https://api.perplexity.ai/chat/completions';
    private static readonly API_KEY = process.env.PERPLEXITY_API_KEY;

    static async search(params: PerplexitySearchParams): Promise<Job[]> {
        const { queries, location, experienceLevel, limit } = params;

        // Build search query
        const roleQuery = queries.join(' OR ');
        const expLabel = this.formatExperienceLevel(experienceLevel);

        const prompt = `Find EXACTLY ${limit} current job openings that match these criteria:
- Role: ${roleQuery}
- Location: ${location}
- Experience Level: ${expLabel}

CRITICAL INSTRUCTIONS:
1. Search for REAL, ACTIVE job postings from job boards (LinkedIn, Indeed, Glassdoor, company career pages)
2. Return ONLY jobs that are currently accepting applications
3. Include the direct application URL for each job
4. Return EXACTLY a valid JSON array, nothing else

Required JSON format (return ONLY this, no markdown, no explanations):
[
  {
    "title": "exact job title from posting",
    "company": "company name",
    "location": "city, country",
    "salary": "salary range if available, otherwise 'Competitive'",
    "description": "2-3 sentence summary of the role",
    "url": "direct application URL"
  }
]

Remember: Return ONLY the JSON array, no additional text.`;

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar-pro', // Updated to correct model name
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a job search assistant. Always return valid JSON arrays only, never include markdown formatting or explanations.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    return_citations: true,
                    return_related_questions: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Perplexity API error:', response.status, errorText);
                throw new Error(`Perplexity API failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('Perplexity raw response:', JSON.stringify(data, null, 2));

            // Extract content from Perplexity response
            const content = data.choices?.[0]?.message?.content || '';
            console.log('Perplexity content:', content);

            // Parse JSON from content (handle markdown code blocks)
            const jobs = this.parseJobsFromContent(content);

            // Add unique IDs and source
            return jobs.map((job: any, index: number) => ({
                id: `perplexity-${Date.now()}-${index}`,
                title: job.title || 'Unknown Position',
                company: job.company || 'Unknown Company',
                location: job.location || location,
                description: job.description || 'No description available',
                salary: job.salary || 'Competitive',
                url: job.url || '#',
                source: 'perplexity'
            }));
        } catch (error) {
            console.error('Perplexity search error:', error);
            throw error;
        }
    }

    private static parseJobsFromContent(content: string): any[] {
        try {
            // Remove markdown code blocks if present
            let cleaned = content.trim();
            cleaned = cleaned.replace(/```json\s*/g, '');
            cleaned = cleaned.replace(/```\s*/g, '');
            cleaned = cleaned.trim();

            // Find JSON array in content
            const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // If no array found, try parsing the whole thing
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Failed to parse jobs from content:', error);
            console.error('Content was:', content);
            return [];
        }
    }

    private static formatExperienceLevel(level: string): string {
        const levelMap: Record<string, string> = {
            'entry': 'Entry-level / Junior (0-2 years)',
            'entry_level': 'Entry-level / Junior (0-2 years)',
            'mid': 'Mid-level (2-5 years)',
            'senior': 'Senior (5-10 years)',
            'lead': 'Lead / Manager (10+ years)',
            'any': 'All experience levels'
        };
        return levelMap[level.toLowerCase()] || 'All experience levels';
    }
}
