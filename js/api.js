/**
 * RN JEWELLERS — DATA API & PRICING ENGINE
 */

// Utility: Escape HTML to prevent XSS in dynamically rendered product strings
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const API = {
  // Get Current Rates (from LocalStorage or Config or Apps Script)
  getRates() {
    const stored = localStorage.getItem('rnj_rates');
    if (stored) {
      return JSON.parse(stored);
    }
    return CONFIG.DEFAULT_RATES;
  },

  // Get Site Settings (promo text, show_promo, hero_bg_url, enable_particles)
  getSiteSettings() {
    const stored = localStorage.getItem('rnj_site_settings');
    if (stored) {
      try { return JSON.parse(stored); } catch(e) {}
    }
    return {
      promo_banner_text: "✨ Festive Offer: Special 15% OFF on Making Charges for All Pure Silver Collections!",
      show_promo_banner: true,
      hero_bg_url: "assets/images/hero.jpg",
      enable_particles: true
    };
  },

  // Save/Update Rates
  setRates(rates) {
    const updated = {
      ...this.getRates(),
      ...rates,
      last_updated: new Date().toISOString()
    };
    localStorage.setItem('rnj_rates', JSON.stringify(updated));
    
    // Sync with Apps Script if configured using GET params (avoids CORS preflight)
    if (CONFIG.APPS_SCRIPT_URL) {
      const params = new URLSearchParams({
        action: 'updateSettings',
        'data[gold_22k_rate]': updated.gold_22k,
        'data[gold_24k_rate]': updated.gold_24k,
        'data[silver_rate]': updated.silver,
        'data[show_gold_22k]': (updated.show_gold_22k !== false && updated.show_gold_22k !== '0') ? '1' : '0',
        'data[show_gold_24k]': (updated.show_gold_24k !== false && updated.show_gold_24k !== '0') ? '1' : '0',
        'data[show_silver]': (updated.show_silver !== false && updated.show_silver !== '0') ? '1' : '0',
        'data[last_rate_update]': updated.last_updated
      });
      fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`)
        .then(r => r.json())
        .catch(err => console.log('Sync err:', err));
    }
    
    return updated;
  },

  // Sync Products & Rates from Apps Script Backend (Google Sheets)
  async syncWithServer() {
    if (!CONFIG.APPS_SCRIPT_URL) return;

    try {
      const nonce = `${Date.now()}_${Math.floor(Math.random()*100000)}`;
      const prodPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getProducts&_nc=${nonce}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      })
        .then(res => res.json())
        .then(prodJson => {
          if (prodJson.status === 'success' && Array.isArray(prodJson.data)) {
            const cleanProducts = prodJson.data.map(p => {
              let imgs = [];
              if (typeof p.image_urls === 'string' && p.image_urls.trim() !== '') {
                imgs = p.image_urls.split(',');
              } else if (Array.isArray(p.image_urls)) {
                imgs = p.image_urls.filter(Boolean);
              }
              imgs = imgs.map(img => typeof img === 'string' ? img.replace(/^(\.\.\/)+/, '').replace(/^\//, '') : img);
              if (imgs.length === 0 || !imgs[0]) imgs = ['assets/images/ring_1.jpg'];
              return {
                ...p,
                weight_g: parseFloat(p.weight_g) || 0,
                making_charge: parseFloat(p.making_charge) || 0,
                product_discount: parseFloat(p.product_discount) || 0,
                image_urls: imgs,
                is_featured: p.is_featured === true || String(p.is_featured).toLowerCase() === 'true' || p.is_featured === 1 || p.is_featured === '1',
                is_new_arrival: p.is_new_arrival === true || String(p.is_new_arrival).toLowerCase() === 'true' || p.is_new_arrival === 1 || p.is_new_arrival === '1',
                is_no_making_charge: p.is_no_making_charge === true || String(p.is_no_making_charge).toLowerCase() === 'true'
              };
            });
            localStorage.setItem('rnj_products', JSON.stringify(cleanProducts));
          }
        }).catch(e => console.log('Products sync error:', e));

      const setPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSettings&_nc=${nonce}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      })
        .then(res => res.json())
        .then(setJson => {
          if (setJson.status === 'success' && setJson.data) {
            const currentRates = this.getRates();
            const parseBool = (val, defaultVal) => {
              if (val === undefined || val === null || val === '') return defaultVal;
              return val !== '0' && val !== 0 && val !== false && val !== 'false';
            };
            const rates = {
              gold_22k: parseFloat(setJson.data.gold_22k_rate) || currentRates.gold_22k,
              gold_24k: parseFloat(setJson.data.gold_24k_rate) || currentRates.gold_24k,
              silver: parseFloat(setJson.data.silver_rate) || currentRates.silver,
              show_gold_22k: parseBool(setJson.data.show_gold_22k, currentRates.show_gold_22k !== false),
              show_gold_24k: parseBool(setJson.data.show_gold_24k, currentRates.show_gold_24k !== false),
              show_silver: parseBool(setJson.data.show_silver, currentRates.show_silver !== false),
              last_updated: setJson.data.last_rate_update || new Date().toISOString()
            };
            localStorage.setItem('rnj_rates', JSON.stringify(rates));

            const currentSettings = this.getSiteSettings();
            const defaultText = "✨ Festive Silver Offer: Special 15% OFF on Making Charges for All Silver Ornaments!";
            const siteSettings = {
              promo_banner_text: (setJson.data.promo_banner_text && String(setJson.data.promo_banner_text).trim() !== '') ? setJson.data.promo_banner_text : defaultText,
              show_promo_banner: parseBool(setJson.data.show_promo_banner, currentSettings.show_promo_banner !== false),
              hero_bg_url: (setJson.data.hero_bg_url && String(setJson.data.hero_bg_url).trim() !== '') ? setJson.data.hero_bg_url : "assets/images/hero.jpg",
              enable_particles: parseBool(setJson.data.enable_particles, currentSettings.enable_particles !== false)
            };
            localStorage.setItem('rnj_site_settings', JSON.stringify(siteSettings));
          }
        }).catch(e => console.log('Settings sync error:', e));

      await Promise.all([prodPromise, setPromise]);
    } catch (err) {
      console.log('Server sync error:', err);
    }
  },

  // Smart Timestamp & Value-based Sync (Checks if rates or settings changed before updating UI)
  async checkAndSyncServer() {
    if (!CONFIG.APPS_SCRIPT_URL) return false;

    try {
      const nonce = `${Date.now()}_${Math.floor(Math.random()*100000)}`;
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSettings&_nc=${nonce}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      const setJson = await res.json();

      if (setJson.status === 'success' && setJson.data) {
        const parseBool = (val, defaultVal) => {
          if (val === undefined || val === null || val === '') return defaultVal;
          return val !== '0' && val !== 0 && val !== false && val !== 'false';
        };

        const currentRates = this.getRates();
        const currentSettings = this.getSiteSettings();
        const defaultText = "✨ Festive Silver Offer: Special 15% OFF on Making Charges for All Silver Ornaments!";

        const newRates = {
          gold_22k: parseFloat(setJson.data.gold_22k_rate) || currentRates.gold_22k,
          gold_24k: parseFloat(setJson.data.gold_24k_rate) || currentRates.gold_24k,
          silver: parseFloat(setJson.data.silver_rate) || currentRates.silver,
          show_gold_22k: parseBool(setJson.data.show_gold_22k, currentRates.show_gold_22k !== false),
          show_gold_24k: parseBool(setJson.data.show_gold_24k, currentRates.show_gold_24k !== false),
          show_silver: parseBool(setJson.data.show_silver, currentRates.show_silver !== false),
          last_updated: setJson.data.last_rate_update || currentRates.last_updated || new Date().toISOString()
        };

        const newSiteSettings = {
          promo_banner_text: (setJson.data.promo_banner_text && String(setJson.data.promo_banner_text).trim() !== '') ? setJson.data.promo_banner_text : defaultText,
          show_promo_banner: parseBool(setJson.data.show_promo_banner, currentSettings.show_promo_banner !== false),
          hero_bg_url: (setJson.data.hero_bg_url && String(setJson.data.hero_bg_url).trim() !== '') ? setJson.data.hero_bg_url : "assets/images/hero.jpg",
          enable_particles: parseBool(setJson.data.enable_particles, currentSettings.enable_particles !== false),
          last_updated: setJson.data.last_settings_update || currentSettings.last_updated || new Date().toISOString()
        };

        const ratesChanged = JSON.stringify(currentRates) !== JSON.stringify(newRates);
        const settingsChanged = JSON.stringify(currentSettings) !== JSON.stringify(newSiteSettings);
        const rawProd = localStorage.getItem('rnj_products');
        const hasProductCache = rawProd !== null && !rawProd.includes('PRD_001');

        localStorage.setItem('rnj_rates', JSON.stringify(newRates));
        localStorage.setItem('rnj_site_settings', JSON.stringify(newSiteSettings));

        // Always sync full catalog if product cache missing OR server settings/rates changed
        if (!hasProductCache || settingsChanged || ratesChanged) {
          await this.syncWithServer();
          return true; // Trigger instant live UI update
        }
      }
    } catch (err) {
      console.log('Smart sync check error:', err);
    }
    return false;
  },

  // Get All Products (from LocalStorage or Sample Products)
  getProducts() {
    const stored = localStorage.getItem('rnj_products');
    let products = [];
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          products = parsed;
        }
      } catch(e) {
        products = CONFIG.SAMPLE_PRODUCTS;
      }
    } else {
      products = CONFIG.SAMPLE_PRODUCTS;
      // NOTE: Do not write fallback sample products to localStorage here,
      // so checkAndSyncServer knows real products have not been synced yet!
    }
    
    const rates = this.getRates();
    
    // Calculate live dynamic prices for each product & sanitize image URLs
    return products.map(p => {
      let sanitizedImgs = (p.image_urls || []).map(img => {
        if (typeof img === 'string') {
          return img.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
        }
        return img;
      });
      if (sanitizedImgs.length === 0 || !sanitizedImgs[0]) {
        sanitizedImgs = ['assets/images/ring_1.jpg'];
      }
      return this.calculateProductPrice({ ...p, image_urls: sanitizedImgs }, rates);
    });
  },

  // Single Product by ID
  getProductById(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id) || products[0];
  },

  // Dynamic Jewellery Pricing Formula:
  // Final Price = (Weight × Rate) + Making Charge - Discount
  calculateProductPrice(product, rates = this.getRates()) {
    const isSilver = String(product.metal).toLowerCase() === 'silver';
    let metalRate = rates.gold_22k;
    let metalName = 'Gold';
    let purityText = product.purity || '22K Gold';

    if (isSilver) {
      metalName = 'Silver';
      const purityUpper = String(product.purity || '').toUpperCase();
      if (purityUpper.includes('925') || purityUpper.includes('STERLING') || purityUpper.includes('92.5')) {
        metalRate = rates.silver * 0.925;
        purityText = '925 Sterling Silver';
      } else if (purityUpper.includes('999') || purityUpper.includes('FINE') || purityUpper.includes('PURE')) {
        metalRate = rates.silver;
        purityText = '999 Fine Silver';
      } else {
        metalRate = rates.silver;
        purityText = product.purity ? `${product.purity} Silver` : 'Silver';
      }
    } else {
      metalName = 'Gold';
      const purityUpper = String(product.purity || '').toUpperCase();
      if (purityUpper.includes('24K')) {
        metalRate = rates.gold_24k || (rates.gold_22k * 1.09);
        purityText = '24K Gold';
      } else if (purityUpper.includes('18K')) {
        metalRate = rates.gold_24k ? (rates.gold_24k * (18 / 24)) : (rates.gold_22k * (18 / 22));
        purityText = '18K Gold';
      } else if (purityUpper.includes('14K')) {
        metalRate = rates.gold_24k ? (rates.gold_24k * (14 / 24)) : (rates.gold_22k * (14 / 22));
        purityText = '14K Gold';
      } else {
        metalRate = rates.gold_22k;
        purityText = '22K Gold';
      }
    }

    const weight = parseFloat(product.weight_g) || 0;
    const rawMetalCost = weight * metalRate;

    // Making charge calculation — supports per_gram / per_10g / per_100g slab / fixed ₹
    const makingType = product.making_type || 'percentage';
    const makingBasis = product.making_basis || 'per_gram';
    const makingVal = parseFloat(product.making_charge) || 0;
    const explicitNoMaking = product.is_no_making_charge === true || String(product.is_no_making_charge).toLowerCase() === 'true';
    const isFreeMaking = explicitNoMaking || (makingVal === 0 && (product.making_charge === 0 || product.making_charge === '0'));

    let makingAmount = 0;
    let makingText = '0%';

    if (isFreeMaking) {
      makingAmount = 0;
      makingText = '0% (FREE)';
    } else if (makingType === 'fixed') {
      makingAmount = makingVal;
      makingText = `₹${makingVal.toLocaleString('en-IN')} (flat)`;
    } else {
      // Percentage-based — compute effective cost based on slab basis
      let effectiveWeight = weight;
      if (makingBasis === 'per_10g') {
        effectiveWeight = Math.floor(weight / 10) * 10;
      } else if (makingBasis === 'per_100g') {
        effectiveWeight = Math.floor(weight / 100) * 100;
      }
      const effectiveCost = effectiveWeight * metalRate;
      makingAmount = (effectiveCost * makingVal) / 100;
      const basisLabel = makingBasis === 'per_10g' ? '/10g slab' : makingBasis === 'per_100g' ? '/100g slab' : '';
      makingText = `${makingVal}%${basisLabel}`;
    }

    const grossPrice = rawMetalCost + makingAmount;

    // Determine Discount % (Product override > Category discount > 0)
    let discountPct = parseFloat(product.product_discount) || 0;
    if (!discountPct) {
      const cat = CONFIG.CATEGORIES.find(c => c.id === product.category);
      if (cat) discountPct = cat.discount || 0;
    }

    const discountAmount = (grossPrice * discountPct) / 100;
    const finalPrice = Math.round(grossPrice - discountAmount);

    return {
      ...product,
      calculated: {
        is_silver: isSilver,
        metal_name: metalName,
        purity_text: purityText,
        metal_rate: Math.round(metalRate),
        raw_metal_cost: Math.round(rawMetalCost),
        making_type: makingType,
        making_basis: makingBasis,
        making_val: makingVal,
        making_amount: Math.round(makingAmount),
        making_text: makingText,
        is_free_making: isFreeMaking,
        gross_price: Math.round(grossPrice),
        discount_percent: discountPct,
        discount_amount: Math.round(discountAmount),
        final_price: finalPrice
      }
    };
  },

  // Save/Add Product (Admin)
  saveProduct(productData) {
    let products = JSON.parse(localStorage.getItem('rnj_products')) || CONFIG.SAMPLE_PRODUCTS;
    
    if (productData.id) {
      const index = products.findIndex(p => p.id === productData.id);
      if (index !== -1) {
        products[index] = { ...products[index], ...productData };
      }
    } else {
      productData.id = 'PRD_' + Date.now();
      products.unshift(productData);
    }

    localStorage.setItem('rnj_products', JSON.stringify(products));

    if (CONFIG.APPS_SCRIPT_URL) {
      const payload = encodeURIComponent(JSON.stringify(productData));
      fetch(`${CONFIG.APPS_SCRIPT_URL}?action=saveProduct&data=${payload}`).catch(e => console.log(e));
    }

    return productData;
  },

  // Delete Product (Admin)
  deleteProduct(id) {
    let products = JSON.parse(localStorage.getItem('rnj_products')) || CONFIG.SAMPLE_PRODUCTS;
    products = products.filter(p => p.id !== id);
    localStorage.setItem('rnj_products', JSON.stringify(products));

    if (CONFIG.APPS_SCRIPT_URL) {
      fetch(`${CONFIG.APPS_SCRIPT_URL}?action=deleteProduct&id=${id}`).catch(e => console.log(e));
    }
  },

  // Wishlist Storage Engine
  getWishlist() {
    return JSON.parse(localStorage.getItem('rnj_wishlist')) || [];
  },

  toggleWishlist(productId) {
    let wishlist = this.getWishlist();
    if (wishlist.includes(productId)) {
      wishlist = wishlist.filter(id => id !== productId);
    } else {
      wishlist.push(productId);
    }
    localStorage.setItem('rnj_wishlist', JSON.stringify(wishlist));
    return wishlist;
  },

  // Recently Viewed Storage Engine
  addRecentlyViewed(productId) {
    let items = JSON.parse(localStorage.getItem('rnj_recently_viewed')) || [];
    items = items.filter(id => id !== productId);
    items.unshift(productId);
    if (items.length > 8) items.pop();
    localStorage.setItem('rnj_recently_viewed', JSON.stringify(items));
  },

  getRecentlyViewed() {
    const ids = JSON.parse(localStorage.getItem('rnj_recently_viewed')) || [];
    return ids.map(id => this.getProductById(id)).filter(Boolean);
  },

  // Form Submission Helper (Enquiry, Appointment, Custom Order)
  submitForm(endpointAction, data) {
    // Store in local history
    let history = JSON.parse(localStorage.getItem('rnj_' + endpointAction)) || [];
    history.unshift({ id: 'SUB_' + Date.now(), timestamp: new Date().toISOString(), ...data });
    localStorage.setItem('rnj_' + endpointAction, JSON.stringify(history));

    if (CONFIG.APPS_SCRIPT_URL) {
      // Primary: Send via HTTP POST body so image base64 payloads can be transmitted safely
      return fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: endpointAction, data: data })
      })
      .then(res => res.json())
      .catch(() => {
        // Fallback: If POST fails or blocked, strip heavy base64 and fire GET URL request
        const cleanData = { ...data };
        delete cleanData.reference_image_base64;
        const payload = encodeURIComponent(JSON.stringify(cleanData));
        return fetch(`${CONFIG.APPS_SCRIPT_URL}?action=${endpointAction}&data=${payload}`).then(res => res.json()).catch(() => ({ status: 'success', local: true }));
      });
    }

    return Promise.resolve({ status: 'success', local: true });
  }
};
