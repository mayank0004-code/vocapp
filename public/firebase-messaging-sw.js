importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDer-MEsan-0RSbuDZ9khrggH1Et2rvzgs",
  authDomain: "vocapp-d94e1.firebaseapp.com",
  projectId: "vocapp-d94e1",
  storageBucket: "vocapp-d94e1.firebasestorage.app",
  messagingSenderId: "118168122989",
  appId: "1:118168122989:web:718c55640c9b715806f164"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Vocapp';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body,
    icon: '/icon-192.jpg',
    badge: '/icon-192.jpg',
    data: payload.data, // Contains URL to open when clicked
    actions: []
  };
  
  // If we sent quick actions (like "Start Quiz" or a micro-learning choice)
  if (payload.data?.action1) {
    notificationOptions.actions.push({ action: 'action1', title: payload.data.action1 });
  }
  if (payload.data?.action2) {
    notificationOptions.actions.push({ action: 'action2', title: payload.data.action2 });
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ', event.notification.tag);
  event.notification.close();

  // Log notification click via a fetch request to a future API endpoint if needed,
  // For now, we handle it on the client side when the app opens.
  
  // If a specific URL was passed in the data payload, open it
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
