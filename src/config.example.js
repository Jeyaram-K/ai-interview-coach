/**
 * Example Configuration File
 * Copy this file to config.js and fill in your actual values
 * 
 * DO NOT commit config.js to version control!
 */

const CONFIG = {
    // ==================== Firebase Configuration ====================
    firebase: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        projectId: "YOUR_PROJECT_ID",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        storageBucket: "YOUR_PROJECT.appspot.com"
    },

    // ==================== RAG Server Configuration ====================
    ragServer: {
        url: "http://localhost:8000",
        enabled: true,
        topK: 3,
        minSimilarity: 0.5
    },

    // ==================== Default Settings ====================
    defaults: {
        provider: "pollinations",
        prompt: "Answer interview questions naturally. Use knowledge base first. Keep answers short, honest, and practical.",
        tone: "Direct"
    }
};

Object.freeze(CONFIG);
Object.freeze(CONFIG.firebase);
Object.freeze(CONFIG.ragServer);
Object.freeze(CONFIG.defaults);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
