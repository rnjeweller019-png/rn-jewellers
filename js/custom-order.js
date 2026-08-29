/**
 * RN JEWELLERS — CUSTOM ORDER DESIGN REQUEST HANDLER
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('custom-order-form');
  const imageInput = document.getElementById('custom-image');
  let base64Image = '';

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          base64Image = reader.result;
          const preview = document.getElementById('image-preview');
          if (preview) {
            preview.src = base64Image;
            preview.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting Design Request...`;
    btn.disabled = true;

    const data = {
      name: document.getElementById('custom-name').value,
      phone: document.getElementById('custom-phone').value,
      type: document.getElementById('custom-type').value,
      metal: document.getElementById('custom-metal').value,
      description: document.getElementById('custom-desc').value,
      budget: document.getElementById('custom-budget').value,
      reference_image_base64: base64Image
    };

    try {
      await API.submitForm('submitCustomOrder', data);
      alert('🎨 Custom Order Request Received! Our master artisan will contact you on WhatsApp.');
      form.reset();
      const preview = document.getElementById('image-preview');
      if (preview) preview.style.display = 'none';
    } catch (err) {
      alert('Order submitted locally. Please also send details to our WhatsApp for fast response!');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
});
