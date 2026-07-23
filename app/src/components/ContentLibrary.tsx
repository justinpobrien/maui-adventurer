import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ArticleDetail } from '../lib/content';

export interface CategoryOption {
  id: string;
  label: string;
  color: string;
  bg: string;
}

interface ContentLibraryProps {
  articles: ArticleDetail[];
  categories: CategoryOption[];
}

const ALL = 'All';

function chipStyle(color: string, bg: string, borderColor: string): CSSProperties {
  return {
    flex: 'none',
    border: `1px solid ${borderColor}`,
    background: bg,
    color,
    fontSize: 13,
    fontWeight: 700,
    padding: '9px 15px',
    borderRadius: 20,
    cursor: 'pointer',
  };
}

function categoryChipStyle(cat: CategoryOption, active: boolean): CSSProperties {
  if (cat.id === ALL) {
    return active ? chipStyle('#fff', '#cf6a3d', '#cf6a3d') : chipStyle('#6b5a3e', '#fffdf9', '#ecdec7');
  }
  return active ? chipStyle('#fff', cat.color, cat.color) : chipStyle(cat.color, cat.bg, cat.bg);
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 14, top: 13 }}>
      <circle cx="11" cy="11" r="7" stroke="#b3a583" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="#b3a583" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhotoPlaceholder({
  height,
  borderRadius,
  stripeBg,
  imgSrc,
  alt,
}: {
  height: number;
  borderRadius?: number;
  stripeBg: string;
  imgSrc?: string;
  alt?: string;
}) {
  // The striped background + "photo" label stay underneath and show while the
  // image loads or if it's missing (onError hides a 404'd <img>).
  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius,
        background: stripeBg,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span className="mono" style={{ fontSize: borderRadius ? 12 : 11, color: '#9c8a6a' }}>
        photo
      </span>
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt ?? ''}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  );
}

export default function ContentLibrary({ articles, categories }: ContentLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      articles.filter(
        (a) => (selectedCategory === ALL || a.categoryId === selectedCategory) && (!q || a.title.toLowerCase().includes(q))
      ),
    [articles, selectedCategory, q]
  );

  const current = openSlug ? articles.find((a) => a.slug === openSlug) ?? null : null;
  const related = current
    ? articles.filter((a) => a.categoryId === current.categoryId && a.slug !== current.slug).slice(0, 3)
    : [];

  const categoryOptions: CategoryOption[] = [{ id: ALL, label: ALL, color: '', bg: '' }, ...categories];

  if (current) {
    return (
      <div>
        <button
          className="back-btn"
          onClick={() => setOpenSlug(null)}
          style={{
            border: '1px solid #ecdec7',
            background: '#fffdf9',
            color: '#6b5a3e',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 20,
          }}
        >
          <BackIcon />
          Back to library
        </button>

        <div style={{ marginBottom: 22 }}>
          <PhotoPlaceholder
            height={220}
            borderRadius={18}
            stripeBg={current.stripeBg}
            imgSrc={`/images/attractions/${current.slug}.webp`}
            alt={current.title}
          />
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: current.categoryColor,
            background: current.categoryBg,
            padding: '4px 10px',
            borderRadius: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {current.category}
        </span>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#33291f', letterSpacing: '-0.01em', margin: '12px 0 6px' }}>
          {current.title}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#9c8a6a', marginBottom: 20 }}>
          <span>{current.location}</span>
          <span className="mono">{current.readTime} read</span>
        </div>

        <div style={{ fontSize: 16, color: '#4a3f2e', lineHeight: 1.65, maxWidth: 640, marginBottom: 26 }}>
          {current.overview}
        </div>

        <div style={{ maxWidth: 640, marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#33291f', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
            Trip details
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            {current.tripDetails.map((d) => (
              <div key={d.label} style={{ fontSize: 14.5, color: '#4a3f2e', lineHeight: 1.6 }}>
                <span style={{ color: '#9c8a6a' }}>{d.label}</span>{' '}
                <span style={{ fontWeight: 600 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 640, marginBottom: 36 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#33291f', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 10 }}>
            Good to know
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {current.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14, color: '#4a3f2e', lineHeight: 1.5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cf6a3d', marginTop: 7, flex: 'none' }} />
                {tip}
              </div>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#33291f', marginBottom: 12 }}>More like this</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {related.map((rel) => (
                <button
                  key={rel.slug}
                  onClick={() => setOpenSlug(rel.slug)}
                  style={{
                    border: '1px solid #ecdec7',
                    background: '#fffdf9',
                    color: '#6b5a3e',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '9px 14px',
                    borderRadius: 20,
                    cursor: 'pointer',
                  }}
                >
                  {rel.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#9c8a6a', textTransform: 'uppercase', marginBottom: 4 }}>
          TripLine · Content Library
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#33291f', letterSpacing: '-0.01em', marginBottom: 6 }}>
          Things to do on Maui
        </div>
        <div style={{ fontSize: 14, color: '#7a6a52', maxWidth: 520, lineHeight: 1.5 }}>
          Structured guides for beaches, adventures, and local spots — written to help you fill the gaps in your itinerary.
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <SearchIcon />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          style={{
            width: '100%',
            border: '1px solid #ecdec7',
            background: '#fffdf9',
            borderRadius: 12,
            padding: '12px 14px 12px 40px',
            fontSize: 14,
            color: '#33291f',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 26, overflowX: 'auto', paddingBottom: 2 }}>
        {categoryOptions.map((cat) => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={categoryChipStyle(cat, selectedCategory === cat.id)}>
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
        {filtered.map((art) => (
          <div
            key={art.slug}
            onClick={() => setOpenSlug(art.slug)}
            style={{
              background: '#fffdf9',
              border: '1px solid #ecdec7',
              borderRadius: 16,
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PhotoPlaceholder
              height={140}
              stripeBg={art.stripeBg}
              imgSrc={`/images/attractions/${art.slug}-thumb.webp`}
              alt={art.title}
            />
            <div style={{ padding: '15px 16px 17px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: art.categoryColor,
                    background: art.categoryBg,
                    padding: '3px 9px',
                    borderRadius: 20,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {art.category}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#33291f', lineHeight: 1.3 }}>{art.title}</div>
              <div style={{ fontSize: 13, color: '#7a6a52', lineHeight: 1.45, flex: 1 }}>{art.summary}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#9c8a6a', marginTop: 4 }}>
                <span>{art.location}</span>
                <span className="mono">{art.readTime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9c8a6a', fontSize: 14 }}>No articles match your search.</div>
      )}
    </div>
  );
}
