# Career Navigator - Complete Codebase Export

**Generated:** 2025-11-24  
**Purpose:** LLM analysis and debugging

This file contains the complete source code of the Career Navigator application.

## Current Issues Being Debugged
1. **Empty Galaxy**: Users see only stars, no career nodes visible despite nodes being generated
2. **Visibility System**: `visibleNodeIds` state management may have timing issues

## Project Structure
- `src/app/` - Next.js pages and API routes
- `src/components/` - React components (CareerGalaxy, ChatInterface, etc.)
- `src/data/` - Static data (career galaxy nodes, constellations)
- `src/utils/` - Utility functions (layout generation, etc.)
- `src/services/` - External service integrations
- `prisma/` - Database schema and config

---

## Files

---
File: src/app/api/analyze-fit/route.ts
---
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { userId, jobTitle } = await req.json();

        if (!userId || !jobTitle) {
            return NextResponse.json(
                { error: 'userId and jobTitle are required' },
                { status: 400 }
            );
        }

        console.log('🧠 Analyzing fit for:', userId, '→', jobTitle);

        // Step 1: Check cache first (within 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const cached = await prisma.careerAnalysis.findUnique({
            where: {
                userId_jobTitle: {
                    userId,
                    jobTitle
                }
            }
        });

        if (cached && cached.expiresAt > new Date()) {
            console.log('✅ Cache hit! Using saved analysis');
            return NextResponse.json({
                intelligentQuery: cached.intelligentQuery,
                reasoning: cached.reasoning,
                keyStrengths: cached.keyStrengths ? JSON.parse(cached.keyStrengths) : null,
                potentialGaps: cached.potentialGaps ? JSON.parse(cached.potentialGaps) : null,
                cached: true
            });
        }

        // Step 2: Fetch user's CV
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.parsedCV) {
            return NextResponse.json(
                { error: 'User CV not found. Please upload your CV first.' },
                { status: 404 }
            );
        }

        const parsedCV = JSON.parse(user.parsedCV);
        console.log('📄 User CV found:', parsedCV.name);

        // Step 3: Call Claude to analyze fit
        console.log('🤖 Calling Claude for deep analysis...');

        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            messages: [{
                role: 'user',
                content: `You are an expert career advisor. Analyze this person's fit for "${jobTitle}" roles.

CV Summary:
- Name: ${parsedCV.name || 'Anonymous'}
- Experience: ${JSON.stringify(parsedCV.experience || [])}
- Skills: ${JSON.stringify(parsedCV.skills || [])}
- Education: ${JSON.stringify(parsedCV.education || [])}
- Summary: ${parsedCV.summary || 'None provided'}

TASK: Generate an intelligent job search query that will find "${jobTitle}" roles SPECIFICALLY suitable for THIS person, not just generic ${jobTitle} jobs.

Consider:
1. **Transferable skills** - What from their background applies?
2. **Career trajectory** - Are they transitioning? Leveling up?
3. **Hidden strengths** - What do they bring that's unique?
4. **Level appropriateness** - Junior/Mid/Senior based on experience
5. **Industry context** - What industries match their background?
6. **Red flags to avoid** - What types of ${jobTitle} roles would be a BAD fit?

Return ONLY a JSON object (no markdown, no explanation):
{
  "intelligentQuery": "detailed search string for Perplexity that captures their unique fit",
  "reasoning": "1-2 sentence explanation of why this fits them",
  "keyStrengths": ["strength1", "strength2", "strength3"],
  "potentialGaps": ["gap1", "gap2"]
}

Be specific and actionable. The search query should help find jobs they'll ACTUALLY get interviews for.`
            }]
        });

        const content = message.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected AI response format');
        }

        // Parse Claude's analysis
        let analysis;
        try {
            const jsonText = content.text.trim();
            analysis = JSON.parse(jsonText);
            console.log('✅ Claude analysis complete');
        } catch (parseError) {
            console.error('Failed to parse Claude response:', content.text);
            throw new Error('AI returned invalid analysis');
        }

        // Step 4: Save to cache
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await prisma.careerAnalysis.upsert({
            where: {
                userId_jobTitle: { userId, jobTitle }
            },
            create: {
                userId,
                jobTitle,
                intelligentQuery: analysis.intelligentQuery,
                reasoning: analysis.reasoning,
                keyStrengths: JSON.stringify(analysis.keyStrengths || []),
                potentialGaps: JSON.stringify(analysis.potentialGaps || []),
                expiresAt
            },
            update: {
                intelligentQuery: analysis.intelligentQuery,
                reasoning: analysis.reasoning,
                keyStrengths: JSON.stringify(analysis.keyStrengths || []),
                potentialGaps: JSON.stringify(analysis.potentialGaps || []),
                expiresAt
            }
        });

        console.log('💾 Analysis saved to cache');

        return NextResponse.json({
            intelligentQuery: analysis.intelligentQuery,
            reasoning: analysis.reasoning,
            keyStrengths: analysis.keyStrengths,
            potentialGaps: analysis.potentialGaps,
            cached: false
        });

    } catch (error: any) {
        console.error('❌ Analyze fit error:', error.message);

        return NextResponse.json({
            error: 'Failed to analyze fit',
            details: error.message
        }, { status: 500 });
    }
}

---
File: src/app/api/chat-history/route.ts
---
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const messages = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            select: {
                role: true,
                content: true,
                createdAt: true
            }
        });

        return NextResponse.json({ messages });
    } catch (error: any) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }
}

---
File: src/app/api/chat/route.ts
---
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { CAREER_GALAXY } from '@/data/careerGalaxyData';

export const maxDuration = 60;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { messages, cvText, userId } = await req.json();

        console.log('=== CHAT API REQUEST DEBUG ===');
        console.log('Messages received:', messages.length);
        console.log('User ID:', userId);

        // Log message roles to see what's being counted
        messages.forEach((m: any, i: number) => {
            console.log(`Msg ${i}: role=${m.role}, content_len=${m.content?.length}`);
        });

        const userMessageCount = messages.filter((m: any) => m.role === 'user').length;
        const shouldGeneratePaths = userMessageCount >= 3;

        console.log('Calculated User Message Count:', userMessageCount);
        console.log('Threshold: 3');
        console.log('Should Generate Paths:', shouldGeneratePaths);

        const basePrompt = `You are an expert career consultant AI. Your goal is to have a conversation with the user, then generate personalized career paths.
        
CRITICAL RULES:
1. You MUST ask 3-4 probing questions before generating paths.
2. Do NOT generate paths immediately.
3. Ask about:
   - Specific interests within their field
   - Preferred work environment
   - Long-term goals
   - Values (e.g., impact, money, work-life balance)

4. ONLY generate paths when you have enough information (usually after 3 user turns).
5. When generating paths, you MUST use the JSON format below.`;

        const conditionalPrompt = shouldGeneratePaths
            ? `\n\nGENERATION PHASE:
You have enough information. Generate 3 distinct career paths based on the user's profile and answers.
STEP 1: SYNTHESIS ANALYSIS
- Analyze the user's core strengths from their CV and chat answers.
- Identify their latent potential (skills they have but might not realize apply elsewhere).
- Determine their "Career Gravity" (what they naturally gravitate towards).

STEP 2: GENERATE 3 PATHS
1. Direct Fit: The logical next step, but elevated (e.g., Senior -> Lead).
2. Strategic Pivot: A different role that leverages their existing skills (e.g., Engineer -> PM).
3. Aspirational: A "Moonshot" role that requires growth but fits their potential (e.g., Founder, CTO).

Response format:
Return a JSON object with this structure:
{
  "message": "A brief, encouraging summary of why you chose these paths (max 2 sentences).",
  "synthesis_analysis": "Brief analysis of their profile...",
  "paths": [
    {
      "type": "Direct Fit",
      "reasoning": "Why this fits...",
      "nodeIds": ["id1", "id2"], // Legacy support
      "pathNodes": [ // NEW: Dynamic node generation
         { "id": "unique-id-1", "name": "Role Name", "level": 3 },
         { "id": "unique-id-2", "name": "Role Name", "level": 4 }
      ],
      "optimizedSearchQuery": "Senior Software Engineer London"
    },
    ...
  ],
  "recommendedPath": ["id1", "id2"], // The IDs of the best path
  "recommendationReason": "Why this is the #1 choice"
}`
            : `\n\nINFORMATION GATHERING PHASE:
You need more information. Ask a follow-up question to understand the user better.
- Be conversational and encouraging.
- Do NOT generate JSON yet.
- Keep response short (max 2 sentences).`;

        const rulesPrompt = `\n\nHYBRID GENERATION RULES:
- You can use existing nodes from the "CAREER GALAXY NODE STRUCTURE" below if they fit.
- BUT you are encouraged to GENERATE NEW NODES if the user's niche isn't perfectly covered.
- If generating new nodes, ensure they follow the level structure:
  Level 3: Role Family (e.g., "FinTech Product", "Climate Tech Engineering")
  Level 4: Job Title (e.g., "Senior Product Manager - Payments", "Carbon Capture Engineer")
- Ensure "pathNodes" contains the full lineage for the path (e.g., Level 3 -> Level 4).

CAREER GALAXY NODE STRUCTURE (Reference only):
${JSON.stringify(CAREER_GALAXY.nodes, (key, value) => {
            if (key === 'childIds' || key === 'parentId' || key === 'description') return undefined;
            return value;
        }).substring(0, 5000)}...`; // Truncate to save tokens

        const systemPrompt = basePrompt + conditionalPrompt + rulesPrompt;

        // Prepare messages for Claude
        const claudeMessages = messages.map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        // If we are in generation phase, force JSON mode by pre-filling the assistant response
        if (shouldGeneratePaths) {
            claudeMessages.push({
                role: 'assistant',
                content: 'Here is the personalized career galaxy JSON:\n\n```json\n{'
            });
        }

        // Save user message to DB if we have a userId
        if (userId) {
            try {
                await prisma.chatMessage.create({
                    data: {
                        userId,
                        role: 'user',
                        content: messages[messages.length - 1].content
                    }
                });
            } catch (e) {
                console.error('Failed to save user message:', e);
            }
        }

        console.log('Calling Anthropic API...');
        console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048, // Increased for full JSON
            system: systemPrompt,
            messages: claudeMessages,
        });

        let content = response.content[0].type === 'text' ? response.content[0].text : '';

        // Save assistant response to DB
        if (userId) {
            try {
                await prisma.chatMessage.create({
                    data: {
                        userId,
                        role: 'assistant',
                        content: content
                    }
                });
            } catch (e) {
                console.error('Failed to save assistant message:', e);
            }
        }

        // If we used pre-fill, we need to reconstruct the full JSON
        if (shouldGeneratePaths) {
            content = '{\n' + content; // Re-add the opening brace we pre-filled (minus the code block marker which we'll handle in extraction)
            console.log('=== USING PRE-FILLED CONTENT ===');
        }

        // Extract JSON if present - try multiple aggressive patterns
        let careerData = null;

        console.log('=== EXTRACTING CAREER DATA ===');
        console.log('Response content length:', content.length);
        console.log('Content preview:', content.substring(0, 300));

        // Pattern 1: Code-fenced JSON
        let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        console.log('Pattern 1 (code fence) match:', !!jsonMatch);

        // Pattern 2: Try without json keyword
        if (!jsonMatch) {
            jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
            console.log('Pattern 2 (plain fence) match:', !!jsonMatch);
        }

        // Pattern 3: Raw JSON object (more robust)
        if (!jsonMatch) {
            // Match any JSON object that contains "paths"
            let match = content.match(/\{[\s\S]*"paths"\s*:\s*\[[\s\S]*?\][\s\S]*\}/);
            if (match) {
                jsonMatch = [match[0], match[0]];
                console.log('Pattern 3 (raw JSON) found match');
            }
        }

        // Parse the JSON if found
        if (jsonMatch && jsonMatch[1]) {
            console.log('📋 Found JSON, attempting parse...');
            try {
                const jsonStr = jsonMatch[1].trim();
                const parsed = JSON.parse(jsonStr);
                console.log('Parsed structure keys:', Object.keys(parsed));

                // NEW FORMAT: Handle paths array
                if (parsed.paths && Array.isArray(parsed.paths) && parsed.paths.length > 0) {
                    const primaryPath = parsed.paths.find((p: any) => p.type === 'Direct Fit') || parsed.paths[0];

                    // Extract nodeIds from pathNodes if available (new format), or use nodeIds directly (legacy)
                    const nodeIds = primaryPath.pathNodes
                        ? primaryPath.pathNodes.map((n: any) => n.id)
                        : primaryPath.nodeIds;

                    if (primaryPath && nodeIds) {
                        careerData = {
                            recommendedPath: {
                                nodeIds: nodeIds,
                                reasoning: primaryPath.reasoning
                            },
                            paths: parsed.paths,  // Store full paths array with pathNodes
                            alternativePaths: parsed.paths.filter((p: any) => p.type !== 'Direct Fit')
                        };
                        console.log('✅ Valid paths array structure');
                        console.log('Primary path IDs:', nodeIds);
                        console.log('All paths:', parsed.paths.length);
                    }
                }
                // LEGACY FORMAT: Handle single recommendedPath
                else if (parsed.recommendedPath && parsed.recommendedPath.nodeIds) {
                    careerData = parsed;
                    console.log('✅ Valid legacy recommendedPath structure');
                    console.log('Path IDs:', parsed.recommendedPath.nodeIds);
                }
                else {
                    console.error('Invalid structure: missing paths array or recommendedPath.nodeIds');
                }
            } catch (e: any) {
                console.error('❌ JSON parse failed:', e.message);
            }
        }

        // Clean the message - remove all JSON
        let cleanMessage = content;

        // Remove code fences
        cleanMessage = cleanMessage.replace(/```json[\s\S]*?```/g, '');
        cleanMessage = cleanMessage.replace(/```[\s\S]*?```/g, '');

        // Remove raw JSON objects (aggressive)
        // Matches { "synthesis_analysis" ... } or { "paths" ... }
        cleanMessage = cleanMessage.replace(/\{[\s\S]*"synthesis_analysis"[\s\S]*\}/g, '');
        cleanMessage = cleanMessage.replace(/\{[\s\S]*"paths"[\s\S]*\}/g, '');
        cleanMessage = cleanMessage.replace(/\{[\s\S]*"recommendedPath"[\s\S]*\}/g, '');

        // Clean up extra characters
        cleanMessage = cleanMessage.replace(/^\s*\}\s*\}\s*`*\s*$/gm, '');
        cleanMessage = cleanMessage.trim();

        // If we have career data, we want to keep the AI's natural response if it exists
        // The AI might have answered a question before the JSON block
        if (careerData && careerData.recommendedPath) {
            // If the message is empty (AI only output JSON), add a friendly transition
            if (!cleanMessage || cleanMessage.trim().length < 5) {
                cleanMessage = "Perfect! I've analyzed your experience and created a personalized career path. Let me show you the galaxy view where you can explore your recommended route! 🌟";
            }
            // Otherwise, keep the AI's message (which might answer the user's question)
        }

        // Fallback if message is empty
        if (!cleanMessage || cleanMessage.length < 10) {
            cleanMessage = "I've generated your personalized career path. Let's explore it in the galaxy view!";
        }

        console.log('=== RESPONSE ===');
        console.log('Has career data:', !!careerData);
        console.log('Clean message:', cleanMessage);

        // Return full paths array for multi-path visualization
        return NextResponse.json({
            message: cleanMessage,
            paths: careerData?.paths || [],  // Return all 3 paths from careerData
            recommendedPath: careerData?.recommendedPath?.nodeIds || [],  // Keep for backwards compatibility
            recommendationReason: careerData?.recommendedPath?.reasoning || '',
        });

    } catch (error: any) {
        console.error('=== ERROR IN CHAT API ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return NextResponse.json({
            error: 'Failed to generate response',
            details: error.message,
            type: error.name
        }, { status: 500 });
    }
}

---
File: src/app/api/job-count/route.ts
---
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { jobTitle, intelligentQuery, location = 'United Kingdom' } = await req.json();

        // Accept either intelligentQuery (AI-generated) or jobTitle (generic)
        const searchQuery = intelligentQuery || jobTitle;

        if (!searchQuery) {
            return NextResponse.json(
                { error: 'jobTitle or intelligentQuery is required' },
                { status: 400 }
            );
        }

        console.log('🔍 Fetching jobs:', intelligentQuery ? '(AI-powered)' : '(generic)');
        console.log('  Query:', searchQuery.substring(0, 100) + '...');

        const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

        if (!PERPLEXITY_API_KEY) {
            throw new Error('PERPLEXITY_API_KEY not configured');
        }

        // Query Perplexity with intelligent search
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [{
                    role: 'user',
                    content: `Find current job listings in ${location} for: ${searchQuery}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "count": <total number of jobs found>,
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "url": "https://...",
      "salary": "Salary range or null"
    }
  ]
}

Include up to 10 recent, relevant job listings. If no jobs found, return count: 0 and empty jobs array.`
                }],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Perplexity API error:', errorText);
            throw new Error(`Perplexity API failed: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in Perplexity response');
        }

        // Parse the JSON response
        let jobData;
        try {
            // Clean up potential markdown formatting
            const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            jobData = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('Failed to parse Perplexity response:', content);
            // Return a fallback
            jobData = {
                count: 0,
                jobs: [],
                note: 'Could not parse job data'
            };
        }

        console.log('✅ Found', jobData.count, 'jobs');

        return NextResponse.json({
            success: true,
            jobTitle: jobTitle || 'AI-matched roles',
            location,
            count: jobData.count || 0,
            jobs: jobData.jobs || [],
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Job count error:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch job count',
            details: error.message
        }, { status: 500 });
    }
}

---
File: src/app/api/parse-cv/route.ts
---
import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ParsedCV {
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year?: string;
  }>;
  summary?: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('📄 Processing CV:', file.name);

    // Step 1: Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const { text } = await extractText(new Uint8Array(arrayBuffer), {
      mergePages: true
    });

    console.log('✅ Extracted text:', text.length, 'characters');

    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract meaningful text from PDF');
    }

    // Step 2: Parse CV with Anthropic AI
    console.log('🤖 Parsing CV with AI...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a CV parsing expert. Extract structured information from this CV text.

CV Text:
${text}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "summary": "Brief professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Jan 2020 - Present",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Name",
      "year": "2020"
    }
  ]
}

If any field is not found, use null or empty array. Be comprehensive with skills extraction.`
      }]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response from AI');
    }

    // Parse the AI response
    let parsedCV: ParsedCV;
    try {
      const jsonText = content.text.trim();
      parsedCV = JSON.parse(jsonText);
      console.log('✅ AI parsed CV:', parsedCV.name, '-', parsedCV.skills?.length || 0, 'skills');
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.text);
      throw new Error('AI returned invalid JSON');
    }

    // Step 3: Save to database
    console.log('💾 Saving to database...');

    let user;
    if (parsedCV.email) {
      // If email exists, upsert (update if exists, create if not)
      user = await prisma.user.upsert({
        where: { email: parsedCV.email },
        update: {
          name: parsedCV.name || undefined,
          parsedCV: JSON.stringify(parsedCV),
          updatedAt: new Date()
        },
        create: {
          name: parsedCV.name || 'Anonymous',
          email: parsedCV.email,
          parsedCV: JSON.stringify(parsedCV)
        }
      });
      console.log('✅ User upserted:', user.id);
    } else {
      // If no email, just create a new user
      user = await prisma.user.create({
        data: {
          name: parsedCV.name || 'Anonymous',
          email: null,
          parsedCV: JSON.stringify(parsedCV)
        }
      });
      console.log('✅ User created (no email):', user.id);
    }

    return NextResponse.json({
      text: text.trim(),
      parsed: parsedCV,
      userId: user.id,
      success: true
    });

  } catch (error: any) {
    console.error('❌ CV parsing error:', error.message);

    return NextResponse.json({
      error: 'Failed to parse CV',
      details: error.message
    }, { status: 500 });
  }
}

---
File: src/app/api/rank-jobs/route.ts
---
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    salary: string;
    url: string;
}

interface RankingRequest {
    jobs: Job[];
    cvText: string;
}

export async function POST(req: NextRequest) {
    try {
        const { jobs, cvText }: RankingRequest = await req.json();

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({ rankedJobs: [] });
        }

        // Create a prompt for Claude to rank jobs
        const rankingPrompt = `You are a career advisor helping someone find the best job matches based on their CV.

CV Summary:
${cvText.substring(0, 2000)}

Jobs to evaluate:
${jobs.map((job, idx) => `
Job ${idx + 1}:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description.substring(0, 300)}
`).join('\n---\n')}

For each job, provide:
1. Overall match score (0-100)
2. Breakdown scores:
   - Skills Match (0-40): How well candidate's skills align with job requirements
   - Experience Fit (0-30): Whether experience level matches (entry/mid/senior)
   - Role Relevance (0-20): How relevant the role is to career goals
   - Other Factors (0-10): Location, company type, etc.
3. Matching skills (list of 2-3 key skills that match)
4. Missing skills (list of 1-2 skills candidate should develop)
5. Brief reason (max 12 words)

Return ONLY a JSON array with this exact format:
[
  {
    "jobIndex": 0,
    "score": 85,
    "breakdown": {
      "skills": 35,
      "experience": 25,
      "relevance": 18,
      "other": 7
    },
    "matchingSkills": ["Python", "React", "AWS"],
    "missingSkills": ["Kubernetes"],
    "reason": "Strong technical match, great growth opportunity"
  }
]

Be concise and accurate.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 3072,
            messages: [{ role: 'user', content: rankingPrompt }],
        });

        const responseText = (response.content[0] as any).text;

        // Extract JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Failed to parse ranking response');
            return NextResponse.json({ rankedJobs: jobs });
        }

        const rankings = JSON.parse(jsonMatch[0]);

        // Merge scores with jobs
        const rankedJobs = jobs.map((job, idx) => {
            const ranking = rankings.find((r: any) => r.jobIndex === idx);
            return {
                ...job,
                matchScore: ranking?.score || 50,
                matchReason: ranking?.reason || 'Potential match',
                scoreBreakdown: ranking?.breakdown || {
                    skills: 20,
                    experience: 15,
                    relevance: 10,
                    other: 5,
                },
                matchingSkills: ranking?.matchingSkills || [],
                missingSkills: ranking?.missingSkills || [],
            };
        });

        // Sort by score descending
        rankedJobs.sort((a, b) => b.matchScore - a.matchScore);

        return NextResponse.json({ rankedJobs });
    } catch (error) {
        console.error('Error ranking jobs:', error);
        return NextResponse.json({ error: 'Failed to rank jobs' }, { status: 500 });
    }
}

---
File: src/app/api/save-job/route.ts
---
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId, job } = await req.json();

        if (!userId || !job) {
            return NextResponse.json(
                { error: 'userId and job data are required' },
                { status: 400 }
            );
        }

        console.log('💾 Saving job for user:', userId);
        console.log('  Job:', job.title, 'at', job.company);

        // Save to database
        const savedJob = await prisma.savedJob.create({
            data: {
                userId,
                jobData: JSON.stringify(job),
                status: 'saved',
                notes: ''
            }
        });

        console.log('✅ Job saved:', savedJob.id);

        return NextResponse.json({
            success: true,
            savedJob
        });

    } catch (error: any) {
        console.error('❌ Save job error:', error.message);

        return NextResponse.json({
            error: 'Failed to save job',
            details: error.message
        }, { status: 500 });
    }
}

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

        const savedJobs = await prisma.savedJob.findMany({
            where: { userId },
            orderBy: { savedAt: 'desc' }
        });

        // Parse the JSON strings back to objects
        const parsedJobs = savedJobs.map(job => ({
            ...job,
            jobData: JSON.parse(job.jobData)
        }));

        return NextResponse.json({
            savedJobs: parsedJobs
        });

    } catch (error: any) {
        console.error('❌ Get saved jobs error:', error.message);

        return NextResponse.json({
            error: 'Failed to fetch saved jobs',
            details: error.message
        }, { status: 500 });
    }
}

---
File: src/app/api/save-recommendation/route.ts
---
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

---
File: src/app/api/search-jobs/route.ts
---
import { NextRequest, NextResponse } from 'next/server';
import { JobSearchService } from '@/services/jobSearchService';
import { PerplexityJobSearchService } from '@/services/perplexityJobSearch';

// Calculate relevance score between CV and job
function calculateRelevance(job: any, cvText: string, experienceLevel: string): number {
    let score = 0;
    const cvLower = cvText.toLowerCase();
    const titleLower = job.title.toLowerCase();
    const descLower = (job.description || '').toLowerCase();

    // 1. Experience level match (30 points)
    const jobLevel = inferJobLevel(titleLower);
    if (jobLevel === experienceLevel) {
        score += 30;
    } else if (isAdjacentLevel(jobLevel, experienceLevel)) {
        score += 15;
    }

    // 2. Title keyword overlap (20 points)
    const titleWords = titleLower.split(/\s+/);
    const cvWords = new Set(cvLower.split(/\s+/));
    const titleMatches = titleWords.filter((word: string) => word.length > 3 && cvWords.has(word)).length;
    score += Math.min(20, titleMatches * 4);

    // 3. Skills overlap (30 points)
    const commonSkills = ['javascript', 'python', 'react', 'node', 'typescript', 'sql', 'aws', 'docker',
        'java', 'management', 'leadership', 'agile', 'excel', 'analytics'];
    const skillMatches = commonSkills.filter((skill: string) =>
        cvLower.includes(skill) && (titleLower.includes(skill) || descLower.includes(skill))
    ).length;
    score += Math.min(30, skillMatches * 6);

    // 4. Description relevance (20 points)
    const descWords = descLower.split(/\s+/).filter((w: string) => w.length > 4);
    const descMatches = descWords.filter((word: string) => cvWords.has(word)).length;
    score += Math.min(20, Math.floor(descMatches / 10) * 5);

    return Math.min(100, Math.round(score));
}

function inferJobLevel(title: string): string {
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) return 'senior';
    if (title.includes('junior') || title.includes('graduate') || title.includes('entry')) return 'entry';
    if (title.includes('head') || title.includes('director') || title.includes('manager')) return 'lead';
    return 'mid';
}

function isAdjacentLevel(level1: string, level2: string): boolean {
    const levels = ['entry', 'mid', 'senior', 'lead'];
    const idx1 = levels.indexOf(level1);
    const idx2 = levels.indexOf(level2);
    return Math.abs(idx1 - idx2) === 1;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const queries = body.queries || [body.query || 'software developer'];
        const location = body.location || 'London, United Kingdom';
        const limit = body.limit || 10;
        const experienceLevel = body.experienceLevel || 'any';
        const workType = body.workType || 'any';
        const cvText = body.cvText || '';

        console.log('Job search params:', { queries, location, limit, experienceLevel, hasCvText: !!cvText });

        let jobs: any[] = [];
        let searchSource = 'unknown';

        // Try Perplexity first (primary source)
        try {
            console.log('🔍 Searching with Perplexity AI...');
            jobs = await PerplexityJobSearchService.search({
                queries,
                location,
                experienceLevel,
                limit: limit * 2 // Fetch more to allow filtering
            });
            searchSource = 'perplexity';
            console.log(`✅ Perplexity returned ${jobs.length} jobs`);
        } catch (perplexityError) {
            console.error('⚠️ Perplexity search failed, falling back to traditional APIs:', perplexityError);

            // Fallback to existing job boards
            try {
                jobs = await JobSearchService.search({
                    queries: queries,
                    location: location,
                    experienceLevel: experienceLevel,
                    workType: workType,
                    limit: limit * 2
                });
                searchSource = 'fallback';
                console.log(`✅ Fallback APIs returned ${jobs.length} jobs`);
            } catch (fallbackError) {
                console.error('❌ Both Perplexity and fallback failed:', fallbackError);
                return NextResponse.json({
                    jobs: [],
                    error: 'All job search services failed',
                    searchSource: 'none'
                });
            }
        }

        // Calculate relevance scores if CV provided
        if (cvText && jobs.length > 0) {
            jobs = jobs.map(job => ({
                ...job,
                matchScore: calculateRelevance(job, cvText, experienceLevel),
                matchReason: generateMatchReason(job, cvText)
            }));

            // Filter out low-relevance jobs (< 20% match)
            jobs = jobs.filter(job => (job.matchScore || 0) >= 20);

            // Sort by relevance score (highest first)
            jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

            // Limit to requested count
            jobs = jobs.slice(0, limit);
        } else {
            // No CV text, just limit results
            jobs = jobs.slice(0, limit);
        }

        console.log(`📊 Returning ${jobs.length} jobs (source: ${searchSource})`);

        return NextResponse.json({
            jobs,
            searchSource,
            totalFound: jobs.length
        });
    } catch (error) {
        console.error('Error in job search API:', error);
        return NextResponse.json({
            error: 'Failed to search jobs',
            jobs: [],
            searchSource: 'error'
        }, { status: 500 });
    }
}

function generateMatchReason(job: any, cvText: string): string {
    const score = job.matchScore || 0;
    if (score >= 70) return 'Excellent match for your skills and experience';
    if (score >= 50) return 'Good fit based on your background';
    if (score >= 30) return 'Potential match worth exploring';
    return 'Some relevant aspects';
}

---
File: src/app/globals.css
---
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }

  33% {
    transform: translate(30px, -50px) scale(1.1);
  }

  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }

  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

@keyframes emp-wave {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }

  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}
---
File: src/app/layout.tsx
---
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lookmore - AI Job Search",
  description: "Find your dream job with AI-powered matching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={spaceGrotesk.className}>{children}</body>
    </html>
  );
}

---
File: src/app/page.tsx
---
'use client';

import React, { useState, useEffect } from 'react';
import CVUpload from '@/components/CVUpload';
import ChatInterface from '@/components/ChatInterface';
import JobResults from '@/components/JobResults';
import { Sparkles } from 'lucide-react';
import CareerPathSelector from '@/components/CareerPathSelector';
import CareerGalaxy from '@/components/CareerGalaxy';
import FloatingChatBubble from '@/components/FloatingChatBubble';
import { useConstellationStore } from '@/hooks/useConstellationStore';
import { constellationData } from '@/data/constellationData';
import { getUserId } from '@/lib/userSession';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'chat' | 'galaxy' | 'results'>('upload');
  const [cvText, setCvText] = useState('');
  const [searchParams, setSearchParams] = useState<any>({});
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [careerClusters, setCareerClusters] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // AI Recommendation state
  const [recommendedPath, setRecommendedPath] = useState<string[] | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string | null>(null);
  const [allPaths, setAllPaths] = useState<any[]>([]);

  // Check for returning user on page load
  useEffect(() => {
    const checkReturningUser = async () => {
      const userId = getUserId();

      if (userId) {
        console.log('🔄 Returning user detected:', userId);
        setIsReturningUser(true);

        try {
          // Fetch saved recommendations
          const recResponse = await fetch(`/api/save-recommendation?userId=${userId}`);

          if (recResponse.ok) {
            const data = await recResponse.json();

            if (data.recommendations && data.recommendations.length > 0) {
              const latestRec = data.recommendations[0]; // Most recent
              console.log('✅ Loaded saved recommendation:', latestRec.id);

              // Restore the paths
              setAllPaths(latestRec.paths);
              setRecommendationReason(latestRec.reasoning);

              // Extract primary path (first path's nodeIds)
              if (latestRec.paths && latestRec.paths.length > 0) {
                setRecommendedPath(latestRec.paths[0].nodeIds);

                // Auto-navigate to Galaxy view
                // setStep('galaxy'); // User requested to stop auto-navigation
                console.log('🌌 Data loaded, ready for Galaxy view');
              }
            }
          }

          // Fetch chat history
          const chatResponse = await fetch(`/api/chat-history?userId=${userId}`);
          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            if (chatData.messages && chatData.messages.length > 0) {
              console.log('💬 Loaded saved chat history:', chatData.messages.length, 'messages');
              setChatMessages(chatData.messages);
            }
          }

        } catch (error) {
          console.error('Failed to load saved user data:', error);
          // Don't block the user, just continue normally
        }
      }
    };

    checkReturningUser();
  }, []);

  const handleUploadComplete = (text: string) => {
    setCvText(text);
    setStep('chat');
  };

  const handleSearchReady = (data: any) => {
    console.log('Search ready with data:', data);

    // Capture paths array if available
    if (data.paths && data.paths.length > 0) {
      console.log('Setting all paths:', data.paths);
      setAllPaths(data.paths);
    }

    if (data.recommendedPath) {
      console.log('Setting recommended path:', data.recommendedPath);
      setRecommendedPath(data.recommendedPath);

      // Transition to galaxy view
      if (step !== 'galaxy') {
        setStep('galaxy');
      }
    } else if (data.clusters) {
      console.log('Setting career clusters:', data.clusters);
      setCareerClusters(data.clusters);
      // Transition to galaxy view
      if (step !== 'galaxy') {
        setStep('galaxy');
      }
    } else if (data.queries) {
      // Fallback for legacy or direct search params
      console.log('Setting search params:', data);
      setSearchParams(data);
      // Don't switch to 'results' if we're already in galaxy view
      // This keeps the split-screen layout intact
      if (step !== 'galaxy') {
        setStep('results');
      }
    } else {
      console.warn('No clusters, recommendedPath, or queries in data');
    }
  };

  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node);
    setSelectedNode(node);

    // Level 4 nodes are job titles - trigger job search
    if (node.level === 4 || node.type === 'role') {
      console.log('Triggering job search for:', node.name);

      // Check if this node is part of a recommended path to use the optimized query
      const matchingPath = allPaths.find(path => path.nodeIds.includes(node.id));
      const query = matchingPath?.optimizedSearchQuery || node.name;

      console.log('Using query:', query, matchingPath ? '(Optimized)' : '(Default)');

      setSearchParams({
        queries: [query],
        location: 'London, United Kingdom',
        experienceLevel: node.experienceLevel || 'entry_level',
        workType: 'full_time',
        cvText: cvText // Pass CV for relevance scoring
      });
    }
  };

  const handleRecommendationReceived = (nodeIds: string[], reasoning: string, paths?: any[]) => {
    console.log('Recommendations received in page.tsx:', nodeIds, reasoning);
    setRecommendedPath(nodeIds);
    setRecommendationReason(reasoning);
    if (paths) {
      setAllPaths(paths);
    }
  };

  const handleClusterSelection = (cluster: any) => {
    setSearchParams({
      queries: cluster.startingRoles,
      location: 'London, United Kingdom', // Default or extracted from CV later
      experienceLevel: 'entry_level', // Default or extracted
      workType: 'any'
    });
    setStep('results');
  };

  const handleMessagesUpdate = (messages: any[]) => {
    setChatMessages(messages);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[95%] mx-auto px-4 py-8 flex flex-col items-center min-h-screen">

        {/* Logo & Header */}
        <div className={`transition-all duration-500 flex flex-col items-center ${step === 'results' || step === 'galaxy' ? 'scale-75 mb-4' : 'mb-12'}`}>
          <div className="w-24 h-24 mb-6 relative group">
            <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <img
              src="/logo.png"
              alt="Lookmore Logo"
              className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
            />
          </div>

          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white tracking-tight mb-3 text-center">
            Lookmore
          </h1>
          <p className="text-blue-200 text-lg font-light tracking-wide">
            See what others miss
          </p>
        </div>

        <div className="w-full space-y-6">
          {step === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20">
                <CVUpload onUploadComplete={handleUploadComplete} />
              </div>
              {/* Debug Button */}
              <button
                onClick={() => {
                  // Just go straight to galaxy view, no mock data needed
                  setStep('galaxy');
                }}
                className="text-xs text-white/30 hover:text-white/80 transition-colors mx-auto block"
              >
                [Debug] Test Career Galaxy
              </button>
            </div>
          )}

          {step === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <ChatInterface
                cvText={cvText}
                onSearchReady={handleSearchReady}
                initialMessages={chatMessages.length > 0 ? chatMessages : undefined}
                onMessagesUpdate={handleMessagesUpdate}
                onRecommendationReceived={handleRecommendationReceived}
              />

              <div className="flex justify-center">
                <button
                  onClick={() => setStep('results')}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-105 shadow-xl"
                >
                  ✨ Show Matched Jobs
                </button>
              </div>
            </div>
          )}

          {step === 'galaxy' && (
            <div className="fixed inset-0 bg-slate-950">
              {/* Welcome Back Banner for Returning Users */}
              {isReturningUser && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg border border-blue-400/30 rounded-2xl px-6 py-3 shadow-2xl">
                    <p className="text-blue-100 font-medium flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Welcome back! Your career journey continues...
                    </p>
                  </div>
                </div>
              )}

              {/* Full-Screen Galaxy */}
              <CareerGalaxy
                data={careerClusters}
                onNodeClick={handleNodeClick}
                paths={allPaths}  // Pass all 3 paths
                recommendationReason={recommendationReason || undefined}
              />

              {/* Floating Chat Bubble */}
              <FloatingChatBubble
                cvText={cvText}
                onRecommendationReceived={handleRecommendationReceived}
                onMessagesUpdate={handleMessagesUpdate}
                initialMessages={chatMessages}
              />
            </div>
          )}

          {step === 'results' && (
            <div className="w-full max-w-7xl mx-auto space-y-6">
              {/* Back Button */}
              <button
                onClick={() => {
                  setStep('upload');
                  setCvText('');
                  setSearchParams({});
                }}
                className="text-sm text-cyan-300 hover:text-white font-medium flex items-center gap-2 group transition-colors"
              >
                <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                Start New Search
              </button>

              {/* Chat Bar - Horizontal across top */}
              <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <h2 className="text-lg font-bold text-white">Refine Your Search</h2>
                    <p className="text-cyan-200/70 text-xs">Keep chatting to find better matches</p>
                  </div>
                </div>
                <ChatInterface
                  cvText={cvText}
                  onSearchReady={handleSearchReady}
                  compact={true}
                  initialMessages={chatMessages}
                  onMessagesUpdate={handleMessagesUpdate}
                />
              </div>

              {/* Job Results - Full width below */}
              <JobResults searchParams={searchParams} cvText={cvText} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

---
File: src/components/CareerGalaxy.tsx
---
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useConstellationStore } from '@/hooks/useConstellationStore';
import { getUserId } from '@/lib/userSession';
import { CAREER_GALAXY, CareerNode, applyRecommendations, clearRecommendations } from '@/data/careerGalaxyData';
import { generateRadialLayout, PositionedNode, DEFAULT_LAYOUT_CONFIG } from '@/utils/galaxyLayout';
import JobListPanel from './JobListPanel';
import Starfield from './Starfield';

interface CareerGalaxyProps {
    data?: any;
    onNodeClick?: (node: any) => void;
    paths?: Array<{
        type: string;           // "Direct Fit", "Strategic Pivot", "Aspirational"
        nodeIds: string[];      // Legacy support
        pathNodes?: Array<{     // New rich format for dynamic nodes
            id: string;
            name: string;
            level: number;
        }>;
        reasoning: string;
        optimizedSearchQuery: string;
    }>;
    recommendationReason?: string; // Why this path is recommended
}

// Path type colors
const PATH_COLORS: Record<string, string> = {
    'Direct Fit': '#10b981',      // Green
    'Strategic Pivot': '#f59e0b',  // Orange/Amber
    'Aspirational': '#8b5cf6'      // Purple
};

export default function CareerGalaxy({ data, onNodeClick, paths, recommendationReason }: CareerGalaxyProps) {
    const { selectRole } = useConstellationStore();
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Use ref for high-performance imperative updates (pan/zoom)
    const viewBoxRef = useRef({ x: -750, y: -450, width: 1500, height: 900 });
    // Use state ONLY for smooth transitions (auto-zoom, centering)
    const [viewBoxState, setViewBoxState] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Job count state
    const [jobCounts, setJobCounts] = useState<Record<string, { count: number, jobs?: any[], loading: boolean, reasoning?: string, keyStrengths?: string[], potentialGaps?: string[] }>>({});
    const [loadingJobCount, setLoadingJobCount] = useState<string | null>(null);
    const [selectedJobNodeId, setSelectedJobNodeId] = useState<string | null>(null);

    // Helper to update SVG viewBox imperatively
    const updateViewBox = useCallback((vb: { x: number, y: number, width: number, height: number }) => {
        viewBoxRef.current = vb;
        if (containerRef.current) {
            const svg = containerRef.current.querySelector('svg');
            if (svg) {
                svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
            }
        }
    }, []);

    // Sync state changes to ref (for smooth transitions)
    useEffect(() => {
        if (viewBoxState) {
            updateViewBox(viewBoxState);
        }
    }, [viewBoxState, updateViewBox]);

    // DEBUG: Log paths whenever they change
    useEffect(() => {
        console.log('🎯 CareerGalaxy Props Check:');
        console.log('  paths:', paths);
        console.log('  paths length:', paths?.length);
        console.log('  recommendationReason:', recommendationReason);
    }, [paths, recommendationReason]);

    // Smooth zoom easing system
    const currentZoomRef = useRef(1);
    const targetZoomRef = useRef(1);
    const animationFrameRef = useRef<number | null>(null);

    // State for progressive disclosure
    const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
    const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
    const [expansionHistory, setExpansionHistory] = useState<string[]>([]); // Track expansion order for "back"

    // Initialize visible nodes with root nodes (Level 0)
    useEffect(() => {
        // Start with just root nodes visible
        const rootNodes = new Set(CAREER_GALAXY.rootNodes);
        setVisibleNodeIds(rootNodes);
    }, []);


    // Note: Recommendations are now applied directly in the useMemo for allPositionedNodes
    // No separate useEffect needed since we track paths in the dependency array

    // Build radial web layout with all nodes positioned - ALWAYS use static CAREER_GALAXY
    const allPositionedNodes = useMemo(() => {
        console.log('📊 Building galaxy from static CAREER_GALAXY tree');

        // Create a local copy of nodes to allow dynamic injection
        // We use a deep copy for the nodes we modify to avoid mutating the static data
        const nodesMap: Record<string, CareerNode> = {};
        Object.keys(CAREER_GALAXY.nodes).forEach(key => {
            nodesMap[key] = { ...CAREER_GALAXY.nodes[key], childIds: [...CAREER_GALAXY.nodes[key].childIds] };
        });

        // Dynamically inject missing nodes from paths
        if (paths && paths.length > 0) {
            paths.forEach(path => {
                if (path.pathNodes && path.pathNodes.length > 0) {
                    path.pathNodes.forEach((nodeInfo, index) => {
                        // If node doesn't exist in our map, create it
                        if (!nodesMap[nodeInfo.id]) {
                            console.log(`✨ Injecting dynamic node: ${nodeInfo.name} (${nodeInfo.id})`);

                            // Infer parent from previous node in path
                            const parentId = index > 0 ? path.pathNodes![index - 1].id : null;

                            // Create new node
                            nodesMap[nodeInfo.id] = {
                                id: nodeInfo.id,
                                name: nodeInfo.name,
                                level: nodeInfo.level as any,
                                parentId: parentId,
                                childIds: [], // Will be populated later
                                color: parentId && nodesMap[parentId] ? nodesMap[parentId].color : '#6b7280', // Inherit color
                                description: 'AI-generated career node',
                                recommended: true
                            };

                            // Connect to parent
                            if (parentId && nodesMap[parentId]) {
                                if (!nodesMap[parentId].childIds.includes(nodeInfo.id)) {
                                    nodesMap[parentId].childIds.push(nodeInfo.id);
                                }
                            }
                        }
                    });
                }
            });
        }

        console.log('Total nodes (after injection):', Object.keys(nodesMap).length);
        console.log('Root nodes:', CAREER_GALAXY.rootNodes);

        const allNodes = Object.values(nodesMap) as CareerNode[];

        // Use the extracted layout utility
        const positionedNodes = generateRadialLayout(allNodes, DEFAULT_LAYOUT_CONFIG);

        // Apply path recommendations to positioned nodes
        if (paths && paths.length > 0) {
            positionedNodes.forEach(node => {
                // Find which paths this node belongs to
                const nodePaths = paths.filter(p =>
                    p.nodeIds?.includes(node.id) ||
                    p.pathNodes?.some(pn => pn.id === node.id)
                );

                if (nodePaths.length > 0) {
                    node.recommended = true;
                    node.pathTypes = nodePaths.map(p => p.type);
                    node.pathColors = nodePaths.map(p => PATH_COLORS[p.type] || '#ffffff');

                    // Add reasoning if it's the last node in a path
                    const primaryPath = nodePaths[0];
                    const lastNodeId = primaryPath.nodeIds ? primaryPath.nodeIds[primaryPath.nodeIds.length - 1] : primaryPath.pathNodes?.[primaryPath.pathNodes.length - 1].id;

                    if (node.id === lastNodeId) {
                        node.recommendationReason = primaryPath.reasoning;
                    }
                }
            });
        }

        return { allNodes: positionedNodes, allLinks: [] }; // Links will be calculated separately
    }, [paths]);

    // Calculate links separately based on positioned nodes
    const links = useMemo(() => {
        const allLinks: { from: string; to: string; fromPos: { x: number, y: number }, toPos: { x: number, y: number }, color: string }[] = [];
        const { allNodes } = allPositionedNodes;

        allNodes.forEach(node => {
            if (node.parentId) {
                const parent = allNodes.find(n => n.id === node.parentId);
                if (parent) {
                    allLinks.push({
                        from: parent.id,
                        to: node.id,
                        fromPos: { x: parent.x, y: parent.y },
                        toPos: { x: node.x, y: node.y },
                        color: node.color
                    });
                }
            }
        });
        return allLinks;
    }, [allPositionedNodes]);

    // Filter visible nodes and links based on progressive disclosure
    const { visibleNodes, visibleLinks } = useMemo(() => {
        const { allNodes } = allPositionedNodes;

        // Filter nodes: must be in visibleNodeIds set
        const filteredNodes = allNodes.filter(n => visibleNodeIds.has(n.id));

        // Filter links: both source and target must be visible
        const filteredLinks = links.filter(l =>
            visibleNodeIds.has(l.from) && visibleNodeIds.has(l.to)
        );

        return { visibleNodes: filteredNodes, visibleLinks: filteredLinks };
    }, [allPositionedNodes, links, visibleNodeIds]);

    // Auto-expand and zoom to the primary path when it loads
    useEffect(() => {
        console.log('🔍 Auto-expand useEffect triggered');
        console.log({
            hasPaths: !!paths,
            pathsLength: paths?.length,
            hasNodes: allPositionedNodes.allNodes.length > 0,
            nodeCount: allPositionedNodes.allNodes.length
        });

        // Extract the primary path (Direct Fit) from the paths array
        const primaryPath = paths?.find(p => p.type === 'Direct Fit');
        const primaryNodeIds = primaryPath?.nodeIds;

        if (primaryNodeIds && primaryNodeIds.length > 1 && allPositionedNodes.allNodes.length > 0) {
            console.log('✅ AUTO-EXPANDING PRIMARY PATH:', primaryNodeIds);

            // Expand each node in the path (except the last one which has no children)
            const nodesToExpand = primaryNodeIds.slice(0, -1);
            console.log('📂 Nodes to expand:', nodesToExpand);

            nodesToExpand.forEach((nodeId, index) => {
                setTimeout(() => {
                    const node = allPositionedNodes.allNodes.find(n => n.id === nodeId);
                    console.log(`📂 Expanding node ${index}:`, { nodeId, found: !!node, hasChildren: node?.childIds?.length });

                    if (node && node.childIds && node.childIds.length > 0) {
                        setVisibleNodeIds(prev => {
                            const newSet = new Set(prev);
                            node.childIds.forEach(childId => newSet.add(childId));
                            console.log(`✨ Added ${node.childIds.length} children of ${nodeId}`);
                            return newSet;
                        });
                        setExpandedNodeIds(prev => new Set([...prev, nodeId]));
                    }
                }, index * 300); // Stagger for animation
            });

            // Center and zoom on the final job node after expansion completes
            const finalNodeId = primaryNodeIds[primaryNodeIds.length - 1];
            setTimeout(() => {
                const finalNode = allPositionedNodes.allNodes.find(n => n.id === finalNodeId);
                if (finalNode) {
                    console.log('🎯 Zooming to final node:', finalNodeId);
                    // Zoom to 2.7x on recommended path
                    const baseWidth = 2000;
                    const baseHeight = 1200;
                    const zoom = 2.7;
                    const newWidth = baseWidth / zoom;
                    const newHeight = baseHeight / zoom;

                    // Use state for smooth transition on auto-zoom
                    setViewBoxState({
                        x: finalNode.x - newWidth / 2,
                        y: finalNode.y - newHeight / 2,
                        width: newWidth,
                        height: newHeight
                    });
                    console.log(`Auto-zoomed to ${zoom}x on ${finalNode.name}`);
                }
            }, nodesToExpand.length * 300 + 500);
        }
    }, [paths, allPositionedNodes]);

    // Pan handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        setViewBoxState(null); // Disable transitions during interaction
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;

        const currentVB = viewBoxRef.current;
        const container = containerRef.current;
        if (!container) return;

        // Calculate scale based on current viewBox and container size
        const scaleX = currentVB.width / container.clientWidth;
        const scaleY = currentVB.height / container.clientHeight;

        const dx = (e.clientX - panStart.x) * scaleX;
        const dy = (e.clientY - panStart.y) * scaleY;

        updateViewBox({
            ...currentVB,
            x: currentVB.x - dx,
            y: currentVB.y - dy
        });

        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Zoom handler - Direct updates for reliability
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.stopPropagation();

        const sensitivity = 0.002;
        const delta = -e.deltaY * sensitivity;

        // Calculate the new zoom value
        const newZoom = targetZoomRef.current * (1 + delta);

        // Clamp between limits
        const minZoom = 0.3;
        const maxZoom = 4;

        // Update target zoom
        const finalZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        targetZoomRef.current = finalZoom;
        currentZoomRef.current = finalZoom;

        // Apply zoom immediately
        const currentVB = viewBoxRef.current;
        updateViewBox({
            ...currentVB,
            width: 2000 / finalZoom,
            height: 1200 / finalZoom
        });
    }, [updateViewBox]);

    // Center on a node with proper zoom
    const centerOnNode = useCallback((node: PositionedNode, zoomLevel?: number) => {
        // Base viewBox dimensions (what user sees at 1x zoom)
        const baseWidth = 2000;
        const baseHeight = 1200;

        // Determine zoom level based on node level if not specified
        let actualZoom = zoomLevel;
        if (!actualZoom) {
            const zoomLevels = {
                0: 0.9,  // Super-clusters - wide view to see all branches
                1: 1.2,  // Industries - moderate zoom to see siblings + children
                2: 1.5,  // Sub-industries - closer but still contextual
                3: 1.8,  // Role families - focus on branch
                4: 2.2   // Job titles - close for details
            };
            actualZoom = zoomLevels[node.level as keyof typeof zoomLevels] || 1.5;
        }

        // Calculate new viewBox - smaller dimensions = more zoom
        const newWidth = baseWidth / actualZoom;
        const newHeight = baseHeight / actualZoom;

        // Sync refs so scroll zooming starts from here
        targetZoomRef.current = actualZoom;
        currentZoomRef.current = actualZoom;

        // Use state for smooth transition
        setViewBoxState({
            x: node.x - newWidth / 2,
            y: node.y - newHeight / 2,
            width: newWidth,
            height: newHeight
        });
    }, []);

    // Handle node click - reveal children or trigger job search
    const handleNodeClickInternal = async (node: PositionedNode) => {
        // If it's a job title, trigger search AND fetch intelligent job count
        if (node.level === 4) {
            selectRole(node.id);
            if (onNodeClick) onNodeClick({ type: 'role', ...node });

            // Open the panel immediately
            setSelectedJobNodeId(node.id);

            // Fetch job count with AI analysis if not already loaded or loading
            if (!jobCounts[node.id] && loadingJobCount !== node.id) {
                setLoadingJobCount(node.id);

                try {
                    const userId = getUserId();

                    if (!userId) {
                        // Fall back to generic search
                        const response = await fetch('/api/job-count', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jobTitle: node.name,
                                location: 'United Kingdom'
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            setJobCounts(prev => ({
                                ...prev,
                                [node.id]: {
                                    count: data.count,
                                    jobs: data.jobs || [],
                                    loading: false
                                }
                            }));
                        }
                    } else {
                        // AI-powered search
                        const analysisResponse = await fetch('/api/analyze-fit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                jobTitle: node.name
                            })
                        });

                        if (!analysisResponse.ok) throw new Error('Failed to analyze fit');

                        const analysis = await analysisResponse.json();

                        const jobResponse = await fetch('/api/job-count', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                intelligentQuery: analysis.intelligentQuery,
                                location: 'United Kingdom'
                            })
                        });

                        if (jobResponse.ok) {
                            const data = await jobResponse.json();
                            setJobCounts(prev => ({
                                ...prev,
                                [node.id]: {
                                    count: data.count,
                                    jobs: data.jobs || [],
                                    loading: false,
                                    reasoning: analysis.reasoning,
                                    keyStrengths: analysis.keyStrengths,
                                    potentialGaps: analysis.potentialGaps
                                }
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error in intelligent job search:', error);
                } finally {
                    setLoadingJobCount(null);
                }
            }
            return;
        }

        // Memoized node positioning
        const allPositionedNodes = useMemo(() => {
            console.log('🌌 CareerGalaxy: Generating nodes...');
            console.log('Input paths:', paths?.length);
            console.log('Input data clusters:', data?.length);

            const nodes: any[] = [];
            const links: any[] = [];

            // 1. Add Static Universe Nodes
            Object.values(CAREER_GALAXY.nodes).forEach(node => {
                if (!nodeExists(node.id)) {
                    nodes.push({
                        ...node,
                        x: 0, // Initial position, will be calculated by layout
                        y: 0,
                        childIds: node.childIds || []
                    });
                }
            });

            // 2. Add Dynamic Nodes from Paths (if any)
            if (paths) {
                paths.forEach(path => {
                    // Handle new pathNodes format
                    if (path.pathNodes) {
                        path.pathNodes.forEach((pathNode: any, index: number) => {
                            if (!nodeExists(pathNode.id)) {
                                // Find parent from previous node in path or infer
                                const parentId = index > 0 ? path.pathNodes![index - 1].id :
                                    (pathNode.level === 0 ? null : 'unknown-parent');

                                nodes.push({
                                    id: pathNode.id,
                                    name: pathNode.name,
                                    level: pathNode.level,
                                    parentId: parentId,
                                    childIds: [],
                                    description: `Dynamic node for ${pathNode.name}`,
                                    x: 0,
                                    y: 0
                                });
                            }
                        });
                    }
                    // Handle legacy nodeIds format (assume nodes exist in static map or handle gracefully)
                });
            }

            // 3. Generate Links
            nodes.forEach(node => {
                if (node.parentId && nodeExists(node.parentId)) {
                    links.push({
                        source: node.parentId,
                        target: node.id
                    });

                    // Update parent's childIds
                    const parent = nodes.find(n => n.id === node.parentId);
                    if (parent && !parent.childIds.includes(node.id)) {
                        parent.childIds.push(node.id);
                    }
                }
            });

            // 4. Calculate Layout
            // Use the imported generateRadialLayout function
            const layout = generateRadialLayout(nodes, links, DEFAULT_LAYOUT_CONFIG);

            // Map layout positions back to nodes
            layout.nodes.forEach(layoutNode => {
                const node = nodes.find(n => n.id === layoutNode.id);
                if (node) {
                    node.x = layoutNode.x;
                    node.y = layoutNode.y;
                    // Ensure level is preserved if missing in layout
                    if (node.level === undefined && layoutNode.level !== undefined) {
                        node.level = layoutNode.level;
                    }
                }
            });

            // Debug output
            console.log('Generated nodes count:', nodes.length);
            return { nodes, links };
        }, [data, paths]); // Removed dimensions

        // Update visible nodes when paths change
        useEffect(() => {
            console.log('🌌 CareerGalaxy: Paths changed, updating visibility');
            if (paths && paths.length > 0) {
                const newVisibleIds = new Set<string>();

                paths.forEach(path => {
                    // Handle both legacy nodeIds and new pathNodes
                    if (path.pathNodes) {
                        path.pathNodes.forEach((n: any) => newVisibleIds.add(n.id));
                    } else if (path.nodeIds) {
                        path.nodeIds.forEach((id: string) => newVisibleIds.add(id));
                    }
                });

                console.log('Visible node IDs:', Array.from(newVisibleIds));
                setVisibleNodeIds(newVisibleIds);

                // Center on the last node of the first path
                const firstPath = paths[0];
                const targetId = firstPath.pathNodes
                    ? firstPath.pathNodes[firstPath.pathNodes.length - 1].id
                    : firstPath.nodeIds[firstPath.nodeIds.length - 1];

                if (targetId) {
                    const targetNode = allPositionedNodes.nodes.find(n => n.id === targetId);
                    if (targetNode) {
                        centerOnNode(targetNode);
                    }
                }
            }
        }, [paths]);
        // Toggle expansion logic
        const isExpanded = expandedNodeIds.has(node.id);
        const childIds = node.childIds;

        if (isExpanded) {
            // COLLAPSE
            const nodesToRemove = new Set<string>();
            const findDescendants = (nodeId: string) => {
                const n = allPositionedNodes.nodes.find(x => x.id === nodeId);
                if (n) {
                    nodesToRemove.add(nodeId);
                    n.childIds.forEach((childId: string) => findDescendants(childId));
                }
            };
            childIds.forEach((id: string) => findDescendants(id));

            setVisibleNodeIds(prev => {
                const newSet = new Set(prev);
                nodesToRemove.forEach(id => newSet.delete(id));
                return newSet;
            });

            setExpandedNodeIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(node.id);
                return newSet;
            });
        } else if (childIds.length > 0) {
            // EXPAND
            const siblings = allPositionedNodes.nodes.filter(n =>
                n.parentId === node.parentId && n.id !== node.id
            );

            const nodesToRemove = new Set<string>();
            const removeDescendants = (nodeId: string) => {
                const nodeToRemove = allPositionedNodes.nodes.find(n => n.id === nodeId);
                if (nodeToRemove) {
                    nodesToRemove.add(nodeId);
                    nodeToRemove.childIds.forEach((childId: string) => removeDescendants(childId));
                }
            };

            siblings.forEach(sibling => {
                if (expandedNodeIds.has(sibling.id)) {
                    sibling.childIds.forEach((childId: string) => removeDescendants(childId));
                }
            });

            setVisibleNodeIds(prev => {
                const newSet = new Set(prev);
                nodesToRemove.forEach(id => newSet.delete(id));
                childIds.forEach((id: string) => newSet.add(id));
                return newSet;
            });

            setExpandedNodeIds(prev => {
                const newSet = new Set(prev);
                siblings.forEach(s => newSet.delete(s.id));
                newSet.add(node.id);
                return newSet;
            });

            // Add to history
            setExpansionHistory(prev => [...prev, node.id]);

            // Center view on the clicked node
            centerOnNode(node);
        }
    };

    // Reset view
    const resetView = () => {
        setViewBoxState({ x: -1000, y: -600, width: 2000, height: 1200 });
    };

    // Back - collapse the most recently expanded node
    const handleBack = () => {
        if (expansionHistory.length === 0) return;

        const lastExpandedId = expansionHistory[expansionHistory.length - 1];
        const lastNode = allPositionedNodes.nodes.find(n => n.id === lastExpandedId);

        if (lastNode) {
            // Collapse the last expanded node
            const nodesToRemove = new Set<string>();

            const findDescendants = (nodeId: string) => {
                const n = allPositionedNodes.allNodes.find(x => x.id === nodeId);
                if (n) {
                    nodesToRemove.add(nodeId);
                    n.childIds.forEach(childId => findDescendants(childId));
                }
            };

            lastNode.childIds.forEach(id => findDescendants(id));

            setVisibleNodeIds(prev => {
                const newSet = new Set(prev);
                nodesToRemove.forEach(id => newSet.delete(id));
                return newSet;
            });

            setExpandedNodeIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(lastExpandedId);
                return newSet;
            });

            // Remove from history
            setExpansionHistory(prev => prev.slice(0, -1));

            // Center on the parent node
            if (lastNode.parentId) {
                const parent = allPositionedNodes.allNodes.find(n => n.id === lastNode.parentId);
                if (parent) centerOnNode(parent);
            }
        }
    };

    // Collapse all - reset to initial state
    const handleCollapseAll = () => {
        const rootNodes = CAREER_GALAXY.rootNodes;
        setVisibleNodeIds(new Set(rootNodes));
        setExpandedNodeIds(new Set());
        // Reset to default view
        setViewBoxState({ x: -1000, y: -600, width: 2000, height: 1200 });
    };

    // Handle saving a job
    const handleSaveJob = async (job: any) => {
        const userId = getUserId();
        if (!userId) {
            alert('Please upload your CV first to save jobs.');
            return;
        }

        try {
            const response = await fetch('/api/save-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    jobData: job,
                    status: 'saved'
                })
            });

            if (!response.ok) throw new Error('Failed to save job');

            // Optional: Show success toast or update UI
            console.log('Job saved successfully');
        } catch (error) {
            console.error('Error saving job:', error);
            alert('Failed to save job. Please try again.');
        }
    };

    // Set initial viewBox
    useEffect(() => {
        if (containerRef.current) {
            const svg = containerRef.current.querySelector('svg');
            if (svg) {
                const vb = viewBoxRef.current;
                svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
            }
        }
    }, []);

    {/* No synthetic onWheel – native listener handles preventDefault & zoom */ }
    return (
        <div
            ref={containerRef}
            className="w-full h-full relative bg-slate-900/50 rounded-3xl overflow-hidden"
            onWheel={handleWheel}
        >
            {/* Dynamic Starfield Background */}
            <Starfield />
            <style>{`
                @keyframes emp-wave {
          0% {
            transform: scale(1);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        @keyframes pulse-stroke {
                    0%, 100% {
                        stroke-width: 4;
                        stroke-opacity: 1;
                    }
                    50% {
                        stroke-width: 8;
                        stroke-opacity: 0.7;
                    }
                }
                .pulse-link {
                    animation: pulse-opacity 2s ease-in-out infinite;
                }
                @keyframes pulse-opacity {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
            `}</style>
            {/* Controls */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={resetView}
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm flex items-center gap-2"
                    >
                        🏠 Reset View
                    </button>
                    <button
                        onClick={handleBack}
                        disabled={expansionHistory.length === 0}
                        className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        ⬅️ Back
                    </button>
                </div>
                <div className="text-xs text-white/50">
                    Drag to pan • Scroll to zoom • Click to reveal
                </div>
            </div>

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                className="w-full h-full cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    transition: viewBoxState ? 'viewBox 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
                    userSelect: 'none',
                    touchAction: 'none'
                }}
            >
                <defs>
                    {/* Standard glow for hover */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Pulse glow for recommended nodes */}
                    <filter id="pulse-glow">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                        <feFlood floodColor="#60a5fa" floodOpacity="0.8" result="flood" />
                        <feComposite in="flood" in2="coloredBlur" operator="in" result="comp" />
                        <feMerge>
                            <feMergeNode in="comp" />
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Add CSS animation */}
                <style>
                    {`
                        @keyframes pulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.7; transform: scale(1.05); }
                        }
                        .pulse-node {
                            animation: pulse 2s ease-in-out infinite;
                        }
                        @keyframes flow {
                            0% { stroke-dashoffset: 20; }
                            100% { stroke-dashoffset: 0; }
                        }
                        .flow-line {
                            animation: flow 1.5s linear infinite;
                        }
                    `}
                </style>

                {/* Gradient definitions for premium path effects */}
                <defs>
                    <linearGradient id="path-gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="path-gradient-orange" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="path-gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="link-glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Links */}
                <g className="links">
                    {visibleLinks.map((link, idx) => {
                        // Check if this link is part of any recommended path
                        const allPathNodeIds = paths?.flatMap(p => p.nodeIds || p.pathNodes?.map(pn => pn.id) || []) || [];
                        const fromIndex = allPathNodeIds.indexOf(link.from);
                        const toIndex = allPathNodeIds.indexOf(link.to);
                        const isRecommendedLink = fromIndex !== -1 && toIndex !== -1 && toIndex === fromIndex + 1;

                        // Determine which path type this link belongs to
                        let pathType = null;
                        if (isRecommendedLink && paths) {
                            for (const path of paths) {
                                const pathIds = path.nodeIds || path.pathNodes?.map(pn => pn.id) || [];
                                const fromIdx = pathIds.indexOf(link.from);
                                const toIdx = pathIds.indexOf(link.to);
                                if (fromIdx !== -1 && toIdx !== -1 && toIdx === fromIdx + 1) {
                                    pathType = path.type;
                                    break;
                                }
                            }
                        }

                        // Get gradient color based on path type
                        const gradientId = pathType === 'Direct Fit' ? 'path-gradient-green' :
                            pathType === 'Strategic Pivot' ? 'path-gradient-orange' :
                                pathType === 'Aspirational' ? 'path-gradient-purple' : null;

                        return (
                            <g key={idx}>
                                {/* Base link */}
                                <line
                                    x1={link.fromPos.x}
                                    y1={link.fromPos.y}
                                    x2={link.toPos.x}
                                    y2={link.toPos.y}
                                    stroke={isRecommendedLink && gradientId ? `url(#${gradientId})` : link.color}
                                    strokeWidth={isRecommendedLink ? 4 : 2}
                                    strokeOpacity={isRecommendedLink ? 0.9 : 0.4}
                                    filter={isRecommendedLink ? 'url(#link-glow)' : undefined}
                                    className="transition-all duration-300"
                                />

                                {/* Animated flow overlay for recommended links */}
                                {isRecommendedLink && (
                                    <line
                                        x1={link.fromPos.x}
                                        y1={link.fromPos.y}
                                        x2={link.toPos.x}
                                        y2={link.toPos.y}
                                        stroke={gradientId ? `url(#${gradientId})` : link.color}
                                        strokeWidth="3"
                                        strokeOpacity="0.6"
                                        strokeDasharray="10 10"
                                        className="flow-line"
                                    />
                                )}

                                {/* Particle flow for recommended links */}
                                {isRecommendedLink && [0, 0.33, 0.66].map((delay, particleIdx) => {
                                    const pathId = `path-${idx}`;
                                    const particleColor = pathType === 'Direct Fit' ? '#10b981' :
                                        pathType === 'Strategic Pivot' ? '#f59e0b' :
                                            pathType === 'Aspirational' ? '#8b5cf6' : '#60a5fa';

                                    return (
                                        <g key={`particle-${particleIdx}`}>
                                            <path
                                                id={`${pathId}-${particleIdx}`}
                                                d={`M ${link.fromPos.x} ${link.fromPos.y} L ${link.toPos.x} ${link.toPos.y}`}
                                                fill="none"
                                                stroke="none"
                                            />
                                            <circle r="4" fill={particleColor} opacity="0.9">
                                                <animateMotion
                                                    dur="3s"
                                                    repeatCount="indefinite"
                                                    begin={`${delay * 3}s`}
                                                >
                                                    <mpath href={`#${pathId}-${particleIdx}`} />
                                                </animateMotion>
                                                <animate
                                                    attributeName="opacity"
                                                    values="0;0.9;0.9;0"
                                                    dur="3s"
                                                    repeatCount="indefinite"
                                                    begin={`${delay * 3}s`}
                                                />
                                            </circle>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </g>

                {/* Nodes */}
                <g className="nodes">
                    {visibleNodes.map((node) => {
                        // Dramatically increased base sizes for better readability
                        const baseSize = node.level === 0 ? 95 : node.level === 1 ? 72 : node.level === 2 ? 56 : node.level === 3 ? 45 : 35;
                        const isHovered = hoveredNode === node.id;
                        const isRecommended = node.recommended === true;
                        const isJobNode = node.level === 4; // Job title nodes

                        // Make recommended nodes larger
                        const size = isRecommended ? baseSize * 1.4 : baseSize;

                        // Dim non-recommended nodes
                        const opacity = isRecommended || isHovered ? 1 : 0.3;

                        return (
                            <g
                                key={node.id}
                                transform={`translate(${node.x}, ${node.y})`}
                                onClick={() => handleNodeClickInternal(node)}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className="cursor-pointer transition-all duration-200"
                                style={{
                                    filter: isHovered && isJobNode
                                        ? 'brightness(1.3)'
                                        : isHovered
                                            ? 'url(#glow)'
                                            : isRecommended
                                                ? 'url(#pulse-glow)'
                                                : 'none',
                                    opacity
                                }}
                            >
                                {/* Premium pulsing halos - Multi-path support */}
                                {isRecommended && node.pathColors && node.pathColors.length > 0 && (
                                    <>
                                        {/* Render pulse rings for each path this node belongs to */}
                                        {node.pathColors.map((color, pathIndex) => (
                                            <React.Fragment key={pathIndex}>
                                                {/* Inner glow base */}
                                                <circle
                                                    r={size * 1.3}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="4"
                                                    opacity="0.3"
                                                    filter="url(#link-glow)"
                                                />

                                                {/* First pulse wave - large and dramatic */}
                                                <circle
                                                    r={size}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="4"
                                                    style={{
                                                        transformOrigin: '0 0',
                                                        animation: 'emp-wave 3s ease-out infinite',
                                                        animationDelay: `${pathIndex * 0.6}s`
                                                    }}
                                                />
                                                {/* Second pulse wave - offset timing */}
                                                <circle
                                                    r={size}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="3"
                                                    style={{
                                                        transformOrigin: '0 0',
                                                        animation: 'emp-wave 3s ease-out infinite',
                                                        animationDelay: `${pathIndex * 0.6 + 1.0}s`
                                                    }}
                                                />
                                                {/* Third pulse wave - creates depth */}
                                                <circle
                                                    r={size}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="2"
                                                    style={{
                                                        transformOrigin: '0 0',
                                                        animation: 'emp-wave 3s ease-out infinite',
                                                        animationDelay: `${pathIndex * 0.6 + 2.0}s`
                                                    }}
                                                />
                                            </React.Fragment>
                                        ))}
                                    </>
                                )}

                                {/* Glassmorphic Circle Node */}
                                <circle
                                    r={size}
                                    fill={node.color}
                                    fillOpacity={isRecommended ? "0.75" : "0.6"}
                                    stroke={node.color}
                                    strokeWidth={isRecommended ? 3 : 2}
                                    strokeOpacity={1.0}
                                    className="transition-all duration-200"
                                    style={{
                                        filter: isHovered
                                            ? 'brightness(1.4) drop-shadow(0 0 30px currentColor)'
                                            : isRecommended
                                                ? `brightness(1.2) drop-shadow(0 0 20px ${node.color})`
                                                : 'brightness(1.0)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                />

                                {/* Text INSIDE the tile - centered */}
                                <text
                                    y={0}
                                    dominantBaseline="middle"
                                    textAnchor="middle"
                                    fill="#ffffff"
                                    fontSize={node.level === 0 ? 22 : node.level === 1 ? 18 : node.level === 2 ? 16 : node.level === 3 ? 14 : 12}
                                    fontWeight={node.level === 0 ? 'bold' : node.level === 1 ? '700' : '600'}
                                    className="pointer-events-none select-none"
                                    style={{
                                        textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.7)',
                                        letterSpacing: '0.3px'
                                    }}
                                >
                                    {/* Multi-line text for longer names */}
                                    {node.name.length > 20 ? (
                                        <>
                                            <tspan x="0" dy="-0.6em">{node.name.substring(0, node.name.indexOf(' ', 10) || 15)}</tspan>
                                            <tspan x="0" dy="1.2em">{node.name.substring((node.name.indexOf(' ', 10) || 15) + 1, 30)}...</tspan>
                                        </>
                                    ) : (
                                        node.name
                                    )}
                                </text>

                                {/* Recommendation star indicator - top right */}
                                {isRecommended && (
                                    <text
                                        x={size - 15}
                                        y={-size + 15}
                                        fontSize={20}
                                        className="pointer-events-none"
                                    >
                                        ✨
                                    </text>
                                )}

                                {/* Full name tooltip on hover */}
                                {isHovered && node.name.length > 18 && (
                                    <text
                                        y={size + 50}
                                        textAnchor="middle"
                                        fill="#ffffff"
                                        fontSize={16}
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                        style={{
                                            textShadow: '0 0 8px rgba(0,0,0,1)'
                                        }}
                                    >
                                        {node.name}
                                    </text>
                                )}



                                {/* Job node hint */}
                                {isHovered && isJobNode && (
                                    <text
                                        y={-size - 15}
                                        textAnchor="middle"
                                        fill="#10b981"
                                        fontSize={11}
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                    >
                                        🎯 Click for jobs!
                                    </text>
                                )}




                                {/* Info icon for nodes with details - CLEAN ALTERNATIVE */}
                                {node.reasoning && (
                                    <text
                                        x={size - 15}
                                        y={size - 15}
                                        fontSize={18}
                                        className="pointer-events-none"
                                        style={{
                                            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))'
                                        }}
                                    >
                                        ℹ️
                                    </text>
                                )}


                                {/* Expansion/Collapse hint */}
                                {isHovered && node.level < 4 && (
                                    expandedNodeIds.has(node.id) ? (
                                        <text
                                            y={size + 35}
                                            textAnchor="middle"
                                            fill="#f59e0b"
                                            fontSize={9}
                                            className="pointer-events-none"
                                        >
                                            Click to collapse
                                        </text>
                                    ) : node.childIds.length > 0 ? (
                                        <text
                                            y={size + 35}
                                            textAnchor="middle"
                                            fill="#60a5fa"
                                            fontSize={9}
                                            className="pointer-events-none"
                                        >
                                            Click to explore ({node.childIds.length} options)
                                        </text>
                                    ) : null
                                )}

                                {/* Job search hint for level 4 */}
                                {isHovered && node.level === 4 && (
                                    <text
                                        y={size + 35}
                                        textAnchor="middle"
                                        fill="#10b981"
                                        fontSize={9}
                                        className="pointer-events-none"
                                    >
                                        Click to search jobs
                                    </text>
                                )}

                                {/* Job count badge for Level 4 nodes */}
                                {node.level === 4 && jobCounts[node.id] && (
                                    <g>
                                        {/* Badge background */}
                                        <rect
                                            x={-30}
                                            y={size + 10}
                                            width={60}
                                            height={20}
                                            rx={10}
                                            fill="#10b981"
                                            opacity="0.9"
                                            className="animate-pulse"
                                        />
                                        {/* Job count text */}
                                        <text
                                            y={size + 24}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize={11}
                                            fontWeight="600"
                                            className="pointer-events-none"
                                        >
                                            🔍 {jobCounts[node.id].count} jobs
                                        </text>
                                    </g>
                                )}

                                {/* Loading spinner for job count */}
                                {node.level === 4 && loadingJobCount === node.id && (
                                    <text
                                        y={size + 24}
                                        textAnchor="middle"
                                        fill="#60a5fa"
                                        fontSize={11}
                                        className="pointer-events-none animate-pulse"
                                    >
                                        Loading...
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg >

            {/* Zoom Controls */}
            < div className="absolute top-4 right-4 flex flex-col gap-2" >
                <button
                    onClick={() => {
                        const newZoom = Math.min(4, targetZoomRef.current * 1.3);
                        targetZoomRef.current = newZoom;
                        currentZoomRef.current = newZoom;

                        const currentVB = viewBoxRef.current;
                        updateViewBox({
                            ...currentVB,
                            width: 2000 / newZoom,
                            height: 1200 / newZoom
                        });
                    }}
                    className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
                    title="Zoom In"
                >
                    +
                </button>
                <button
                    onClick={() => {
                        const newZoom = Math.max(0.3, targetZoomRef.current / 1.3);
                        targetZoomRef.current = newZoom;
                        currentZoomRef.current = newZoom;

                        const currentVB = viewBoxRef.current;
                        updateViewBox({
                            ...currentVB,
                            width: 2000 / newZoom,
                            height: 1200 / newZoom
                        });
                    }}
                    className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
                    title="Zoom Out"
                >
                    −
                </button>
                <button
                    onClick={resetView}
                    className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white text-sm transition-all hover:scale-110"
                    title="Reset View"
                >
                    ⟲
                </button>
            </div >

            {/* Legends */}
            < div className="absolute bottom-4 right-4 space-y-3" >
                {/* Path Legend - Only show if we have paths */}
                {
                    paths && paths.length > 0 && (
                        <div className="bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs">
                            <div className="text-white/80 font-bold mb-3 uppercase tracking-wide">Career Paths</div>
                            <div className="space-y-2.5">
                                {paths.map((path, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: PATH_COLORS[path.type] || '#6b7280' }}
                                        />
                                        <span className="text-white/80 font-medium">{path.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Levels Legend */}
                <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs">
                    <div className="text-white/50 font-bold mb-2">LEVELS</div>
                    <div className="space-y-1 text-white/70">
                        <div>🌌 Super-Clusters</div>
                        <div>🏢 Industries</div>
                        <div>📊 Sub-Industries</div>
                        <div>👤 Role Families</div>
                        <div>💼 Job Titles</div>
                    </div>
                </div>
            </div >
            {/* Job List Panel */}
            <JobListPanel
                isOpen={!!selectedJobNodeId}
                onClose={() => setSelectedJobNodeId(null)}
                jobTitle={selectedJobNodeId ? allPositionedNodes.allNodes.find(n => n.id === selectedJobNodeId)?.name || 'Job Listings' : ''}
                jobs={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].jobs : []}
                count={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].count : 0}
                loading={selectedJobNodeId === loadingJobCount}
                reasoning={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].reasoning : undefined}
                keyStrengths={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].keyStrengths : undefined}
                potentialGaps={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].potentialGaps : undefined}
                onSaveJob={handleSaveJob}
            />
        </div >
    );
}

---
File: src/components/CareerPathSelector.tsx
---
import React from 'react';
import { ArrowRight, TrendingUp, Map, CheckCircle2 } from 'lucide-react';

interface CareerCluster {
    id: string;
    name: string;
    description: string;
    startingRoles: string[];
    trajectory: string[];
    reasoning: string;
}

interface CareerPathSelectorProps {
    clusters: CareerCluster[];
    onSelect: (cluster: CareerCluster) => void;
    onBack: () => void;
}

export default function CareerPathSelector({ clusters, onSelect, onBack }: CareerPathSelectorProps) {
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    const handleSelect = (cluster: CareerCluster) => {
        setSelectedId(cluster.id);
        // Small delay to show selection state before proceeding
        setTimeout(() => {
            onSelect(cluster);
        }, 500);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">Choose Your Path</h2>
                <p className="text-blue-200 text-lg max-w-2xl mx-auto">
                    Based on your profile, I've mapped out these three potential career trajectories.
                    Select the one that aligns best with your ambition.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {clusters.map((cluster, index) => (
                    <div
                        key={cluster.id}
                        onClick={() => handleSelect(cluster)}
                        className={`
              relative group cursor-pointer rounded-3xl p-1 transition-all duration-500
              ${selectedId === cluster.id ? 'scale-105 ring-4 ring-orange-500' : 'hover:scale-105 hover:-translate-y-2'}
            `}
                    >
                        {/* Glowing Border Effect */}
                        <div className={`
              absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-orange-500 opacity-50 
              blur-xl group-hover:opacity-100 transition-opacity duration-500
              ${selectedId === cluster.id ? 'opacity-100' : ''}
            `} />

                        {/* Card Content */}
                        <div className="relative h-full bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-8 border border-white/10 flex flex-col overflow-hidden">

                            {/* Header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-500/20 rounded-2xl">
                                        <Map className="w-6 h-6 text-blue-400" />
                                    </div>
                                    {selectedId === cluster.id && (
                                        <CheckCircle2 className="w-8 h-8 text-orange-500 animate-bounce" />
                                    )}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{cluster.name}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{cluster.description}</p>
                            </div>

                            {/* Trajectory Visualization */}
                            <div className="flex-1 relative mb-8">
                                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent" />

                                <div className="space-y-6 relative">
                                    {/* Starting Point */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 border-4 border-slate-900 z-10 shrink-0 mt-1" />
                                        <div>
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Start Here</span>
                                            <div className="text-white font-medium mt-1 text-sm">
                                                {cluster.startingRoles.slice(0, 2).join(", ")}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Future Path */}
                                    {cluster.trajectory.map((role, i) => (
                                        <div key={i} className="flex items-start gap-4 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 border-4 border-slate-900 z-10 shrink-0 mt-1" />
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    {i === cluster.trajectory.length - 1 ? 'Ultimate Goal' : 'Next Step'}
                                                </span>
                                                <div className="text-slate-300 font-medium mt-1 text-sm">{role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reasoning Footer */}
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="flex items-start gap-3">
                                    <TrendingUp className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                                    <p className="text-xs text-slate-400 italic">"{cluster.reasoning}"</p>
                                </div>
                            </div>

                            {/* Hover Action */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <button
                    onClick={onBack}
                    className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2 mx-auto"
                >
                    ← Back to Chat
                </button>
            </div>
        </div>
    );
}

---
File: src/components/ChatInterface.tsx
---
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Briefcase, User, Loader2, Bot } from 'lucide-react';
import clsx from 'clsx';
import { getUserId } from '@/lib/userSession';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    cvText: string;
    onSearchReady: (params: any) => void;
    compact?: boolean;
    initialMessages?: Message[];
    onMessagesUpdate?: (messages: Message[]) => void; // Callback to update parent state
    onRecommendationReceived?: (nodeIds: string[], reasoning: string, paths?: any[]) => void;
    embedded?: boolean;
}

export default function ChatInterface({ cvText, onSearchReady, compact = false, initialMessages, onMessagesUpdate, onRecommendationReceived, embedded = false }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(
        initialMessages || [
            {
                role: 'assistant',
                content: "Hi! I've analyzed your CV. I'd love to get to know you better to find the perfect job match. Could you tell me a bit more about what you enjoy working on most?",
            },
        ]
    );
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasGeneratedPaths, setHasGeneratedPaths] = useState(false); // Track if we've already generated paths
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Sync messages with parent
    useEffect(() => {
        if (onMessagesUpdate) {
            onMessagesUpdate(messages);
        }
    }, [messages, onMessagesUpdate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user' as const, content: input };
        const newMessages = [...messages, userMessage];

        console.log('📤 SENDING TO API:');
        console.log('Total messages:', newMessages.length);
        console.log('User messages:', newMessages.filter(m => m.role === 'user').length);
        console.log('Messages:', newMessages.map(m => ({ role: m.role, preview: m.content.substring(0, 50) })));

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // Notify parent of message update
        if (onMessagesUpdate) {
            onMessagesUpdate(newMessages);
        }

        try {
            console.log('=== SENDING CHAT MESSAGE ===');
            // Send all current messages including the new user message
            console.log('Messages:', newMessages);
            console.log('Current message:', userMessage.content);
            console.log('CV Text length:', cvText?.length);

            const payload = {
                messages: newMessages,
                cvText,
                userId: getUserId(), // Pass userId for persistence
            };
            console.log('🔍 VERIFYING PAYLOAD:', {
                messageCount: payload.messages.length,
                cvTextLength: payload.cvText?.length,
                lastMessage: payload.messages[payload.messages.length - 1].content
            });

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`Failed to send message: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            console.log('📥 RECEIVED FROM API:', data);
            console.log('Has recommendedPath?', !!data.recommendedPath);
            console.log('Has paths?', !!data.paths);

            console.log('API Response data:', data);

            if (data.error) {
                console.error('API returned error:', data.error, data.details);
                throw new Error(data.error);
            }

            // Add assistant message
            const assistantMessage = { role: 'assistant' as const, content: data.message };
            const updatedMessages = [...newMessages, assistantMessage];
            setMessages(updatedMessages);

            // Notify parent of message update
            if (onMessagesUpdate) {
                onMessagesUpdate(updatedMessages);
            }

            const userMessageCount = updatedMessages.filter(m => m.role === 'user').length;

            console.log('🔢 User Message Count (after response):', userMessageCount);

            // Check for recommended path in response
            // ONLY trigger galaxy transition if we have at least 3 user messages AND valid data
            // AND we haven't already generated paths (to avoid redundant transitions when chatting in galaxy view)
            // AND we're NOT in embedded mode (floating chat on galaxy page)
            const hasValidPath = data.recommendedPath && data.recommendedPath.length > 0;
            const hasValidClusters = data.clusters && Object.keys(data.clusters).length > 0;

            if ((hasValidClusters || hasValidPath) && userMessageCount >= 3 && !hasGeneratedPaths && !embedded) {
                console.log('✅ TRIGGERING GALAXY TRANSITION (Have 3+ messages, first time)');

                // Mark that we've generated paths to avoid doing it again
                setHasGeneratedPaths(true);

                // Save recommendation to database
                const userId = getUserId();
                if (userId && data.paths) {
                    console.log('💾 Saving recommendation to database for user:', userId);
                    try {
                        const saveResponse = await fetch('/api/save-recommendation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                paths: data.paths,
                                reasoning: data.recommendationReason || 'AI-generated career paths based on your profile'
                            })
                        });

                        if (saveResponse.ok) {
                            const saveData = await saveResponse.json();
                            console.log('✅ Recommendation saved:', saveData.recommendationId);
                        } else {
                            console.warn('⚠️ Failed to save recommendation');
                        }
                    } catch (saveError) {
                        console.error('Failed to save recommendation:', saveError);
                        // Don't block the flow if save fails
                    }
                }

                // Trigger galaxy view transition
                onSearchReady({
                    recommendedPath: data.recommendedPath,
                    paths: data.paths // Pass full paths object
                });

                // Also trigger recommendation callback if available
                if (onRecommendationReceived) {
                    onRecommendationReceived(
                        data.recommendedPath,
                        data.recommendationReason || '',
                        data.paths // Pass full paths object
                    );
                }
            } else if (embedded) {
                console.log('⏭️ SKIPPING GALAXY TRANSITION (Embedded chat in galaxy view)');
            } else if (hasGeneratedPaths) {
                console.log('⏭️ SKIPPING GALAXY TRANSITION (Already generated paths, user is refining in galaxy view)');
            } else if (data.recommendedPath && userMessageCount < 3) {
                console.log('❌ BLOCKING EARLY TRANSITION (Only', userMessageCount, 'user messages)');
            }

        } catch (error: any) {
            console.error('=== CHAT ERROR ===');
            console.error('Error type:', error.constructor?.name);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
            alert(`Chat error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // COMPACT HORIZONTAL LAYOUT (for results page)
    if (compact) {
        return (
            <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Messages - 2/3 width */}
                    <div className="lg:col-span-2 bg-white/5 rounded-xl p-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        <div className="space-y-2">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-r from-orange-500 to-blue-500 text-white'
                                            : 'bg-white/10 text-cyan-100 border border-white/10'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10">
                                        <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input - 1/3 width */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask for different roles..."
                                className="flex-1 px-3 py-2 text-sm rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-cyan-200/50"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 transition-all"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // FULL VERTICAL LAYOUT (for main chat page)
    return (
        <div className={clsx(
            "flex flex-col overflow-hidden",
            embedded ? "h-full bg-transparent" : "h-[650px] bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20"
        )}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            'flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300',
                            msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                        )}
                    >
                        <div
                            className={clsx(
                                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                                msg.role === 'user'
                                    ? 'bg-gradient-to-br from-orange-500 to-blue-500 text-white'
                                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                            )}
                        >
                            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div
                            className={clsx(
                                'p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                                msg.role === 'user'
                                    ? 'bg-gradient-to-br from-orange-500 to-blue-500 text-white rounded-tr-md'
                                    : 'bg-white/90 text-gray-800 rounded-tl-md border border-white/20'
                            )}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-white/90 p-4 rounded-2xl rounded-tl-md flex items-center border border-white/20">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Tell me about your ideal role..."
                        className="flex-1 px-5 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-cyan-200 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-5 py-3 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl hover:shadow-2xl hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}

---
File: src/components/CVUpload.tsx
---
'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { setUserId } from '@/lib/userSession';

interface CVUploadProps {
    onUploadComplete: (text: string) => void;
}

export default function CVUpload({ onUploadComplete }: CVUploadProps) {
    const [mode, setMode] = useState<'choose' | 'upload' | 'text'>('choose');
    const [cvText, setCvText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await processFile(files[0]);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await processFile(files[0]);
        }
    };

    const processFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file.');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/parse-cv', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Failed to upload CV');
            }

            const data = await response.json();

            // Save userId to localStorage for future use
            if (data.userId) {
                setUserId(data.userId);
                console.log('✅ User ID saved:', data.userId);
            }

            // Show success message to user
            if (data.parsed) {
                console.log('✅ CV parsed:', data.parsed.name);
            }

            onUploadComplete(data.text);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Upload failed. Please try the text option instead.');
            setIsUploading(false);
        }
    };

    const handleTextSubmit = () => {
        if (cvText.trim().length < 100) {
            setError('Please enter at least 100 characters');
            return;
        }
        onUploadComplete(cvText);
    };

    if (mode === 'choose') {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-3">Let's get started! 📄</h2>
                    <p className="text-cyan-200 text-lg">How would you like to share your experience?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setMode('upload')}
                        className="p-8 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-orange-400 rounded-3xl transition-all group"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Upload PDF</h3>
                        <p className="text-cyan-200 text-sm">Upload your CV as a PDF file</p>
                    </button>

                    <button
                        onClick={() => setMode('text')}
                        className="p-8 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-orange-400 rounded-3xl transition-all group"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText className="w-8 h-8 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Paste Text</h3>
                        <p className="text-cyan-200 text-sm">Copy and paste your CV content</p>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'upload') {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Upload your CV 📄</h2>
                    <p className="text-cyan-200">Drag and drop or click to browse</p>
                </div>

                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-3 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-orange-400 bg-orange-500/20 scale-105' : 'border-white/30 hover:border-orange-400 hover:bg-white/5'
                        } ${isUploading && 'pointer-events-none opacity-60'}`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            {isUploading ? (
                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            ) : (
                                <Upload className="w-10 h-10 text-indigo-600" />
                            )}
                        </div>
                        <div>
                            <p className="text-xl font-semibold text-white mb-2">
                                {isUploading ? 'Processing...' : 'Upload your CV'}
                            </p>
                            <p className="text-sm text-cyan-200">
                                Drag and drop your PDF here, or click to browse
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
                        <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                )}

                <button
                    onClick={() => setMode('text')}
                    className="w-full py-3 text-cyan-200 hover:text-white transition-colors text-sm"
                >
                    ← Use text input instead
                </button>
            </div>
        );
    }

    // Text mode
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Tell us about yourself 📝</h2>
                <p className="text-cyan-200">Paste your CV or describe your experience</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20">
                <textarea
                    value={cvText}
                    onChange={(e) => {
                        setCvText(e.target.value);
                        setError(null);
                    }}
                    placeholder="Example:&#10;&#10;I'm a management consultant with 3 years at Deloitte, focusing on strategy and operations. I have an MBA from London Business School...&#10;&#10;I'm interested in moving into venture capital or startup roles..."
                    className="w-full h-80 px-5 py-4 rounded-xl border-2 border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-cyan-200/40 resize-none"
                    autoFocus
                />
                <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-cyan-200/70">{cvText.length} characters (minimum 100)</p>
                    {cvText.length >= 100 && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Ready
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
                    <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={() => setMode('upload')}
                    className="px-6 py-3 text-cyan-200 hover:text-white transition-colors text-sm"
                >
                    ← Upload PDF instead
                </button>
                <button
                    onClick={handleTextSubmit}
                    disabled={cvText.trim().length < 100}
                    className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    Continue
                </button>
            </div>
        </div>
    );
}

---
File: src/components/FloatingChatBubble.tsx
---
'use client';

import { useState } from 'react';
import ChatInterface from './ChatInterface';

interface FloatingChatBubbleProps {
  cvText: string;
  onRecommendationReceived?: (path: string[], reason: string, paths?: any[]) => void;
  initialMessages?: any[];
  onMessagesUpdate?: (messages: any[]) => void;
}

export default function FloatingChatBubble({
  cvText,
  onRecommendationReceived,
  initialMessages = [],
  onMessagesUpdate
}: FloatingChatBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {isExpanded && (
        /* Backdrop - click to close */
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsExpanded(false)}
          aria-label="Close chat"
        />
      )}

      <div className="fixed bottom-6 left-6 z-50">
        {isExpanded ? (
          /* Expanded Chat Panel - Much Bigger */
          <div className="w-[600px] h-[70vh] bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl flex flex-col animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
              <h3 className="text-white text-xl font-semibold flex items-center gap-3">
                <span className="text-2xl">💬</span>
                Career Chat
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                aria-label="Minimize chat"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages - Takes full remaining space */}
            <div className="flex-1 min-h-0">
              <ChatInterface
                cvText={cvText}
                onSearchReady={(data) => {
                  // Handle search ready if needed
                  if (onRecommendationReceived && data.recommendedPath) {
                    onRecommendationReceived(data.recommendedPath, data.recommendationReason || '');
                  }
                }}
                onRecommendationReceived={onRecommendationReceived}
                onMessagesUpdate={onMessagesUpdate}
                compact={false}
                embedded={true}
                initialMessages={initialMessages}
              />
            </div>
          </div>
        ) : (
          /* Minimized Bubble */
          <button
            onClick={() => setIsExpanded(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center text-3xl hover:scale-110 transition-all duration-200 animate-bounce-subtle"
            aria-label="Open chat"
          >
            💬
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

---
File: src/components/JobListPanel.tsx
---
import React from 'react';
import { X, Briefcase, MapPin, DollarSign, ExternalLink, Bookmark, Star } from 'lucide-react';

interface Job {
    title: string;
    company: string;
    location: string;
    url: string;
    salary?: string;
}

interface JobListPanelProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    jobs: Job[];
    count: number;
    reasoning?: string;
    keyStrengths?: string[];
    potentialGaps?: string[];
    loading?: boolean;
    onSaveJob?: (job: Job) => void;
}

export default function JobListPanel({
    isOpen,
    onClose,
    jobTitle,
    jobs,
    count,
    reasoning,
    keyStrengths,
    potentialGaps,
    loading = false,
    onSaveJob
}: JobListPanelProps) {

    const [savedIndices, setSavedIndices] = React.useState<Set<number>>(new Set());

    const handleSave = (job: Job, index: number) => {
        if (onSaveJob) {
            onSaveJob(job);
            setSavedIndices(prev => new Set(prev).add(index));
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 shadow-2xl z-50 overflow-y-auto animate-slide-in-right">

                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-lg border-b border-white/10 p-6 flex items-start justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{jobTitle}</h2>
                        <p className="text-cyan-300 text-sm">
                            {loading ? 'Searching...' : `${count} personalized matches found`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* AI Reasoning Card */}
                    {reasoning && (
                        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-lg border border-purple-400/30 rounded-2xl p-5">
                            <div className="flex items-start gap-3 mb-3">
                                <Star className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-white font-semibold mb-1">Why these jobs fit you</h3>
                                    <p className="text-purple-100 text-sm leading-relaxed">{reasoning}</p>
                                </div>
                            </div>

                            {keyStrengths && keyStrengths.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-purple-400/20">
                                    <p className="text-purple-200 text-xs font-medium mb-2">Your Strengths:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {keyStrengths.map((strength, i) => (
                                            <span key={i} className="px-3 py-1 bg-purple-500/30 text-purple-100 rounded-full text-xs">
                                                {strength}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/5 rounded-xl p-5 animate-pulse">
                                    <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                                    <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
                                    <div className="h-4 bg-white/10 rounded w-2/3" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Job Listings */}
                    {!loading && jobs.length > 0 && (
                        <div className="space-y-4">
                            {jobs.map((job, index) => {
                                const isSaved = savedIndices.has(index);
                                return (
                                    <div
                                        key={index}
                                        className="bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-cyan-300 transition-colors">
                                                    {job.title}
                                                </h3>
                                                <p className="text-cyan-200 font-medium">{job.company}</p>
                                            </div>
                                            <button
                                                onClick={() => handleSave(job, index)}
                                                className={`p-2 rounded-lg transition-colors ${isSaved ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/10 text-white/50 hover:text-yellow-400'}`}
                                            >
                                                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-cyan-100">
                                                <MapPin className="w-4 h-4" />
                                                <span>{job.location}</span>
                                            </div>
                                            {job.salary && (
                                                <div className="flex items-center gap-2 text-sm text-green-300">
                                                    <DollarSign className="w-4 h-4" />
                                                    <span>{job.salary}</span>
                                                </div>
                                            )}
                                        </div>

                                        <a
                                            href={job.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Apply Now
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && jobs.length === 0 && (
                        <div className="text-center py-12">
                            <Briefcase className="w-16 h-16 text-white/20 mx-auto mb-4" />
                            <p className="text-white/50 text-lg">No jobs found for this role yet.</p>
                            <p className="text-white/30 text-sm mt-2">Try exploring other career paths in the Galaxy.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

---
File: src/components/JobResults.tsx
---
'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, ExternalLink, Loader2 } from 'lucide-react';
import SearchSettings from './SearchSettings';

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    salary: string;
    url: string;
    source?: string; // Added source field
    matchScore?: number;
    matchReason?: string;
    scoreBreakdown?: {
        skills: number;
        experience: number;
        relevance: number;
        other: number;
    };
    matchingSkills?: string[];
    missingSkills?: string[];
}

interface JobResultsProps {
    searchParams?: any;
    cvText: string;
}

export default function JobResults({ searchParams = {}, cvText }: JobResultsProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [ranking, setRanking] = useState(false);
    const [limit, setLimit] = useState(10);
    const [location, setLocation] = useState('London, United Kingdom');
    const [experienceLevel, setExperienceLevel] = useState('any');
    const [workType, setWorkType] = useState('any');
    const [datePosted, setDatePosted] = useState('any');

    const fetchJobs = async (params?: any) => {
        setLoading(true);
        try {
            const searchBody = {
                ...searchParams,
                location: params?.location || location,
                limit: params?.limit || limit,
                experienceLevel: params?.experienceLevel || experienceLevel,
                workType: params?.workType || workType,
                datePosted: params?.datePosted || datePosted,
                cvText: cvText, // Pass CV for relevance scoring
            };

            const response = await fetch('/api/search-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchBody),
            });
            const data = await response.json();
            const fetchedJobs = data.jobs || [];

            // Rank jobs using AI
            if (fetchedJobs.length > 0 && cvText) {
                setRanking(true);
                try {
                    const rankResponse = await fetch('/api/rank-jobs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jobs: fetchedJobs,
                            cvText: cvText,
                        }),
                    });
                    const rankData = await rankResponse.json();
                    setJobs(rankData.rankedJobs || fetchedJobs);
                } catch (rankError) {
                    console.error('Ranking failed, showing unranked:', rankError);
                    setJobs(fetchedJobs);
                } finally {
                    setRanking(false);
                }
            } else {
                setJobs(fetchedJobs);
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleSearch = (params: any) => {
        setLocation(params.location);
        setLimit(params.limit);
        setExperienceLevel(params.experienceLevel);
        setWorkType(params.workType);
        setDatePosted(params.datePosted);
        fetchJobs(params);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                <p className="text-cyan-200">Searching for the best matches...</p>
            </div>
        );
    }

    if (ranking) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                <p className="text-cyan-200">AI is ranking jobs based on your CV...</p>
            </div>
        );
    }

    const displayedJobs = (jobs || []).slice(0, limit);

    return (
        <div className="space-y-6">
            <SearchSettings
                initialLocation={location}
                initialLimit={limit}
                initialExperienceLevel={experienceLevel}
                initialWorkType={workType}
                initialDatePosted={datePosted}
                onSearch={handleSearch}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Perfect Matches</h2>
                    <p className="text-cyan-200 mt-1">{jobs.length} jobs found ✨</p>
                </div>
            </div>

            <div className="grid gap-5">
                {displayedJobs.map((job) => (
                    <div
                        key={job.id}
                        className="group bg-white/10 backdrop-blur-xl p-7 rounded-3xl border-2 border-white/20 shadow-xl hover:shadow-2xl hover:border-orange-400 hover:bg-white/15 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-2xl font-bold text-white group-hover:text-orange-300 transition-colors">{job.title}</h3>
                                    {job.matchScore && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${job.matchScore >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                            job.matchScore >= 60 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                                'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                            }`}>
                                            {job.matchScore}% Match
                                        </span>
                                    )}
                                </div>
                                <p className="text-lg text-cyan-200 font-semibold">{job.company}</p>
                                {job.matchReason && (
                                    <p className="text-sm text-cyan-300/70 mt-1 italic">"{job.matchReason}"</p>
                                )}

                                {/* Score Breakdown */}
                                {job.scoreBreakdown && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-xs font-semibold text-cyan-200 uppercase tracking-wide">Match Breakdown</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Skills</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.skills}/40</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-orange-500 to-blue-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.skills / 40) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Experience</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.experience}/30</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.experience / 30) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Relevance</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.relevance}/20</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.relevance / 20) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Other</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.other}/10</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.other / 10) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Skills Match/Gap */}
                                {(job.matchingSkills && job.matchingSkills.length > 0) || (job.missingSkills && job.missingSkills.length > 0) ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {job.matchingSkills && job.matchingSkills.map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">
                                                ✓ {skill}
                                            </span>
                                        ))}
                                        {job.missingSkills && job.missingSkills.map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                                                → {skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 text-cyan-300 hover:bg-white/10 rounded-2xl transition-all transform hover:scale-110"
                            >
                                <ExternalLink className="w-6 h-6" />
                            </a>
                        </div>

                        <p className="text-cyan-100 mb-5 line-clamp-2 leading-relaxed">{job.description}</p>

                        <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                                <DollarSign className="w-4 h-4" />
                                {job.salary}
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium">
                                <Briefcase className="w-4 h-4" />
                                Full-time
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

---
File: src/components/JobTitleSelector.tsx
---
'use client';

import React, { useState } from 'react';
import { Check, Plus, X, Search } from 'lucide-react';

interface JobTitleSelectorProps {
    initialTitles: string[];
    onConfirm: (selectedTitles: string[]) => void;
    onBack: () => void;
}

export default function JobTitleSelector({ initialTitles, onConfirm, onBack }: JobTitleSelectorProps) {
    const [selectedTitles, setSelectedTitles] = useState<string[]>(initialTitles);
    const [newTitle, setNewTitle] = useState('');

    const toggleTitle = (title: string) => {
        if (selectedTitles.includes(title)) {
            setSelectedTitles(selectedTitles.filter(t => t !== title));
        } else {
            setSelectedTitles([...selectedTitles, title]);
        }
    };

    const handleAddTitle = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle.trim() && !selectedTitles.includes(newTitle.trim())) {
            setSelectedTitles([...selectedTitles, newTitle.trim()]);
            setNewTitle('');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-white">Select Job Titles</h2>
                <p className="text-xl text-cyan-200">
                    I've found these roles might be a good fit. Select the ones you'd like to explore.
                </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex flex-wrap gap-3 mb-8">
                    {selectedTitles.map((title) => (
                        <button
                            key={title}
                            onClick={() => toggleTitle(title)}
                            className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${selectedTitles.includes(title)
                                    ? 'bg-gradient-to-r from-orange-500 to-blue-500 text-white shadow-lg shadow-orange-500/25 transform scale-105'
                                    : 'bg-white/5 text-cyan-100 hover:bg-white/10 border border-white/10'
                                }`}
                        >
                            {selectedTitles.includes(title) && <Check className="w-4 h-4" />}
                            {title}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleAddTitle} className="flex gap-3 mb-8">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Add another job title..."
                        className="flex-1 px-5 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newTitle.trim()}
                        className="px-5 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </form>

                <div className="flex gap-4 pt-4 border-t border-white/10">
                    <button
                        onClick={onBack}
                        className="px-6 py-4 text-cyan-200 hover:text-white font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => onConfirm(selectedTitles)}
                        disabled={selectedTitles.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                    >
                        <Search className="w-5 h-5" />
                        Search {selectedTitles.length} Roles
                    </button>
                </div>
            </div>
        </div>
    );
}

---
File: src/components/RoleDetailPanel.tsx
---
'use client';

import React from 'react';
import { X, Briefcase, TrendingUp, DollarSign, Award } from 'lucide-react';
import { RoleNode } from '@/data/constellationData';
import { useConstellationStore } from '@/hooks/useConstellationStore';

interface RoleDetailPanelProps {
    role: RoleNode;
}

export default function RoleDetailPanel({ role }: RoleDetailPanelProps) {
    const { selectRole } = useConstellationStore();

    return (
        <div className="fixed right-0 top-0 h-screen w-[450px] z-20 animate-in slide-in-from-right duration-400">
            {/* Frosted glass panel */}
            <div className="h-full bg-slate-900/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl p-8 overflow-y-auto">

                {/* Close button */}
                <button
                    onClick={() => selectRole(null)}
                    className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                    <X className="w-5 h-5 text-white/60 hover:text-white" />
                </button>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-blue-500/20 rounded-2xl">
                            <Briefcase className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="px-3 py-1 bg-blue-500/10 rounded-full text-xs text-blue-300 border border-blue-500/20">
                            {role.experienceLevel}
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{role.name}</h2>
                    <p className="text-slate-400 leading-relaxed">{role.description}</p>
                </div>

                {/* Salary */}
                <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Salary Range</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        £{role.salaryRange.min.toLocaleString()} - £{role.salaryRange.max.toLocaleString()}
                    </div>
                </div>

                {/* Responsibilities */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Key Responsibilities</span>
                    </div>
                    <ul className="space-y-2">
                        {role.responsibilities.map((resp, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-300">
                                <span className="text-orange-400 mt-1">•</span>
                                <span>{resp}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Skills */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Required Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {role.requiredSkills.map((skill, i) => (
                            <div
                                key={i}
                                className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-full text-sm border border-purple-500/20"
                            >
                                {skill}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="pt-6 border-t border-white/10">
                    <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-105">
                        See Open Positions →
                    </button>
                </div>
            </div>
        </div>
    );
}

---
File: src/components/SearchSettings.tsx
---
'use client';

import React, { useState } from 'react';
import { MapPin, Hash, Search } from 'lucide-react';

interface SearchSettingsProps {
    initialLocation?: string;
    initialLimit?: number;
    initialExperienceLevel?: string;
    initialWorkType?: string;
    initialDatePosted?: string;
    onSearch: (params: SearchParams) => void;
}

export interface SearchParams {
    location: string;
    limit: number;
    experienceLevel: string;
    workType: string;
    datePosted: string;
}

export default function SearchSettings({
    initialLocation = 'London, United Kingdom',
    initialLimit = 10,
    initialExperienceLevel = 'any',
    initialWorkType = 'any',
    initialDatePosted = 'any',
    onSearch
}: SearchSettingsProps) {
    const [location, setLocation] = useState(initialLocation);
    const [limit, setLimit] = useState(initialLimit);
    const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel);
    const [workType, setWorkType] = useState(initialWorkType);
    const [datePosted, setDatePosted] = useState(initialDatePosted);

    const handleSearch = () => {
        onSearch({
            location,
            limit,
            experienceLevel,
            workType,
            datePosted,
        });
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border-2 border-white/20 shadow-xl mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., London, United Kingdom"
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-cyan-200/50 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Experience
                    </label>
                    <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium"
                    >
                        <option value="any">Any Level</option>
                        <option value="entry_level">Entry Level</option>
                        <option value="mid_level">Mid Level</option>
                        <option value="senior_level">Senior Level</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Work Type
                    </label>
                    <select
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium"
                    >
                        <option value="any">Any Type</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="onsite">On-site</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Posted
                    </label>
                    <select
                        value={datePosted}
                        onChange={(e) => setDatePosted(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium"
                    >
                        <option value="any">Any Time</option>
                        <option value="today">Today</option>
                        <option value="3days">Last 3 Days</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-cyan-200" />
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="px-4 py-2 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium text-sm"
                    >
                        <option value={5}>5 jobs</option>
                        <option value={10}>10 jobs</option>
                        <option value={20}>20 jobs</option>
                    </select>
                </div>

                <button
                    onClick={handleSearch}
                    className="ml-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-105 shadow-xl flex items-center gap-2"
                >
                    <Search className="w-5 h-5" />
                    Search Jobs
                </button>
            </div>
        </div>
    );
}

---
File: src/components/Starfield.tsx
---
import React, { useEffect, useRef } from 'react';

interface Star {
    x: number;
    y: number;
    size: number;
    opacity: number;
    speed: number;
}

export default function Starfield() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let stars: Star[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
        };

        const initStars = () => {
            stars = [];
            const numStars = Math.floor((canvas.width * canvas.height) / 3000); // Density

            // Background stars
            for (let i = 0; i < numStars; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 1.5 + 0.5, // 0.5 to 2px
                    opacity: Math.random(),
                    speed: Math.random() * 0.05 + 0.01 // Slow drift
                });
            }

            // Ambient particles (Nebula dust)
            const numParticles = Math.floor(numStars / 10);
            for (let i = 0; i < numParticles; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 3 + 2, // 2 to 5px (larger)
                    opacity: Math.random() * 0.3 + 0.1, // Fainter
                    speed: Math.random() * 0.02 + 0.005 // Very slow
                });
            }
        };

        const draw = () => {
            if (!ctx || !canvas) return;

            // Clear with trail effect for smoothness (optional, but simple clear is better for crisp stars)
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background gradient
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width
            );
            gradient.addColorStop(0, '#0f172a'); // Slate 900
            gradient.addColorStop(1, '#020617'); // Slate 950
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw stars
            stars.forEach(star => {
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();

                // Twinkle effect
                star.opacity += (Math.random() - 0.5) * 0.02;
                if (star.opacity < 0.1) star.opacity = 0.1;
                if (star.opacity > 0.8) star.opacity = 0.8;

                // Movement (slow drift)
                star.y -= star.speed;
                if (star.y < 0) {
                    star.y = canvas.height;
                    star.x = Math.random() * canvas.width;
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: '#020617' }}
        />
    );
}

---
File: src/data/careerGalaxyData.ts
---
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

---
File: src/data/constellationData.ts
---
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

---
File: src/data/megaSectors.ts
---
// 12 Mega Sectors for Career Galaxy
export const MEGA_SECTORS = [
    {
        id: 'stem',
        name: 'Science, Technology & Engineering',
        description: 'STEM, research, software, AI, biotech, aerospace, robotics, chemistry',
        color: '#3b82f6', // Blue
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'business-finance',
        name: 'Business, Finance & Professional Services',
        description: 'Banking, finance, accounting, law, insurance, consulting, real estate',
        color: '#10b981', // Green
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'creative-media',
        name: 'Creative, Media & Design',
        description: 'Art, film, games, content, writing, design, marketing, advertising',
        color: '#f59e0b', // Orange
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'health-medicine',
        name: 'Health, Medicine & Life Sciences',
        description: 'Doctors, nurses, mental health, pharma, public health, medical devices',
        color: '#ef4444', // Red
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'education',
        name: 'Education & Academia',
        description: 'Teaching, universities, training, research institutions, libraries',
        color: '#8b5cf6', // Purple
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'government-law',
        name: 'Government, Law & Public Services',
        description: 'Civil service, policy, law enforcement, military, politics, NGOs',
        color: '#6366f1', // Indigo
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'sales-revenue',
        name: 'Sales, Customer & Revenue Functions',
        description: 'Sales, SDR/BDR, partnerships, customer success, account management',
        color: '#ec4899', // Pink
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'operations-logistics',
        name: 'Operations, Logistics & Supply Chain',
        description: 'Business ops, warehouse, transport, manufacturing, procurement',
        color: '#14b8a6', // Teal
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'construction-trades',
        name: 'Construction, Engineering Trades & Built Environment',
        description: 'Trades, electricians, plumbers, architects, surveyors, construction mgmt',
        color: '#f97316', // Deep Orange
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'hospitality-retail',
        name: 'Hospitality, Retail & Consumer Services',
        description: 'Retail, restaurants, hotels, beauty, gyms, tourism, entertainment service',
        color: '#06b6d4', // Cyan
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'agriculture-environment',
        name: 'Agriculture, Environment & Natural Resources',
        description: 'Farming, fisheries, environment, climate, energy, sustainability',
        color: '#84cc16', // Lime
        size: 50,
        type: 'megasector' as const
    },
    {
        id: 'entrepreneurship',
        name: 'Entrepreneurship & Startups',
        description: 'Founders, early-stage ventures, innovation, venture building',
        color: '#a855f7', // Bright Purple
        size: 50,
        type: 'megasector' as const
    }
];

---
File: src/hooks/useConstellationStore.ts
---
import { create } from 'zustand';
import { ConstellationNode, RoleNode } from '@/data/constellationData';

type ZoomLevel = 'galaxy' | 'industry' | 'role';

interface ConstellationStore {
    // View state
    zoomLevel: ZoomLevel;
    selectedIndustry: string | null;
    selectedRole: string | null;

    // Actions
    setZoomLevel: (level: ZoomLevel) => void;
    selectIndustry: (id: string | null) => void;
    selectRole: (roleId: string | null) => void;
    reset: () => void;
}

export const useConstellationStore = create<ConstellationStore>((set) => ({
    // Initial state
    zoomLevel: 'galaxy',
    selectedIndustry: null,
    selectedRole: null,

    // Actions
    setZoomLevel: (level) => set({ zoomLevel: level }),

    selectIndustry: (id) => set({
        selectedIndustry: id,
        zoomLevel: id ? 'industry' : 'galaxy'
    }),

    selectRole: (roleId) => set({
        selectedRole: roleId,
        zoomLevel: roleId ? 'role' : 'industry'
    }),

    reset: () => set({
        zoomLevel: 'galaxy',
        selectedIndustry: null,
        selectedRole: null
    })
}));

---
File: src/lib/prisma.ts
---
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

---
File: src/lib/userSession.ts
---
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

---
File: src/services/jobSearchService.ts
---
import { Job } from '@/components/JobResults';

interface SearchParams {
    queries: string[];
    location: string;
    experienceLevel?: string;
    workType?: string;
    limit?: number;
}

export class JobSearchService {
    private static SERPAPI_KEY = process.env.SERPAPI_KEY;
    private static ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
    private static ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
    private static REED_API_KEY = process.env.REED_API_KEY;

    static async search(params: SearchParams): Promise<Job[]> {
        const allJobs: Job[] = [];
        const seenUrls = new Set<string>();

        // 1. Try Adzuna (Primary - High Quality)
        if (this.ADZUNA_APP_ID && this.ADZUNA_APP_KEY) {
            try {
                const adzunaJobs = await this.searchAdzuna(params);
                this.addUniqueJobs(adzunaJobs, allJobs, seenUrls);
            } catch (error) {
                console.error('Adzuna search failed:', error);
            }
        }

        // 2. Try Reed (Secondary - UK Specific)
        if (this.REED_API_KEY) {
            try {
                const reedJobs = await this.searchReed(params);
                this.addUniqueJobs(reedJobs, allJobs, seenUrls);
            } catch (error) {
                console.error('Reed search failed:', error);
            }
        }

        // 3. Fallback to SerpAPI (Broadest Coverage)
        if (this.SERPAPI_KEY) {
            try {
                const serpJobs = await this.searchSerpApi(params);
                this.addUniqueJobs(serpJobs, allJobs, seenUrls);
            } catch (error) {
                console.error('SerpAPI search failed:', error);
            }
        }

        return allJobs;
    }

    private static addUniqueJobs(newJobs: Job[], allJobs: Job[], seenUrls: Set<string>) {
        for (const job of newJobs) {
            if (!seenUrls.has(job.url)) {
                seenUrls.add(job.url);
                allJobs.push(job);
            }
        }
    }

    private static async searchAdzuna(params: SearchParams): Promise<Job[]> {
        const results: Job[] = [];

        for (const query of params.queries) {
            try {
                const url = new URL('https://api.adzuna.com/v1/api/jobs/gb/search/1');
                url.searchParams.append('app_id', this.ADZUNA_APP_ID || '');
                url.searchParams.append('app_key', this.ADZUNA_APP_KEY || '');
                url.searchParams.append('what', query);
                url.searchParams.append('where', params.location);
                url.searchParams.append('results_per_page', '10');
                url.searchParams.append('content-type', 'application/json');

                const response = await fetch(url.toString());
                if (!response.ok) continue;

                const data = await response.json();

                if (data.results) {
                    const mapped = data.results.map((job: any) => ({
                        id: `adzuna-${job.id}`,
                        title: job.title,
                        company: job.company.display_name,
                        location: job.location.display_name,
                        description: job.description,
                        salary: job.salary_min ? `£${job.salary_min} - £${job.salary_max}` : 'Competitive',
                        url: job.redirect_url,
                        source: 'Adzuna'
                    }));
                    results.push(...mapped);
                }
            } catch (e) {
                console.error(`Adzuna search error for query "${query}":`, e);
            }
        }
        return results;
    }

    private static async searchReed(params: SearchParams): Promise<Job[]> {
        const results: Job[] = [];

        if (!this.REED_API_KEY) return [];

        for (const query of params.queries) {
            try {
                const url = new URL('https://www.reed.co.uk/api/1.0/search');
                url.searchParams.append('keywords', query);
                url.searchParams.append('locationName', params.location);

                const response = await fetch(url.toString(), {
                    headers: {
                        'Authorization': `Basic ${btoa(this.REED_API_KEY + ':')}`
                    }
                });

                if (!response.ok) continue;

                const data = await response.json();

                if (data.results) {
                    const mapped = data.results.map((job: any) => ({
                        id: `reed-${job.jobId}`,
                        title: job.jobTitle,
                        company: job.employerName,
                        location: job.locationName,
                        description: job.jobDescription,
                        salary: job.minimumSalary ? `£${job.minimumSalary} - £${job.maximumSalary}` : 'Competitive',
                        url: job.jobUrl,
                        source: 'Reed'
                    }));
                    results.push(...mapped);
                }
            } catch (e) {
                console.error(`Reed search error for query "${query}":`, e);
            }
        }
        return results;
    }

    private static async searchSerpApi(params: SearchParams): Promise<Job[]> {
        const results: Job[] = [];

        for (const query of params.queries) {
            const url = new URL('https://serpapi.com/search');
            url.searchParams.append('engine', 'google_jobs');
            url.searchParams.append('q', `${query} in ${params.location}`);
            url.searchParams.append('api_key', this.SERPAPI_KEY || '');
            url.searchParams.append('hl', 'en');

            // Add filters
            if (params.workType === 'remote') url.searchParams.append('chips', 'work_from_home');

            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.jobs_results) {
                const mapped = data.jobs_results.map((job: any) => ({
                    id: job.job_id || Math.random().toString(),
                    title: job.title,
                    company: job.company_name,
                    location: job.location,
                    description: job.description,
                    salary: job.detected_extensions?.salary || 'Not specified',
                    url: job.share_link || job.related_links?.[0]?.link || '#',
                    source: 'Google Jobs'
                }));
                results.push(...mapped);
            }
        }

        return results;
    }
}

---
File: src/services/perplexityJobSearch.ts
---
import Anthropic from '@anthropic-ai/sdk';

interface PerplexitySearchParams {
    queries: string[];
    location: string;
    experienceLevel: string;
    limit: number;
}

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    salary: string;
    url: string;
    source: string;
}

export class PerplexityJobSearchService {
    private static readonly API_URL = 'https://api.perplexity.ai/chat/completions';
    private static readonly API_KEY = process.env.PERPLEXITY_API_KEY;

    static async search(params: PerplexitySearchParams): Promise<Job[]> {
        const { queries, location, experienceLevel, limit } = params;

        // Build search query
        const roleQuery = queries.join(' OR ');
        const expLabel = this.formatExperienceLevel(experienceLevel);

        const prompt = `Find EXACTLY ${limit} current job openings that match these criteria:
- Role: ${roleQuery}
- Location: ${location}
- Experience Level: ${expLabel}

CRITICAL INSTRUCTIONS:
1. Search for REAL, ACTIVE job postings from job boards (LinkedIn, Indeed, Glassdoor, company career pages)
2. Return ONLY jobs that are currently accepting applications
3. Include the direct application URL for each job
4. Return EXACTLY a valid JSON array, nothing else

Required JSON format (return ONLY this, no markdown, no explanations):
[
  {
    "title": "exact job title from posting",
    "company": "company name",
    "location": "city, country",
    "salary": "salary range if available, otherwise 'Competitive'",
    "description": "2-3 sentence summary of the role",
    "url": "direct application URL"
  }
]

Remember: Return ONLY the JSON array, no additional text.`;

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar-pro', // Updated to correct model name
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a job search assistant. Always return valid JSON arrays only, never include markdown formatting or explanations.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    return_citations: true,
                    return_related_questions: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Perplexity API error:', response.status, errorText);
                throw new Error(`Perplexity API failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('Perplexity raw response:', JSON.stringify(data, null, 2));

            // Extract content from Perplexity response
            const content = data.choices?.[0]?.message?.content || '';
            console.log('Perplexity content:', content);

            // Parse JSON from content (handle markdown code blocks)
            const jobs = this.parseJobsFromContent(content);

            // Add unique IDs and source
            return jobs.map((job: any, index: number) => ({
                id: `perplexity-${Date.now()}-${index}`,
                title: job.title || 'Unknown Position',
                company: job.company || 'Unknown Company',
                location: job.location || location,
                description: job.description || 'No description available',
                salary: job.salary || 'Competitive',
                url: job.url || '#',
                source: 'perplexity'
            }));
        } catch (error) {
            console.error('Perplexity search error:', error);
            throw error;
        }
    }

    private static parseJobsFromContent(content: string): any[] {
        try {
            // Remove markdown code blocks if present
            let cleaned = content.trim();
            cleaned = cleaned.replace(/```json\s*/g, '');
            cleaned = cleaned.replace(/```\s*/g, '');
            cleaned = cleaned.trim();

            // Find JSON array in content
            const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // If no array found, try parsing the whole thing
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Failed to parse jobs from content:', error);
            console.error('Content was:', content);
            return [];
        }
    }

    private static formatExperienceLevel(level: string): string {
        const levelMap: Record<string, string> = {
            'entry': 'Entry-level / Junior (0-2 years)',
            'entry_level': 'Entry-level / Junior (0-2 years)',
            'mid': 'Mid-level (2-5 years)',
            'senior': 'Senior (5-10 years)',
            'lead': 'Lead / Manager (10+ years)',
            'any': 'All experience levels'
        };
        return levelMap[level.toLowerCase()] || 'All experience levels';
    }
}

---
File: src/types/pdf-parse.d.ts
---
declare module 'pdf-parse' {
    function pdf(dataBuffer: Buffer, options?: any): Promise<{
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        text: string;
        version: string;
    }>;
    export = pdf;
}

---
File: src/types/three-spritetext.d.ts
---
declare module 'three-spritetext' {
    import { Object3D } from 'three';
    export default class SpriteText extends Object3D {
        constructor(text?: string, textHeight?: number, color?: string);
        text: string;
        textHeight: number;
        color: string;
        fontFace: string;
        fontSize: number;
        fontWeight: string;
        strokeWidth: number;
        strokeColor: string;
    }
}

---
File: src/utils/galaxyLayout.ts
---
import { CareerNode } from '@/data/careerGalaxyData';

export interface PositionedNode extends CareerNode {
    x: number;
    y: number;
    pathTypes?: string[];     // Which path types this node belongs to
    pathColors?: string[];    // Corresponding colors for each path
}

export interface RadialLayoutConfig {
    centerX: number;
    centerY: number;
    levelRadii: {
        level0: number;
        level1: number;
        level2: number;
        level3: number;
        level4: number;
    };
}

export const DEFAULT_LAYOUT_CONFIG: RadialLayoutConfig = {
    centerX: 0,
    centerY: 0,
    levelRadii: {
        level0: 400,
        level1: 900,
        level2: 1400,
        level3: 2000,
        level4: 2600
    }
};

/**
 * Generates a radial layout for the career galaxy nodes.
 * This is a pure function that takes nodes and returns positioned nodes.
 */
export function generateRadialLayout(
    allNodes: CareerNode[],
    config: RadialLayoutConfig = DEFAULT_LAYOUT_CONFIG
): PositionedNode[] {
    const { centerX, centerY, levelRadii } = config;
    const positionedNodes: PositionedNode[] = [];

    // Position level 0 (super-clusters) in a circle
    const level0Nodes = allNodes.filter(n => n.level === 0);
    level0Nodes.forEach((node, i) => {
        const angle = (i / level0Nodes.length) * Math.PI * 2 - Math.PI / 2;
        positionedNodes.push({
            ...node,
            x: centerX + Math.cos(angle) * levelRadii.level0,
            y: centerY + Math.sin(angle) * levelRadii.level0
        });
    });

    // For each super-cluster, position its children radiating outward
    positionedNodes.filter(n => n.level === 0).forEach((superCluster) => {
        const children = allNodes.filter(n => n.parentId === superCluster.id);
        const superClusterAngle = Math.atan2(superCluster.y - centerY, superCluster.x - centerX);

        // Dynamic arc span based on number of children (more children = wider arc)
        const baseArc = Math.PI / 3; // 60 degrees base
        const arcSpan = Math.min(Math.PI / 1.5, baseArc * (1 + children.length * 0.1)); // Max 120 degrees

        children.forEach((child, i) => {
            const childAngle = superClusterAngle + (i - (children.length - 1) / 2) * (arcSpan / Math.max(children.length - 1, 1));
            positionedNodes.push({
                ...child,
                x: centerX + Math.cos(childAngle) * levelRadii.level1,
                y: centerY + Math.sin(childAngle) * levelRadii.level1
            });

            // Recursively position deeper levels
            const positionChildrenRecursively = (parent: PositionedNode, currentLevel: number) => {
                const grandchildren = allNodes.filter(n => n.parentId === parent.id);
                const parentAngle = Math.atan2(parent.y - centerY, parent.x - centerX);

                const radius = currentLevel === 2 ? levelRadii.level2
                    : currentLevel === 3 ? levelRadii.level3
                        : levelRadii.level4;

                // Dynamic arc for children (wider for more nodes)
                const childArc = Math.min(Math.PI / 2, Math.PI / 3 * (1 + grandchildren.length * 0.05)); // Max 90 degrees

                grandchildren.forEach((gc, j) => {
                    const gcAngle = parentAngle + (j - (grandchildren.length - 1) / 2) * (childArc / Math.max(grandchildren.length - 1, 1));
                    const positioned = {
                        ...gc,
                        x: centerX + Math.cos(gcAngle) * radius,
                        y: centerY + Math.sin(gcAngle) * radius
                    };
                    positionedNodes.push(positioned);

                    if (currentLevel < 4) {
                        positionChildrenRecursively(positioned, currentLevel + 1);
                    }
                });
            };

            const positionedChild = positionedNodes.find(n => n.id === child.id);
            if (positionedChild && child.level < 4) {
                positionChildrenRecursively(positionedChild, child.level + 1);
            }
        });
    });

    return positionedNodes;
}

---
File: src/utils/galaxyTransform.ts
---
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

