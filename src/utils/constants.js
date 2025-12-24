const CONSTANTS = {
  DEFAULT_PROMPT: "You are an expert sales coach. Give me a short, punchy answer to the client's last objection or question. Focus on value and closing.",
  DEFAULT_TONE: "Direct",
  DEFAULT_PROVIDER: "pollinations",
  MAX_CONTEXT_CHARS: 2000,

  // RAG Configuration
  RAG: {
    SERVER_URL: "http://localhost:8000",
    ENABLED: true,
    TOP_K: 3,  // Number of chunks to retrieve
    MIN_SIMILARITY: 0.5  // Minimum similarity threshold
  },
  // AI Provider Configurations
  PROVIDERS: {
    pollinations: {
      name: "Pollinations (Free)",
      endpoint: "https://text.pollinations.ai/",
      defaultModel: "openai",
      models: ["openai", "mistral", "llama"],
      keyPrefix: null,  // No API key needed!
      requiresKey: false
    },
    openai: {
      name: "OpenAI",
      endpoint: "https://api.openai.com/v1/chat/completions",
      defaultModel: "gpt-4o-mini",
      models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
      keyPrefix: "sk-",
      requiresKey: true
    },
    gemini: {
      name: "Google Gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
      defaultModel: "gemini-1.5-flash",
      models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
      keyPrefix: "AI",
      requiresKey: true
    },
    openrouter: {
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      defaultModel: "google/gemini-flash-1.5",
      models: ["google/gemini-flash-1.5", "anthropic/claude-3-haiku", "meta-llama/llama-3.1-8b-instruct", "openai/gpt-4o-mini"],
      keyPrefix: "sk-or-",
      requiresKey: true
    },
    groq: {
      name: "Groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      defaultModel: "llama-3.1-8b-instant",
      models: ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
      keyPrefix: "gsk_",
      requiresKey: true
    }
  },

  Events: {
    GENERATE: "GENERATE_RESPONSE",
    SUMMARIZE: "SUMMARIZE_CONTEXT",
    UPDATE_SIDEBAR: "UPDATE_SIDEBAR_UI"
  }
};
// Make available globally for content scripts
if (typeof window !== "undefined") window.CONSTANTS = CONSTANTS;