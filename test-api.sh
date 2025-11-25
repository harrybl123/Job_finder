#!/bin/bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "assistant", "content": "Hi! I have analyzed your CV..."},
      {"role": "user", "content": "I like product management."},
      {"role": "assistant", "content": "Great! What kind of product management?"},
      {"role": "user", "content": "I want to lead teams and work on strategy."},
      {"role": "assistant", "content": "Understood. What industries?"},
      {"role": "user", "content": "Fintech and B2B SaaS."},
      {"role": "assistant", "content": "Got it. What specific areas?"},
      {"role": "user", "content": "Payments and lending. I prefer hands-on leadership."}
    ],
    "cvText": "Sample CV text...",
    "userId": "test-user"
  }'
