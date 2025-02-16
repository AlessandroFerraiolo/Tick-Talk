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

const callManager = {
    callStartTime: null,
    beforeCallTimeBalance:0,
    timeBalance: 0,

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
            this.timeBalance = this.beforeCallTimeBalance + callDuration;
        } else {
            this.timeBalance = this.beforeCallTimeBalance - callDuration;
        }
        console.log(document.querySelectorAll("#timeBalance").length); // Should output 1

        this.elements.timeBalanceDisplay.textContent = this.writeTime(this.timeBalance);

        // End call if learner exceeds time balance
        if (this.elements.roleSelect.value === 'learner' && this.timeBalance<0) {
            this.stopCall();
            return;
        }

        // Update time balance in Firebase (if user is logged in)
        const user = auth.currentUser;
        if (user) {
            try {
                await set(ref(database, `users/${user.uid}/timeBalance`), this.timeBalance);
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


// import firebase from "firebase/compat/app";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signOut, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyD_8XOF7AjD2HILY57ZGG52JzI6J1lVKS0",
  authDomain: "tick-talk-5b816.firebaseapp.com",
  projectId: "tick-talk-5b816",
  storageBucket: "tick-talk-5b816.firebasestorage.app",
  messagingSenderId: "659050213776",
  appId: "1:659050213776:web:a788adefa211b7b4f98315",
  measurementId: "G-03DZGPVMKW",
  databaseURL: "https://tick-talk-5b816-default-rtdb.europe-west1.firebasedatabase.app/"
};


// AUTENTICATION
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp)
auth.languageCode = "it"
const provider = new GoogleAuthProvider()



const googleLogin = document.getElementById("google-login-button");
googleLogin.addEventListener("click", function() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const user = result.user;
            userDisplay.innerText = `Logged in as: ${user.email}`;
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error(errorCode, errorMessage);
        });
});

// DATABASE
const database = getDatabase(firebaseApp)
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

// Event listener for authentication state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User logged in:", user);
        await callManager.fetchTimeBalance(user);  // Fetch time balance on login

        await prefillForm(user); // Pre-fill the form with saved data
    } else {
        console.log("No user logged in.");
    }
});

// Event listener for form submission
form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent form from reloading the page

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const formData = {
                nativeLanguage: form.nativeLanguage.value,
                targetLanguage: form.targetLanguage.value,
                topics: Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map(
                    (checkbox) => checkbox.value
                ),
                userId: user.uid, // Associate data with the user's ID
                email: user.email, // Optional
            };

            try {
                // Save data to Realtime Database
                await set(ref(database, `users/${user.uid}/profile`), formData);
                alert("Profile updated successfully!");
                console.log("Data saved:", formData);
            } catch (error) {
                console.error("Error saving data:", error);
                alert("Failed to update profile.");
            }
        } else {
            alert("Please log in to save your profile.");
        }
    });
});


