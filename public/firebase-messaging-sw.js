importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCZhn6jxoUR1zHXsYzTGgOpoqBwUFkB0pQ",
  authDomain: "gen-lang-client-0463998550.firebaseapp.com",
  projectId: "gen-lang-client-0463998550",
  storageBucket: "gen-lang-client-0463998550.firebasestorage.app",
  messagingSenderId: "138673940716",
  appId: "1:138673940716:web:626554c369bf44eee45dc9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data
  });
});
