// Quick test script to verify Perplexity API is working
// Run: node test-perplexity.js

const API_KEY = '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';

async function testPerplexity() {
    console.log('🧪 Testing Perplexity API...\n');

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant. Return only JSON.'
                    },
                    {
                        role: 'user',
                        content: 'Find 3 current "Frontend Developer" jobs in London. Return ONLY a JSON array: [{"title": "...", "company": "...", "location": "...", "salary": "...", "description": "...", "url": "..."}]'
                    }
                ],
                temperature: 0.2,
                return_citations: true
            })
        });

        console.log('📊 Status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            return;
        }

        const data = await response.json();
        console.log('✅ Success! Response:', JSON.stringify(data, null, 2));

        const content = data.choices?.[0]?.message?.content;
        console.log('\n📝 Content:', content);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testPerplexity();
