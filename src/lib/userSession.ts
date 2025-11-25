// Simple utility to manage user session via localStorage

const USER_ID_KEY = 'career_navigator_user_id';

export function getUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(USER_ID_KEY);
}

export function setUserId(userId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_ID_KEY, userId);
}

export function clearUserId(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_ID_KEY);
}
