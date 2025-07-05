import React from 'react'
import { 
  Camera, 
  Crown, 
  CalendarDays, 
  UserCheck, 
  CalendarRange, 
  Calendar, 
  Wine, 
  Package as PackageIcon,
  LucideIcon,
  Star,
  Briefcase
} from 'lucide-react'

// Icon mapping for package types
const ICON_MAP: Record<string, LucideIcon> = {
  camera: Camera,
  crown: Crown,
  'calendar-days': CalendarDays,
  'user-check': UserCheck,
  'calendar-range': CalendarRange,
  calendar: Calendar,
  wine: Wine,
  package: PackageIcon,
  star: Star,
  briefcase: Briefcase
}

// Get icon component for a package type
export const getPackageIconComponent = (packageTypeId: string): LucideIcon => {
  const iconName = getPackageIcon(packageTypeId)
  return ICON_MAP[iconName] || PackageIcon
}

// Interfaces
export interface TierInfo {
  name: string
  color: string
  description: string
}

export interface PackageType {
  name: string
  description: string
  multiplier: number
  features: string[]
  revenueCatId: string
  minNights?: number
  maxNights?: number
  isHosted?: boolean
  category: 'standard' | 'luxury' | 'hosted' | 'specialty'
  icon: string
  tier: 'standard' | 'pro' | 'luxury'
  baseTemplate: 'per_night' | 'three_nights' | 'weekly' | 'monthly' | 'wine_package'
  durationVariant?: string
}

export interface PackageTypeTemplate extends PackageType {}

// Base templates for organizing packages
export type BaseTemplate = 'per_night' | 'three_nights' | 'weekly' | 'monthly' | 'wine_package'

// User tiers for package access
export type UserTier = 'guest' | 'standard' | 'pro' | 'luxury'

// Package mapping interface for organizing by base template and tier
export interface PackageMapping {
  [baseTemplate: string]: {
    [tier: string]: {
      packageId: string
      revenueCatId: string
      durationVariant?: string
    }
  }
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
    category: 'standard',
    icon: 'camera',
    tier: 'standard',
    baseTemplate: 'per_night'
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
    revenueCatId: "per_night_luxury",
    minNights: 1,
    maxNights: 1,
    isHosted: true,
    category: 'luxury',
    icon: 'crown',
    tier: 'luxury',
    baseTemplate: 'per_night'
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
    category: 'standard',
    icon: 'calendar-days',
    tier: 'standard',
    baseTemplate: 'three_nights'
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
    category: 'hosted',
    icon: 'user-check',
    tier: 'luxury',
    baseTemplate: 'three_nights'
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
    revenueCatId: "Weekly",
    minNights: 7,
    maxNights: 7,
    category: 'standard',
    icon: 'calendar-range',
    tier: 'standard',
    baseTemplate: 'weekly'
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
    category: 'hosted',
    icon: 'user-check',
    tier: 'luxury',
    baseTemplate: 'weekly'
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
    revenueCatId: "Bottle_wine",
    category: 'specialty',
    icon: 'wine',
    tier: 'standard',
    baseTemplate: 'wine_package'
  },

  // Customer (Paid) Packages - Enhanced versions with premium features
  per_night_customer: {
    name: "Per Night Pro",
    description: "Enhanced nightly experience with priority support and premium amenities",
    multiplier: 1.0,
    features: [
      "Photo studio access",
      "Premium lighting equipment",
      "Priority booking support",
      "24/7 customer service",
      "Enhanced cleaning service",
      "Welcome package included",
      "Free cancellation up to 24h",
      "Equipment setup assistance"
    ],
    revenueCatId: "per_night",
    minNights: 1,
    maxNights: 1,
    category: 'standard',
    icon: 'star',
    tier: 'pro',
    baseTemplate: 'per_night'
  },

  three_nights_customer: {
    name: "3 Nights Pro Package",
    description: "Enhanced three-night experience with premium support and exclusive perks",
    multiplier: 0.95,
    features: [
      "3 nights accommodation",
      "Premium photo studio access",
      "Professional equipment included",
      "5% discount on total",
      "Priority customer support",
      "Daily housekeeping",
      "Concierge service",
      "Welcome amenities package",
      "Free equipment tutorials",
      "Flexible check-in/out times"
    ],
    revenueCatId: "3nights_customer",
    minNights: 3,
    maxNights: 3,
    category: 'standard',
    icon: 'crown',
    tier: 'pro',
    baseTemplate: 'three_nights'
  },

  weekly_customer: {
    name: "Weekly Pro Package",
    description: "Premium week-long experience with dedicated support and enhanced amenities",
    multiplier: 0.85,
    features: [
      "7 nights accommodation",
      "Extended photo studio access",
      "Professional equipment storage",
      "15% discount on total",
      "Dedicated account manager",
      "Daily housekeeping service",
      "Priority booking for future stays",
      "Equipment maintenance included",
      "Professional consultation sessions",
      "Enhanced workspace setup",
      "Complimentary local experiences"
    ],
    revenueCatId: "weekly_customer",
    minNights: 7,
    maxNights: 7,
    category: 'standard',
    icon: 'briefcase',
    tier: 'pro',
    baseTemplate: 'weekly'
  },

  // Monthly Packages
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
    category: 'standard',
    icon: 'calendar',
    tier: 'standard',
    baseTemplate: 'monthly'
  }
} as const

// Comprehensive package mapping for all base templates and tiers
export const PACKAGE_MAPPINGS: PackageMapping = {
  per_night: {
    standard: {
      packageId: 'per_night',
      revenueCatId: 'per_night'
    },
    pro: {
      packageId: 'per_night_customer',
      revenueCatId: 'per_night_customer'
    },
    luxury: {
      packageId: 'luxury_night',
      revenueCatId: 'per_night_luxury'
    }
  },
  three_nights: {
    standard: {
      packageId: 'three_nights',
      revenueCatId: '3nights'
    },
    pro: {
      packageId: 'three_nights_customer',
      revenueCatId: '3nights_customer'
    },
    luxury: {
      packageId: 'hosted_3nights',
      revenueCatId: 'hosted3nights'
    }
  },
  weekly: {
    standard: {
      packageId: 'weekly',
      revenueCatId: 'Weekly'
    },
    pro: {
      packageId: 'weekly_customer',
      revenueCatId: 'weekly_customer'
    },
    luxury: {
      packageId: 'hosted_weekly',
      revenueCatId: 'hosted_weekly'
    }
  },
  monthly: {
    standard: {
      packageId: 'monthly',
      revenueCatId: 'monthly'
    }
  },
  wine_package: {
    standard: {
      packageId: 'wine_package',
      revenueCatId: 'Bottle_wine'
    }
  }
}

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

// Get icon name for a package type
export const getPackageIcon = (packageTypeId: string): string => {
  const packageType = getPackageById(packageTypeId)
  return packageType?.icon || 'package'
}

// Helper function to get the appropriate package based on user tier and base template
export function getPackageForUserTier(baseTemplate: BaseTemplate, userTier: UserTier): string | null {
  const templateMapping = PACKAGE_MAPPINGS[baseTemplate]
  if (!templateMapping) return null
  
  // Try to get the exact tier, fallback to standard if not available
  const tierMapping = templateMapping[userTier] || templateMapping['standard']
  return tierMapping?.packageId || null
}

export function getRevenueCatIdForPackage(baseTemplate: BaseTemplate, userTier: UserTier): string | null {
  const templateMapping = PACKAGE_MAPPINGS[baseTemplate]
  if (!templateMapping) return null
  
  const tierMapping = templateMapping[userTier] || templateMapping['standard']
  return tierMapping?.revenueCatId || null
}

// Helper function to determine user tier from entitlements
export function getUserTierFromEntitlements(entitlements: string[]): UserTier {
  const activeEntitlements = entitlements.map(e => e.toLowerCase())
  
  // Check for luxury tier first (highest priority)
  if (activeEntitlements.some(e => e.includes('luxury') || e.includes('hosted'))) {
    return 'luxury'
  }
  
  // Check for pro tier
  if (activeEntitlements.some(e => e.includes('pro') || e.includes('premium') || e.includes('customer'))) {
    return 'pro'
  }
  
  // Check for any active subscription (standard tier)
  if (activeEntitlements.length > 0) {
    return 'standard'
  }
  
  // No active entitlements - guest tier
  return 'guest'
}

// Helper function to get the appropriate package template key for user's tier
export function getPackageTemplateForUser(baseTemplate: BaseTemplate, userEntitlements: string[]): string {
  const userTier = getUserTierFromEntitlements(userEntitlements)
  const packageId = getPackageForUserTier(baseTemplate, userTier)
  
  // Return the package ID if it exists in PACKAGE_TYPES, otherwise fallback to base template
  if (packageId && PACKAGE_TYPES[packageId]) {
    return packageId
  }
  
  // Fallback to the base template if the mapped package doesn't exist
  return baseTemplate
}

// Helper function to get all available packages for a user based on their entitlements
export function getAvailablePackagesForUser(userEntitlements: string[]): Record<string, PackageTypeTemplate> {
  const userTier = getUserTierFromEntitlements(userEntitlements)
  const availablePackages: Record<string, PackageTypeTemplate> = {}
  
  // Get all base templates
  const baseTemplates: BaseTemplate[] = ['per_night', 'three_nights', 'weekly', 'monthly', 'wine_package']
  
  baseTemplates.forEach(baseTemplate => {
    const packageId = getPackageForUserTier(baseTemplate, userTier)
    if (packageId && PACKAGE_TYPES[packageId]) {
      availablePackages[packageId] = PACKAGE_TYPES[packageId]
    } else if (PACKAGE_TYPES[baseTemplate]) {
      // Fallback to base template if tier-specific package doesn't exist
      availablePackages[baseTemplate] = PACKAGE_TYPES[baseTemplate]
    }
  })
  
  return availablePackages
}

// Tier information for UI display
export const TIER_INFO: Record<string, TierInfo> = {
  standard: {
    name: 'Standard',
    color: 'blue',
    description: 'Basic features and support'
  },
  pro: {
    name: 'Pro',
    color: 'purple', 
    description: 'Enhanced features and priority support'
  },
  luxury: {
    name: 'Luxury',
    color: 'gold',
    description: 'Premium experience with hosted services'
  }
} 