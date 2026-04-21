export const ORDER_TAX_RATE = 0.05;

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

export function calculateTax(subtotal) {
  return roundCurrency(subtotal * ORDER_TAX_RATE);
}

export function calculateOrderTotal(subtotal) {
  return roundCurrency(subtotal + calculateTax(subtotal));
}
