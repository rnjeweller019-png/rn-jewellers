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
              autoPrompt: true, // Enabled for native mobile Chrome & Safari auto-prompt
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
        const tryLogCurrentSub = () => {
          try {
            const isOptedIn = OneSignal.User && OneSignal.User.PushSubscription && OneSignal.User.PushSubscription.optedIn;
            const subId = OneSignal.User && OneSignal.User.PushSubscription && OneSignal.User.PushSubscription.id;
            if (isOptedIn && subId) {
              logSubscriberToServer(subId);
              return true;
            }
          } catch(e) {}
          return false;
        };

        // 1. Listen for subscription changes
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          OneSignal.User.PushSubscription.addEventListener('change', function(event) {
            if (event.current && event.current.optedIn && event.current.id) {
              logSubscriberToServer(event.current.id);
            }
          });
        }

        // 2. Listen for permission prompt approval
        if (OneSignal.Notifications) {
          OneSignal.Notifications.addEventListener('permissionChange', function(permission) {
            if (permission) {
              setTimeout(tryLogCurrentSub, 2000);
              setTimeout(tryLogCurrentSub, 5000);
            }
          });
        }

        // 3. Extended polling check (polls every 2 seconds for up to 60 seconds)
        let attempts = 0;
        const checkSubInterval = setInterval(() => {
          attempts++;
          const logged = tryLogCurrentSub();
          if (logged || attempts > 30) {
            clearInterval(checkSubInterval);
          }
        }, 2000);
      } catch(e) {}

    } catch(err) {
      console.log('OneSignal init notice:', err);
    }
  });
}

// Global helper to manually trigger push prompt on button/icon click
window.triggerPushPrompt = function() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (typeof OneSignalDeferred !== 'undefined') {
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        if (OneSignal.Slidedown && typeof OneSignal.Slidedown.promptPush === 'function') {
          await OneSignal.Slidedown.promptPush({ force: true });
        } else if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
          await OneSignal.Notifications.requestPermission();
        }
      } catch(e) {
        if (typeof Notification !== 'undefined') {
          Notification.requestPermission();
        }
      }
    });
  } else if (typeof Notification !== 'undefined') {
    Notification.requestPermission();
  }

  // iOS Safari PWA guidance if native push is restricted by Apple
  if (isIOS && !window.navigator.standalone) {
    setTimeout(() => {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        alert("📲 To enable Push Alerts on iPhone Safari:\n\n1. Tap the Share button 📤 (bottom bar)\n2. Tap 'Add to Home Screen' ➕\n3. Open RN Jewellers from your Home Screen & tap Allow!");
      }
    }, 1500);
  }
};

// Floating Push Bell Button — Required for iPhone Safari User-Gesture Compliance
function initPushBellWidget() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') return;
  if (document.getElementById('rnj-floating-push-bell')) return;

  const bell = document.createElement('button');
  bell.id = 'rnj-floating-push-bell';
  bell.innerHTML = '<i class="fas fa-bell"></i> <span>Enable Push Alerts</span>';
  bell.style.cssText = `
    position: fixed;
    bottom: 25px;
    right: 20px;
    z-index: 999999;
    background: linear-gradient(135deg, #c9a84c, #e6ca65);
    color: #000;
    border: none;
    padding: 12px 18px;
    border-radius: 30px;
    font-weight: 700;
    font-size: 0.85rem;
    box-shadow: 0 8px 25px rgba(201, 168, 76, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
  `;

  bell.onclick = function() {
    window.triggerPushPrompt();
    bell.style.display = 'none';
  };

  if (document.body) {
    document.body.appendChild(bell);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initPushBellWidget, 1500));
} else {
  setTimeout(initPushBellWidget, 1500);
}

function logSubscriberToServer(subscriptionId) {
  if (typeof CONFIG === 'undefined' || !CONFIG.APPS_SCRIPT_URL || !subscriptionId) return;

  const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
  const device = isMobile ? (navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android Mobile') : 'Desktop';
  const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata') : 'Asia/Kolkata';

  const payload = encodeURIComponent(JSON.stringify({
    subscription_id: subscriptionId,
    device: device,
    timezone: tz,
    browser: navigator.userAgent
  }));

  // Bulletproof CORS-free image beacon to send subscriber data to Google Apps Script
  const img = new Image();
  img.src = `${CONFIG.APPS_SCRIPT_URL}?action=logSubscriber&data=${payload}&_t=${Date.now()}`;
}
