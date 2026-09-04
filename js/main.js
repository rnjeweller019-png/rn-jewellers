/**
 * RN JEWELLERS — CORE CLIENT SCRIPT
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme immediately (before server sync) to avoid flash
  API.applyTheme();

  initIntroAnimation();
  initLiveRateTicker();
  initNavbar();
  initWishlistBadge();
  initHeroSection();
  initParticleCanvas();
  initPromoBanner();
  logVisitorAnalytics();

  if (CONFIG.APPS_SCRIPT_URL) {
    const loadingBar = document.getElementById('sync-loading-bar');
    if (loadingBar) loadingBar.classList.add('visible');

    await API.checkAndSyncServer();

    if (loadingBar) loadingBar.classList.remove('visible');
    API.applyTheme();
    initLiveRateTicker();
    initHeroSection();
    initParticleCanvas();
    initPromoBanner();
    refreshPageContentsSilently();

    // Fast 5-second live background polling for real-time rates, banners & hero updates
    setInterval(async () => {
      const updated = await API.checkAndSyncServer();
      if (updated) {
        API.applyTheme();
        initLiveRateTicker();
        initHeroSection();
        initParticleCanvas();
        initPromoBanner();
        refreshPageContentsSilently();
      }
    }, 5000);

    // Instant update check when switching back to the app/tab on iPhone or Android PWA
    const checkiPhoneResume = async () => {
      const updated = await API.checkAndSyncServer();
      if (updated) {
        API.applyTheme();
        initLiveRateTicker();
        initHeroSection();
        initParticleCanvas();
        initPromoBanner();
        refreshPageContentsSilently();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkiPhoneResume();
    });
    window.addEventListener('pageshow', checkiPhoneResume);
  }
});

// Helper: Get Featured Products (prioritizes is_featured: true, fallback to top products)
function getFeaturedProducts() {
  const allProducts = API.getProducts();
  if (!allProducts || allProducts.length === 0) {
    return [];
  }
  const featured = allProducts.filter(p => p.is_featured === true || String(p.is_featured).toLowerCase() === 'true');
  if (featured.length > 0) {
    return featured;
  }
  return allProducts;
}

function refreshPageContentsSilently() {
  const featuredGrid = document.getElementById('featured-products-grid');
  if (featuredGrid && typeof renderProductCard === 'function') {
    const products = getFeaturedProducts();
    const newHtml = (products.length === 0)
      ? '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">No products available in catalog.</div>'
      : products.map(renderProductCard).join('');
    
    // Only touch DOM if HTML actually changed!
    if (featuredGrid.dataset.lastRender !== newHtml) {
      featuredGrid.dataset.lastRender = newHtml;
      featuredGrid.innerHTML = newHtml;
    }
  }

  if (typeof window.refreshCollectionsGrid === 'function') {
    window.refreshCollectionsGrid();
  }

  if (typeof window.refreshProductDetailPage === 'function') {
    window.refreshProductDetailPage();
  }
}

// Live Rate Ticker Renderer (supports admin visibility toggles)
function initLiveRateTicker() {
  const rates = API.getRates();
  const gold22El = document.getElementById('ticker-gold-22k');
  const gold24El = document.getElementById('ticker-gold-24k');
  const silverEl = document.getElementById('ticker-silver');

  const show22 = rates.show_gold_22k !== false && rates.show_gold_22k !== '0' && rates.show_gold_22k !== 0;
  const show24 = rates.show_gold_24k !== false && rates.show_gold_24k !== '0' && rates.show_gold_24k !== 0;
  const showSil = rates.show_silver !== false && rates.show_silver !== '0' && rates.show_silver !== 0;

  if (gold22El) {
    gold22El.textContent = `₹${rates.gold_22k.toLocaleString('en-IN')}/g`;
    const parent = gold22El.closest('.ticker-item');
    if (parent) parent.style.display = show22 ? 'inline-flex' : 'none';
  }
  if (gold24El) {
    gold24El.textContent = `₹${rates.gold_24k.toLocaleString('en-IN')}/g`;
    const parent = gold24El.closest('.ticker-item');
    if (parent) parent.style.display = show24 ? 'inline-flex' : 'none';
  }
  if (silverEl) {
    silverEl.textContent = `₹${rates.silver.toLocaleString('en-IN')}/g`;
    const parent = silverEl.closest('.ticker-item');
    if (parent) parent.style.display = showSil ? 'inline-flex' : 'none';
  }

  // Hide the entire rate bar if all 3 are turned off by admin
  const rateBar = document.querySelector('.rate-ticker-bar');
  if (rateBar) {
    rateBar.style.display = (!show22 && !show24 && !showSil) ? 'none' : 'block';
  }
}

// Navbar & Sticky Behavior
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
  }
}

// Wishlist Badge Counter Update
function initWishlistBadge() {
  const wishlist = API.getWishlist();
  const badge = document.getElementById('wishlist-count-badge');
  if (badge) {
    badge.textContent = wishlist.length;
    badge.style.display = wishlist.length > 0 ? 'flex' : 'none';
  }
}

// Promo Banner Close Handler
function initPromoBanner() {
  const promo = document.getElementById('promo-banner');
  if (!promo) return;

  const settings = API.getSiteSettings();
  const show = settings.show_promo_banner !== false && settings.show_promo_banner !== '0';

  if (!show) {
    promo.style.display = 'none';
    return;
  }

  const promoTextSpan = promo.querySelector('span');
  if (promoTextSpan && settings.promo_banner_text) {
    promoTextSpan.innerHTML = settings.promo_banner_text;
  }

  promo.style.display = 'flex';

  const closeBtn = document.getElementById('promo-close-btn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      promo.style.display = 'none';
    };
  }
}

// Custom Hero Background Image Renderer (100% iOS Safari & Mobile Compatible)
function initHeroSection() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  const settings = API.getSiteSettings();
  const bgUrl = settings.hero_bg_url;
  if (!bgUrl || String(bgUrl).trim() === '' || bgUrl === 'undefined' || bgUrl === 'null') {
    hero.style.backgroundImage = 'none';
    return;
  }

  // Preload image to ensure instant smooth rendering
  const img = new Image();
  const applyBg = (url) => {
    hero.style.backgroundImage = `linear-gradient(to right, rgba(8,8,8,0.7), rgba(8,8,8,0.3)), url('${url}')`;
    hero.style.backgroundPosition = 'center center';
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundRepeat = 'no-repeat';
  };

  img.onload = () => applyBg(bgUrl);
  img.src = bgUrl;
  applyBg(bgUrl);
}

// Gold Sparkle Particle Canvas Background Effect
function initParticleCanvas() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const settings = API.getSiteSettings();
  const enable = settings.enable_particles !== false && settings.enable_particles !== '0';

  if (!enable) {
    canvas.style.display = 'none';
    return;
  }

  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = canvas.parentElement.offsetWidth);
  let height = (canvas.height = canvas.parentElement.offsetHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  });

  const particles = [];
  const particleCount = 45;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      color: `rgba(245, 215, 127, ${Math.random() * 0.5 + 0.2})`,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      pulse: Math.random() * 0.05
    });
  }

  function render() {
    if (canvas.style.display === 'none') return;
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#c9a84c';
      ctx.fill();
    });

    requestAnimationFrame(render);
  }

  render();
}

// Utility: Build HTML for Product Cards
function renderProductCard(product) {
  const isWishlisted = API.getWishlist().includes(product.id);
  const calc = product.calculated;
  const mainImg = (product.image_urls && product.image_urls[0]) ? product.image_urls[0] : 'assets/logo.png';

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-image-wrap">
        <div class="product-img-skeleton"></div>
        <img src="${mainImg}" alt="${product.name}" class="product-img img-blur-up" loading="lazy"
          onload="this.classList.add('img-loaded'); this.previousElementSibling.style.display='none';"
          onerror="this.onerror=null; this.src='assets/logo.png'; this.classList.add('img-loaded'); this.previousElementSibling.style.display='none';">
        <div class="product-badges">
          ${product.is_featured ? '<span class="badge badge-featured">Featured</span>' : ''}
          ${product.is_new_arrival ? '<span class="badge badge-new">New</span>' : ''}
          ${calc.is_free_making ? '<span class="badge" style="background:#2ecc71; color:#0a0a0a; font-weight:700;">0% Making</span>' : ''}
          ${calc.discount_percent > 0 ? `<span class="badge badge-discount">${calc.discount_percent}% OFF</span>` : ''}
        </div>
        <button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.preventDefault(); toggleWishlistClick('${product.id}', this)">
          <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
      <div class="product-content">
        <div class="product-category">${escapeHtml(product.category)} • ${escapeHtml(calc.purity_text)}</div>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-meta">
          <span><i class="fas fa-weight-hanging"></i> ${product.weight_g}g</span>
          <span><i class="fas fa-certificate"></i> ${escapeHtml(product.certification || 'Certified Hallmark Purity')}</span>
        </div>
        <div class="product-price-box">
          <span class="price-current">₹${calc.final_price.toLocaleString('en-IN')}</span>
          ${calc.discount_amount > 0 ? `<span class="price-original">₹${calc.gross_price.toLocaleString('en-IN')}</span>` : ''}
        </div>
        <div class="product-actions">
          <a href="product.html?id=${product.id}" class="btn btn-secondary btn-sm" style="font-size:0.8rem; padding:8px 12px;">Details</a>
          <a href="https://wa.me/${CONFIG.SHOP.whatsapp}?text=${encodeURIComponent(`Hello RN Jewellers, I am interested in ${product.name} (${product.id}) priced at ₹${calc.final_price.toLocaleString('en-IN')}`)}" target="_blank" class="btn btn-whatsapp btn-sm" style="font-size:0.8rem; padding:8px 12px;"><i class="fab fa-whatsapp"></i> Enquire</a>
        </div>
      </div>
    </div>
  `;
}

function toggleWishlistClick(id, btn) {
  API.toggleWishlist(id);
  const icon = btn.querySelector('i');
  if (icon) {
    icon.classList.toggle('fas');
    icon.classList.toggle('far');
  }
  btn.classList.toggle('active');
  initWishlistBadge();
}

// Smart Visitor Analytics (10s Dwell Time + 5min Session Cooldown + Rich Regional Insights)
function logVisitorAnalytics() {
  if (!CONFIG.APPS_SCRIPT_URL) return;

  const FIVE_MIN_MS = 5 * 60 * 1000;
  const now = Date.now();
  const lastLog = parseInt(localStorage.getItem('rnj_last_visit_logged_time') || '0', 10);

  // If user was logged less than 5 minutes ago, skip logging (active session)
  if (now - lastLog < FIVE_MIN_MS) {
    return;
  }

  // 10-Second Dwell Timer: Only count if user stays on site for at least 10s
  setTimeout(() => {
    const currentNow = Date.now();
    const currentLastLog = parseInt(localStorage.getItem('rnj_last_visit_logged_time') || '0', 10);

    if (currentNow - currentLastLog >= FIVE_MIN_MS) {
      localStorage.setItem('rnj_last_visit_logged_time', currentNow.toString());

      const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
      const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
      const deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');

      let userTimezone = 'Asia/Kolkata';
      try {
        userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      } catch (e) { }

      const userLang = navigator.language || 'en-US';
      const screenSize = `${window.screen.width}x${window.screen.height}`;

      const payload = encodeURIComponent(JSON.stringify({
        page: window.location.pathname || 'index.html',
        device: deviceType,
        referrer: document.referrer || 'Direct',
        timezone: userTimezone,
        language: userLang,
        screen: screenSize
      }));
      fetch(`${CONFIG.APPS_SCRIPT_URL}?action=logVisit&data=${payload}`).catch(() => { });
    }
  }, 10000);
}

/**
 * ══════════════════════════════════════════════════════════
 * LUXURY INTRO ANIMATION (Doors Split & Logo Rise)
 * ══════════════════════════════════════════════════════════
 */
function initIntroAnimation() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  // Detect whether this is an explicit page reload
  let isReload = false;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      isReload = navEntries[0].type === 'reload';
    } else if (window.performance && window.performance.navigation) {
      isReload = window.performance.navigation.type === 1;
    }
  } catch (e) { }

  const hasSeenIntro = sessionStorage.getItem('rnj_intro_shown');

  // If already seen in this session and NOT an explicit reload, bypass doors instantly
  if (hasSeenIntro && !isReload) {
    overlay.style.display = 'none';
    overlay.classList.add('done');
    return;
  }

  // Mark session so internal navigation (Collections -> Home, etc.) skips the doors
  sessionStorage.setItem('rnj_intro_shown', 'true');

  const introLogo = document.getElementById('intro-logo');
  const totalMs = 1600;
  const holdMs = Math.round(totalMs * 0.35);  // Hold on closed seam (~560ms)
  const doorMs = Math.round(totalMs * 0.65);  // Doors split & logo rise (~1040ms)
  const doorTopTarget = '-160%';
  const doorBottomTarget = '120%';
  const easing = 'cubic-bezier(0.76, 0, 0.24, 1)';

  setTimeout(() => {
    const doorTop = document.querySelector('.door-top');
    const doorBottom = document.querySelector('.door-bottom');

    if (doorTop) {
      doorTop.style.transition = `transform ${doorMs}ms ${easing}`;
      doorTop.style.transform = `translateY(${doorTopTarget})`;
    }
    if (doorBottom) {
      doorBottom.style.transition = `transform ${doorMs}ms ${easing}`;
      doorBottom.style.transform = `translateY(${doorBottomTarget})`;
    }
    overlay.classList.add('open');

    // Gentle fade out of floating logo once it reaches top
    setTimeout(() => {
      if (introLogo) {
        introLogo.style.transition = 'opacity 0.6s ease';
        introLogo.style.opacity = '0';
      }
    }, doorMs + 80);

    // Remove overlay from DOM flow
    setTimeout(() => {
      overlay.classList.add('done');
    }, doorMs + 700);
  }, holdMs);
}
