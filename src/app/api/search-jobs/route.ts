import { NextRequest, NextResponse } from 'next/server';
import { JobSearchService } from '@/services/jobSearchService';
import { PerplexityJobSearchService } from '@/services/perplexityJobSearch';

// Calculate relevance score between CV and job
function calculateRelevance(job: any, cvText: string, experienceLevel: string): number {
    let score = 0;
    const cvLower = cvText.toLowerCase();
    const titleLower = job.title.toLowerCase();
    const descLower = (job.description || '').toLowerCase();

    // 1. Experience level match (30 points)
    const jobLevel = inferJobLevel(titleLower);
    if (jobLevel === experienceLevel) {
        score += 30;
    } else if (isAdjacentLevel(jobLevel, experienceLevel)) {
        score += 15;
    }

    // 2. Title keyword overlap (20 points)
    const titleWords = titleLower.split(/\s+/);
    const cvWords = new Set(cvLower.split(/\s+/));
    const titleMatches = titleWords.filter((word: string) => word.length > 3 && cvWords.has(word)).length;
    score += Math.min(20, titleMatches * 4);

    // 3. Skills overlap (30 points)
    const commonSkills = ['javascript', 'python', 'react', 'node', 'typescript', 'sql', 'aws', 'docker',
        'java', 'management', 'leadership', 'agile', 'excel', 'analytics'];
    const skillMatches = commonSkills.filter((skill: string) =>
        cvLower.includes(skill) && (titleLower.includes(skill) || descLower.includes(skill))
    ).length;
    score += Math.min(30, skillMatches * 6);

    // 4. Description relevance (20 points)
    const descWords = descLower.split(/\s+/).filter((w: string) => w.length > 4);
    const descMatches = descWords.filter((word: string) => cvWords.has(word)).length;
    score += Math.min(20, Math.floor(descMatches / 10) * 5);

    return Math.min(100, Math.round(score));
}

function inferJobLevel(title: string): string {
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) return 'senior';
    if (title.includes('junior') || title.includes('graduate') || title.includes('entry')) return 'entry';
    if (title.includes('head') || title.includes('director') || title.includes('manager')) return 'lead';
    return 'mid';
}

function isAdjacentLevel(level1: string, level2: string): boolean {
    const levels = ['entry', 'mid', 'senior', 'lead'];
    const idx1 = levels.indexOf(level1);
    const idx2 = levels.indexOf(level2);
    return Math.abs(idx1 - idx2) === 1;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const queries = body.queries || [body.query || 'software developer'];
        const location = body.location || 'London, United Kingdom';
        const limit = body.limit || 10;
        const experienceLevel = body.experienceLevel || 'any';
        const workType = body.workType || 'any';
        const cvText = body.cvText || '';

        console.log('Job search params:', { queries, location, limit, experienceLevel, hasCvText: !!cvText });

        let jobs: any[] = [];
        let searchSource = 'unknown';

        // Try Perplexity first (primary source)
        try {
            console.log('🔍 Searching with Perplexity AI...');
            jobs = await PerplexityJobSearchService.search({
                queries,
                location,
                experienceLevel,
                limit: limit * 2 // Fetch more to allow filtering
            });
            searchSource = 'perplexity';
            console.log(`✅ Perplexity returned ${jobs.length} jobs`);
        } catch (perplexityError) {
            console.error('⚠️ Perplexity search failed, falling back to traditional APIs:', perplexityError);

            // Fallback to existing job boards
            try {
                jobs = await JobSearchService.search({
                    queries: queries,
                    location: location,
                    experienceLevel: experienceLevel,
                    workType: workType,
                    limit: limit * 2
                });
                searchSource = 'fallback';
                console.log(`✅ Fallback APIs returned ${jobs.length} jobs`);
            } catch (fallbackError) {
                console.error('❌ Both Perplexity and fallback failed:', fallbackError);
                return NextResponse.json({
                    jobs: [],
                    error: 'All job search services failed',
                    searchSource: 'none'
                });
            }
        }

        // Calculate relevance scores if CV provided
        if (cvText && jobs.length > 0) {
            jobs = jobs.map(job => ({
                ...job,
                matchScore: calculateRelevance(job, cvText, experienceLevel),
                matchReason: generateMatchReason(job, cvText)
            }));

            // Filter out low-relevance jobs (< 20% match)
            jobs = jobs.filter(job => (job.matchScore || 0) >= 20);

            // Sort by relevance score (highest first)
            jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

            // Limit to requested count
            jobs = jobs.slice(0, limit);
        } else {
            // No CV text, just limit results
            jobs = jobs.slice(0, limit);
        }

        console.log(`📊 Returning ${jobs.length} jobs (source: ${searchSource})`);

        return NextResponse.json({
            jobs,
            searchSource,
            totalFound: jobs.length
        });
    } catch (error) {
        console.error('Error in job search API:', error);
        return NextResponse.json({
            error: 'Failed to search jobs',
            jobs: [],
            searchSource: 'error'
        }, { status: 500 });
    }
}

function generateMatchReason(job: any, cvText: string): string {
    const score = job.matchScore || 0;
    if (score >= 70) return 'Excellent match for your skills and experience';
    if (score >= 50) return 'Good fit based on your background';
    if (score >= 30) return 'Potential match worth exploring';
    return 'Some relevant aspects';
}
