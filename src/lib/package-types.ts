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
  icon: string // Lucide icon name
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
  icon: string // Lucide icon name
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
    icon: 'camera'
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
    icon: 'crown'
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
    icon: 'calendar-days'
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
    icon: 'user-check'
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
    icon: 'calendar-range'
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
    icon: 'user-check'
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
    icon: 'wine'
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
    revenueCatId: "per_night_pro",
    minNights: 1,
    maxNights: 1,
    category: 'standard',
    icon: 'star'
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
    revenueCatId: "3nights_pro",
    minNights: 3,
    maxNights: 3,
    category: 'standard',
    icon: 'crown'
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
    revenueCatId: "weekly_pro",
    minNights: 7,
    maxNights: 7,
    category: 'standard',
    icon: 'briefcase'
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
    icon: 'calendar'
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

// Get icon name for a package type
export const getPackageIcon = (packageTypeId: string): string => {
  const packageType = getPackageById(packageTypeId)
  return packageType?.icon || 'package'
} 