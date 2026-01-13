/**
 * Cloud Database Service for AI Interview Coach
 * Uses Firebase REST API directly (works in Chrome extension service workers)
 */

// Import from centralized config
import { FIREBASE_CONFIG } from '../config.js';

// Check if configured
function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

// Firestore REST API base URL
function getFirestoreUrl(path) {
    return `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${path}`;
}

export const CloudDB = {
    getCollectionPath() {
        return 'knowledge_base';
    },

    async saveDocument(title, content, chunks = []) {
        if (!isFirebaseConfigured()) {
            return { success: false, error: "Firebase not configured" };
        }
        try {
            const docId = encodeURIComponent(title.replace(/[\/\.]/g, '_'));
            const url = `${getFirestoreUrl(this.getCollectionPath())}/${docId}?key=${FIREBASE_CONFIG.apiKey}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        title: { stringValue: title },
                        content: { stringValue: content },
                        chunkCount: { integerValue: chunks.length.toString() },
                        updatedAt: { stringValue: new Date().toISOString() }
                    }
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to save');
            }
            return { success: true, chunks: chunks.length };
        } catch (error) {
            console.error("CloudDB saveDocument error:", error);
            return { success: false, error: error.message };
        }
    },

    async getDocuments() {
        if (!isFirebaseConfigured()) {
            return { success: false, error: "Firebase not configured", documents: [] };
        }
        try {
            const url = `${getFirestoreUrl(this.getCollectionPath())}?key=${FIREBASE_CONFIG.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to fetch');
            }
            const data = await response.json();
            const documents = [];
            if (data.documents) {
                data.documents.forEach(doc => {
                    const fields = doc.fields || {};
                    documents.push({
                        title: fields.title?.stringValue || 'Untitled',
                        chunks: parseInt(fields.chunkCount?.integerValue || '0'),
                        updatedAt: fields.updatedAt?.stringValue
                    });
                });
            }
            return { success: true, documents };
        } catch (error) {
            console.error("CloudDB getDocuments error:", error);
            return { success: false, error: error.message, documents: [] };
        }
    },

    async deleteDocument(title) {
        if (!isFirebaseConfigured()) {
            return { success: false, error: "Firebase not configured" };
        }
        try {
            const docId = encodeURIComponent(title.replace(/[\/\.]/g, '_'));
            const url = `${getFirestoreUrl(this.getCollectionPath())}/${docId}?key=${FIREBASE_CONFIG.apiKey}`;
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok && response.status !== 404) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to delete');
            }
            return { success: true };
        } catch (error) {
            console.error("CloudDB deleteDocument error:", error);
            return { success: false, error: error.message };
        }
    },

    async healthCheck() {
        if (!isFirebaseConfigured()) {
            return { success: false, status: "not_configured", message: "Firebase not configured" };
        }
        try {
            const result = await this.getDocuments();
            if (result.success) {
                return { success: true, status: "connected", message: "Cloud connected", documents: result.documents?.length || 0 };
            }
            return { success: false, status: "error", message: result.error };
        } catch (error) {
            return { success: false, status: "error", message: error.message };
        }
    }
};
