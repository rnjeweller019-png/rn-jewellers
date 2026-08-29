/**
 * RN JEWELLERS — APPOINTMENT BOOKING HANDLER
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('appointment-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Booking Appointment...`;
    btn.disabled = true;

    const formData = {
      name: document.getElementById('apt-name').value,
      phone: document.getElementById('apt-phone').value,
      date: document.getElementById('apt-date').value,
      time: document.getElementById('apt-time').value,
      notes: document.getElementById('apt-notes').value,
      status: 'Pending'
    };

    try {
      await API.submitForm('submitAppointment', formData);
      
      const successModal = document.getElementById('booking-success-modal');
      if (successModal) {
        successModal.style.display = 'flex';
      } else {
        alert('✨ Showroom Visit Request Received!\nOur team will check slot availability and notify you shortly via WhatsApp with your booking status.');
      }
      form.reset();
    } catch (err) {
      alert('Error submitting appointment. Please contact us via WhatsApp.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
});
