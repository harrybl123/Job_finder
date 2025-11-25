// Career Galaxy - Multi-Level Zoom Structure
// Levels: 0 (Universe) → 1 (Industry) → 2 (Sub-Industry) → 3 (Role Family) → 4 (Job Title)

export interface CareerNode {
    id: string;
    name: string;
    level: 0 | 1 | 2 | 3 | 4;
    parentId: string | null;
    childIds: string[];
    color: string;
    description: string;

    // Visual positioning
    x?: number;
    y?: number;

    // Recommendation system
    recommended?: boolean;
    recommendationReason?: string;

    // Level 4 specific (Job Titles)
    jobSearchKeywords?: string[];
    typicalSalary?: string;
    requiredSkills?: string[];
    experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

    // AI-generated metadata
    yearsFromNow?: number; // Timeline for reaching this role
    reasoning?: string; // Why this role fits the user
    salaryRange?: string; // AI-estimated salary for this role
}

export interface CareerGalaxy {
    nodes: Record<string, CareerNode>;
    rootNodes: string[]; // IDs of level 0 nodes
}

// ========================================
// LEVEL 0: SUPER-CLUSTERS (The Universe)
// ========================================

const superClusters: CareerNode[] = [
    {
        id: 'sc-tech',
        name: 'Technology & Digital',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#8b5cf6', // Purple
        description: 'Software, IT, Digital Products & Services'
    },
    {
        id: 'sc-business',
        name: 'Business, Finance & Operations',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#10b981', // Green
        description: 'Corporate functions, finance, consulting, sales'
    },
    {
        id: 'sc-stem',
        name: 'STEM & Engineering',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#3b82f6', // Blue
        description: 'Science, Technology, Engineering & Mathematics'
    },
    {
        id: 'sc-healthcare',
        name: 'Healthcare, Science & Social Care',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#ef4444', // Red
        description: 'Medical, research, and care services'
    },
    {
        id: 'sc-creative',
        name: 'Creative, Media & Entertainment',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#f59e0b', // Amber
        description: 'Arts, media, design, and entertainment'
    },
    {
        id: 'sc-public',
        name: 'Public Sector & Non-Profit',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#6366f1', // Indigo
        description: 'Government, education, charity, and public service'
    },
    {
        id: 'sc-trade',
        name: 'Trade, Manufacturing & Logistics',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#f97316', // Orange
        description: 'Production, supply chain, and skilled trades'
    },
    {
        id: 'sc-hospitality',
        name: 'Hospitality, Retail & Customer Service',
        level: 0,
        parentId: null,
        childIds: [],
        color: '#ec4899', // Pink
        description: 'Service industries, retail, and customer-facing roles'
    },
];

// ========================================
// LEVEL 1: INDUSTRIES (Planets)
// ========================================

const industries: CareerNode[] = [
    // ===== Technology & Digital Industries =====
    {
        id: 'ind-software',
        name: 'Software Engineering',
        level: 1,
        parentId: 'sc-tech',
        childIds: [],
        color: '#8b5cf6',
        description: 'Building applications, systems, and software products'
    },
    {
        id: 'ind-product',
        name: 'Product Management',
        level: 1,
        parentId: 'sc-tech',
        childIds: [],
        color: '#a855f7',
        description: 'Product strategy, roadmaps, and delivery'
    },
    {
        id: 'ind-data',
        name: 'Data & Analytics',
        level: 1,
        parentId: 'sc-tech',
        childIds: [],
        color: '#7c3aed',
        description: 'Data science, analytics, BI, and insights'
    },
    {
        id: 'ind-cybersecurity',
        name: 'Cybersecurity',
        level: 1,
        parentId: 'sc-tech',
        childIds: [],
        color: '#9333ea',
        description: 'Information security and threat protection'
    },
    {
        id: 'ind-it',
        name: 'IT Support & Infrastructure',
        level: 1,
        parentId: 'sc-tech',
        childIds: [],
        color: '#a855f7',
        description: 'Technical support and systems administration'
    },
    {
        id: 'ind-ux',
        name: 'UX/UI & Design',
        level: 1,
        parentId: 'sc-tech',
        childIds: [],
        color: '#c084fc',
        description: 'User experience and interface design'
    },
    {
        id: 'ind-digital-marketing',
        name: 'Digital Marketing',
        level: 1,
        parentId: 'sc-tech',
        childIds: [],
        color: '#d8b4fe',
        description: 'Online marketing, SEO, and growth'
    },

    // ===== Business & Finance Industries =====
    {
        id: 'ind-accounting',
        name: 'Accounting & Finance',
        level: 1,
        parentId: 'sc-business',
        childIds: [],
        color: '#10b981',
        description: 'Financial planning, accounting, and analysis'
    },
    {
        id: 'ind-consulting',
        name: 'Consulting',
        level: 1,
        parentId: 'sc-business',
        childIds: [],
        color: '#059669',
        description: 'Strategy, operations, and business advisory'
    },
    {
        id: 'ind-sales',
        name: 'Sales & Business Development',
        level: 1,
        parentId: 'sc-business',
        childIds: [],
        color: '#34d399',
        description: 'Revenue generation and client acquisition'
    },
    {
        id: 'ind-hr',
        name: 'HR & People Operations',
        level: 1,
        parentId: 'sc-business',
        childIds: [],
        color: '#6ee7b7',
        description: 'Talent acquisition, development, and culture'
    },
    {
        id: 'ind-marketing',
        name: 'Marketing & Brand',
        level: 1,
        parentId: 'sc-business',
        childIds: [],
        color: '#a7f3d0',
        description: 'Brand strategy, campaigns, and communications'
    },
    {
        id: 'ind-operations',
        name: 'Operations & Project Management',
        level: 1,
        parentId: 'sc-business',
        childIds: [],
        color: '#34d399',
        description: 'Business operations and delivery'
    },
    {
        id: 'ind-legal',
        name: 'Legal & Compliance',
        level: 1,
        parentId: 'sc-business',
        childIds: [],
        color: '#059669',
        description: 'Corporate law and regulatory compliance'
    },

    // ===== STEM & Engineering Industries =====
    {
        id: 'ind-civil',
        name: 'Civil Engineering',
        level: 1,
        parentId: 'sc-stem',
        childIds: [],
        color: '#3b82f6',
        description: 'Infrastructure, construction, and structural engineering'
    },
    {
        id: 'ind-mechanical',
        name: 'Mechanical Engineering',
        level: 1,
        parentId: 'sc-stem',
        childIds: [],
        color: '#2563eb',
        description: 'Machinery, systems, and product engineering'
    },
    {
        id: 'ind-electrical',
        name: 'Electrical Engineering',
        level: 1,
        parentId: 'sc-stem',
        childIds: [],
        color: '#1d4ed8',
        description: 'Electronics, power systems, and circuits'
    },
    {
        id: 'ind-chemical',
        name: 'Chemical Engineering',
        level: 1,
        parentId: 'sc-stem',
        childIds: [],
        color: '#60a5fa',
        description: 'Chemical processes and materials'
    },
    {
        id: 'ind-research',
        name: 'Research & Development',
        level: 1,
        parentId: 'sc-stem',
        childIds: [],
        color: '#93c5fd',
        description: 'Scientific research and innovation'
    },
    {
        id: 'ind-environmental',
        name: 'Environmental Science',
        level: 1,
        parentId: 'sc-stem',
        childIds: [],
        color: '#2563eb',
        description: 'Sustainability and environmental protection'
    },

    // ===== Healthcare Industries =====
    {
        id: 'ind-nursing',
        name: 'Nursing & Midwifery',
        level: 1,
        parentId: 'sc-healthcare',
        childIds: [],
        color: '#ef4444',
        description: 'Patient care and clinical nursing'
    },
    {
        id: 'ind-medical',
        name: 'Medical & Physicians',
        level: 1,
        parentId: 'sc-healthcare',
        childIds: [],
        color: '#dc2626',
        description: 'Doctors, specialists, and medical practitioners'
    },
    {
        id: 'ind-mental-health',
        name: 'Mental Health',
        level: 1,
        parentId: 'sc-healthcare',
        childIds: [],
        color: '#f87171',
        description: 'Psychology, counseling, and therapy'
    },
    {
        id: 'ind-allied-health',
        name: 'Allied Health',
        level: 1,
        parentId: 'sc-healthcare',
        childIds: [],
        color: '#fca5a5',
        description: 'Physiotherapy, occupational therapy, etc.'
    },
    {
        id: 'ind-pharmacy',
        name: 'Pharmacy & Pharmaceutical',
        level: 1,
        parentId: 'sc-healthcare',
        childIds: [],
        color: '#dc2626',
        description: 'Medication and pharmaceutical services'
    },
    {
        id: 'ind-care',
        name: 'Social Care & Support',
        level: 1,
        parentId: 'sc-healthcare',
        childIds: [],
        color: '#f87171',
        description: 'Care work and support services'
    },

    // ===== Creative & Media Industries =====
    {
        id: 'ind-graphic-design',
        name: 'Graphic Design',
        level: 1,
        parentId: 'sc-creative',
        childIds: [],
        color: '#f59e0b',
        description: 'Visual design and brand identity'
    },
    {
        id: 'ind-video',
        name: 'Film & Video Production',
        level: 1,
        parentId: 'sc-creative',
        childIds: [],
        color: '#d97706',
        description: 'Film making, editing, and production'
    },
    {
        id: 'ind-journalism',
        name: 'Journalism & Writing',
        level: 1,
        parentId: 'sc-creative',
        childIds: [],
        color: '#fbbf24',
        description: 'News, content creation, and copywriting'
    },
    {
        id: 'ind-music',
        name: 'Music & Audio',
        level: 1,
        parentId: 'sc-creative',
        childIds: [],
        color: '#fcd34d',
        description: 'Music production and sound engineering'
    },
    {
        id: 'ind-advertising',
        name: 'Advertising & PR',
        level: 1,
        parentId: 'sc-creative',
        childIds: [],
        color: '#d97706',
        description: 'Public relations and creative advertising'
    },
    {
        id: 'ind-gaming',
        name: 'Gaming & Entertainment',
        level: 1,
        parentId: 'sc-creative',
        childIds: [],
        color: '#f59e0b',
        description: 'Game design, development, and entertainment'
    },

    // ===== Public Sector Industries =====
    {
        id: 'ind-government',
        name: 'Government & Policy',
        level: 1,
        parentId: 'sc-public',
        childIds: [],
        color: '#6366f1',
        description: 'Public administration and policy work'
    },
    {
        id: 'ind-education',
        name: 'Education & Teaching',
        level: 1,
        parentId: 'sc-public',
        childIds: [],
        color: '#4f46e5',
        description: 'Teaching, tutoring, and educational services'
    },
    {
        id: 'ind-nonprofit',
        name: 'Non-Profit & Charity',
        level: 1,
        parentId: 'sc-public',
        childIds: [],
        color: '#818cf8',
        description: 'Charitable organizations and social enterprises'
    },
    {
        id: 'ind-emergency',
        name: 'Emergency Services',
        level: 1,
        parentId: 'sc-public',
        childIds: [],
        color: '#6366f1',
        description: 'Fire, police, ambulance, and rescue'
    },
    {
        id: 'ind-social-work',
        name: 'Social Work',
        level: 1,
        parentId: 'sc-public',
        childIds: [],
        color: '#818cf8',
        description: 'Community support and social services'
    },

    // ===== Trade & Manufacturing Industries =====
    {
        id: 'ind-construction',
        name: 'Construction & Building',
        level: 1,
        parentId: 'sc-trade',
        childIds: [],
        color: '#f97316',
        description: 'Building trades and construction work'
    },
    {
        id: 'ind-manufacturing',
        name: 'Manufacturing & Production',
        level: 1,
        parentId: 'sc-trade',
        childIds: [],
        color: '#ea580c',
        description: 'Factory work and production lines'
    },
    {
        id: 'ind-logistics',
        name: 'Logistics & Supply Chain',
        level: 1,
        parentId: 'sc-trade',
        childIds: [],
        color: '#fb923c',
        description: 'Warehousing, distribution, and logistics'
    },
    {
        id: 'ind-transport',
        name: 'Transport & Delivery',
        level: 1,
        parentId: 'sc-trade',
        childIds: [],
        color: '#fdba74',
        description: 'Driving, delivery, and transportation'
    },
    {
        id: 'ind-skilled-trades',
        name: 'Skilled Trades',
        level: 1,
        parentId: 'sc-trade',
        childIds: [],
        color: '#ea580c',
        description: 'Plumbing, electrical, carpentry, etc.'
    },

    // ===== Hospitality & Retail Industries =====
    {
        id: 'ind-retail',
        name: 'Retail & Sales',
        level: 1,
        parentId: 'sc-hospitality',
        childIds: [],
        color: '#ec4899',
        description: 'Shop work and retail management'
    },
    {
        id: 'ind-food',
        name: 'Food Service & Catering',
        level: 1,
        parentId: 'sc-hospitality',
        childIds: [],
        color: '#db2777',
        description: 'Restaurants, cafes, and catering'
    },
    {
        id: 'ind-hotel',
        name: 'Hotels & Accommodation',
        level: 1,
        parentId: 'sc-hospitality',
        childIds: [],
        color: '#f472b6',
        description: 'Hotel management and hospitality'
    },
    {
        id: 'ind-events',
        name: 'Events & Hospitality',
        level: 1,
        parentId: 'sc-hospitality',
        childIds: [],
        color: '#f9a8d4',
        description: 'Event planning and management'
    },
    {
        id: 'ind-customer-service',
        name: 'Customer Service',
        level: 1,
        parentId: 'sc-hospitality',
        childIds: [],
        color: '#db2777',
        description: 'Support, service, and customer experience'
    },
    {
        id: 'ind-beauty',
        name: 'Beauty & Wellness',
        level: 1,
        parentId: 'sc-hospitality',
        childIds: [],
        color: '#ec4899',
        description: 'Hair, beauty, fitness, and wellness'
    },
];

// ========================================
// LEVEL 2: SUB-INDUSTRIES (Regions/Continents)
// ========================================

const subIndustries: CareerNode[] = [
    // ===== Technology & Digital Sub-Industries (Level 2) =====
    {
        id: 'sub-web',
        name: 'Web Development',
        level: 2,
        parentId: 'ind-software',
        childIds: [],
        color: '#8b5cf6',
        description: 'Building websites and web applications'
    },
    {
        id: 'sub-mobile',
        name: 'Mobile Development',
        level: 2,
        parentId: 'ind-software',
        childIds: [],
        color: '#8b5cf6',
        description: 'iOS and Android app development'
    },
    {
        id: 'sub-backend',
        name: 'Backend Engineering',
        level: 2,
        parentId: 'ind-software',
        childIds: [],
        color: '#8b5cf6',
        description: 'Server-side logic, databases, and APIs'
    },
    {
        id: 'sub-frontend',
        name: 'Frontend Engineering',
        level: 2,
        parentId: 'ind-software',
        childIds: [],
        color: '#8b5cf6',
        description: 'User interface and client-side logic'
    },
    {
        id: 'sub-fullstack',
        name: 'Full-Stack Development',
        level: 2,
        parentId: 'ind-software',
        childIds: [],
        color: '#8b5cf6',
        description: 'Both client and server-side development'
    },
    {
        id: 'sub-devops',
        name: 'DevOps & Cloud',
        level: 2,
        parentId: 'ind-software',
        childIds: [],
        color: '#8b5cf6',
        description: 'Infrastructure, CI/CD, and cloud platforms'
    },
    {
        id: 'sub-data-eng',
        name: 'Data Engineering',
        level: 2,
        parentId: 'ind-data',
        childIds: [],
        color: '#7c3aed',
        description: 'Building data pipelines and infrastructure'
    },
    {
        id: 'sub-data-science',
        name: 'Data Science',
        level: 2,
        parentId: 'ind-data',
        childIds: [],
        color: '#7c3aed',
        description: 'Advanced analytics and machine learning'
    },
    {
        id: 'sub-product-mgmt',
        name: 'Product Management',
        level: 2,
        parentId: 'ind-product',
        childIds: [],
        color: '#a855f7',
        description: 'Product strategy and execution'
    },

    // ===== Business Sub-Industries (Level 2) =====
    {
        id: 'sub-tech-consulting',
        name: 'Tech Consulting',
        level: 2,
        parentId: 'ind-consulting',
        childIds: [],
        color: '#10b981',
        description: 'Advising on technology strategy'
    },
    {
        id: 'sub-mgmt-consulting',
        name: 'Management Consulting',
        level: 2,
        parentId: 'ind-consulting',
        childIds: [],
        color: '#10b981',
        description: 'Strategic business advisory'
    },
];

// ========================================
// LEVEL 3: ROLE FAMILIES (Solar Systems)
// ========================================

const roleFamilies: CareerNode[] = [
    // --- Web Development Roles ---
    {
        id: 'rf-web-junior',
        name: 'Junior Web Developer',
        level: 3,
        parentId: 'sub-web',
        childIds: [],
        color: '#8b5cf6',
        description: 'Entry-level web development roles'
    },
    {
        id: 'rf-web-mid',
        name: 'Web Developer',
        level: 3,
        parentId: 'sub-web',
        childIds: [],
        color: '#8b5cf6',
        description: 'Mid-level web development roles'
    },
    {
        id: 'rf-web-senior',
        name: 'Senior Web Developer',
        level: 3,
        parentId: 'sub-web',
        childIds: [],
        color: '#8b5cf6',
        description: 'Senior web development roles'
    },
    {
        id: 'rf-web-lead',
        name: 'Tech Lead',
        level: 3,
        parentId: 'sub-web',
        childIds: [],
        color: '#8b5cf6',
        description: 'Technical leadership roles'
    },
    {
        id: 'rf-web-manager',
        name: 'Engineering Manager',
        level: 3,
        parentId: 'sub-web',
        childIds: [],
        color: '#8b5cf6',
        description: 'People management and team leadership'
    },

    // --- Frontend Roles ---
    {
        id: 'rf-frontend-junior',
        name: 'Junior Frontend Dev',
        level: 3,
        parentId: 'sub-frontend',
        childIds: [],
        color: '#8b5cf6',
        description: 'Entry-level frontend roles'
    },
    {
        id: 'rf-frontend-senior',
        name: 'Senior Frontend Dev',
        level: 3,
        parentId: 'sub-frontend',
        childIds: [],
        color: '#8b5cf6',
        description: 'Senior frontend roles'
    },

    // --- Data Roles ---
    {
        id: 'rf-data-analyst',
        name: 'Data Analyst',
        level: 3,
        parentId: 'sub-data-science',
        childIds: [],
        color: '#7c3aed',
        description: 'Analyzing data for insights'
    },
    {
        id: 'rf-data-scientist',
        name: 'Data Scientist',
        level: 3,
        parentId: 'sub-data-science',
        childIds: [],
        color: '#7c3aed',
        description: 'Advanced statistical modeling'
    },

    // --- Product Roles ---
    {
        id: 'rf-pm-assoc',
        name: 'Associate PM',
        level: 3,
        parentId: 'sub-product-mgmt',
        childIds: [],
        color: '#a855f7',
        description: 'Entry-level product management'
    },
    {
        id: 'rf-pm',
        name: 'Product Manager',
        level: 3,
        parentId: 'sub-product-mgmt',
        childIds: [],
        color: '#a855f7',
        description: 'Core product management roles'
    },
];

// ========================================
// LEVEL 4: JOB TITLES (Stars)
// ========================================

const jobTitles: CareerNode[] = [
    // --- Web Development Jobs ---
    {
        id: 'job-web-junior-fe',
        name: 'Junior Frontend Developer',
        level: 4,
        parentId: 'rf-web-junior',
        childIds: [],
        color: '#8b5cf6',
        description: 'Build user interfaces with React/Vue',
        jobSearchKeywords: ['Junior Frontend Developer', 'Junior React Developer'],
        typicalSalary: '£30k - £45k',
        requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React'],
        experienceLevel: 'entry'
    },


    // Senior Web Developer positions
    {
        id: 'job-web-senior-fe',
        name: 'Senior Frontend Developer',
        level: 4,
        parentId: 'rf-web-senior',
        childIds: [],
        color: '#8b5cf6',
        description: 'Senior frontend development with architectural responsibility',
        jobSearchKeywords: ['senior frontend developer', 'senior react developer', 'principal frontend engineer'],
        typicalSalary: '£55k - £85k',
        requiredSkills: ['JavaScript', 'React', 'TypeScript', 'Architecture', 'Mentoring', 'Performance'],
        experienceLevel: 'senior'
    },
    {
        id: 'job-web-senior-fullstack',
        name: 'Senior Full Stack Developer',
        level: 4,
        parentId: 'rf-web-senior',
        childIds: [],
        color: '#8b5cf6',
        description: 'Senior full-stack with system design expertise',
        jobSearchKeywords: ['senior full stack developer', 'senior fullstack engineer', 'senior software engineer'],
        typicalSalary: '£60k - £90k',
        requiredSkills: ['JavaScript', 'TypeScript', 'System Design', 'Databases', 'Cloud', 'Mentoring'],
        experienceLevel: 'senior'
    },

    // Tech Lead positions
    {
        id: 'job-web-lead-technical',
        name: 'Technical Lead',
        level: 4,
        parentId: 'rf-web-lead',
        childIds: [],
        color: '#8b5cf6',
        description: 'Technical leadership and architecture',
        jobSearchKeywords: ['tech lead', 'technical lead', 'lead developer', 'lead engineer'],
        typicalSalary: '£70k - £100k',
        requiredSkills: ['Leadership', 'Architecture', 'System Design', 'Mentoring', 'Agile'],
        experienceLevel: 'lead'
    },

    // Engineering Manager positions
    {
        id: 'job-web-em',
        name: 'Engineering Manager',
        level: 4,
        parentId: 'rf-web-manager',
        childIds: [],
        color: '#8b5cf6',
        description: 'People management and team delivery',
        jobSearchKeywords: ['engineering manager', 'development manager', 'software engineering manager'],
        typicalSalary: '£65k - £95k',
        requiredSkills: ['People Management', 'Agile', 'Hiring', 'Performance Management', 'Stakeholder Management'],
        experienceLevel: 'lead'
    },
];

// ========================================
// BUILD THE GALAXY
// ========================================

function buildGalaxy(): CareerGalaxy {
    const allNodes = [
        ...superClusters,
        ...industries,
        ...subIndustries,
        ...roleFamilies,
        ...jobTitles
    ];

    const nodes: Record<string, CareerNode> = {};
    allNodes.forEach(node => {
        nodes[node.id] = node;
    });

    // Populate childIds
    allNodes.forEach(node => {
        if (node.parentId && nodes[node.parentId]) {
            nodes[node.parentId].childIds.push(node.id);
        }
    });

    // Get root nodes (level 0)
    const rootNodes = allNodes
        .filter(n => n.level === 0)
        .map(n => n.id);

    return { nodes, rootNodes };
}

export const CAREER_GALAXY = buildGalaxy();

// Helper functions
export function getNodeById(id: string): CareerNode | undefined {
    return CAREER_GALAXY.nodes[id];
}

export function getNodeChildren(nodeId: string): CareerNode[] {
    const node = getNodeById(nodeId);
    if (!node) return [];
    return node.childIds.map(id => CAREER_GALAXY.nodes[id]).filter(Boolean);
}

export function getNodeParent(nodeId: string): CareerNode | undefined {
    const node = getNodeById(nodeId);
    if (!node || !node.parentId) return undefined;
    return CAREER_GALAXY.nodes[node.parentId];
}

export function searchJobTitles(query: string): CareerNode[] {
    return Object.values(CAREER_GALAXY.nodes)
        .filter(node => node.level === 4)
        .filter(node =>
            node.name.toLowerCase().includes(query.toLowerCase()) ||
            node.description.toLowerCase().includes(query.toLowerCase()) ||
            node.jobSearchKeywords?.some(k => k.toLowerCase().includes(query.toLowerCase()))
        );
}

// Mark nodes as recommended based on AI path
export function applyRecommendations(recommendedPath: string[], reasoning?: string) {
    // Clear all previous recommendations
    Object.values(CAREER_GALAXY.nodes).forEach(node => {
        node.recommended = false;
        node.recommendationReason = undefined;
    });

    // Mark nodes in the recommended path
    recommendedPath.forEach((nodeId, index) => {
        const node = CAREER_GALAXY.nodes[nodeId];
        if (node) {
            node.recommended = true;
            node.recommendationReason = reasoning || `Recommended based on your profile`;
        }
    });
}

// Clear all recommendations (useful for resetting)
export function clearRecommendations() {
    Object.values(CAREER_GALAXY.nodes).forEach(node => {
        node.recommended = false;
        node.recommendationReason = undefined;
    });
}
