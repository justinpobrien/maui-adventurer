export type Category =
  | 'beaches'
  | 'hikes'
  | 'waterfalls'
  | 'snorkel-dive'
  | 'restaurants'
  | 'towns-culture'
  | 'tours-activities'
  | 'viewpoints-scenic'
  | 'kid-friendly-rainy-day';

export type Region =
  | 'west-maui'
  | 'south-maui'
  | 'central'
  | 'upcountry'
  | 'hana'
  | 'haleakala';

export type Difficulty = 'easy' | 'moderate' | 'strenuous';

/** Raw shape of a single attraction doc, matching the markdown frontmatter schema + parsed body. */
export interface Attraction {
  slug: string;
  name: string;
  category: Category;
  subcategory: string;
  region: Region;
  coordinates: [number, number];
  min_time_minutes: number;
  difficulty?: Difficulty;
  price?: string;
  price_range?: string;
  kid_friendly: boolean;
  tags: string[];
  resource_link: string;
  tips: string[];
  image_prompt: string;
  last_updated: string;
  body: string;
}
