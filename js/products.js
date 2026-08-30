let globalFilterAndRender = null;

window.refreshCollectionsGrid = function() {
  if (typeof globalFilterAndRender === 'function') {
    globalFilterAndRender();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initCollectionsPage();
});

function initCollectionsPage() {
  const grid = document.getElementById('collections-grid');
  const searchInput = document.getElementById('catalog-search');
  const categorySelect = document.getElementById('filter-category');
  const metalSelect = document.getElementById('filter-metal');
  const sortSelect = document.getElementById('filter-sort');
  const countEl = document.getElementById('product-count');

  if (!grid) return;

  function filterAndRender() {
    let products = API.getProducts();

    // Category filter
    const cat = categorySelect ? categorySelect.value : 'all';
    if (cat && cat !== 'all') {
      products = products.filter(p => p.category === cat);
    }

    // Metal filter
    const metal = metalSelect ? metalSelect.value : 'all';
    if (metal && metal !== 'all') {
      products = products.filter(p => p.metal === metal);
    }

    // Search Query
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (query) {
      products = products.filter(p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query)));
    }

    // Sorting
    const sort = sortSelect ? sortSelect.value : 'featured';
    if (sort === 'price-low') {
      products.sort((a, b) => a.calculated.final_price - b.calculated.final_price);
    } else if (sort === 'price-high') {
      products.sort((a, b) => b.calculated.final_price - a.calculated.final_price);
    } else if (sort === 'newest') {
      products.sort((a, b) => (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0));
    }

    if (countEl) countEl.textContent = `${products.length} Items Found`;

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 60px 20px;">
          <i class="fas fa-gem" style="font-size:3rem; color:var(--border-gold); margin-bottom:15px;"></i>
          <h3>No Jewellery Items Found</h3>
          <p style="color:var(--text-muted);">Try adjusting your search query or filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(renderProductCard).join('');
  }

  globalFilterAndRender = filterAndRender;

  // URL Query Parameters support (?category=rings)
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam && categorySelect) {
    categorySelect.value = catParam;
  }

  if (searchInput) searchInput.addEventListener('input', filterAndRender);
  if (categorySelect) categorySelect.addEventListener('change', filterAndRender);
  if (metalSelect) metalSelect.addEventListener('change', filterAndRender);
  if (sortSelect) sortSelect.addEventListener('change', filterAndRender);

  filterAndRender();
}
