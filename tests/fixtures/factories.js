/**
 * Deterministic, uniquely identified test data factories for Phase 2 automation.
 * Generates isolated, unique records with predictable formats to prevent collisions.
 */

export function createCustomerData(overrides = {}) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    name: `Test Client ${uniqueId}`,
    code: `CUST-${uniqueId.slice(-6)}`,
    currency: 'USD',
    paymentTermsDays: 30,
    taxId: `TAX-${uniqueId.slice(-6)}`,
    creditLimit: '15000',
    email: `client.${uniqueId}@testcompany.com`,
    phone: '+1 555 019 2831',
    billingAddress: {
      street: '100 Silicon Parkway',
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      postalCode: '94105'
    },
    ...overrides
  };
}

export function createSupplierData(overrides = {}) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    name: `Vendor Global ${uniqueId}`,
    code: `SUPP-${uniqueId.slice(-6)}`,
    currency: 'INR',
    paymentTermsDays: 45,
    taxId: '29AABCV9999Z1Z5',
    email: `procurement.${uniqueId}@globalvendor.com`,
    phone: '+91 80 8822 1100',
    address: {
      street: '42 Industrial Park, Phase II',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560058'
    },
    ...overrides
  };
}

export function createProductData(overrides = {}) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    name: `High-Precision Sensor ${uniqueId}`,
    sku: `SKU-HW-${uniqueId.slice(-6)}`,
    type: 'GOODS',
    description: 'Enterprise grade sensor hardware for industrial automation',
    unit: 'pcs',
    purchasePrice: '450.00',
    sellingPrice: '750.00',
    taxRate: '18',
    hsnCode: '847130',
    trackInventory: true,
    reorderLevel: 15,
    openingStock: '50',
    ...overrides
  };
}

export function createServiceData(overrides = {}) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    name: `Architecture Consulting ${uniqueId}`,
    sku: `SRV-CONS-${uniqueId.slice(-6)}`,
    type: 'SERVICE',
    description: 'Senior technical advisory and financial systems architecture',
    unit: 'hrs',
    purchasePrice: '0',
    sellingPrice: '3500.00',
    taxRate: '18',
    hsnCode: '998314',
    trackInventory: false,
    ...overrides
  };
}
