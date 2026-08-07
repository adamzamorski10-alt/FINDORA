const firebaseConfig = {
  apiKey: "AIzaSyDBS7Bdo_ytMnHdynywsN-o0RyA9ZFnxzI",
  authDomain: "finanse-8462b.firebaseapp.com",
  databaseURL: "https://finanse-8462b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "finanse-8462b",
  storageBucket: "finanse-8462b.firebasestorage.app",
  messagingSenderId: "58600482076",
  appId: "1:58600482076:web:3cb85a225e7829fe6746d9",
  measurementId: "G-66WSEQC5RE",
};

const firebaseApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

export { firebaseConfig, firebaseApp, db, auth };
