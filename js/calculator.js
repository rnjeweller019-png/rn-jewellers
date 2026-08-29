/**
 * RN JEWELLERS — GOLD & SILVER PRICE CALCULATOR TOOL
 */

document.addEventListener('DOMContentLoaded', () => {
  initPriceCalculator();
});

function initPriceCalculator() {
  const metalSelect = document.getElementById('calc-metal');
  const puritySelect = document.getElementById('calc-purity');
  const weightInput = document.getElementById('calc-weight');
  const makingInput = document.getElementById('calc-making');
  const resultDisplay = document.getElementById('calc-total-result');
  const breakdownDisplay = document.getElementById('calc-breakdown');

  if (!weightInput) return;

  function calculate() {
    const rates = API.getRates();
    const metal = metalSelect ? metalSelect.value : 'gold';
    const purity = puritySelect ? puritySelect.value : '22K';
    const weight = parseFloat(weightInput.value) || 0;
    const making = parseFloat(makingInput ? makingInput.value : 0) || 0;

    let rate = rates.gold_22k;
    if (metal === 'silver') {
      rate = rates.silver;
    } else if (purity === '24K') {
      rate = rates.gold_24k;
    } else if (purity === '18K') {
      rate = rates.gold_22k * 0.82;
    }

    const metalCost = weight * rate;
    const total = Math.round(metalCost + making);

    if (resultDisplay) {
      resultDisplay.textContent = `₹${total.toLocaleString('en-IN')}`;
    }

    if (breakdownDisplay) {
      breakdownDisplay.innerHTML = `
        <div>Metal Cost (${weight}g × ₹${Math.round(rate).toLocaleString('en-IN')}/g): <strong>₹${Math.round(metalCost).toLocaleString('en-IN')}</strong></div>
        <div>Estimated Making Charge: <strong>+ ₹${making.toLocaleString('en-IN')}</strong></div>
      `;
    }
  }

  [metalSelect, puritySelect, weightInput, makingInput].forEach(el => {
    if (el) el.addEventListener('input', calculate);
  });

  calculate();
}
