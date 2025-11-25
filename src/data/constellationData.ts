export interface MegaSectorNode {
    id: string;
    name: string;
    description: string;
    color: string;
    size: number;
    type: 'megasector';
}

export interface IndustryNode {
    id: string;
    name: string;
    megaSectorId: string; // Parent mega sector
    description: string;
    color: string;
    size: number;
    type: 'industry';
}

export interface RoleNode {
    id: string;
    name: string;
    industryId: string;
    description: string;
    responsibilities: string[];
    salaryRange: { min: number; max: number; currency: string };
    requiredSkills: string[];
    experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
    type: 'role';
}

export interface TransitionEdge {
    source: string;
    target: string;
    probability: number;
    timeframe: string;
    reasoning: string;
}

export type ConstellationNode = MegaSectorNode | IndustryNode | RoleNode;

export interface ConstellationData {
    nodes: ConstellationNode[];
    links: TransitionEdge[];
}

// Hardcoded constellation data for MVP
export const constellationData: ConstellationData = {
    nodes: [
        // === INDUSTRIES ===
        {
            id: 'fintech',
            name: 'FinTech & Payments',
            megaSectorId: 'stem',
            description: 'Financial technology, digital payments, and banking innovation',
            color: '#3b82f6',
            size: 40,
            type: 'industry'
        },
        {
            id: 'product',
            name: 'Product & Growth',
            megaSectorId: 'stem',
            description: 'Product management, strategy, and growth optimization',
            color: '#8b5cf6',
            size: 40,
            type: 'industry'
        },
        {
            id: 'venture',
            name: 'Venture & Investment',
            megaSectorId: 'business-finance',
            description: 'Venture capital, private equity, and startup investment',
            color: '#f59e0b',
            size: 40,
            type: 'industry'
        },

        // === FINTECH ROLES ===
        {
            id: 'fintech-analyst',
            name: 'FinTech Analyst',
            industryId: 'fintech',
            description: 'Analyze financial products, market trends, and payment systems',
            responsibilities: ['Market research', 'Product analysis', 'Data modeling'],
            salaryRange: { min: 45000, max: 65000, currency: 'GBP' },
            requiredSkills: ['Excel', 'SQL', 'Financial modeling'],
            experienceLevel: 'entry',
            type: 'role'
        },
        {
            id: 'payments-pm',
            name: 'Payments Product Manager',
            industryId: 'fintech',
            description: 'Lead payment product development and strategy',
            responsibilities: ['Product roadmap', 'Stakeholder management', 'Launch execution'],
            salaryRange: { min: 70000, max: 95000, currency: 'GBP' },
            requiredSkills: ['Product management', 'Payments', 'Agile'],
            experienceLevel: 'mid',
            type: 'role'
        },
        {
            id: 'fintech-bd',
            name: 'FinTech BD Manager',
            industryId: 'fintech',
            description: 'Build partnerships with banks, merchants, and payment providers',
            responsibilities: ['Partnership development', 'Deal negotiation', 'Revenue growth'],
            salaryRange: { min: 60000, max: 85000, currency: 'GBP' },
            requiredSkills: ['Sales', 'Negotiation', 'Financial services'],
            experienceLevel: 'mid',
            type: 'role'
        },
        {
            id: 'head-fintech',
            name: 'Head of FinTech',
            industryId: 'fintech',
            description: 'Lead entire FinTech product division',
            responsibilities: ['Strategy', 'Team leadership', 'P&L ownership'],
            salaryRange: { min: 120000, max: 180000, currency: 'GBP' },
            requiredSkills: ['Leadership', 'Strategy', 'Financial services'],
            experienceLevel: 'executive',
            type: 'role'
        },

        // === PRODUCT ROLES ===
        {
            id: 'product-associate',
            name: 'Product Associate',
            industryId: 'product',
            description: 'Support product managers with research, analysis, and execution',
            responsibilities: ['User research', 'Feature specs', 'Data analysis'],
            salaryRange: { min: 40000, max: 55000, currency: 'GBP' },
            requiredSkills: ['Product thinking', 'Analytics', 'Communication'],
            experienceLevel: 'entry',
            type: 'role'
        },
        {
            id: 'product-manager',
            name: 'Product Manager',
            industryId: 'product',
            description: 'Own product vision, roadmap, and delivery',
            responsibilities: ['Roadmap planning', 'Cross-functional leadership', 'Launch management'],
            salaryRange: { min: 65000, max: 90000, currency: 'GBP' },
            requiredSkills: ['Product management', 'Prioritization', 'Stakeholder management'],
            experienceLevel: 'mid',
            type: 'role'
        },
        {
            id: 'growth-pm',
            name: 'Growth Product Manager',
            industryId: 'product',
            description: 'Drive user acquisition, activation, and retention through product',
            responsibilities: ['Experimentation', 'Funnel optimization', 'Growth strategy'],
            salaryRange: { min: 75000, max: 105000, currency: 'GBP' },
            requiredSkills: ['Growth hacking', 'A/B testing', 'Analytics'],
            experienceLevel: 'mid',
            type: 'role'
        },
        {
            id: 'vp-product',
            name: 'VP of Product',
            industryId: 'product',
            description: 'Lead product organization and strategy',
            responsibilities: ['Product strategy', 'Team building', 'Executive alignment'],
            salaryRange: { min: 130000, max: 200000, currency: 'GBP' },
            requiredSkills: ['Leadership', 'Strategy', 'Product vision'],
            experienceLevel: 'executive',
            type: 'role'
        },

        // === VENTURE ROLES ===
        {
            id: 'vc-analyst',
            name: 'VC Analyst',
            industryId: 'venture',
            description: 'Source deals, conduct due diligence, and support portfolio companies',
            responsibilities: ['Deal sourcing', 'Due diligence', 'Market research'],
            salaryRange: { min: 50000, max: 70000, currency: 'GBP' },
            requiredSkills: ['Financial modeling', 'Market analysis', 'Networking'],
            experienceLevel: 'entry',
            type: 'role'
        },
        {
            id: 'vc-associate',
            name: 'VC Associate',
            industryId: 'venture',
            description: 'Lead investment analysis and portfolio support',
            responsibilities: ['Investment memos', 'Portfolio management', 'Founder support'],
            salaryRange: { min: 70000, max: 100000, currency: 'GBP' },
            requiredSkills: ['Investment analysis', 'Startup ecosystems', 'Strategic thinking'],
            experienceLevel: 'mid',
            type: 'role'
        },
        {
            id: 'vc-principal',
            name: 'VC Principal',
            industryId: 'venture',
            description: 'Lead deals and build firm reputation',
            responsibilities: ['Deal leadership', 'Board seats', 'Fund strategy'],
            salaryRange: { min: 100000, max: 150000, currency: 'GBP' },
            requiredSkills: ['Deal making', 'Board governance', 'Network building'],
            experienceLevel: 'senior',
            type: 'role'
        },
        {
            id: 'vc-partner',
            name: 'VC Partner',
            industryId: 'venture',
            description: 'Make investment decisions and manage fund',
            responsibilities: ['Investment decisions', 'Fund management', 'LP relations'],
            salaryRange: { min: 150000, max: 300000, currency: 'GBP' },
            requiredSkills: ['Investment strategy', 'Fund management', 'Leadership'],
            experienceLevel: 'executive',
            type: 'role'
        }
    ],

    links: [
        // FinTech career progression
        { source: 'fintech-analyst', target: 'payments-pm', probability: 0.7, timeframe: '2-3 years', reasoning: 'Natural progression from analysis to product ownership' },
        { source: 'fintech-analyst', target: 'fintech-bd', probability: 0.5, timeframe: '2-3 years', reasoning: 'Leverage market knowledge for partnerships' },
        { source: 'payments-pm', target: 'head-fintech', probability: 0.6, timeframe: '4-6 years', reasoning: 'Product leadership to executive role' },
        { source: 'fintech-bd', target: 'head-fintech', probability: 0.4, timeframe: '5-7 years', reasoning: 'BD expertise valuable for leadership' },

        // Product career progression
        { source: 'product-associate', target: 'product-manager', probability: 0.8, timeframe: '1-2 years', reasoning: 'Standard PM career ladder' },
        { source: 'product-manager', target: 'growth-pm', probability: 0.6, timeframe: '2-3 years', reasoning: 'Specialization in growth' },
        { source: 'product-manager', target: 'vp-product', probability: 0.5, timeframe: '5-7 years', reasoning: 'Management track' },
        { source: 'growth-pm', target: 'vp-product', probability: 0.7, timeframe: '4-6 years', reasoning: 'Growth expertise to leadership' },

        // Venture career progression
        { source: 'vc-analyst', target: 'vc-associate', probability: 0.8, timeframe: '2-3 years', reasoning: 'Standard VC progression' },
        { source: 'vc-associate', target: 'vc-principal', probability: 0.6, timeframe: '3-5 years', reasoning: 'Proven deal track record' },
        { source: 'vc-principal', target: 'vc-partner', probability: 0.5, timeframe: '4-7 years', reasoning: 'Partnership promotion' },

        // Cross-industry transitions
        { source: 'fintech-analyst', target: 'product-associate', probability: 0.6, timeframe: '1-2 years', reasoning: 'Product thinking from analysis' },
        { source: 'payments-pm', target: 'product-manager', probability: 0.7, timeframe: '1-2 years', reasoning: 'PM skills are transferable' },
        { source: 'fintech-bd', target: 'vc-analyst', probability: 0.5, timeframe: '2-3 years', reasoning: 'Industry knowledge valuable for VC' },
        { source: 'product-manager', target: 'vc-associate', probability: 0.4, timeframe: '3-5 years', reasoning: 'Product expertise for investment' },
        { source: 'growth-pm', target: 'vc-associate', probability: 0.5, timeframe: '3-5 years', reasoning: 'Growth mindset aligns with VC' }
    ]
};
