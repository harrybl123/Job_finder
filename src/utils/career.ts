/**
 * Career Experience Level System
 * Defines the standardized hierarchy for career progression
 */

export enum ExperienceLevel {
    ASSOCIATE = 1,
    MID_LEVEL = 2,
    SENIOR_IC = 3,
    LEAD = 4,
    MANAGER = 5,
    DIRECTOR = 6,
    VP = 7,
    EXECUTIVE = 8,
}

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
    [ExperienceLevel.ASSOCIATE]: "Entry/Associate",
    [ExperienceLevel.MID_LEVEL]: "Mid-Level",
    [ExperienceLevel.SENIOR_IC]: "Senior IC",
    [ExperienceLevel.LEAD]: "Lead/Principal",
    [ExperienceLevel.MANAGER]: "Manager",
    [ExperienceLevel.DIRECTOR]: "Director",
    [ExperienceLevel.VP]: "VP",
    [ExperienceLevel.EXECUTIVE]: "Executive",
};

export const LEVEL_DESCRIPTIONS: Record<ExperienceLevel, string> = {
    [ExperienceLevel.ASSOCIATE]: "0-2 years experience, junior roles",
    [ExperienceLevel.MID_LEVEL]: "2-5 years, solid performer",
    [ExperienceLevel.SENIOR_IC]: "5-8 years, expert in domain",
    [ExperienceLevel.LEAD]: "8-12 years, guiding others",
    [ExperienceLevel.MANAGER]: "People management responsibility",
    [ExperienceLevel.DIRECTOR]: "Managing managers",
    [ExperienceLevel.VP]: "VP-level strategic leadership",
    [ExperienceLevel.EXECUTIVE]: "C-suite executive leadership",
};

/**
 * Infer experience level from years of experience
 * Note: This is a heuristic - actual level depends on role/responsibilities
 */
export function getLevelFromYears(years: number): ExperienceLevel {
    if (years < 2) return ExperienceLevel.ASSOCIATE;
    if (years < 5) return ExperienceLevel.MID_LEVEL;
    if (years < 8) return ExperienceLevel.SENIOR_IC;
    if (years < 12) return ExperienceLevel.LEAD;
    return ExperienceLevel.MANAGER; // Default to manager track for 12+ years
}

/**
 * Check if a level jump is realistic
 * @param currentLevel - User's current level
 * @param targetLevel - Target level they want to reach
 * @param pathType - Type of career path
 * @returns true if the jump is realistic
 */
export function isRealisticLevelJump(
    currentLevel: ExperienceLevel,
    targetLevel: ExperienceLevel,
    pathType: 'Direct Fit' | 'Strategic Pivot' | 'Aspirational'
): boolean {
    const jump = targetLevel - currentLevel;

    switch (pathType) {
        case 'Direct Fit':
            return jump === 1; // Exactly +1 level
        case 'Strategic Pivot':
            return jump === 0; // Same level, different domain
        case 'Aspirational':
            return jump > 0 && jump <= 2; // +1 or +2 levels
        default:
            return false;
    }
}

/**
 * Get the expected years range for a given level
 */
export function getYearsRangeForLevel(level: ExperienceLevel): string {
    switch (level) {
        case ExperienceLevel.ASSOCIATE:
            return "0-2 years";
        case ExperienceLevel.MID_LEVEL:
            return "2-5 years";
        case ExperienceLevel.SENIOR_IC:
            return "5-8 years";
        case ExperienceLevel.LEAD:
            return "8-12 years";
        case ExperienceLevel.MANAGER:
            return "5+ years (with management experience)";
        case ExperienceLevel.DIRECTOR:
            return "10+ years (managing managers)";
        case ExperienceLevel.VP:
            return "15+ years (strategic leadership)";
        case ExperienceLevel.EXECUTIVE:
            return "20+ years (C-suite)";
    }
}
