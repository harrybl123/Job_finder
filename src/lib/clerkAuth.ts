import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';

/**
 * Gets or creates a user in the database from Clerk authentication
 * This should be called in API routes to ensure the user exists in our DB
 */
export async function getOrCreateUser() {
    const { userId } = await auth();

    if (!userId) {
        throw new Error('Unauthorized - no user ID from Clerk');
    }

    // Check if user exists in our database with this Clerk ID
    let user = await prisma.user.findUnique({
        where: { id: userId }
    });

    // If not, create them with data from Clerk
    if (!user) {
        const clerkUser = await currentUser();
        const email = clerkUser?.emailAddresses[0]?.emailAddress;

        // Check if a user with this email already exists (from before Clerk migration)
        if (email) {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                // Update existing user's ID to Clerk ID
                user = await prisma.user.update({
                    where: { email },
                    data: { id: userId }
                });
                return user;
            }
        }

        // Create new user
        user = await prisma.user.create({
            data: {
                id: userId,
                email: email,
                name: clerkUser?.firstName && clerkUser?.lastName
                    ? `${clerkUser.firstName} ${clerkUser.lastName}`
                    : clerkUser?.firstName || clerkUser?.username || null,
            }
        });
    }

    return user;
}

/**
 * Gets just the Clerk user ID (without creating a DB record)
 * Use this for read-only operations
 */
export async function getUserId() {
    const { userId } = await auth();

    if (!userId) {
        throw new Error('Unauthorized - no user ID from Clerk');
    }

    return userId;
}
