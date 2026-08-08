// Service Worker v2.0 - Production Ready
// Cache version: Update this when deploying new version
// Format: tasks-v{MAJOR}.{MINOR}.{PATCH}
// Example: tasks-v2.0.0 → tasks-v2.1.0 (on update)
const CACHE_NAME = 'tasks-v2.0.0';
const CACHE_VERSION = '2.0.0'; // Change this on every release
const STATIC_ASSETS = [
    './',
    './tamil-reminder-v2-production.html',
    './manifest.json'
];

// Install Event
self.addEventListener('install', event => {
    console.log('📦 Service Worker Installing...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('✅ Cache opened:', CACHE_NAME);
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.log('⚠️ Some assets failed to cache (acceptable for offline mode):', err.message);
                return Promise.resolve();
            });
        }).catch(err => {
            console.log('⚠️ Cache opening failed:', err.message);
        })
    );
});

// Activate Event
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch Event - Network First, then Cache
self.addEventListener('fetch', event => {
    // Skip cross-origin and non-GET requests
    if (event.request.method !== 'GET' || event.request.url.includes('api.anthropic.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone response for caching
                const clonedResponse = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clonedResponse);
                });
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Return offline page
                    return new Response(
                        '<html><body style="font-family:Arial; padding:20px; text-align:center;">' +
                        '<h2>📴 Offline Mode</h2>' +
                        '<p>You are offline. Cached data is available.</p>' +
                        '<p>Tasks and settings will sync when online.</p>' +
                        '</body></html>',
                        { 
                            headers: { 'Content-Type': 'text/html' },
                            status: 503
                        }
                    );
                });
            })
    );
});

// Background Sync for notifications (when app goes online)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-tasks') {
        console.log('🔄 Background Sync: Syncing tasks...');
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SYNC_TASKS',
                        timestamp: new Date().toISOString()
                    });
                });
                return Promise.resolve();
            })
        );
    }
});

// Message Handler from App
self.addEventListener('message', event => {
    console.log('📨 SW received message:', event.data.type);
    
    if (event.data.type === 'SEND_NOTIFICATION') {
        const { title, options } = event.data;
        self.registration.showNotification(title, {
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%238B5CF6" width="192" height="192" rx="45"/><text x="50%" y="50%" font-size="100" fill="white" text-anchor="middle" dominant-baseline="middle">📋</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="45" fill="%238B5CF6"/><text x="50%" y="50%" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle">📋</text></svg>',
            ...options
        }).catch(err => console.log('Notification error:', err));
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('✅ Cache cleared');
            event.ports[0].postMessage({ success: true });
        });
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('👆 Notification clicked:', event.notification.tag);
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(clientList => {
            // Focus existing window
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (self.clients.openWindow) {
                return self.clients.openWindow('./tamil-reminder-v2-production.html');
            }
        })
    );
});

// Periodic Background Sync for notifications (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'check-notifications') {
            console.log('⏰ Periodic sync: Checking notifications...');
            event.waitUntil(
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'CHECK_NOTIFICATIONS',
                            timestamp: new Date().toISOString()
                        });
                    });
                })
            );
        }
    });
}

console.log('✅ Service Worker loaded successfully');
