/**
 * RN JEWELLERS — WISHLIST CONTROLLER
 */

document.addEventListener('DOMContentLoaded', () => {
  renderWishlistPage();
});

function renderWishlistPage() {
  const grid = document.getElementById('wishlist-grid');
  const shareBtn = document.getElementById('share-wishlist-btn');
  if (!grid) return;

  const wishlistIds = API.getWishlist();
  const allProducts = API.getProducts();
  const wishlistedProducts = allProducts.filter(p => wishlistIds.includes(p.id));

  if (wishlistedProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 80px 20px;">
        <i class="far fa-heart" style="font-size:4rem; color:var(--border-gold); margin-bottom:20px;"></i>
        <h2>Your Wishlist is Empty</h2>
        <p style="color:var(--text-muted); margin-bottom:25px;">Explore our collections and save your favourite jewellery pieces.</p>
        <a href="collections.html" class="btn btn-primary">Browse Collections</a>
      </div>
    `;
    if (shareBtn) shareBtn.style.display = 'none';
    return;
  }

  if (shareBtn) {
    shareBtn.style.display = 'inline-flex';
    shareBtn.onclick = () => {
      let msg = `*My Saved Favourites at RN Jewellers:*\n\n`;
      wishlistedProducts.forEach((p, idx) => {
        msg += `${idx + 1}. ${p.name} - ₹${p.calculated.final_price.toLocaleString('en-IN')}\n`;
      });
      msg += `\nEnquire here: https://wa.me/${CONFIG.SHOP.whatsapp}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };
  }

  grid.innerHTML = wishlistedProducts.map(renderProductCard).join('');
}
