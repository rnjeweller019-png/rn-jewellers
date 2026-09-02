/**
 * RN JEWELLERS — PROGRESSIVE WEB APP (PWA) INSTALL & PUSH NOTIFICATION MANAGER
 */

// ─── SERVICE WORKER REGISTRATION ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=3.5.0')
      .then(reg => {
        console.log('PWA ServiceWorker registered', reg.scope);
        // Force check for Service Worker updates on launch (crucial for iPhone PWA)
        reg.update();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New PWA version installed');
              }
            });
          }
        });
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

// ─── ONESIGNAL PUSH NOTIFICATIONS ENGINE ─────────────────────────────────────
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
        // CRITICAL: Tell OneSignal exactly where our Service Worker lives
        // Our site is in a GitHub Pages subfolder /rn-jewellers/ not the root
        serviceWorkerPath: '/rn-jewellers/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/rn-jewellers/' },
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
      });

      // Helper function to check & log active subscriber ID to Google Sheets
      const tryLogCurrentSub = async () => {
        try {
          const isOptedIn = OneSignal.User && OneSignal.User.PushSubscription && OneSignal.User.PushSubscription.optedIn;
          const subId = OneSignal.User && OneSignal.User.PushSubscription && OneSignal.User.PushSubscription.id;
          if (isOptedIn && subId && !subId.startsWith('local-')) {
            if (localStorage.getItem('rnj_logged_sub_' + subId)) {
              return true; // Already logged — stop polling immediately
            }
            logSubscriberToServer(subId);
            return true;
          }
        } catch(e) {}
        return false;
      };

      // 1. Initial check after load
      setTimeout(tryLogCurrentSub, 3000);

      // 2. Listen for push subscription changes (when user clicks Subscribe)
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        OneSignal.User.PushSubscription.addEventListener('change', async function(event) {
          if (event.current && event.current.optedIn && event.current.id) {
            setTimeout(() => logSubscriberToServer(event.current.id), 2000);
            setTimeout(() => logSubscriberToServer(event.current.id), 6000);
          }
        });
      }

      // 3. Listen for browser permission approval
      if (OneSignal.Notifications) {
        OneSignal.Notifications.addEventListener('permissionChange', async function(permission) {
          if (permission) {
            setTimeout(tryLogCurrentSub, 2000);
            setTimeout(tryLogCurrentSub, 6000);
          }
        });
      }

      // 4. Background polling check (polls every 3s for up to 60s)
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

// ─── USER GESTURE PROMPT TRIGGER & PLATFORM HANDLING ───────────────────────
window.triggerPushPrompt = function() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // 1. SYNCHRONOUS WebKit Permission Request (Mandatory for iOS Safari & PWA)
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try {
      Notification.requestPermission().then(function(perm) {
        if (perm === 'granted' && typeof OneSignalDeferred !== 'undefined') {
          OneSignalDeferred.push(function(OneSignal) {
            try {
              if (OneSignal.User && OneSignal.User.PushSubscription) {
                OneSignal.User.PushSubscription.optIn();
              }
            } catch(e) {}
          });
        }
      }).catch(function() {});
    } catch(e) {}
  }

  // 2. OneSignal SDK Slidedown trigger
  if (typeof OneSignalDeferred !== 'undefined') {
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        if (OneSignal.Slidedown && typeof OneSignal.Slidedown.promptPush === 'function') {
          await OneSignal.Slidedown.promptPush({ force: true });
        } else if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
          await OneSignal.Notifications.requestPermission();
        }
      } catch(e) {}
    });
  }

  // 3. iOS Safari Banner guidance if opened in browser tab (not Home Screen PWA)
  if (isIOS && !window.navigator.standalone) {
    showIOSPWABanner();
  }
};

// Elegant iOS PWA Floating Push Bell Button (Guarantees Sync User Gesture on iPhone)
function initIOSFloatingBell() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (!isIOS) return;
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') return;
  if (document.getElementById('rnj-ios-floating-bell')) return;

  const bell = document.createElement('button');
  bell.id = 'rnj-ios-floating-bell';
  bell.innerHTML = '<i class="fas fa-bell"></i> <span>Enable Push Alerts</span>';
  bell.style.cssText = `
    position: fixed;
    bottom: 25px;
    right: 20px;
    z-index: 9999999;
    background: linear-gradient(135deg, #c9a84c, #e6ca65);
    color: #000;
    border: none;
    padding: 12px 20px;
    border-radius: 30px;
    font-weight: 700;
    font-size: 0.85rem;
    box-shadow: 0 8px 25px rgba(201, 168, 76, 0.6);
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
  document.addEventListener('DOMContentLoaded', () => setTimeout(initIOSFloatingBell, 1000));
} else {
  setTimeout(initIOSFloatingBell, 1000);
}

// Elegant iOS PWA Banner Guidance for iPhone Safari
function showIOSPWABanner() {
  if (document.getElementById('rnj-ios-pwa-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'rnj-ios-pwa-banner';
  banner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
      <div style="font-weight:700; font-size:0.92rem; color:#c9a84c;">📲 Enable Push Alerts on iPhone</div>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:#888; font-size:1.1rem; cursor:pointer;">&times;</button>
    </div>
    <div style="font-size:0.82rem; color:#ddd; line-height:1.5;">
      1. Tap the <strong>Share button</strong> <i class="fas fa-share-square" style="color:#3498db;"></i> (bottom bar)<br>
      2. Tap <strong>"Add to Home Screen"</strong> <i class="fas fa-plus-square" style="color:#2ecc71;"></i><br>
      3. Open RN Jewellers from Home Screen &amp; tap <strong>Enable Push Alerts</strong>!
    </div>
  `;
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    z-index: 999999;
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid rgba(201, 168, 76, 0.6);
    border-radius: 14px;
    padding: 14px 18px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
    font-family: inherit;
    backdrop-filter: blur(10px);
  `;
  document.body.appendChild(banner);
}

// ─── SUBSCRIBER CONFIRMATION TOAST ──────────────────────────────────────────
function showSubscriptionToast(message) {
  if (document.getElementById('rnj-sub-toast')) return;
  const toast = document.createElement('div');
  toast.id = 'rnj-sub-toast';
  toast.innerHTML = `<i class="fas fa-check-circle" style="color:#2ecc71; font-size:1.15rem;"></i> <span>${message}</span>`;
  toast.style.cssText = `
    position: fixed;
    top: 25px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999999;
    background: rgba(18, 18, 18, 0.95);
    color: #ffffff;
    border: 1px solid #c9a84c;
    padding: 12px 24px;
    border-radius: 30px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    font-size: 0.88rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    backdrop-filter: blur(10px);
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -20px)';
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// ─── SERVER LOGGING (SINGLE EXECUTION PER SUBSCRIBER) ────────────────────────
function logSubscriberToServer(subscriptionId) {
  if (typeof CONFIG === 'undefined' || !CONFIG.APPS_SCRIPT_URL || !subscriptionId) return;
  if (String(subscriptionId).startsWith('local-')) return;

  // STRICT SINGLE-TIME CHECK: Stop immediately if already logged from this browser
  const loggedKey = 'rnj_logged_sub_' + subscriptionId;
  if (localStorage.getItem(loggedKey)) {
    return; // Already logged once — zero extra requests or glitches!
  }

  // Mark as logged permanently in browser local storage
  localStorage.setItem(loggedKey, '1');

  const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
  const device = isMobile ? (navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android Mobile') : 'Desktop';
  const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata') : 'Asia/Kolkata';

  const payload = encodeURIComponent(JSON.stringify({
    subscription_id: subscriptionId,
    device: device,
    timezone: tz,
    browser: navigator.userAgent.substring(0, 200)
  }));

  const url = `${CONFIG.APPS_SCRIPT_URL}?action=logSubscriber&data=${payload}&_t=${Date.now()}`;

  // Fire Image beacon (CORS-free, instant execution)
  try {
    const img = new Image();
    img.src = url;
  } catch(e) {}

  // Trigger one-time golden confirmation toast to user
  showSubscriptionToast('✨ You are subscribed! You will receive exclusive offers & new arrivals first.');
}
