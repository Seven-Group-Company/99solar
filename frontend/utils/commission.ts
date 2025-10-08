export const applyCommission = (price: number, commission: number = 4) => {
  if (!price || price <= 0 || isNaN(price)) return null; // keep blanks as null
  return parseFloat((price - commission).toFixed(2));
};
