/**
 * RN JEWELLERS — PROGRESSIVE WEB APP (PWA) INSTALL & CACHE MANAGER
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('PWA ServiceWorker registered', reg.scope))
      .catch(err => console.log('ServiceWorker registration failed', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = document.getElementById('pwa-install-btn');
  if (pwaBtn) {
    pwaBtn.style.display = 'inline-flex';
    pwaBtn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted PWA prompt');
        }
        deferredPrompt = null;
        pwaBtn.style.display = 'none';
      });
    });
  }
});

// ONESIGNAL WEB PUSH NOTIFICATIONS SDK INITIALIZATION
const onesignalAppId = (typeof CONFIG !== 'undefined' && CONFIG.ONESIGNAL_APP_ID && CONFIG.ONESIGNAL_APP_ID.trim()) ? CONFIG.ONESIGNAL_APP_ID.trim() : "91a28970-9e1b-4343-a379-de2a1923e7a7";

if (onesignalAppId) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.init({
        appId: onesignalAppId,
        safari_web_id: "web.onesignal.auto.2c31ff0c-1624-4aec-8f89-a4f0b1da0ea1",
        notifyButton: {
          enable: true,
          size: 'medium',
          position: 'bottom-left'
        },
      });

      // Explicitly prompt for Push Notification Permission
      if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
        OneSignal.Notifications.requestPermission();
      } else if (OneSignal.Slidedown && typeof OneSignal.Slidedown.promptPush === 'function') {
        OneSignal.Slidedown.promptPush();
      }
    } catch(err) {
      console.log('OneSignal init notice:', err);
    }
  });
}
