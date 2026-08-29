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
            'tip.state.subscribed': '✅ You are subscribed',
            'tip.state.blocked': 'Push notifications blocked',
          }
        },
        welcomeNotification: {
          title: '✨ RN Jewellers',
          message: 'Thanks for subscribing! You will get exclusive offers & new arrivals first.'
        }
        // NOTE: No promptOptions/autoPrompt here — notifyButton handles everything
      });

      // Log subscriber after init — delay to let OneSignal finish registration
      const tryLogCurrentSub = async () => {
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

      // 1. Fire immediately (for returning already-subscribed visitors)
      setTimeout(tryLogCurrentSub, 3000);

      // 2. Listen for subscription changes (fires when user clicks Subscribe)
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        OneSignal.User.PushSubscription.addEventListener('change', async function(event) {
          if (event.current && event.current.optedIn && event.current.id) {
            // Wait 3s for Apple/Google to fully confirm subscription
            setTimeout(() => logSubscriberToServer(event.current.id), 3000);
            setTimeout(() => logSubscriberToServer(event.current.id), 7000);
          }
        });
      }

      // 3. Listen for permission approval (iOS PWA)
      if (OneSignal.Notifications) {
        OneSignal.Notifications.addEventListener('permissionChange', async function(permission) {
          if (permission) {
            setTimeout(tryLogCurrentSub, 3000);
            setTimeout(tryLogCurrentSub, 8000);
          }
        });
      }

      // 4. Polling fallback every 3s for up to 60s
      let attempts = 0;
      const checkSubInterval = setInterval(async () => {
        attempts++;
        const logged = await tryLogCurrentSub();
        if (logged || attempts > 20) clearInterval(checkSubInterval);
      }, 3000);

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
    browser: navigator.userAgent.substring(0, 200) // trim to avoid URL length limits
  }));

  const url = `${CONFIG.APPS_SCRIPT_URL}?action=logSubscriber&data=${payload}&_t=${Date.now()}`;

  // Strategy 1: Image beacon (no CORS, works everywhere)
  try {
    const img = new Image();
    img.src = url;
  } catch(e) {}

  // Strategy 2: fetch as backup (in case Image beacon fails silently)
  try {
    fetch(url, { mode: 'no-cors' }).catch(() => {});
  } catch(e) {}
}
