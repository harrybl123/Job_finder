// Quick test of Perplexity API
const PERPLEXITY_API_KEY = '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';

async function testPerplexity() {
    console.log('🧪 Testing Perplexity API...');

    try {
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
                    content: 'Find 3 current job listings in London, UK for "Software Engineer". Return ONLY JSON: {"count": X, "jobs": [{"title": "...", "company": "...", "location": "...", "url": "...", "salary": "..."}]}'
                }],
                temperature: 0.2
            })
        });

        console.log('📡 Status:', response.status);

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ API Error:', error);
            return;
        }

        const data = await response.json();
        console.log('✅ API Response:', data);

        const content = data.choices?.[0]?.message?.content;
        console.log('📄 Content:', content);

        // Try to parse as JSON
        try {
            const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jobData = JSON.parse(jsonText);
            console.log('✅ Parsed Jobs:', jobData);
            console.log('📊 Count:', jobData.count);
        } catch (e) {
            console.error('❌ JSON Parse Error:', e);
        }

    } catch (error) {
        console.error('❌ Fetch Error:', error);
    }
}

testPerplexity();
