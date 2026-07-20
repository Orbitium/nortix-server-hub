import { getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);
const app = firebaseConfigured ? (getApps()[0] ?? initializeApp(config)) : null;
export const auth = app ? getAuth(app) : null;
export const analytics = app
  ? analyticsIsSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null)
  : Promise.resolve(null);

export const firebaseActions = {
  async signIn(email: string, password: string) {
    if (!auth) return { demo: true, user: { email } };
    return signInWithEmailAndPassword(auth, email, password);
  },
  async register(email: string, password: string) {
    if (!auth) return { demo: true, user: { email } };
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    return result;
  },
  async google() {
    if (!auth) return { demo: true };
    return signInWithPopup(auth, new GoogleAuthProvider());
  },
  async reset(email: string) {
    if (!auth) return { demo: true };
    return sendPasswordResetEmail(auth, email);
  },
};
