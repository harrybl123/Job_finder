import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/clerkAuth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ParsedCV {
  name: string;
  email?: string;
  phone?: string;
  location?: string;  // City or region where they're based/looking for jobs
  summary: string;
  yearsExperience?: number;
  currentLevel?: number;
  levelReasoning?: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
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
  "location": "City name (e.g. 'London', 'Manchester', 'Birmingham')",
  "summary": "Brief professional summary",
  "yearsExperience": 5,
  "currentLevel": 3,
  "levelReasoning": "5 years as developer, senior-level responsibilities",
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

IMPORTANT: For location:
- Extract the city/region where they're based or looking for work
- Look for addresses, contact info, or statements like "Based in London"
- Just return the city name (e.g., "London", not "London, UK")
- If not found, return null

IMPORTANT: For yearsExperience and currentLevel:
- Count TOTAL years of professional work experience (not just current role)
- Classify currentLevel (1-8) based on:
  1 = Entry/Associate (0-2 years, junior roles)
  2 = Mid-Level (2-5 years, solid performer)
  3 = Senior IC (5-8 years, expert, may mentor others)
  4 = Lead/Principal (8-12 years, technical leadership)
  5 = Manager (people management responsibility, any years)
  6 = Director (managing managers)
  7 = VP (VP-level title)
  8 = Executive (C-suite: CEO, CTO, etc.)
- In levelReasoning, explain why you chose this level

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

    // Get or create user from Clerk authentication
    const user = await getOrCreateUser();

    // Update user's CV data and experience level
    await prisma.user.update({
      where: { id: user.id },
      data: {
        parsedCV: JSON.stringify(parsedCV),
        currentLevel: parsedCV.currentLevel || null,
        yearsExperience: parsedCV.yearsExperience || null,
        updatedAt: new Date()
      }
    });

    console.log('✅ User CV updated:', user.id, `Level: ${parsedCV.currentLevel}, Years: ${parsedCV.yearsExperience}`);

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
