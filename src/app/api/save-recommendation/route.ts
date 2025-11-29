import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/clerkAuth';

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId();
        const { paths, reasoning } = await req.json();

        if (!paths) {
            return NextResponse.json(
                { error: 'paths are required' },
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
        }, { status: error.message.includes('Unauthorized') ? 401 : 500 });
    }
}

// Get recommendations for a user
export async function GET(req: NextRequest) {
    try {
        const userId = await getUserId();

        const recommendations = await prisma.careerRecommendation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { currentLevel: true }
                }
            }
        });

        // Parse the JSON strings back to objects
        const parsed = recommendations.map(rec => ({
            ...rec,
            paths: JSON.parse(rec.paths),
            userLevel: rec.user.currentLevel // Hoist level to top level
        }));

        return NextResponse.json({ recommendations: parsed });

    } catch (error: any) {
        console.error('❌ Failed to fetch recommendations:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch recommendations',
            details: error.message
        }, { status: error.message.includes('Unauthorized') ? 401 : 500 });
    }
}
