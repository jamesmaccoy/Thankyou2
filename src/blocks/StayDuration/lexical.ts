import { BlocksFeature } from '@payloadcms/richtext-lexical'
import { StayDuration } from './config'

export const StayDurationFeature = () => {
  return BlocksFeature({
    blocks: [StayDuration],
  })
} 