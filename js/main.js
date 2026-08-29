/**
 * RN JEWELLERS — CORE CLIENT SCRIPT
 */

document.addEventListener('DOMContentLoaded', async () => {
  initLiveRateTicker();
  initNavbar();
  initWishlistBadge();
  initParticleCanvas();
  initPromoBanner();
  logVisitorAnalytics();

  if (CONFIG.APPS_SCRIPT_URL) {
    await API.syncWithServer();
    initLiveRateTicker();
    refreshPageContentsSilently();

    // Silent background auto-sync every 30 seconds (no page reload)
    setInterval(async () => {
      await API.syncWithServer();
      initLiveRateTicker();
      refreshPageContentsSilently();
    }, 30000);
  }
});

// Helper: Get Featured Products (prioritizes is_featured: true, fallback to top products)
function getFeaturedProducts() {
  const allProducts = API.getProducts();
  const featured = allProducts.filter(p => p.is_featured === true || String(p.is_featured).toLowerCase() === 'true');
  if (featured.length >= 4) {
    return featured.slice(0, 4);
  }
  const remaining = allProducts.filter(p => !(p.is_featured === true || String(p.is_featured).toLowerCase() === 'true'));
  return [...featured, ...remaining].slice(0, 4);
}

function refreshPageContentsSilently() {
  const featuredGrid = document.getElementById('featured-products-grid');
  if (featuredGrid && typeof renderProductCard === 'function') {
    const products = getFeaturedProducts();
    featuredGrid.innerHTML = products.map(renderProductCard).join('');
  }

  if (typeof window.refreshCollectionsGrid === 'function') {
    window.refreshCollectionsGrid();
  }

  if (typeof window.refreshProductDetailPage === 'function') {
    window.refreshProductDetailPage();
  }
}

// Live Rate Ticker Renderer
function initLiveRateTicker() {
  const rates = API.getRates();
  const gold22El = document.getElementById('ticker-gold-22k');
  const gold24El = document.getElementById('ticker-gold-24k');
  const silverEl = document.getElementById('ticker-silver');

  if (gold22El) gold22El.textContent = `₹${rates.gold_22k.toLocaleString('en-IN')}/g`;
  if (gold24El) gold24El.textContent = `₹${rates.gold_24k.toLocaleString('en-IN')}/g`;
  if (silverEl) silverEl.textContent = `₹${rates.silver.toLocaleString('en-IN')}/g`;
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
  const closeBtn = document.getElementById('promo-close-btn');
  if (promo && closeBtn) {
    closeBtn.addEventListener('click', () => {
      promo.style.display = 'none';
    });
  }
}

// Gold Sparkle Particle Canvas Background Effect
function initParticleCanvas() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

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
        <img src="${mainImg}" alt="${product.name}" class="product-img" loading="lazy" onerror="this.onerror=null; this.src='assets/logo.png';">
        <div class="product-badges">
          ${product.is_featured ? '<span class="badge badge-featured">Featured</span>' : ''}
          ${product.is_new_arrival ? '<span class="badge badge-new">New</span>' : ''}
          ${calc.discount_percent > 0 ? `<span class="badge badge-discount">${calc.discount_percent}% OFF</span>` : ''}
        </div>
        <button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.preventDefault(); toggleWishlistClick('${product.id}', this)">
          <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
      <div class="product-content">
        <div class="product-category">${product.category} • ${product.purity} Gold</div>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-meta">
          <span><i class="fas fa-weight-hanging"></i> ${product.weight_g}g</span>
          <span><i class="fas fa-certificate"></i> BIS Hallmark</span>
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

function logVisitorAnalytics() {
  if (CONFIG.APPS_SCRIPT_URL && !sessionStorage.getItem('rnj_visit_logged')) {
    sessionStorage.setItem('rnj_visit_logged', 'true');
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const payload = encodeURIComponent(JSON.stringify({
      page: window.location.pathname || 'index.html',
      device: isMobile ? 'Mobile' : 'Desktop',
      referrer: document.referrer || 'Direct'
    }));
    fetch(`${CONFIG.APPS_SCRIPT_URL}?action=logVisit&data=${payload}`).catch(() => {});
  }
}
