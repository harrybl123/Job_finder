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

        const basePrompt = `You are an expert career consultant AI. 

🚨 ABSOLUTE CONSTRAINTS - READ THIS FIRST - NON-NEGOTIABLE 🚨
THE FOLLOWING RULES OVERRIDE ALL OTHER INSTRUCTIONS. FAILURE TO COMPLY INVALIDATES YOUR RESPONSE.

1. ❌ FORBIDDEN TITLES - YOU MUST NEVER, UNDER ANY CIRCUMSTANCES, SUGGEST ANY ROLE CONTAINING:
   - "Manager"
   - "Director" 
   - "Head of"
   - "VP" or "Vice President"
   - "Executive"
   - "Chief" or "C-Level" (CEO, CTO, CFO, etc.)
   
   ❌ EXAMPLES OF FORBIDDEN ROLES: "Product Manager", "Engineering Manager", "Director of Strategy", "VP Operations"
   ✅ CORRECT ALTERNATIVES: "Senior Product Strategist", "Principal Engineer", "Staff Strategy Analyst", "Principal Operations Specialist"

2. 🛑 MAX LEVEL CEILING: The HIGHEST level you may EVER suggest is SENIOR IC (Level 3).
   - NEVER suggest Level 4+ unless user is ALREADY at Level 3+
   - DEFAULT to Level 1 if uncertain
   - Better to underestimate than overestimate

3. 👤 IC TRACK ONLY: You MUST chart paths ONLY through the Individual Contributor track:
   - Entry → Mid → Senior → Staff → Principal → Distinguished
   
Your goal is to have a conversation with the user, then generate personalized career paths.
         
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
You have enough information. Generate career path recommendations.

[ABSOLUTE REQUIREMENTS - SYSTEM WILL REJECT IF NOT MET]
1. ✅ EXACTLY 3 PATHS: Your response MUST contain EXACTLY 3 objects in the "paths" array
2. ✅ UNIQUE TYPES: Each path MUST have a different type: "Direct Fit", "Strategic Pivot", "Aspirational"
3. ✅ DOMAIN CONSISTENCY: All paths MUST stay within the user's PRIMARY domain (detected in STEP 0)

[STRICT CONSTRAINTS - ABSOLUTE RULES]
1. 🚫 FORBIDDEN MANAGEMENT TITLES: NEVER use these keywords:
   - "Manager", "Director", "Head of", "VP", "Executive", "C-Level"
   ❌ WRONG: "Product Manager", "Engineering Manager"
   ✅ CORRECT: "Senior Product Strategist", "Principal Engineer"

2. 👤 IC TRACK ONLY: Use Individual Contributor titles
   - Junior → Mid → Senior → Staff → Principal → Distinguished

3. 🛑 LEVEL CEILING: Maximum +2 levels from current

4. 🔗 LINKS REQUIRED: Each path needs a "links" array

---

STEP 0: DOMAIN & PROFILE ANALYSIS (CRITICAL FIRST STEP)
Analyze the CV to determine:

A. PRIMARY DOMAIN
- What industry/sector? (Technology, Business, Healthcare, Finance, etc.)
- What function? (Product, Operations, Engineering, Strategy, Consulting, etc.)

B. SKILLS INVENTORY
- List TOP 5 transferable skills
- Technical vs. Soft skills ratio

C. CAREER TRAJECTORY DETECTION
- Is there a clear progression pattern?
- Are they pivoting or deepening expertise?

🎯 ALL 3 PATHS MUST ALIGN WITH THIS DOMAIN unless user explicitly asks to pivot.

---

STEP 1: INFER CURRENT LEVEL (USE EXPLICIT EVIDENCE)

LEVEL DETECTION RULES (BE CONSERVATIVE):
- Level 1 (Associate/Entry): 
  ✅ Job titles: "Associate", "Junior", "Coordinator", "Intern"
  ✅ 0-2 years total experience
  ✅ No leadership mentions
  
- Level 2 (Mid-Level):
  ✅ 2-5 years experience
  ✅ Solid performer, no "Senior" title yet
  
- Level 3 (Senior IC):
  ✅ "Senior" in title
  ✅ 5-8 years experience
  ✅ Mentoring others

🚨 DEFAULT TO LEVEL 1 if ambiguous - better to underestimate than overestimate

---

STEP 2: GENERATE EXACTLY 3 PATHS (NON-NEGOTIABLE)

Path 1: DIRECT FIT
- Maximum +1 level from current
- Same domain and function
- Example: "Business Analyst" → "Senior Business Analyst"

Path 2: STRATEGIC PIVOT  
- Same level, adjacent function within domain
- Leverage transferable skills
- Example: "Operations Analyst" → "Strategy Analyst" (both Business domain)

Path 3: ASPIRATIONAL
- Maximum +2 levels
- Still within domain
- Note explicit skill gaps
- Example: "Junior Analyst" → "Principal Analyst" (but note: "Needs 3-5 more years experience")

🎯 IF YOU CAN'T GENERATE 3 DISTINCT PATHS: Create variations (e.g., different specializations within same domain)

---

STEP 3: VALIDATE YOUR OUTPUT

Before returning, check:
✅ paths.length === 3?
✅ All paths within detected domain?
✅ No forbidden keywords?
✅ currentLevel based on evidence?
✅ Each path has links array?
✅ CRITICAL: Each pathNode MUST have a "type" property set to either "ROLE" or "CATEGORY"
   - "ROLE" = Specific job title (e.g., "Business Analyst", "Senior Developer")  
   - "CATEGORY" = Grouping/area (e.g., "Data & Analytics", "Product Management")

---

Response format:
Return a JSON object with this structure:
{
  "message": "A brief, encouraging summary of why you chose these paths (max 2 sentences).",
  "synthesis_analysis": "Brief analysis of their profile...",
  "currentLevel": 2, // Inferred experience level (1-7+)
  "paths": [
    {
      "type": "Direct Fit",
      "reasoning": "Why this fits...",
      "levelJump": 1, // How many levels above current (0-2 only)
      "nodeIds": ["id1", "id2"], // Legacy support
      "pathNodes": [ // NEW: Dynamic node generation with FULL lineage
         { 
           "id": "unique-id-1", 
           "name": "Mid-Level Developer", 
           "level": 2,
           "type": "CATEGORY" // REQUIRED: "ROLE" for job titles (e.g., "Business Analyst") OR "CATEGORY" for groupings (e.g., "Data & Analytics")
         },
         { 
           "id": "unique-id-2", 
           "name": "Senior Developer", 
           "level": 3,
           "type": "ROLE" // This is a specific job title people could apply for
         }
      ],
      "links": [ // NEW: Explicit graph connections
         { "source": "unique-id-1", "target": "unique-id-2" }
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


        // Extract JSON using robust index finding (regex fails on nested objects)
        let careerData = null;
        const jsonStartIndex = content.indexOf('{');
        const jsonEndIndex = content.lastIndexOf('}');

        console.log('=== EXTRACTING CAREER DATA ===');
        console.log('Response content length:', content.length);

        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
            const jsonString = content.substring(jsonStartIndex, jsonEndIndex + 1);
            try {
                careerData = JSON.parse(jsonString);
                console.log('✅ Successfully parsed JSON via index extraction');
            } catch (e) {
                console.error('❌ Failed to parse JSON via index extraction:', e);
            }
        }

        // Fallback to regex if index extraction failed
        if (!careerData) {
            console.log('⚠️ Index extraction failed, trying regex fallback...');
            const match = content.match(/\{[\s\S]*"paths"\s*:\s*\[[\s\S]*?\][\s\S]*\}/);
            if (match) {
                try {
                    careerData = JSON.parse(match[0]);
                    console.log('✅ Successfully parsed JSON via regex fallback');
                } catch (e) {
                    console.error('❌ Failed to parse JSON via regex fallback:', e);
                }
            }
        }

        // Construct the response message
        // CRITICAL: If we have valid career data, ignore the raw content to avoid JSON artifacts
        let finalMessage = '';

        if (careerData) {
            // 🛡️ SERVER-SIDE VALIDATION
            console.log('=== VALIDATING AI RESPONSE ===');

            // VALIDATION 1: Enforce exactly 3 paths
            if (!careerData.paths || !Array.isArray(careerData.paths)) {
                console.error('❌ VALIDATION FAILED: Missing or invalid paths array');
                careerData.paths = [];
            } else if (careerData.paths.length !== 3) {
                console.warn(`⚠️ VALIDATION WARNING: Expected 3 paths, got ${careerData.paths.length}`);
                // Pad with dummy paths if < 3, truncate if > 3
                while (careerData.paths.length < 3) {
                    careerData.paths.push({
                        type: careerData.paths.length === 1 ? "Strategic Pivot" : "Aspirational",
                        reasoning: "Additional path variation",
                        pathNodes: [],
                        links: [],
                        optimizedSearchQuery: ""
                    });
                }
                if (careerData.paths.length > 3) {
                    careerData.paths = careerData.paths.slice(0, 3);
                }
            }

            // VALIDATION 2: Cap currentLevel if unreasonably high
            if (careerData.currentLevel && careerData.currentLevel > 4) {
                console.warn(`⚠️ VALIDATION WARNING: currentLevel ${careerData.currentLevel} seems high, capping at 3`);
                careerData.currentLevel = 3;
            }

            console.log('✅ Validation complete. Paths:', careerData.paths.length);

            // Use the message from the JSON, or a default success message
            finalMessage = careerData.message || "I've analyzed your profile and generated personalized career paths. Explore them in the galaxy view!";

            // Log if we're ignoring pre-text
            if (jsonStartIndex > 50) {
                console.log('ℹ️ Ignoring pre-JSON text to ensure clean output');
            }
        } else {
            // If parsing failed, return the raw content but clean code blocks
            finalMessage = content.replace(/```json[\s\S]*?```/g, '[JSON Data]');
        }

        console.log('=== RESPONSE ===');
        console.log('Has career data:', !!careerData);
        console.log('Final message:', finalMessage);

        // 🔍 DIAGNOSTIC: Log the paths array structure
        if (careerData?.paths) {
            console.log('📊 PATHS ARRAY:', careerData.paths.length, 'paths');
            careerData.paths.forEach((path: any, idx: number) => {
                console.log(`  Path ${idx + 1}: ${path.type}`);
                console.log(`    - Has pathNodes:`, !!path.pathNodes, `(${path.pathNodes?.length || 0} nodes)`);
                console.log(`    - Has nodeIds:`, !!path.nodeIds, `(${path.nodeIds?.length || 0} IDs)`);
            });
        } else {
            console.log('⚠️ NO PATHS DATA IN RESPONSE');
        }

        // Process careerData structure to normalize output
        let processedData = {
            paths: [],
            recommendedPath: [],
            recommendationReason: ''
        };

        if (careerData) {
            // NEW FORMAT: Handle paths array
            if (careerData.paths && Array.isArray(careerData.paths) && careerData.paths.length > 0) {
                const primaryPath = careerData.paths.find((p: any) => p.type === 'Direct Fit') || careerData.paths[0];

                // Extract nodeIds from pathNodes if available (new format), or use nodeIds directly (legacy)
                const nodeIds = primaryPath.pathNodes
                    ? primaryPath.pathNodes.map((n: any) => n.id)
                    : (primaryPath.nodeIds || []);

                processedData = {
                    paths: careerData.paths,
                    recommendedPath: nodeIds,
                    recommendationReason: primaryPath.reasoning || careerData.recommendationReason || ''
                };

                console.log('✅ Valid paths array structure');
                console.log('Primary path IDs:', nodeIds);
            }
            // LEGACY FORMAT: Handle single recommendedPath object
            else if (careerData.recommendedPath && !Array.isArray(careerData.recommendedPath) && careerData.recommendedPath.nodeIds) {
                processedData = {
                    paths: [], // Legacy didn't have paths array
                    recommendedPath: careerData.recommendedPath.nodeIds,
                    recommendationReason: careerData.recommendedPath.reasoning || ''
                };
                console.log('✅ Valid legacy recommendedPath structure');
            }
            // SIMPLE FORMAT: recommendedPath is just an array of IDs
            else if (Array.isArray(careerData.recommendedPath)) {
                processedData = {
                    paths: careerData.paths || [],
                    recommendedPath: careerData.recommendedPath,
                    recommendationReason: careerData.recommendationReason || ''
                };
                console.log('✅ Valid simple recommendedPath array');
            }
        }

        // 🔍 DIAGNOSTIC: Log the processed data
        console.log('📊 PROCESSED DATA:');
        console.log('   Paths:', processedData.paths.length);
        console.log('   Recommended Path:', processedData.recommendedPath);
        console.log('   Reason:', processedData.recommendationReason);

        // Return normalized data
        return NextResponse.json({
            message: finalMessage,
            paths: processedData.paths,
            recommendedPath: processedData.recommendedPath,
            recommendationReason: processedData.recommendationReason,
            currentLevel: careerData?.currentLevel || null, // Pass user's experience level
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
