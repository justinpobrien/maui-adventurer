import type { Category, Region } from './types';

interface CategoryStyle {
  label: string;
  color: string;
  bg: string;
}

// Extends the tropical palette the prototype set up for 6 example categories
// (teal/blue/gold/green/plum/coral) out to the real 9-category taxonomy,
// keeping every hue distinct around the wheel.
export const CATEGORIES: Record<Category, CategoryStyle> = {
  beaches: { label: 'Beaches', color: '#2f8fa3', bg: '#dcedf0' },
  'snorkel-dive': { label: 'Snorkel & Dive', color: '#1f8a7a', bg: '#d7f0ea' },
  waterfalls: { label: 'Waterfalls', color: '#3a7fc4', bg: '#dde6f5' },
  hikes: { label: 'Hikes', color: '#4a8f4f', bg: '#e2f0e2' },
  'viewpoints-scenic': { label: 'Viewpoints & Scenic', color: '#5b6bbf', bg: '#e3e5f7' },
  'towns-culture': { label: 'Towns & Culture', color: '#9c5a86', bg: '#f4e3ef' },
  'tours-activities': { label: 'Tours & Activities', color: '#b8842a', bg: '#f6ecd6' },
  restaurants: { label: 'Restaurants', color: '#cf5a3f', bg: '#fbe0d8' },
  'kid-friendly-rainy-day': { label: 'Kid-Friendly & Rainy Day', color: '#c4577f', bg: '#f9e1ea' },
};

export const CATEGORY_ORDER: Category[] = [
  'beaches',
  'hikes',
  'waterfalls',
  'snorkel-dive',
  'restaurants',
  'towns-culture',
  'tours-activities',
  'viewpoints-scenic',
  'kid-friendly-rainy-day',
];

export const REGION_LABELS: Record<Region, string> = {
  'west-maui': 'West Maui',
  'south-maui': 'South Maui',
  central: 'Central Maui',
  upcountry: 'Upcountry',
  hana: 'Hana',
  haleakala: 'Haleakalā',
};
