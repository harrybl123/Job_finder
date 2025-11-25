import { Job } from '@/components/JobResults';

interface SearchParams {
    queries: string[];
    location: string;
    experienceLevel?: string;
    workType?: string;
    limit?: number;
}

export class JobSearchService {
    private static SERPAPI_KEY = process.env.SERPAPI_KEY;
    private static ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
    private static ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
    private static REED_API_KEY = process.env.REED_API_KEY;

    static async search(params: SearchParams): Promise<Job[]> {
        const allJobs: Job[] = [];
        const seenUrls = new Set<string>();

        // 1. Try Adzuna (Primary - High Quality)
        if (this.ADZUNA_APP_ID && this.ADZUNA_APP_KEY) {
            try {
                const adzunaJobs = await this.searchAdzuna(params);
                this.addUniqueJobs(adzunaJobs, allJobs, seenUrls);
            } catch (error) {
                console.error('Adzuna search failed:', error);
            }
        }

        // 2. Try Reed (Secondary - UK Specific)
        if (this.REED_API_KEY) {
            try {
                const reedJobs = await this.searchReed(params);
                this.addUniqueJobs(reedJobs, allJobs, seenUrls);
            } catch (error) {
                console.error('Reed search failed:', error);
            }
        }

        // 3. Fallback to SerpAPI (Broadest Coverage)
        if (this.SERPAPI_KEY) {
            try {
                const serpJobs = await this.searchSerpApi(params);
                this.addUniqueJobs(serpJobs, allJobs, seenUrls);
            } catch (error) {
                console.error('SerpAPI search failed:', error);
            }
        }

        return allJobs;
    }

    private static addUniqueJobs(newJobs: Job[], allJobs: Job[], seenUrls: Set<string>) {
        for (const job of newJobs) {
            if (!seenUrls.has(job.url)) {
                seenUrls.add(job.url);
                allJobs.push(job);
            }
        }
    }

    private static async searchAdzuna(params: SearchParams): Promise<Job[]> {
        const results: Job[] = [];

        for (const query of params.queries) {
            try {
                const url = new URL('https://api.adzuna.com/v1/api/jobs/gb/search/1');
                url.searchParams.append('app_id', this.ADZUNA_APP_ID || '');
                url.searchParams.append('app_key', this.ADZUNA_APP_KEY || '');
                url.searchParams.append('what', query);
                url.searchParams.append('where', params.location);
                url.searchParams.append('results_per_page', '10');
                url.searchParams.append('content-type', 'application/json');

                const response = await fetch(url.toString());
                if (!response.ok) continue;

                const data = await response.json();

                if (data.results) {
                    const mapped = data.results.map((job: any) => ({
                        id: `adzuna-${job.id}`,
                        title: job.title,
                        company: job.company.display_name,
                        location: job.location.display_name,
                        description: job.description,
                        salary: job.salary_min ? `£${job.salary_min} - £${job.salary_max}` : 'Competitive',
                        url: job.redirect_url,
                        source: 'Adzuna'
                    }));
                    results.push(...mapped);
                }
            } catch (e) {
                console.error(`Adzuna search error for query "${query}":`, e);
            }
        }
        return results;
    }

    private static async searchReed(params: SearchParams): Promise<Job[]> {
        const results: Job[] = [];

        if (!this.REED_API_KEY) return [];

        for (const query of params.queries) {
            try {
                const url = new URL('https://www.reed.co.uk/api/1.0/search');
                url.searchParams.append('keywords', query);
                url.searchParams.append('locationName', params.location);

                const response = await fetch(url.toString(), {
                    headers: {
                        'Authorization': `Basic ${btoa(this.REED_API_KEY + ':')}`
                    }
                });

                if (!response.ok) continue;

                const data = await response.json();

                if (data.results) {
                    const mapped = data.results.map((job: any) => ({
                        id: `reed-${job.jobId}`,
                        title: job.jobTitle,
                        company: job.employerName,
                        location: job.locationName,
                        description: job.jobDescription,
                        salary: job.minimumSalary ? `£${job.minimumSalary} - £${job.maximumSalary}` : 'Competitive',
                        url: job.jobUrl,
                        source: 'Reed'
                    }));
                    results.push(...mapped);
                }
            } catch (e) {
                console.error(`Reed search error for query "${query}":`, e);
            }
        }
        return results;
    }

    private static async searchSerpApi(params: SearchParams): Promise<Job[]> {
        const results: Job[] = [];

        for (const query of params.queries) {
            const url = new URL('https://serpapi.com/search');
            url.searchParams.append('engine', 'google_jobs');
            url.searchParams.append('q', `${query} in ${params.location}`);
            url.searchParams.append('api_key', this.SERPAPI_KEY || '');
            url.searchParams.append('hl', 'en');

            // Add filters
            if (params.workType === 'remote') url.searchParams.append('chips', 'work_from_home');

            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.jobs_results) {
                const mapped = data.jobs_results.map((job: any) => ({
                    id: job.job_id || Math.random().toString(),
                    title: job.title,
                    company: job.company_name,
                    location: job.location,
                    description: job.description,
                    salary: job.detected_extensions?.salary || 'Not specified',
                    url: job.share_link || job.related_links?.[0]?.link || '#',
                    source: 'Google Jobs'
                }));
                results.push(...mapped);
            }
        }

        return results;
    }
}
