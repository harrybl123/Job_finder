/**
 * Transforms AI-generated career data into Career Galaxy node structure
 */

export interface GalaxyNode {
    id: string;
    name: string;
    level: number; // 0=super-cluster, 1=industry, 2=sub-industry, 3=role-family, 4=job-title
    color: string;
    parentId: string | null;
    childIds: string[];
    recommended?: boolean;
    recommendationReason?: string;
    // Timeline & metadata
    yearsFromNow?: number;
    salaryRange?: string;
    requiredSkills?: string[];
    reasoning?: string;
}

export interface GalaxyData {
    nodes: Record<string, GalaxyNode>;
    rootNodes: string[];
}

interface CareerPath {
    id: string;
    name: string;
    description: string;
    color: string;
    roles: Array<{
        title: string;
        megaSector: string;
        industry: string;
        yearsFromNow: number;
        salaryRange?: string;
        requiredSkills?: string[];
        reasoning: string;
    }>;
}

interface AICareerData {
    currentRole?: {
        title: string;
        megaSector: string;
        industry: string;
        experienceLevel: string;
    };
    careerPaths: CareerPath[];
    recommendedPath?: {
        nodeIds: string[];
        reasoning: string;
    };
}

/**
 * Transform AI career data into galaxy node structure
 */
export function transformCareerDataToGalaxy(careerData: AICareerData): GalaxyData {
    const nodes: Record<string, GalaxyNode> = {};
    const rootNodes: string[] = [];
    const recommendedNodeIds = new Set(careerData.recommendedPath?.nodeIds || []);
    const recommendationReason = careerData.recommendedPath?.reasoning || '';

    // Track which super-clusters we've created
    const superClusters = new Set<string>();
    const industries = new Map<string, string>(); // key: industry+supercluster, value: node id
    const subIndustries = new Map<string, string>();
    const roleFamilies = new Map<string, string>();

    // Process each career path
    careerData.careerPaths.forEach((path, pathIndex) => {
        const pathColor = path.color || generateColor(pathIndex);

        path.roles.forEach((role, roleIndex) => {
            const sector = role.megaSector || 'tech';
            const industry = role.industry || 'software';

            // 1. Create super-cluster (level 0) if it doesn't exist
            const scId = `sc-${sector.toLowerCase().replace(/\s+/g, '-')}`;
            if (!superClusters.has(scId)) {
                superClusters.add(scId);
                rootNodes.push(scId);
                nodes[scId] = {
                    id: scId,
                    name: capitalizeWords(sector),
                    level: 0,
                    color: pathColor,
                    parentId: null,
                    childIds: [],
                    recommended: recommendedNodeIds.has(scId),
                    recommendationReason: recommendedNodeIds.has(scId) ? recommendationReason : undefined,
                };
            }

            // 2. Create industry (level 1) if it doesn't exist
            const indKey = `${industry}-${scId}`;
            let indId = industries.get(indKey);
            if (!indId) {
                indId = `ind-${industry.toLowerCase().replace(/\s+/g, '-')}`;
                industries.set(indKey, indId);
                nodes[indId] = {
                    id: indId,
                    name: capitalizeWords(industry),
                    level: 1,
                    color: pathColor,
                    parentId: scId,
                    childIds: [],
                    recommended: recommendedNodeIds.has(indId),
                    recommendationReason: recommendedNodeIds.has(indId) ? recommendationReason : undefined,
                };
                nodes[scId].childIds.push(indId);
            }

            // 3. Create sub-industry (level 2) - use role title as sub-category
            const subIndKey = `${role.title}-${indId}`;
            let subIndId = subIndustries.get(subIndKey);
            if (!subIndId) {
                subIndId = `sub-${sanitizeId(role.title)}-${roleIndex}`;
                subIndustries.set(subIndKey, subIndId);
                nodes[subIndId] = {
                    id: subIndId,
                    name: role.title,
                    level: 2,
                    color: pathColor,
                    parentId: indId,
                    childIds: [],
                    recommended: recommendedNodeIds.has(subIndId),
                    recommendationReason: recommendedNodeIds.has(subIndId) ? recommendationReason : undefined,
                };
                nodes[indId].childIds.push(subIndId);
            }

            // 4. Create role family (level 3) - seniority level
            const seniority = inferSeniority(role.title);
            const rfKey = `${seniority}-${subIndId}`;
            let rfId = roleFamilies.get(rfKey);
            if (!rfId) {
                rfId = `rf-${sanitizeId(role.title)}-${seniority}`;
                roleFamilies.set(rfKey, rfId);
                nodes[rfId] = {
                    id: rfId,
                    name: `${seniority} ${extractRoleBase(role.title)}`,
                    level: 3,
                    color: pathColor,
                    parentId: subIndId,
                    childIds: [],
                    recommended: recommendedNodeIds.has(rfId),
                    recommendationReason: recommendedNodeIds.has(rfId) ? recommendationReason : undefined,
                };
                nodes[subIndId].childIds.push(rfId);
            }

            // 5. Create job title (level 4) - the actual role
            const jobId = `job-${sanitizeId(role.title)}-${pathIndex}-${roleIndex}`;
            nodes[jobId] = {
                id: jobId,
                name: role.title,
                level: 4,
                color: pathColor,
                parentId: rfId,
                childIds: [],
                recommended: recommendedNodeIds.has(jobId),
                recommendationReason: recommendedNodeIds.has(jobId) ? recommendationReason : undefined,
                // Preserve timeline & metadata
                yearsFromNow: role.yearsFromNow,
                salaryRange: role.salaryRange,
                requiredSkills: role.requiredSkills,
                reasoning: role.reasoning,
            };
            nodes[rfId].childIds.push(jobId);
        });
    });

    return { nodes, rootNodes };
}

// Helper functions
function generateColor(index: number): string {
    const colors = [
        '#f97316', // orange
        '#3b82f6', // blue
        '#10b981', // green
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#f59e0b', // amber
    ];
    return colors[index % colors.length];
}

function capitalizeWords(str: string): string {
    return str
        .split(/[\s-_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function sanitizeId(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function inferSeniority(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('junior') || lower.includes('entry') || lower.includes('graduate')) {
        return 'Junior';
    }
    if (lower.includes('senior') || lower.includes('lead') || lower.includes('principal')) {
        return 'Senior';
    }
    if (lower.includes('manager') || lower.includes('head') || lower.includes('director')) {
        return 'Manager';
    }
    return 'Mid-level';
}

function extractRoleBase(title: string): string {
    // Remove seniority prefixes
    return title
        .replace(/^(Junior|Senior|Lead|Principal|Manager|Head|Director|Entry|Graduate|Mid-level)\s+/i, '')
        .trim();
}
