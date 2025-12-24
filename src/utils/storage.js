const StorageUtils = {
  async getSettings() {
    const result = await chrome.storage.local.get(["apiKey", "prompt", "tone", "provider", "model"]);
    const provider = result.provider || window.CONSTANTS.DEFAULT_PROVIDER;
    const providerConfig = window.CONSTANTS.PROVIDERS[provider];

    return {
      apiKey: result.apiKey || "",
      prompt: result.prompt || window.CONSTANTS.DEFAULT_PROMPT,
      tone: result.tone || window.CONSTANTS.DEFAULT_TONE,
      provider: provider,
      model: result.model || providerConfig.defaultModel
    };
  },

  async saveSettings(settings) {
    await chrome.storage.local.set(settings);
  }
};
if (typeof window !== "undefined") window.StorageUtils = StorageUtils;