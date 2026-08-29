/**
 * RN JEWELLERS — PROGRESSIVE WEB APP (PWA) INSTALL & PUSH NOTIFICATION MANAGER
 */

// ─── SERVICE WORKER REGISTRATION ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('PWA ServiceWorker registered', reg.scope);
      })
      .catch(err => console.log('ServiceWorker registration failed', err));
  });
}

// ─── PWA INSTALL PROMPT ─────────────────────────────────────────────────────
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
          console.log('User accepted PWA install');
        }
        deferredPrompt = null;
        pwaBtn.style.display = 'none';
      });
    });
  }
});

// ─── ONESIGNAL PUSH NOTIFICATIONS ───────────────────────────────────────────
const onesignalAppId = (typeof CONFIG !== 'undefined' && CONFIG.ONESIGNAL_APP_ID && CONFIG.ONESIGNAL_APP_ID.trim())
  ? CONFIG.ONESIGNAL_APP_ID.trim()
  : '91a28970-9e1b-4343-a379-de2a1923e7a7';

if (onesignalAppId) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.init({
        appId: onesignalAppId,
        safari_web_id: 'web.onesignal.auto.2c31ff0c-1624-4aec-8f89-a4f0b1da0ea1',
        notifyButton: {
          enable: true,
          size: 'medium',
          position: 'bottom-left',
          text: {
            'tip.state.unsubscribed': 'Subscribe for exclusive offers!',
            'tip.state.subscribed': 'You are subscribed',
            'tip.state.blocked': 'Push notifications blocked',
          }
        },
        welcomeNotification: {
          title: '✨ RN Jewellers',
          message: 'Thanks for subscribing! You will get exclusive offers & new arrivals first.'
        },
        promptOptions: {
          slidedown: {
            prompts: [{
              type: 'push',
              autoPrompt: false, // We prompt manually after delay — not on every visit
              text: {
                actionMessage: 'Get notified about new arrivals & exclusive jewellery offers!',
                acceptButton: 'Allow',
                cancelButton: 'Later'
              }
            }]
          }
        }
      });

      // Auto-log subscriber to Google Sheets Subscribers tab
      try {
        OneSignal.User.PushSubscription.addEventListener('change', function(event) {
          if (event.current && event.current.optedIn && event.current.id) {
            logSubscriberToServer(event.current.id);
          }
        });

        // Poll until OneSignal finishes loading subscription ID
        let attempts = 0;
        const checkSubInterval = setInterval(async () => {
          attempts++;
          try {
            const isOptedIn = await OneSignal.User.PushSubscription.optedIn;
            const subId = OneSignal.User.PushSubscription.id;
            if (isOptedIn && subId) {
              logSubscriberToServer(subId);
              clearInterval(checkSubInterval);
            }
          } catch(e) {}
          if (attempts > 10) clearInterval(checkSubInterval);
        }, 1000);
      } catch(e) {}

      // Auto-prompt logic — prompts if permission is not yet granted
      setTimeout(async () => {
        try {
          const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
          const currentPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
          if (!isSubscribed && currentPerm !== 'granted') {
            if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
              await OneSignal.Notifications.requestPermission();
            } else if (OneSignal.Slidedown && typeof OneSignal.Slidedown.promptPush === 'function') {
              await OneSignal.Slidedown.promptPush();
            }
          }
        } catch(e) { /* ignore */ }
      }, 3000);

    } catch(err) {
      console.log('OneSignal init notice:', err);
    }
  });
}

// Global helper to manually trigger push prompt on button/icon click
window.triggerPushPrompt = function() {
  if (typeof OneSignalDeferred !== 'undefined') {
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
          await OneSignal.Notifications.requestPermission();
        } else if (OneSignal.Slidedown && typeof OneSignal.Slidedown.promptPush === 'function') {
          await OneSignal.Slidedown.promptPush();
        }
      } catch(e) {
        if (typeof Notification !== 'undefined') Notification.requestPermission();
      }
    });
  } else if (typeof Notification !== 'undefined') {
    Notification.requestPermission();
  }
};

function logSubscriberToServer(subscriptionId) {
  if (typeof CONFIG === 'undefined' || !CONFIG.APPS_SCRIPT_URL || !subscriptionId) return;
  const loggedKey = 'rnj_sub_logged_' + subscriptionId;
  if (localStorage.getItem(loggedKey)) return;

  const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
  const device = isMobile ? 'Mobile' : 'Desktop';
  const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata') : 'Asia/Kolkata';

  const params = new URLSearchParams({
    action: 'logSubscriber',
    'data[subscription_id]': subscriptionId,
    'data[device]': device,
    'data[timezone]': tz,
    'data[browser]': navigator.userAgent
  });

  fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`)
    .then(() => localStorage.setItem(loggedKey, '1'))
    .catch(() => {});
}
