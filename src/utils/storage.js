const StorageUtils = {
  async getSettings() {
    const result = await chrome.storage.local.get(["apiKeys", "prompt", "tone", "provider", "model"]);
    const provider = result.provider || window.CONSTANTS.DEFAULT_PROVIDER;
    const providerConfig = window.CONSTANTS.PROVIDERS[provider];
    const apiKeys = result.apiKeys || {};

    return {
      apiKey: apiKeys[provider] || "",
      apiKeys: apiKeys,
      prompt: result.prompt || window.CONSTANTS.DEFAULT_PROMPT,
      tone: result.tone || window.CONSTANTS.DEFAULT_TONE,
      provider: provider,
      model: result.model || providerConfig.defaultModel
    };
  },

  async saveSettings(settings) {
    // If saving apiKey, store it per-provider
    if (settings.apiKey !== undefined && settings.provider) {
      const result = await chrome.storage.local.get(["apiKeys"]);
      const apiKeys = result.apiKeys || {};
      apiKeys[settings.provider] = settings.apiKey;
      settings.apiKeys = apiKeys;
      delete settings.apiKey; // Remove the generic key, use only per-provider
    }
    await chrome.storage.local.set(settings);
  },

  // Get API key for a specific provider
  async getApiKeyForProvider(provider) {
    const result = await chrome.storage.local.get(["apiKeys"]);
    const apiKeys = result.apiKeys || {};
    return apiKeys[provider] || "";
  },

  // Save API key for a specific provider
  async saveApiKeyForProvider(provider, apiKey) {
    const result = await chrome.storage.local.get(["apiKeys"]);
    const apiKeys = result.apiKeys || {};
    apiKeys[provider] = apiKey;
    await chrome.storage.local.set({ apiKeys });
  }
};
if (typeof window !== "undefined") window.StorageUtils = StorageUtils;