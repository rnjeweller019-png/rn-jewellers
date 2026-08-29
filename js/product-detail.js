/**
 * RN JEWELLERS — PRODUCT DETAIL PAGE CONTROLLER
 */

window.refreshProductDetailPage = initProductDetailPage;

document.addEventListener('DOMContentLoaded', () => {
  initProductDetailPage();
});

function initProductDetailPage() {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id') || 'PRD_001';
  
  const product = API.getProductById(id);
  API.addRecentlyViewed(product.id);

  const calc = product.calculated;
  const rates = API.getRates();
  const isWishlisted = API.getWishlist().includes(product.id);

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:50px; align-items:start;">
      <!-- Left: Image Gallery -->
      <div>
        <div style="background:var(--surface-1); border:1px solid var(--border-gold); border-radius:var(--radius-lg); overflow:hidden; position:relative; aspect-ratio:1;">
          <img id="main-product-img" src="${product.image_urls[0] || 'assets/logo.png'}" alt="${product.name}" onerror="this.onerror=null; this.src='assets/logo.png';" style="width:100%; height:100%; object-fit:cover;">
          <button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlistClick('${product.id}', this)" style="top:20px; right:20px; width:45px; height:45px;">
            <i class="${isWishlisted ? 'fas' : 'far'} fa-heart" style="font-size:1.2rem;"></i>
          </button>
        </div>
      </div>

      <!-- Right: Product Info & Pricing Breakdown -->
      <div>
        <div class="product-category" style="font-size:0.9rem; margin-bottom:10px;">${escapeHtml(product.category.toUpperCase())} • ${escapeHtml(calc.purity_text.toUpperCase())}</div>
        <h1 style="font-size:2.2rem; margin-bottom:15px; font-family:var(--font-heading);">${product.name}</h1>
        
        <div style="background:var(--surface-2); border:1px solid var(--border-gold); padding:20px; border-radius:var(--radius-md); margin-bottom:25px;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;">
            <span style="font-size:0.9rem; color:var(--text-muted);">Transparent Dynamic Price</span>
            <span class="badge badge-featured"><i class="fas fa-sync-alt"></i> Live Rate Updated</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:15px; margin-bottom:15px;">
            <span style="font-size:2.4rem; font-weight:800; color:var(--gold-light);">₹${calc.final_price.toLocaleString('en-IN')}</span>
            ${calc.discount_amount > 0 ? `<span style="font-size:1.2rem; color:var(--text-dim); text-decoration:line-through;">₹${calc.gross_price.toLocaleString('en-IN')}</span>` : ''}
            ${calc.discount_percent > 0 ? `<span class="badge badge-discount" style="font-size:0.9rem;">${calc.discount_percent}% OFF</span>` : ''}
          </div>

          <!-- Price Calculation Formula Accordion -->
          <details style="border-top:1px solid var(--border-dark); padding-top:15px; cursor:pointer;" open>
            <summary style="font-weight:600; color:var(--gold-primary); font-size:0.9rem;"><i class="fas fa-calculator"></i> View Price Breakdown Formula</summary>
            <div style="margin-top:15px; font-size:0.85rem; color:var(--text-muted); display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between;"><span>${calc.metal_name} Weight:</span><strong>${product.weight_g} grams</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Current ${calc.purity_text} Rate:</span><strong>₹${calc.metal_rate.toLocaleString('en-IN')}/g</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Net ${calc.metal_name} Cost (${product.weight_g}g × ₹${calc.metal_rate.toLocaleString('en-IN')}):</span><strong>₹${calc.raw_metal_cost.toLocaleString('en-IN')}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Making Charge:</span><strong style="${calc.is_free_making ? 'color:#2ecc71;' : ''}">${calc.is_free_making ? 'FREE (0%)' : calc.making_text}</strong></div>
              ${calc.discount_amount > 0 ? `<div style="display:flex; justify-content:space-between; color:var(--success);"><span>Discount Applied (${calc.discount_percent}%):</span><strong>− ₹${calc.discount_amount.toLocaleString('en-IN')}</strong></div>` : ''}
              <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border-dark); padding-top:8px; color:var(--text-main); font-weight:700;"><span>Total Final Price:</span><strong style="color:var(--gold-light);">₹${calc.final_price.toLocaleString('en-IN')}</strong></div>
            </div>
          </details>
        </div>

        <p style="color:var(--text-muted); font-size:1rem; margin-bottom:25px; line-height:1.7;">${product.description}</p>

        <!-- CTA Buttons -->
        <div style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:30px;">
          <a href="https://wa.me/${CONFIG.SHOP.whatsapp}?text=${encodeURIComponent(`Hello RN Jewellers! I want to enquire about ${product.name} (Code: ${product.id}), Weight: ${product.weight_g}g, Price: ₹${calc.final_price.toLocaleString('en-IN')}`)}" target="_blank" class="btn btn-whatsapp" style="flex:1; min-width:200px; padding:15px;">
            <i class="fab fa-whatsapp" style="font-size:1.3rem;"></i> Enquire on WhatsApp
          </a>
          <a href="appointments.html?product=${product.id}" class="btn btn-primary" style="flex:1; min-width:200px; padding:15px;">
            <i class="fas fa-calendar-check"></i> Book Showroom Visit
          </a>
        </div>

        <!-- Share & QR Code Bar -->
        <div style="background:var(--surface-1); border:1px solid var(--border-dark); padding:20px; border-radius:var(--radius-md); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:15px;">
          <div>
            <div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:5px;">SHARE PRODUCT</div>
            <div style="display:flex; gap:10px;">
              <button onclick="shareWhatsAppStory('${product.name}', '${window.location.href}')" class="btn btn-secondary btn-sm" style="font-size:0.8rem;"><i class="fab fa-whatsapp"></i> Share</button>
              <button onclick="navigator.clipboard.writeText(window.location.href); alert('Product Link Copied!');" class="btn btn-secondary btn-sm" style="font-size:0.8rem;"><i class="fas fa-link"></i> Copy Link</button>
            </div>
          </div>
          <div style="text-align:center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(window.location.href)}" alt="QR Code" style="border-radius:6px; border:1px solid var(--border-gold);">
            <div style="font-size:0.7rem; color:var(--text-dim); margin-top:3px;">Scan to view</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderRecentlyViewedSection();
}

function shareWhatsAppStory(title, url) {
  const text = `Check out this gorgeous ${title} at RN Jewellers: ${url}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function renderRecentlyViewedSection() {
  const section = document.getElementById('recently-viewed-section');
  if (!section) return;

  const items = API.getRecentlyViewed();
  if (items.length <= 1) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  const grid = document.getElementById('recently-viewed-grid');
  if (grid) {
    grid.innerHTML = items.slice(0, 4).map(renderProductCard).join('');
  }
}
