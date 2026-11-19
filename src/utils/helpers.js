const SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY'];
const PROVINCES = ['Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape',
  'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Total = sum of (quantity x price) for every line. Never typed in by the admin.
function calculateTotal(lines, priceKey) {
  return round2(lines.reduce((sum, l) => sum + l.quantity * l[priceKey], 0));
}

// Amount still payable by the vendor for a sale
function calculateOutstanding(total, paid) {
  return round2(total - paid);
}

function computeStatus(total, paid) {
  if (paid <= 0) return 'UNPAID';
  if (paid >= total) return 'PAID';
  return 'PARTIALLY_PAID';
}

module.exports = { SIZES, PAYMENT_METHODS, PROVINCES, round2, calculateTotal, calculateOutstanding, computeStatus };
