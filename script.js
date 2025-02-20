console.log("Script loaded!");

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signOut, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

console.log("Firebase modules imported");

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "tick-talk-5b816.firebaseapp.com",
    projectId: "tick-talk-5b816",
    storageBucket: "tick-talk-5b816.firebasestorage.app",
    messagingSenderId: "659050213776",
    appId: "1:659050213776:web:a788adefa211b7b4f98315",
    measurementId: "G-03DZGPVMKW",
    databaseURL: "https://tick-talk-5b816-default-rtdb.europe-west1.firebasedatabase.app/"
};

console.log("Config loaded:", firebaseConfig);

// AUTHENTICATION
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
auth.languageCode = "it";
const provider = new GoogleAuthProvider();

console.log("Firebase initialized");

// Make sure we wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded");
    
    const callManager = {
        callStartTime: null,
        beforeCallTimeBalance: 0,
        timeBalance: 0,
        teacherMultiplier: 1.5,

        elements: {
            preCallDiv: document.getElementById('preCall'),
            inCallDiv: document.getElementById('inCall'),
            callEndedDiv: document.getElementById('callEnded'),
            callDurationDisplay: document.getElementById('callDuration'),
            timeBalanceDisplay: document.getElementById('timeBalance'),
            roleSelect: document.getElementById('roleSelect'),
            startCallButton: document.getElementById('startCallButton'),
            stopCallButton: document.getElementById('stopCallButton'),
            newCallButton: document.getElementById('newCallButton'),
        },

        init() {
            // Attach event listeners
            this.elements.startCallButton.addEventListener('click', () => this.startCall());
            this.elements.stopCallButton.addEventListener('click', () => this.stopCall());
            this.elements.newCallButton.addEventListener('click', () => this.newCall());
        },

        startCall() {
            // Switch UI to in-call view
            this.showElement(this.elements.inCallDiv);
            this.hideElement(this.elements.preCallDiv);
            

            this.beforeCallTimeBalance = this.timeBalance
            this.callStartTime = new Date();

            this.interval = setInterval(() => {
                this.updateCallValues()
                //this.updateCallDuration(callStartTime);
                //this.updateTimeBalance(beforeCallTimeBalance);
            }, 1000);
        },

        async updateCallValues(){
            const now = new Date();
            let callDuration = Math.floor((now - this.callStartTime) / 1000);
            this.elements.callDurationDisplay.textContent = this.writeTime(callDuration);

            const role = this.elements.roleSelect.value;
            if (role === 'teacher') {
                // Apply multiplier for teachers
                this.timeBalance = this.beforeCallTimeBalance + (callDuration * this.teacherMultiplier);
            } else {
                this.timeBalance = this.beforeCallTimeBalance - callDuration;
            }

            this.elements.timeBalanceDisplay.textContent = this.writeTime(Math.floor(this.timeBalance));

            // End call if learner exceeds time balance
            if (role === 'learner' && this.timeBalance < 0) {
                alert("Time balance depleted. Call ended.");
                this.stopCall();
                return;
            }

            // Store transaction in Firebase
            const user = auth.currentUser;
            if (user) {
                try {
                    await set(ref(database, `users/${user.uid}/timeBalance`), this.timeBalance);
                    
                    // Store transaction history
                    const transactionRef = ref(database, `users/${user.uid}/transactions/${Date.now()}`);
                    await set(transactionRef, {
                        role: role,
                        duration: callDuration,
                        timestamp: now.toISOString(),
                        balanceAfter: this.timeBalance
                    });
                } catch (error) {
                    console.error("Error updating time balance in Firebase:", error);
                }
            }
        },


        writeTime(seconds) {
            return `${this.pad(Math.floor(seconds / 3600))}:${this.pad(Math.floor((seconds % 3600) / 60))}:${this.pad(seconds % 60)}`;
        },
        
        

        stopCall() {
            clearInterval(this.interval);
            this.hideElement(this.elements.inCallDiv);
            this.showElement(this.elements.callEndedDiv)
        },

        newCall(){
            this.hideElement(this.elements.callEndedDiv);
            this.hideElement(this.elements.callDurationDisplay);
            this.showElement(this.elements.preCallDiv)
        },


        pad(number) {
            return number < 10 ? `0${number}` : number;
        },

        showElement(element) {
            element.style.display = 'block';
        },

        hideElement(element) {
            element.style.display = 'none';
        },

        // Fetch the time balance from Firebase on login
        async fetchTimeBalance(user) {
            const timeBalanceRef = ref(database, `users/${user.uid}/timeBalance`);
            try {
                const snapshot = await get(timeBalanceRef);
                if (snapshot.exists()) {
                    // Set the time balance in callManager
                    this.timeBalance = snapshot.val();
                    this.elements.timeBalanceDisplay.textContent = this.writeTime(this.timeBalance);
                    console.log("Time balance fetched from Firebase:", this.timeBalance);
                } else {
                    console.log("No time balance found for user, setting to 0.");
                    this.timeBalance = 0; // Default value if no time balance is found
                    this.elements.timeBalanceDisplay.textContent = this.writeTime(this.timeBalance);
                }
            } catch (error) {
                console.error("Error fetching time balance from Firebase:", error);
            }
        },
    };

    // Initialize call manager
    callManager.init();
    
    const googleLogin = document.getElementById("google-login-button");
    console.log("Login button found:", googleLogin);
    
    if (!googleLogin) {
        console.error("Google login button not found!");
        return;
    }

    googleLogin.addEventListener("click", function() {
        console.log("Login button clicked");
        signInWithPopup(auth, provider)
            .then((result) => {
                console.log("Login successful", result);
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const user = result.user;
                userDisplay.innerText = `Logged in as: ${user.email}`;
                signOutButton.style.display = "block";
            })
            .catch((error) => {
                console.error("Login error:", error);
                const errorCode = error.code;
                const errorMessage = error.message;
                alert(`Login failed: ${errorMessage}`);
            });
    });

    // Event listener for authentication state changes
    onAuthStateChanged(auth, async (user) => {
        const startCallButton = document.getElementById('startCallButton');
        startCallButton.disabled = false; // Always enable the button
        
        if (user) {
            console.log("User logged in:", user);
            userDisplay.innerText = `Logged in as: ${user.email}`;
            await callManager.fetchTimeBalance(user);
            await prefillForm(user);
        } else {
            console.log("No user logged in.");
            userDisplay.innerText = "Not logged in";
        }
    });
});

const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach((item) => {
    item.addEventListener('click', () => {
    const target = item.getAttribute('data-target');

    // Deactivate all pages and remove active class
    pages.forEach((page) => {
      page.classList.remove('active');
    });

    // Activate the targeted page
    document.querySelector(`.${target}`).classList.add('active');
  });
});

const form = document.getElementById('profileForm');

// Function to pre-fill the form with data from Firebase Realtime Database
const prefillForm = async (user) => {
    const userRef = ref(database, `users/${user.uid}/profile`);

    try {
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log("Fetched data:", data);

            // Populate form fields with retrieved data
            form.nativeLanguage.value = data.nativeLanguage || '';
            form.targetLanguage.value = data.targetLanguage || '';

            // Check the relevant checkboxes for topics
            if (data.topics && Array.isArray(data.topics)) {
                form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                    checkbox.checked = data.topics.includes(checkbox.value);
                });
            }
        } else {
            console.log("No data found for user.");
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

const signOutButton = document.getElementById("signOutButton");
const userDisplay = document.getElementById("userDisplay");

signOutButton.addEventListener("click", () => {
    signOut(auth).then(() => {
        userDisplay.innerText = "Not logged in";
        signOutButton.style.display = "none";
        callManager.timeBalance = 0;
        callManager.elements.timeBalanceDisplay.textContent = callManager.writeTime(0);
    }).catch((error) => {
        console.error("Sign out error:", error);
    });
});


