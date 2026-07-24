import type { Attraction } from './types';
import { CATEGORIES, REGION_LABELS } from './categories';

const WORDS_PER_MINUTE = 200;

export interface TripDetail {
  label: string;
  value: string;
}

export interface ArticleCard {
  slug: string;
  title: string;
  categoryId: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  summary: string;
  location: string;
  readTime: string;
  stripeBg: string;
  // Scheduling fields the itinerary builder needs to fit an attraction into a
  // free-time gap and rank recommendations by proximity.
  minTimeMinutes: number;
  regionId: string;
  coordinates: [number, number] | null;
}

export interface ArticleDetail extends ArticleCard {
  overview: string;
  tips: string[];
  tripDetails: TripDetail[];
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function readTimeFor(body: string): string {
  const minutes = Math.max(1, Math.round(wordCount(body) / WORDS_PER_MINUTE));
  return `${minutes} min`;
}

/** First sentence of the body, truncated, used as the card summary. */
export function summaryFor(body: string, maxLength = 140): string {
  const firstParagraph = body.trim().split(/\n\s*\n/)[0] ?? '';
  const firstSentenceMatch = firstParagraph.match(/^.*?[.!?](?=\s|$)/);
  const sentence = (firstSentenceMatch ? firstSentenceMatch[0] : firstParagraph).trim();
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function tripDetailsFor(a: Attraction): TripDetail[] {
  const details: TripDetail[] = [];
  details.push({ label: 'Time', value: formatDuration(a.min_time_minutes) });
  if (a.difficulty) details.push({ label: 'Difficulty', value: titleCase(a.difficulty) });
  const price = a.price ?? a.price_range;
  if (price) details.push({ label: 'Price', value: titleCase(price) });
  if (a.kid_friendly) details.push({ label: 'Kid-friendly', value: 'Yes' });
  return details;
}

function stripeBgFor(bg: string): string {
  return `repeating-linear-gradient(45deg, ${bg}, ${bg} 8px, #fdf3e6 8px, #fdf3e6 16px)`;
}

export function toArticleCard(a: Attraction): ArticleCard {
  const style = CATEGORIES[a.category];
  return {
    slug: a.slug,
    title: a.name,
    categoryId: a.category,
    category: style.label,
    categoryColor: style.color,
    categoryBg: style.bg,
    summary: summaryFor(a.body),
    location: REGION_LABELS[a.region],
    readTime: readTimeFor(a.body),
    stripeBg: stripeBgFor(style.bg),
    minTimeMinutes: a.min_time_minutes,
    regionId: a.region,
    coordinates: Array.isArray(a.coordinates) ? a.coordinates : null,
  };
}

export function toArticleDetail(a: Attraction): ArticleDetail {
  return {
    ...toArticleCard(a),
    overview: a.body.trim(),
    tips: a.tips,
    tripDetails: tripDetailsFor(a),
  };
}
