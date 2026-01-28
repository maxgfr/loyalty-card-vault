/**
 * Predefined tag categories for loyalty cards
 */

export const TAG_CATEGORIES = {
  FR: [
    'Supermarché',
    'Alimentation',
    'Mode',
    'Beauté',
    'Sport',
    'Bricolage',
    'Maison',
    'Électronique',
    'Multimédia',
    'Restaurant',
    'Fast-food',
    'Café',
    'Carburant',
    'Pharmacie',
    'Santé',
    'Loisirs',
    'Culture',
    'Livres',
    'Jouets',
    'Animaux',
  ],
  US: [
    'Grocery',
    'Food',
    'Fashion',
    'Beauty',
    'Sports',
    'Hardware',
    'Home',
    'Electronics',
    'Media',
    'Restaurant',
    'Fast Food',
    'Coffee',
    'Gas Station',
    'Pharmacy',
    'Health',
    'Entertainment',
    'Culture',
    'Books',
    'Toys',
    'Pets',
  ],
  INTL: [
    'Shopping',
    'Food & Drink',
    'Lifestyle',
    'Services',
    'Travel',
    'Fitness',
    'Entertainment',
  ],
}

/**
 * Get tag suggestions based on user's locale
 */
export function getTagSuggestions(country?: 'FR' | 'US' | 'INTL'): string[] {
  const locale = country || detectUserCountry()
  const countryTags = TAG_CATEGORIES[locale] || []
  const intlTags = TAG_CATEGORIES.INTL || []

  // Merge country-specific tags with international tags
  return [...countryTags, ...intlTags]
}

/**
 * Detect user's country from browser locale
 */
function detectUserCountry(): 'FR' | 'US' | 'INTL' {
  const locale = navigator.language || 'en-US'

  if (locale.startsWith('fr')) return 'FR'
  if (locale.startsWith('en-US') || locale.startsWith('en-GB')) return 'US'

  return 'INTL'
}

/**
 * Auto-suggest tags based on store name
 */
export function suggestTagsForStore(storeName: string): string[] {
  if (!storeName) return []

  const suggestions: string[] = []

  // French store categories
  if (/carrefour|auchan|leclerc|intermarch|casino|monoprix|franprix|lidl|biocoop/i.test(storeName)) {
    suggestions.push('Supermarché', 'Alimentation')
  }
  if (/mcdonald|quick|kfc|subway|burger king/i.test(storeName)) {
    suggestions.push('Restaurant', 'Fast-food')
  }
  if (/starbucks|paul|caf/i.test(storeName)) {
    suggestions.push('Café')
  }
  if (/sephora|nocib|marionnaud/i.test(storeName)) {
    suggestions.push('Beauté')
  }
  if (/h&m|zara|kiabi/i.test(storeName)) {
    suggestions.push('Mode')
  }
  if (/d[ée]cathlon|go sport/i.test(storeName)) {
    suggestions.push('Sport')
  }
  if (/fnac|darty|boulanger|micromania/i.test(storeName)) {
    suggestions.push('Électronique', 'Multimédia')
  }
  if (/leroy merlin|castorama|bricomarch/i.test(storeName)) {
    suggestions.push('Bricolage', 'Maison')
  }
  if (/ikea|but|conforama/i.test(storeName)) {
    suggestions.push('Maison')
  }
  if (/pharmacie|parapharmacie/i.test(storeName)) {
    suggestions.push('Pharmacie', 'Santé')
  }
  if (/total|bp|esso|shell/i.test(storeName)) {
    suggestions.push('Carburant')
  }
  if (/cultura|nature.*d[ée]couvertes/i.test(storeName)) {
    suggestions.push('Culture', 'Loisirs')
  }

  // US store categories
  if (/target|walmart|costco|sam's club|kroger|safeway/i.test(storeName)) {
    suggestions.push('Grocery', 'Shopping')
  }
  if (/cvs|walgreens/i.test(storeName)) {
    suggestions.push('Pharmacy', 'Health')
  }
  if (/best buy/i.test(storeName)) {
    suggestions.push('Electronics')
  }
  if (/home depot/i.test(storeName)) {
    suggestions.push('Hardware', 'Home')
  }
  if (/whole foods|trader joe/i.test(storeName)) {
    suggestions.push('Grocery', 'Food')
  }
  if (/petco|petsmart/i.test(storeName)) {
    suggestions.push('Pets')
  }
  if (/gamestop/i.test(storeName)) {
    suggestions.push('Electronics', 'Entertainment')
  }
  if (/barnes.*noble/i.test(storeName)) {
    suggestions.push('Books', 'Culture')
  }
  if (/amc|regal/i.test(storeName)) {
    suggestions.push('Entertainment')
  }
  if (/marriott|hilton/i.test(storeName)) {
    suggestions.push('Travel')
  }
  if (/delta|united|southwest/i.test(storeName)) {
    suggestions.push('Travel')
  }

  return suggestions
}
