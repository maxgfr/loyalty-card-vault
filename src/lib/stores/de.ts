import type { StoreConfig } from './types'

/**
 * German stores with pre-filled parameters
 */
export const DE_STORES: StoreConfig[] = [
  // Supermarkets
  {
    name: 'REWE',
    color: '#CC071E',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'PAYBACK Karte',
  },
  {
    name: 'EDEKA',
    color: '#005AA9',
    defaultTags: ['Supermarket', 'Food'],
  },
  {
    name: 'Lidl',
    color: '#0050AA',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'Lidl Plus',
  },
  {
    name: 'Aldi',
    color: '#00A0E3',
    defaultTags: ['Supermarket', 'Food'],
  },
  {
    name: 'Kaufland',
    color: '#E30613',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'Kaufland Card',
  },
  {
    name: 'Netto',
    color: '#FFD100',
    defaultTags: ['Supermarket', 'Food'],
  },
  {
    name: 'Penny',
    color: '#E30613',
    defaultTags: ['Supermarket', 'Food'],
  },

  // Electronics
  {
    name: 'Media Markt',
    color: '#E30613',
    defaultTags: ['Electronics'],
  },
  {
    name: 'Saturn',
    color: '#E30613',
    defaultTags: ['Electronics'],
  },

  // Fashion
  {
    name: 'C&A',
    color: '#E30613',
    defaultTags: ['Fashion'],
  },
  {
    name: 'H&M',
    color: '#E50010',
    defaultTags: ['Fashion'],
    defaultNotes: 'H&M Member',
  },
  {
    name: 'Zara',
    color: '#000000',
    defaultTags: ['Fashion'],
  },

  // Hardware & Home
  {
    name: 'Bauhaus',
    color: '#005AA9',
    defaultTags: ['Hardware', 'Home'],
  },
  {
    name: 'OBI',
    color: '#FF6600',
    defaultTags: ['Hardware', 'Home'],
  },
  {
    name: 'Hornbach',
    color: '#E30613',
    defaultTags: ['Hardware', 'Home'],
  },
  {
    name: 'IKEA',
    color: '#0051BA',
    defaultTags: ['Home'],
    defaultNotes: 'IKEA Family',
  },

  // Pharmacy
  {
    name: 'dm',
    color: '#005AA9',
    defaultTags: ['Pharmacy', 'Beauty', 'Health'],
    defaultNotes: 'PAYBACK Karte',
  },
  {
    name: 'Rossmann',
    color: '#E30613',
    defaultTags: ['Pharmacy', 'Beauty', 'Health'],
  },
  {
    name: 'Müller',
    color: '#E30613',
    defaultTags: ['Pharmacy', 'Beauty'],
  },

  // Fast Food & Coffee
  {
    name: 'McDonald\'s',
    color: '#FFC72C',
    defaultTags: ['Restaurant', 'Fast Food'],
    defaultNotes: 'MyMcDonald\'s Rewards',
  },
  {
    name: 'Burger King',
    color: '#EC1C24',
    defaultTags: ['Restaurant', 'Fast Food'],
  },
  {
    name: 'Starbucks',
    color: '#00704A',
    defaultTags: ['Coffee'],
    defaultNotes: 'Starbucks Rewards',
  },
  {
    name: 'Subway',
    color: '#008C15',
    defaultTags: ['Restaurant', 'Fast Food'],
  },
]
