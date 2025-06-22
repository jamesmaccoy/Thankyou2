export interface PackageType {
  id: string
  name: string
  description: string
  multiplier: number
  features: string[]
  revenueCatId: string
  minNights?: number
  maxNights?: number
  isHosted?: boolean
  category: 'standard' | 'luxury' | 'hosted' | 'specialty'
}

export interface PackageTypeTemplate {
  name: string
  description: string
  multiplier: number
  features: string[]
  revenueCatId: string
  minNights?: number
  maxNights?: number
  isHosted?: boolean
  category: 'standard' | 'luxury' | 'hosted' | 'specialty'
}

// Centralized package types definition based on Plek's core offerings
export const PACKAGE_TYPES: Record<string, PackageTypeTemplate> = {
  // Standard Packages
  per_night: {
    name: "Per Night",
    description: "Standard nightly rate for photo studio rental",
    multiplier: 1.0,
    features: [
      "Photo studio access",
      "Basic lighting equipment",
      "Self-service setup",
      "Standard accommodation"
    ],
    revenueCatId: "per_night",
    minNights: 1,
    maxNights: 1,
    category: 'standard'
  },

  // Luxury Packages
  luxury_night: {
    name: "Luxury Night",
    description: "Premium nightly rate with wine sommelier service",
    multiplier: 1.5,
    features: [
      "Premium photo studio access",
      "Professional lighting setup",
      "Wine sommelier consultation",
      "Curated wine selection",
      "Premium accommodation",
      "Priority service"
    ],
    revenueCatId: "luxury_night",
    minNights: 1,
    maxNights: 1,
    isHosted: true,
    category: 'luxury'
  },

  // Multi-night Packages
  three_nights: {
    name: "3 Nights Package",
    description: "Three night stay with studio access",
    multiplier: 0.95,
    features: [
      "3 nights accommodation",
      "Photo studio access",
      "Basic equipment included",
      "5% discount on total",
      "Flexible scheduling"
    ],
    revenueCatId: "3nights",
    minNights: 3,
    maxNights: 3,
    category: 'standard'
  },

  hosted_3nights: {
    name: "Hosted 3 Nights",
    description: "Premium 3-night experience with wine sommelier",
    multiplier: 1.4,
    features: [
      "3 nights premium accommodation",
      "Professional photo studio setup",
      "Wine sommelier service",
      "Daily wine tastings",
      "Dedicated host assistance",
      "Enhanced amenities",
      "Priority service"
    ],
    revenueCatId: "hosted3nights",
    minNights: 3,
    maxNights: 3,
    isHosted: true,
    category: 'hosted'
  },

  // Weekly Packages
  weekly: {
    name: "Weekly Package",
    description: "Seven night stay with extended studio access",
    multiplier: 0.85,
    features: [
      "7 nights accommodation",
      "Extended photo studio access",
      "Equipment storage included",
      "15% discount on total",
      "Flexible project scheduling",
      "Priority booking for future stays"
    ],
    revenueCatId: "weekly",
    minNights: 7,
    maxNights: 7,
    category: 'standard'
  },

  hosted_weekly: {
    name: "Hosted Weekly",
    description: "Premium week-long experience with dedicated support",
    multiplier: 1.3,
    features: [
      "7 nights premium accommodation",
      "Professional studio management",
      "Wine sommelier service",
      "Weekly wine experience",
      "Dedicated host support",
      "Enhanced amenities",
      "Priority service",
      "Custom project planning"
    ],
    revenueCatId: "hosted_weekly",
    minNights: 7,
    maxNights: 7,
    isHosted: true,
    category: 'hosted'
  },

  // Extended Stay Packages
  monthly: {
    name: "Monthly Package",
    description: "Extended month-long stay with winter benefits",
    multiplier: 0.7,
    features: [
      "30+ nights accommodation",
      "Unlimited studio access",
      "Equipment storage",
      "30% discount on total",
      "Winter heating included",
      "Extended stay perks",
      "Priority booking",
      "Flexible cancellation"
    ],
    revenueCatId: "monthly",
    minNights: 30,
    maxNights: 90,
    category: 'standard'
  },

  // Specialty Packages
  wine_package: {
    name: "Wine Sommelier Package",
    description: "Specialized wine experience add-on for any stay",
    multiplier: 1.5,
    features: [
      "Professional wine sommelier",
      "Curated wine selection",
      "Daily wine tastings",
      "Wine pairing consultation",
      "Premium glassware provided",
      "Wine education sessions"
    ],
    revenueCatId: "wine_sommelier",
    category: 'specialty'
  }
} as const

// Helper functions
export const getPackageById = (id: string): PackageTypeTemplate | null => {
  return PACKAGE_TYPES[id] || null
}

export const getPackagesByCategory = (category: PackageType['category']): Record<string, PackageTypeTemplate> => {
  return Object.fromEntries(
    Object.entries(PACKAGE_TYPES).filter(([_, pkg]) => pkg.category === category)
  )
}

export const getPackageByDuration = (nights: number): string | null => {
  // Logic to determine appropriate package based on duration
  if (nights === 1) return 'per_night'
  if (nights === 3) return 'three_nights'
  if (nights === 7) return 'weekly'
  if (nights >= 30) return 'monthly'
  return null
}

export const formatPackageFeatures = (features: string[]): string => {
  return features.join(', ')
}

// Package validation
export const validatePackageType = (packageType: Partial<PackageType>): boolean => {
  return !!(
    packageType.name &&
    packageType.description &&
    typeof packageType.multiplier === 'number' &&
    Array.isArray(packageType.features) &&
    packageType.revenueCatId
  )
}

// Convert template to full package type
export const createPackageFromTemplate = (id: string, template: PackageTypeTemplate): PackageType => {
  return {
    id,
    ...template
  }
}

// Get all package types as full PackageType objects
export const getAllPackageTypes = (): Record<string, PackageType> => {
  return Object.fromEntries(
    Object.entries(PACKAGE_TYPES).map(([id, template]) => [
      id,
      createPackageFromTemplate(id, template)
    ])
  )
} 