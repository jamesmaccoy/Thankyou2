import type { Block } from 'payload'

export const StayDuration: Block = {
  slug: 'stayDuration',
  interfaceName: 'StayDurationBlock',
  fields: [
    {
      name: 'baseRateOverride',
      type: 'number',
      defaultValue: 150,
      label: 'Base Rate per Night',
      required: true,
    }
  ],
  labels: {
    singular: 'Stay Duration',
    plural: 'Stay Durations',
  },
} 