
/**
 * Mock Data - Contains sample data for development and testing
 * Used when real API calls are not needed
 */

const organizations = [
  { id: 1, name: 'Acme Corporation' },
  { id: 2, name: 'Globex Industries' },
  { id: 3, name: 'Stark Enterprises' },
  { id: 4, name: 'Wayne Enterprises' },
  { id: 5, name: 'Umbrella Corporation' },
];

const products = [
  { id: 1, name: 'Product A', orgId: 1 },
  { id: 2, name: 'Product B', orgId: 1 },
  { id: 3, name: 'Product C', orgId: 2 },
  { id: 4, name: 'Product D', orgId: 3 },
  { id: 5, name: 'Product E', orgId: 4 },
];

module.exports = {
  organizations,
  products
};
