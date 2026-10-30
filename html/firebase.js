
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBizYv_ME2Eh6Qp_0JTmj7RspHDEfMvDCc",
  authDomain: "proshop-v2-85c8f.firebaseapp.com",
  projectId: "proshop-v2-85c8f",
  storageBucket: "proshop-v2-85c8f.firebasestorage.app",
  messagingSenderId: "968439466067",
  appId: "1:968439466067:web:60c1378a615f9245a2dea6",
  measurementId: "G-L2RY0S5Q1G"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("PROSHOP V2 Firebase Connected!");
