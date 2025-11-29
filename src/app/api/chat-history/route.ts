import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '@/lib/clerkAuth';

const prisma = new PrismaClient();

// GET - Fetch chat history for a user
export async function GET(req: NextRequest) {
    try {
        const userId = await getUserId();

        const messages = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json({ messages });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

// DELETE - Clear chat history for a user
export async function DELETE(req: NextRequest) {
    try {
        const userId = await getUserId();

        await prisma.chatMessage.deleteMany({
            where: { userId }
        });

        console.log(`🗑️ Deleted chat history for user: ${userId}`);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
