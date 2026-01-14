import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Firestore database instance
export const db = admin.firestore();

// Configure Firestore settings
db.settings({ ignoreUndefinedProperties: true });
