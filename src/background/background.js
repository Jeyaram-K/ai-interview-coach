/* src/background/background.js */

// RAG Configuration
const RAG_CONFIG = {
  SERVER_URL: "http://localhost:8000",
  ENABLED: true,
  TOP_K: 3,
  MIN_SIMILARITY: 0.5
};

// Provider configurations for background worker
const PROVIDERS_CONFIG = {
  pollinations: {
    name: "Pollinations (Free)",
    endpoint: "https://text.pollinations.ai/",
    requiresKey: false
  },
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    requiresKey: true
  },
  gemini: {
    name: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    defaultModel: "gemini-1.5-flash",
    requiresKey: true
  },
  openrouter: {
    name: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemini-flash-1.5",
    requiresKey: true
  },
  groq: {
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.1-8b-instant",
    requiresKey: true
  }
};

// Listen for messages from the sidebar and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_RESPONSE") {
    handleGenerateResponse(request.payload, sendResponse);
    return true;
  }

  if (request.action === "TEST_CONNECTION") {
    handleTestConnection(request.payload, sendResponse);
    return true;
  }

  // RAG Actions
  if (request.action === "RAG_ADD_DOCUMENT") {
    handleAddDocument(request.payload, sendResponse);
    return true;
  }

  if (request.action === "RAG_GET_DOCUMENTS") {
    handleGetDocuments(sendResponse);
    return true;
  }

  if (request.action === "RAG_DELETE_DOCUMENT") {
    handleDeleteDocument(request.payload, sendResponse);
    return true;
  }

  if (request.action === "RAG_SEARCH") {
    handleRagSearch(request.payload, sendResponse);
    return true;
  }

  if (request.action === "RAG_HEALTH") {
    handleRagHealth(sendResponse);
    return true;
  }
});

// ==================== RAG Functions ====================

async function handleRagHealth(sendResponse) {
  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/health`);
    const data = await response.json();
    sendResponse({ success: true, ...data });
  } catch (err) {
    sendResponse({ success: false, error: "RAG server not running" });
  }
}

async function handleAddDocument(payload, sendResponse) {
  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        content: payload.content
      })
    });

    const data = await response.json();

    if (!response.ok) {
      sendResponse({ success: false, error: data.detail || "Failed to add document" });
    } else {
      sendResponse({ success: true, ...data });
    }
  } catch (err) {
    sendResponse({ success: false, error: "RAG server not running. Start with: uvicorn main:app" });
  }
}

async function handleGetDocuments(sendResponse) {
  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/documents`);
    const data = await response.json();
    sendResponse({ success: true, ...data });
  } catch (err) {
    sendResponse({ success: false, error: "RAG server not running", documents: [] });
  }
}

async function handleDeleteDocument(payload, sendResponse) {
  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/documents/${encodeURIComponent(payload.title)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const data = await response.json();
      sendResponse({ success: false, error: data.detail || "Failed to delete" });
    } else {
      sendResponse({ success: true });
    }
  } catch (err) {
    sendResponse({ success: false, error: "RAG server not running" });
  }
}

async function handleRagSearch(payload, sendResponse) {
  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: payload.query,
        limit: RAG_CONFIG.TOP_K
      })
    });

    const data = await response.json();
    sendResponse({ success: true, ...data });
  } catch (err) {
    sendResponse({ success: false, error: "RAG server not running", results: [] });
  }
}

// Get relevant context from RAG
async function getRagContext(query) {
  if (!RAG_CONFIG.ENABLED) return "";

  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        limit: RAG_CONFIG.TOP_K
      })
    });

    if (!response.ok) return "";

    const data = await response.json();

    // Filter by similarity threshold and format context
    const relevantChunks = data.results
      .filter(r => r.similarity >= RAG_CONFIG.MIN_SIMILARITY)
      .map(r => `[${r.title}]: ${r.content}`)
      .join("\n\n");

    return relevantChunks;
  } catch (err) {
    console.log("RAG search failed:", err);
    return "";
  }
}

// ==================== Test Connection ====================

async function handleTestConnection(payload, sendResponse) {
  const { provider, model, apiKey } = payload;
  const testPrompt = "Say 'OK' if you can hear me.";

  try {
    let response;

    switch (provider) {
      case "pollinations":
        response = await callPollinations(testPrompt, model);
        break;
      case "gemini":
        response = await callGemini(apiKey, model, testPrompt);
        break;
      case "openrouter":
        response = await callOpenRouter(apiKey, model, testPrompt);
        break;
      case "groq":
        response = await callGroq(apiKey, model, testPrompt);
        break;
      case "openai":
      default:
        response = await callOpenAI(apiKey, model, testPrompt);
        break;
    }

    if (response.error) {
      sendResponse({ success: false, error: response.error });
    } else {
      sendResponse({ success: true, message: response.text });
    }
  } catch (err) {
    sendResponse({ success: false, error: `Network Error: ${err.message}` });
  }
}

// ==================== Generate Response with RAG ====================

async function handleGenerateResponse(payload, sendResponse) {
  // 1. Get Settings
  const settings = await chrome.storage.local.get(["apiKey", "prompt", "tone", "provider", "model", "ragEnabled"]);
  const { apiKey, prompt, tone } = settings;
  const provider = settings.provider || "pollinations";
  const model = settings.model || PROVIDERS_CONFIG[provider]?.defaultModel || "openai";
  const providerConfig = PROVIDERS_CONFIG[provider];
  const ragEnabled = settings.ragEnabled !== false; // Default to true

  // Check API key only for providers that require it
  if (providerConfig.requiresKey && !apiKey) {
    sendResponse({ error: "No API Key found. Please open extension settings." });
    return;
  }

  // 2. Get RAG Context if enabled
  let ragContext = "";
  if (ragEnabled) {
    ragContext = await getRagContext(payload.recentCaptions);
  }

  // 3. Build the System Prompt with RAG context
  let systemPrompt = `
You are attending a job interview.
You are the candidate, and the interviewer will ask questions one by one.

ANSWERING RULES:
- Always get the answer from KNOWLEDGE BASE first as top preference, then respond.
- Do not overthink.
- Do not show over-smartness or fake confidence.
- Speak in simple, normal spoken English, beginner level, with a natural Indian accent style.
- Keep answers short, clear, and practical.
- Sound polite, professional, and honest.

PERSONALITY & APPROACH:
- Be brutally honest, straightforward, and logical.
- Challenge weak assumptions and call out wrong or unrealistic thinking if needed.
- Do not sugarcoat, do not flatter, and do not give empty motivation.
- Avoid vague advice and generic praise.
- Give hard facts, clear reasoning, and actionable feedback.
- Respond like a no-nonsense coach or brutally honest friend whose goal is improvement, not comfort.
- Push back when required and never give diplomatic or fake answers.

GOAL:
- Answer interview questions naturally.
- Show basic intelligence, learning mindset, and clarity, without exaggeration.
- Slightly impress the interviewer through logic and honesty, not buzzwords.
`;

  // Add RAG context if available - THIS IS TOP PRIORITY
  if (ragContext) {
    systemPrompt += `
--------------------------------
KNOWLEDGE BASE (USE THIS FIRST - TOP PRIORITY FOR ANSWERS):
${ragContext}
--------------------------------
`;
  }

  systemPrompt += `
--------------------------------
INTERVIEWER'S QUESTION (from live transcript):
${payload.recentCaptions}
--------------------------------

NOW ANSWER THE INTERVIEWER'S QUESTION:
- Use KNOWLEDGE BASE content if relevant.
- Keep it short (2-3 sentences max).
- Sound natural, honest, and practical.
  `;

  try {
    let response;

    switch (provider) {
      case "pollinations":
        response = await callPollinations(systemPrompt, model);
        break;
      case "gemini":
        response = await callGemini(apiKey, model, systemPrompt);
        break;
      case "openrouter":
        response = await callOpenRouter(apiKey, model, systemPrompt);
        break;
      case "groq":
        response = await callGroq(apiKey, model, systemPrompt);
        break;
      case "openai":
      default:
        response = await callOpenAI(apiKey, model, systemPrompt);
        break;
    }

    // Add RAG indicator to response
    if (ragContext && response.text) {
      response.usedRag = true;
    }

    sendResponse(response);
  } catch (err) {
    sendResponse({ error: `Network Error: ${err.message}` });
  }
}

// ==================== AI Provider Calls ====================

async function callPollinations(systemPrompt, model) {
  const encodedPrompt = encodeURIComponent(systemPrompt);
  const url = `https://text.pollinations.ai/${encodedPrompt}?model=${model}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Accept": "text/plain" }
  });

  if (!response.ok) {
    return { error: `Pollinations Error: ${response.status} ${response.statusText}` };
  }

  const text = await response.text();
  return { text: text };
}

async function callOpenAI(apiKey, model, systemPrompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "OpenAI Error: " + data.error.message };
  }
  return { text: data.choices[0].message.content };
}

async function callGemini(apiKey, model, systemPrompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 }
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "Gemini Error: " + data.error.message };
  }

  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return { text: data.candidates[0].content.parts[0].text };
  }

  return { error: "Gemini: No response generated" };
}

async function callOpenRouter(apiKey, model, systemPrompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": chrome.runtime.getURL(""),
      "X-Title": "Sales Coach Extension"
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "OpenRouter Error: " + (data.error.message || data.error) };
  }
  return { text: data.choices[0].message.content };
}

async function callGroq(apiKey, model, systemPrompt) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "Groq Error: " + data.error.message };
  }
  return { text: data.choices[0].message.content };
}