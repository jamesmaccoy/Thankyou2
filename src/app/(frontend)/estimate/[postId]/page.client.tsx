import { getPackageById, PACKAGE_TYPES } from '@/lib/package-types'

// Replace the default packages with centralized types
const defaultPackages = Object.values(PACKAGE_TYPES).map(pkg => ({
  name: pkg.name,
  description: pkg.description,
  price: '0',
  multiplier: pkg.multiplier,
  features: pkg.features,
  revenueCatId: pkg.revenueCatId,
})) 