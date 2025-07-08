'use client'

import React, { useState } from 'react'
import { Check, ChevronDown, Clock, Home, Calendar, Wine, Crown, Star, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  PACKAGE_MAPPINGS, 
  PACKAGE_TYPES, 
  TIER_INFO,
  type BaseTemplate, 
  type UserTier 
} from '@/lib/package-types'

interface PackageSetupProps {
  className?: string
  onPackageCreate?: (config: PackageConfiguration) => void
}

interface PackageConfiguration {
  baseTemplate: BaseTemplate
  isHosted: boolean
  tier: UserTier
  packageId: string
  revenueCatId: string
  features: string[]
  pricing: {
    multiplier: number
    baseRate?: number
  }
}

interface DurationOption {
  value: BaseTemplate
  label: string
  description: string
  icon: React.ReactNode
  minDuration: string
  maxDuration: string
}

interface HostingOption {
  value: boolean
  label: string
  description: string
  icon: React.ReactNode
}

interface TierOption {
  value: UserTier
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const durationOptions: DurationOption[] = [
  {
    value: 'per_hour',
    label: 'Hourly',
    description: 'Short-term access by the hour',
    icon: <Clock className="h-4 w-4" />,
    minDuration: '1 hour',
    maxDuration: '24 hours'
  },
  {
    value: 'per_night',
    label: 'Nightly',
    description: 'Standard overnight stays',
    icon: <Home className="h-4 w-4" />,
    minDuration: '1 night',
    maxDuration: '6 nights'
  },
  {
    value: 'three_nights',
    label: 'Three Nights',
    description: 'Weekend getaway packages',
    icon: <Calendar className="h-4 w-4" />,
    minDuration: '3 nights',
    maxDuration: '7 nights'
  },
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Extended week-long stays',
    icon: <Calendar className="h-4 w-4" />,
    minDuration: '7 nights',
    maxDuration: '28 nights'
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Long-term monthly packages',
    icon: <Calendar className="h-4 w-4" />,
    minDuration: '30 nights',
    maxDuration: '365 nights'
  },
  {
    value: 'wine_package',
    label: 'Wine Package',
    description: 'Premium wine experience add-on',
    icon: <Wine className="h-4 w-4" />,
    minDuration: 'Add-on',
    maxDuration: 'Any duration'
  }
]

const hostingOptions: HostingOption[] = [
  {
    value: false,
    label: 'Self-Service',
    description: 'Independent access without host assistance',
    icon: <Zap className="h-4 w-4" />
  },
  {
    value: true,
    label: 'Hosted',
    description: 'Full-service with dedicated host support',
    icon: <Crown className="h-4 w-4" />
  }
]

const tierOptions: TierOption[] = [
  {
    value: 'guest',
    label: 'Guest',
    description: 'Basic access for unregistered users',
    icon: <Star className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-700'
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Standard features for registered users',
    icon: <Star className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700'
  },
  {
    value: 'pro',
    label: 'Pro',
    description: 'Enhanced features and priority support',
    icon: <Star className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-700'
  },
  {
    value: 'luxury',
    label: 'Luxury',
    description: 'Premium experience with concierge service',
    icon: <Crown className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-700'
  }
]

export function PackageMappingVisualization({ className, onPackageCreate }: PackageSetupProps) {
  const [selectedDuration, setSelectedDuration] = useState<BaseTemplate | null>(null)
  const [selectedHosting, setSelectedHosting] = useState<boolean | null>(null)
  const [selectedTier, setSelectedTier] = useState<UserTier | null>(null)
  const [durationOpen, setDurationOpen] = useState(false)
  const [hostingOpen, setHostingOpen] = useState(false)
  const [tierOpen, setTierOpen] = useState(false)

  // Get the current package configuration based on selections
  const getCurrentPackage = (): PackageConfiguration | null => {
    if (!selectedDuration || selectedTier === null) return null

    // Find the package mapping for this configuration
    const durationMapping = PACKAGE_MAPPINGS[selectedDuration]
    if (!durationMapping) return null

    const tierMapping = durationMapping[selectedTier]
    if (!tierMapping) return null

    const packageType = PACKAGE_TYPES[tierMapping.packageId]
    if (!packageType) return null

    return {
      baseTemplate: selectedDuration,
      isHosted: selectedHosting ?? false,
      tier: selectedTier,
      packageId: tierMapping.packageId,
      revenueCatId: tierMapping.revenueCatId,
      features: packageType.features,
      pricing: {
        multiplier: packageType.multiplier,
        baseRate: undefined // Will be set by the property
      }
    }
  }

  const currentPackage = getCurrentPackage()

  // Check if a hosting option is available for the current duration/tier combination
  const isHostingAvailable = (hosted: boolean): boolean => {
    if (!selectedDuration || selectedTier === null) return false
    
    const durationMapping = PACKAGE_MAPPINGS[selectedDuration]
    if (!durationMapping || !durationMapping[selectedTier]) return false

    const packageType = PACKAGE_TYPES[durationMapping[selectedTier].packageId]
    if (!packageType) return false

    // Check if the package supports the requested hosting level
    return hosted ? (packageType.isHosted === true) : true // Self-service is always available
  }

  // Get available tiers for the selected duration
  const getAvailableTiers = (): UserTier[] => {
    if (!selectedDuration) return []
    
    const durationMapping = PACKAGE_MAPPINGS[selectedDuration]
    if (!durationMapping) return []

    return Object.keys(durationMapping) as UserTier[]
  }

  const handleCreatePackage = () => {
    if (currentPackage && onPackageCreate) {
      onPackageCreate(currentPackage)
    }
  }

  const resetSelections = () => {
    setSelectedDuration(null)
    setSelectedHosting(null)
    setSelectedTier(null)
  }

  return (
    <div className={cn("space-y-6 p-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Setup your packages</h1>
        <p className="text-muted-foreground">
          Configure package combinations for your property by selecting duration, hosting level, and tier options.
          Create packages that match your guests' needs and your service capabilities.
        </p>
      </div>

      {/* Package Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Package Configuration Builder
          </CardTitle>
          <CardDescription>
            Select options below to create a package configuration. Each combination creates a unique package type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Duration Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Step 1: Choose Duration Type
            </label>
            <Popover open={durationOpen} onOpenChange={setDurationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={durationOpen}
                  className="w-full justify-between h-auto py-3"
                >
                  {selectedDuration ? (
                    <div className="flex items-center gap-3">
                      {durationOptions.find(option => option.value === selectedDuration)?.icon}
                      <div className="text-left">
                        <div className="font-medium">
                          {durationOptions.find(option => option.value === selectedDuration)?.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {durationOptions.find(option => option.value === selectedDuration)?.description}
                        </div>
                      </div>
                    </div>
                  ) : (
                    "Select duration type..."
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search duration types..." />
                  <CommandList>
                    <CommandEmpty>No duration type found.</CommandEmpty>
                    <CommandGroup>
                      {durationOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => {
                            setSelectedDuration(option.value)
                            setSelectedTier(null) // Reset tier when duration changes
                            setDurationOpen(false)
                          }}
                          className="py-3"
                        >
                          <div className="flex items-center gap-3">
                            {option.icon}
                            <div className="flex-1">
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Duration: {option.minDuration} - {option.maxDuration}
                              </div>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedDuration === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Step 2: Tier Selection (only show if duration is selected) */}
          {selectedDuration && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Step 2: Choose Tier Level
              </label>
              <Popover open={tierOpen} onOpenChange={setTierOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tierOpen}
                    className="w-full justify-between h-auto py-3"
                  >
                    {selectedTier ? (
                      <div className="flex items-center gap-3">
                        {tierOptions.find(option => option.value === selectedTier)?.icon}
                        <div className="text-left">
                          <div className="font-medium">
                            {tierOptions.find(option => option.value === selectedTier)?.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tierOptions.find(option => option.value === selectedTier)?.description}
                          </div>
                        </div>
                        <Badge className={tierOptions.find(option => option.value === selectedTier)?.color}>
                          {TIER_INFO[selectedTier]?.name || selectedTier}
                        </Badge>
                      </div>
                    ) : (
                      "Select tier level..."
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search tier levels..." />
                    <CommandList>
                      <CommandEmpty>No tier level found.</CommandEmpty>
                      <CommandGroup>
                        {tierOptions
                          .filter(option => getAvailableTiers().includes(option.value))
                          .map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              setSelectedTier(option.value)
                              setTierOpen(false)
                            }}
                            className="py-3"
                          >
                            <div className="flex items-center gap-3">
                              {option.icon}
                              <div className="flex-1">
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                              <Badge className={option.color}>
                                {TIER_INFO[option.value]?.name || option.label}
                              </Badge>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedTier === option.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Step 3: Hosting Selection (only show if duration and tier are selected) */}
          {selectedDuration && selectedTier && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Step 3: Choose Service Level
              </label>
              <Popover open={hostingOpen} onOpenChange={setHostingOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={hostingOpen}
                    className="w-full justify-between h-auto py-3"
                  >
                    {selectedHosting !== null ? (
                      <div className="flex items-center gap-3">
                        {hostingOptions.find(option => option.value === selectedHosting)?.icon}
                        <div className="text-left">
                          <div className="font-medium">
                            {hostingOptions.find(option => option.value === selectedHosting)?.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {hostingOptions.find(option => option.value === selectedHosting)?.description}
                          </div>
                        </div>
                      </div>
                    ) : (
                      "Select service level..."
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandEmpty>No service level found.</CommandEmpty>
                      <CommandGroup>
                        {hostingOptions
                          .filter(option => isHostingAvailable(option.value))
                          .map((option) => (
                          <CommandItem
                            key={option.value.toString()}
                            value={option.value.toString()}
                            onSelect={() => {
                              setSelectedHosting(option.value)
                              setHostingOpen(false)
                            }}
                            className="py-3"
                          >
                            <div className="flex items-center gap-3">
                              {option.icon}
                              <div className="flex-1">
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedHosting === option.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleCreatePackage}
              disabled={!currentPackage}
              className="flex-1"
            >
              Create Package Configuration
            </Button>
            <Button 
              variant="outline" 
              onClick={resetSelections}
              disabled={!selectedDuration && selectedTier === null && selectedHosting === null}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Package Preview */}
      {currentPackage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Package Preview
            </CardTitle>
            <CardDescription>
              Preview of your configured package based on current selections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">PACKAGE ID</label>
                <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                  {currentPackage.packageId}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">REVENUE CAT ID</label>
                <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                  {currentPackage.revenueCatId}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">MULTIPLIER</label>
                <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                  {currentPackage.pricing.multiplier}x
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">INCLUDED FEATURES</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentPackage.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {durationOptions.find(d => d.value === currentPackage.baseTemplate)?.label}
              </Badge>
              <Badge className={tierOptions.find(t => t.value === currentPackage.tier)?.color}>
                {currentPackage.tier.charAt(0).toUpperCase() + currentPackage.tier.slice(1)}
              </Badge>
              <Badge variant={currentPackage.isHosted ? "default" : "secondary"}>
                {currentPackage.isHosted ? "Hosted" : "Self-Service"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Package Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Duration Types:</span> Define the booking period - from hourly access to monthly stays.
          </div>
          <div>
            <span className="font-medium">Tier Levels:</span> Set access levels based on user subscriptions and entitlements.
          </div>
          <div>
            <span className="font-medium">Service Levels:</span> Choose between self-service access or full hosting support.
          </div>
          <div className="pt-2 text-xs">
            💡 Each combination creates a unique package that can be offered to guests based on their subscription tier.
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 