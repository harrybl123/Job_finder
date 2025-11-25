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

[STRICT CONSTRAINTS - THESE ARE ABSOLUTE RULES, NOT SUGGESTIONS]
1. 🚫 FORBIDDEN MANAGEMENT TITLES: The career path MUST NEVER contain ANY role with the following keywords in the title:
   - "Manager" (e.g., Product Manager, Engineering Manager, Strategy Manager)
   - "Director" 
   - "Head of"
   - "VP" or "Vice President"
   - "Executive"
   - "C-Level" (CEO, CTO, etc.)
   
   ❌ WRONG: "Product Strategy Manager", "Engineering Manager", "Director of Product"
   ✅ CORRECT: "Senior Product Strategist", "Principal Engineer", "Staff Product Designer"

2. 👤 INDIVIDUAL CONTRIBUTOR (IC) TRACK ONLY: Your paths MUST follow the IC track:
   - Junior/Associate → Mid-Level → Senior → Staff/Principal → Distinguished/Fellow
   - Examples: "Junior Developer" → "Developer" → "Senior Developer" → "Staff Engineer" → "Principal Engineer"
   - Examples: "Product Designer" → "Senior Product Designer" → "Staff Product Designer"
   - Examples: "Data Analyst" → "Senior Data Analyst" → "Principal Data Scientist"

3. 🛑 ABSOLUTE CEILING: NO role may exceed Senior IC level (Level 3-4) for most users.

4. 🔗 GRAPH STRUCTURE: You MUST provide a "links" array for each path.

STEP 1: SYNTHESIS ANALYSIS
- Analyze the user's core strengths from their CV and chat answers.
- Identify their latent potential (skills they have but might not realize apply elsewhere).
- Determine their "Career Gravity" (what they naturally gravitate towards).

STEP 2: INFER CURRENT EXPERIENCE LEVEL
Based on their CV, classify their current experience level:
- Level 1 (Associate/Entry): 0-2 years experience, junior roles
- Level 2 (Mid-Level): 2-5 years, solid performer
- Level 3 (Senior IC): 5-8 years, expert in domain
- Level 4 (Lead/Principal): 8-12 years, guiding others
- Level 5 (Manager): People management responsibility
- Level 6 (Director/Senior Manager): Managing managers
- Level 7+ (VP/Executive): Strategic leadership

STEP 3: GENERATE 3 PATHS (WITH LEVEL CONSTRAINTS)
⚠️ CRITICAL RULE: Each path must follow REALISTIC PROGRESSION:
- Direct Fit: Maximum +1 level jump (e.g., Level 2 → Level 3)
- Strategic Pivot: Same level, different domain (e.g., Level 3 Engineer → Level 3 PM)
- Aspirational: Maximum +2 levels BUT with explicit skill gaps noted (e.g., Level 2 → Level 4)

❌ NEVER suggest roles more than 2 levels above current level
❌ NEVER skip intermediate steps (e.g., don't go from Junior → Director)
✅ ALWAYS include intermediate roles in pathNodes (e.g., Junior → Mid → Senior)

Path Types:
1. Direct Fit: The logical next step, elevated by 1 level (e.g., Mid Developer → Senior Developer).
2. Strategic Pivot: A lateral move (same level) leveraging existing skills (e.g., Engineer → Product Manager).
3. Aspirational: A stretch goal (+2 levels max) with clear skill gaps (e.g., Senior IC → Lead, noting "Needs: Team leadership experience").

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
         { "id": "unique-id-1", "name": "Mid-Level Developer", "level": 2 },
         { "id": "unique-id-2", "name": "Senior Developer", "level": 3 }
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
