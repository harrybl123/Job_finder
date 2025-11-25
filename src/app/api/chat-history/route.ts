import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch chat history for a user
export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ messages });
}

// DELETE - Clear chat history for a user
export async function DELETE(req: NextRequest) {
    const { userId } = await req.json();

    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await prisma.chatMessage.deleteMany({
        where: { userId }
    });

    console.log(`🗑️ Deleted chat history for user: ${userId}`);

    return NextResponse.json({ success: true });
}
