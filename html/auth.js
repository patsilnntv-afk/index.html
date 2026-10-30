
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// REGISTER
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const message = document.getElementById("message");
    const submitButton = registerForm.querySelector('[type="submit"]');

    if (!name || !email || !password) {
      message.textContent = "Please fill in all fields.";
      return;
    }

    if (password.length < 8) {
      message.textContent = "Password must be at least 8 characters.";
      return;
    }

    if (submitButton) submitButton.disabled = true;
    message.textContent = "Creating account...";

    try {
      // 1. ສ້າງບັນຊີ Firebase Authentication
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = result.user;
      const uid = user.uid;

      // 2. ບັນທຶກຊື່ສະມາຊິກ
      await updateProfile(user, {
        displayName: name
      });

      // 3. ບັນທຶກຂໍ້ມູນໃນ Firestore
      const userRef = doc(db, "users", uid);

      await setDoc(userRef, {
        name: name,
        email: email,
        createdAt: serverTimestamp(),
        demoBalance: 0,
        vipLevel: 0
      });

      // 4. ກວດວ່າບັນທຶກສຳເລັດ
      const savedUser = await getDoc(userRef);

      if (!savedUser.exists()) {
        throw new Error("Member document was not created.");
      }

      console.log("REGISTER SUCCESS");
      console.log("Member UID:", uid);
      console.log("User Document:", savedUser.id);

      message.textContent = "Account created successfully!";

      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Registration error:", error);

      message.textContent =
        "Register failed: " + error.code + " - " + error.message;

      if (submitButton) submitButton.disabled = false;
    }
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const message = document.getElementById("message");
    const submitButton = loginForm.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = true;
    message.textContent = "Logging in...";

    try {
      await signInWithEmailAndPassword(auth, email, password);

      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Login error:", error);

      message.textContent =
        "Login failed: " + error.code + " - " + error.message;

      if (submitButton) submitButton.disabled = false;
    }
  });
}
