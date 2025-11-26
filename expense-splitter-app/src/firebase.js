import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyCwq136ByM8mnSk8hQ87EcHU0Chc-8qsC0",
    authDomain: "e-split-a98b8.firebaseapp.com",
    projectId: "e-split-a98b8",
    storageBucket: "e-split-a98b8.firebasestorage.app",
    messagingSenderId: "1079274586462",
    appId: "1:1079274586462:web:8e99d3577790de9c938fcf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
