import type { StoreConfig } from './types'

/**
 * French stores with pre-filled parameters
 */
export const FR_STORES: StoreConfig[] = [
  // Supermarkets
  {
    name: 'Carrefour',
    color: '#005AA9',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'Carte de fidélité Carrefour',
  },
  {
    name: 'Auchan',
    color: '#ED1C24',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'Carte Waaoh',
  },
  {
    name: 'Leclerc',
    color: '#005CAB',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'Carte E.Leclerc',
  },
  {
    name: 'Intermarché',
    color: '#E30613',
    defaultTags: ['Supermarket', 'Food'],
  },
  {
    name: 'Super U',
    color: '#ED1C24',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'Carte U',
  },
  {
    name: 'Lidl',
    color: '#0050AA',
    defaultTags: ['Supermarket', 'Food'],
    defaultNotes: 'Lidl Plus',
  },
  {
    name: 'Casino',
    color: '#E30613',
    defaultTags: ['Supermarket', 'Food'],
  },
  {
    name: 'Monoprix',
    color: '#E30613',
    defaultTags: ['Supermarket', 'Food'],
  },
  {
    name: 'Franprix',
    color: '#00A650',
    defaultTags: ['Supermarket', 'Food'],
  },
  {
    name: 'Biocoop',
    color: '#6BB43F',
    defaultTags: ['Supermarket', 'Food', 'Health'],
    defaultNotes: 'Carte de fidélité Bio',
  },

  // Restaurants & Coffee
  {
    name: 'McDonald\'s',
    color: '#FFC72C',
    defaultTags: ['Restaurant', 'Fast Food'],
    defaultNotes: 'MyMcDonald\'s Rewards',
  },
  {
    name: 'Quick',
    color: '#ED1C24',
    defaultTags: ['Restaurant', 'Fast Food'],
  },
  {
    name: 'KFC',
    color: '#E4002B',
    defaultTags: ['Restaurant', 'Fast Food'],
  },
  {
    name: 'Subway',
    color: '#008C15',
    defaultTags: ['Restaurant', 'Fast Food'],
    defaultNotes: 'Subway MyWay Rewards',
  },
  {
    name: 'Burger King',
    color: '#EC1C24',
    defaultTags: ['Restaurant', 'Fast Food'],
  },
  {
    name: 'Paul',
    color: '#8B4513',
    defaultTags: ['Coffee', 'Food'],
  },
  {
    name: 'Starbucks',
    color: '#00704A',
    defaultTags: ['Coffee'],
    defaultNotes: 'Starbucks Rewards',
  },

  // Fashion & Beauty
  {
    name: 'Sephora',
    color: '#000000',
    defaultTags: ['Beauty'],
    defaultNotes: 'Beauty Insider',
  },
  {
    name: 'Nocibé',
    color: '#E30613',
    defaultTags: ['Beauty'],
  },
  {
    name: 'Marionnaud',
    color: '#E4002B',
    defaultTags: ['Beauty'],
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
  {
    name: 'Décathlon',
    color: '#0082C3',
    defaultTags: ['Sports'],
    defaultNotes: 'Carte Décathlon',
  },
  {
    name: 'Go Sport',
    color: '#ED1C24',
    defaultTags: ['Sports'],
  },
  {
    name: 'Kiabi',
    color: '#E30613',
    defaultTags: ['Fashion'],
  },

  // Electronics & Media
  {
    name: 'Fnac',
    color: '#F39200',
    defaultTags: ['Electronics', 'Media', 'Books'],
    defaultNotes: 'Carte Fnac+',
  },
  {
    name: 'Darty',
    color: '#E30613',
    defaultTags: ['Electronics'],
    defaultNotes: 'Carte Darty',
  },
  {
    name: 'Boulanger',
    color: '#E30613',
    defaultTags: ['Electronics'],
  },
  {
    name: 'Micromania',
    color: '#ED1C24',
    defaultTags: ['Electronics', 'Entertainment'],
    defaultNotes: 'Carte MégaMic',
  },

  // Hardware & Home
  {
    name: 'Leroy Merlin',
    color: '#78BE20',
    defaultTags: ['Hardware', 'Home'],
    defaultNotes: 'Carte Maison',
  },
  {
    name: 'Castorama',
    color: '#0072BB',
    defaultTags: ['Hardware', 'Home'],
  },
  {
    name: 'Bricomarché',
    color: '#E30613',
    defaultTags: ['Hardware', 'Home'],
  },
  {
    name: 'Ikea',
    color: '#0051BA',
    defaultTags: ['Home'],
    defaultNotes: 'IKEA Family',
  },
  {
    name: 'BUT',
    color: '#E30613',
    defaultTags: ['Home'],
  },
  {
    name: 'Conforama',
    color: '#E30613',
    defaultTags: ['Home'],
  },

  // Pharmacy & Health
  {
    name: 'Pharmacie',
    color: '#00A650',
    defaultTags: ['Pharmacy', 'Health'],
  },
  {
    name: 'Parapharmacie Leclerc',
    color: '#005CAB',
    defaultTags: ['Pharmacy', 'Health'],
  },

  // Gas Stations
  {
    name: 'Total',
    color: '#EE3124',
    defaultTags: ['Gas Station'],
    defaultNotes: 'TotalEnergies Club',
  },
  {
    name: 'BP',
    color: '#008A00',
    defaultTags: ['Gas Station'],
  },
  {
    name: 'Esso',
    color: '#E31937',
    defaultTags: ['Gas Station'],
  },
  {
    name: 'Shell',
    color: '#FFD100',
    defaultTags: ['Gas Station'],
  },

  // Other
  {
    name: 'Nature & Découvertes',
    color: '#6BB43F',
    defaultTags: ['Culture', 'Entertainment'],
  },
  {
    name: 'Cultura',
    color: '#F39200',
    defaultTags: ['Culture', 'Books'],
  },
  {
    name: 'Action',
    color: '#E30613',
    defaultTags: ['Shopping'],
  },
]
