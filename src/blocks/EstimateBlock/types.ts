export interface EstimateBlockType {
  blockType: 'stayDuration'
  baseRateOverride?: number
  packageTypes?: Array<{
    name: string
    description?: string
    price?: number
  }>
  id?: string
  blockName?: string
} 