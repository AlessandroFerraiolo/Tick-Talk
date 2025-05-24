import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signOut, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA5hMf9pYkDIQtZvuyR-BhKwPA_i5nE0C4",
    authDomain: "tick-talk-373da.firebaseapp.com",
    projectId: "tick-talk-373da",
    storageBucket: "tick-talk-373da.firebasestorage.app",
    messagingSenderId: "351794687800",
    appId: "1:351794687800:web:162c371d694b75c0721bcd"
};


// AUTHENTICATION
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
auth.languageCode = "it";
const provider = new GoogleAuthProvider();


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
                    // await set(ref(database, `users/${user.uid}/timeBalance`), this.timeBalance);
                    await setDoc(doc(db, "users", user.uid), { timeBalance: this.timeBalance }, { merge: true });
                    
                    // Store transaction history
                    // const transactionRef = ref(database, `users/${user.uid}/transactions/${Date.now()}`);
                    // await set(transactionRef, {
                    await addDoc(collection(db, "users", user.uid, "transactions"), {
                        role: role,
                        duration: callDuration,
                        timestamp: serverTimestamp(), // Use serverTimestamp for consistency
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
            // const timeBalanceRef = ref(database, `users/${user.uid}/timeBalance`);
            const userDocRef = doc(db, "users", user.uid);
            try {
                // const snapshot = await get(timeBalanceRef);
                const docSnap = await getDoc(userDocRef);
                // if (snapshot.exists()) {
                if (docSnap.exists()) {
                    // Set the time balance in callManager
                    // this.timeBalance = snapshot.val();
                    this.timeBalance = docSnap.data().timeBalance;
                    this.elements.timeBalanceDisplay.textContent = this.writeTime(this.timeBalance);
                    console.log("Time balance fetched from Firebase:", this.timeBalance);
                } else {
                    console.log("No time balance found for user, setting to 0.");
                    this.timeBalance = 0; // Default value if no time balance is found
                     // Initialize timeBalance in Firestore if it doesn't exist
                    await setDoc(userDocRef, { timeBalance: 0 }, { merge: true });
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
    const userDocRef = doc(db, "users", user.uid);

    try {
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists() && docSnap.data().profile) {
            const data = docSnap.data().profile;
            console.log("Fetched profile data:", data);

            // Populate form fields with retrieved data
            form.nativeLanguage.value = data.nativeLanguage || '';
            form.targetLanguage.value = data.targetLanguage || '';

            // Check the relevant checkboxes for topics
            if (data.topics && Array.isArray(data.topics)) {
                form.querySelectorAll('input[name="topics"]').forEach((checkbox) => {
                    checkbox.checked = data.topics.includes(checkbox.value);
                });
            }
        } else {
            console.log("No profile data found for user, initializing.");
            // Initialize profile and ensure timeBalance is also initialized if not present
            const initialData = { 
                profile: { nativeLanguage: '', targetLanguage: '', topics: [] }
            };
            if (!docSnap.exists() || (docSnap.exists() && docSnap.data().timeBalance === undefined)) {
                initialData.timeBalance = 0;
            }
            await setDoc(userDocRef, initialData, { merge: true });
            // Clear form fields if initializing
            form.nativeLanguage.value = '';
            form.targetLanguage.value = '';
            form.querySelectorAll('input[name="topics"]').forEach((checkbox) => {
                checkbox.checked = false;
            });
        }
    } catch (error) {
        console.error("Error fetching or initializing profile data:", error);
    }
};

// Function to save profile data to Firestore
const saveProfileData = async (user) => {
    const userDocRef = doc(db, "users", user.uid);
    const nativeLanguageValue = form.nativeLanguage.value;
    const targetLanguageValue = form.targetLanguage.value;
    const selectedTopics = [];
    form.querySelectorAll('input[name="topics"]:checked').forEach((checkbox) => {
        selectedTopics.push(checkbox.value);
    });

    const profileData = {
        nativeLanguage: nativeLanguageValue,
        targetLanguage: targetLanguageValue,
        topics: selectedTopics,
    };

    try {
        await setDoc(userDocRef, { profile: profileData }, { merge: true });
        console.log("Profile data saved:", profileData);
    } catch (error) {
        console.error("Error saving profile data:", error);
    }
};

// Attach event listeners for profile saving
document.addEventListener('DOMContentLoaded', () => {
    // Ensure this runs after the main DOMContentLoaded where 'form' is defined.
    // If 'form' is defined in the same DOMContentLoaded, this is fine.
    // Otherwise, ensure 'form' is accessible here.
    if (form) { // Check if form is already defined
        const elementsToListen = [
            form.nativeLanguage,
            form.targetLanguage,
            ...form.querySelectorAll('input[name="topics"]'),
        ];

        elementsToListen.forEach((element) => {
            if (element) { // Check if element exists
                element.addEventListener('change', () => {
                    const user = auth.currentUser;
                    if (user) {
                        saveProfileData(user);
                    }
                });
            }
        });
    } else {
        console.error("Form not found for attaching profile save listeners.");
    }
});


const signOutButton = document.getElementById("signOutButton");
const userDisplay = document.getElementById("userDisplay");

signOutButton.addEventListener("click", () => {
    signOut(auth).then(() => {
        userDisplay.innerText = "Not logged in";
        signOutButton.style.display = "none";
        callManager.timeBalance = 0;
        callManager.elements.timeBalanceDisplay.textContent = callManager.writeTime(0);
        // Optionally, clear form fields on sign out
        if (form) {
            form.reset(); // Resets all form fields to their initial values
            form.querySelectorAll('input[name="topics"]').forEach(checkbox => checkbox.checked = false); // Ensure checkboxes are cleared
        }
    }).catch((error) => {
        console.error("Sign out error:", error);
    });
});


