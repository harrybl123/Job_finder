import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        console.log('🎙️ TTS Request received');
        const { text } = await req.json();

        if (!text) {
            console.error('❌ No text provided');
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        console.log('📝 Text to convert:', text.substring(0, 50) + '...');

        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('❌ ElevenLabs API key not configured');
            return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
        }

        console.log('✅ API key found');

        // Call ElevenLabs API
        console.log('🔄 Calling ElevenLabs API...');
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        console.log('📡 ElevenLabs response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ ElevenLabs API error:', response.statusText, errorText);
            throw new Error(`ElevenLabs API error: ${response.statusText} - ${errorText}`);
        }

        // Get audio buffer
        const audioBuffer = await response.arrayBuffer();
        console.log('✅ Audio generated, size:', audioBuffer.byteLength, 'bytes');

        // Return audio as response
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString()
            }
        });

    } catch (error: any) {
        console.error('❌ TTS Error:', error.message);
        console.error('Stack:', error.stack);
        return NextResponse.json({
            error: 'Failed to generate speech',
            details: error.message
        }, { status: 500 });
    }
}
