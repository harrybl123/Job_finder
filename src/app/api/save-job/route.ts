import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId, job } = await req.json();

        if (!userId || !job) {
            return NextResponse.json(
                { error: 'userId and job data are required' },
                { status: 400 }
            );
        }

        console.log('💾 Saving job for user:', userId);
        console.log('  Job:', job.title, 'at', job.company);

        // Save to database
        const savedJob = await prisma.savedJob.create({
            data: {
                userId,
                jobData: JSON.stringify(job),
                status: 'saved',
                notes: ''
            }
        });

        console.log('✅ Job saved:', savedJob.id);

        return NextResponse.json({
            success: true,
            savedJob
        });

    } catch (error: any) {
        console.error('❌ Save job error:', error.message);

        return NextResponse.json({
            error: 'Failed to save job',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const savedJobs = await prisma.savedJob.findMany({
            where: { userId },
            orderBy: { savedAt: 'desc' }
        });

        // Parse the JSON strings back to objects
        const parsedJobs = savedJobs.map(job => ({
            ...job,
            jobData: JSON.parse(job.jobData)
        }));

        return NextResponse.json({
            savedJobs: parsedJobs
        });

    } catch (error: any) {
        console.error('❌ Get saved jobs error:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch saved jobs',
            details: error.message
        }, { status: 500 });
    }
}
