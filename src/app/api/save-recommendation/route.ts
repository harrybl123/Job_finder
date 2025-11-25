import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId, paths, reasoning } = await req.json();

        if (!userId || !paths) {
            return NextResponse.json(
                { error: 'userId and paths are required' },
                { status: 400 }
            );
        }

        console.log('💾 Saving career recommendation for user:', userId);

        const recommendation = await prisma.careerRecommendation.create({
            data: {
                userId,
                paths: JSON.stringify(paths),
                reasoning: reasoning || 'AI-generated career paths based on your profile'
            }
        });

        console.log('✅ Recommendation saved:', recommendation.id);

        return NextResponse.json({
            success: true,
            recommendationId: recommendation.id
        });

    } catch (error: any) {
        console.error('❌ Failed to save recommendation:', error.message);

        return NextResponse.json({
            error: 'Failed to save recommendation',
            details: error.message
        }, { status: 500 });
    }
}

// Get recommendations for a user
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

        const recommendations = await prisma.careerRecommendation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        // Parse the JSON strings back to objects
        const parsed = recommendations.map(rec => ({
            ...rec,
            paths: JSON.parse(rec.paths)
        }));

        return NextResponse.json({ recommendations: parsed });

    } catch (error: any) {
        console.error('❌ Failed to fetch recommendations:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch recommendations',
            details: error.message
        }, { status: 500 });
    }
}
