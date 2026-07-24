import { useEffect, useState } from 'react';
import type { ArticleDetail } from '../lib/content';
import ContentLibrary from './ContentLibrary';
import type { CategoryOption } from './ContentLibrary';
import Itinerary from './Itinerary';
import { loadWishlist, saveWishlist } from '../lib/trip';

interface AppProps {
  articles: ArticleDetail[];
  categories: CategoryOption[];
}

type View = 'explore' | 'plan';

function navBtnStyle(active: boolean): React.CSSProperties {
  return {
    border: 'none',
    background: active ? '#cf6a3d' : 'transparent',
    color: active ? '#fff' : '#6b5a3e',
    fontSize: 14,
    fontWeight: 700,
    padding: '9px 20px',
    borderRadius: 10,
    cursor: 'pointer',
  };
}

export default function App({ articles, categories }: AppProps) {
  const [view, setView] = useState<View>('explore');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // localStorage is client-only; load after mount to avoid hydration mismatch.
  useEffect(() => {
    setWishlist(loadWishlist());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) saveWishlist(wishlist);
  }, [wishlist, hydrated]);

  const toggleWishlist = (slug: string) =>
    setWishlist((w) => (w.includes(slug) ? w.filter((s) => s !== slug) : [...w, slug]));
  const wishlistSet = new Set(wishlist);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 26,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: '#33291f', letterSpacing: '-0.01em' }}>
          TripLine <span style={{ color: '#cf6a3d' }}>·</span> Maui
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#fffdf9', border: '1px solid #ecdec7', borderRadius: 12, padding: 4 }}>
          <button onClick={() => setView('explore')} style={navBtnStyle(view === 'explore')}>
            Explore
          </button>
          <button onClick={() => setView('plan')} style={navBtnStyle(view === 'plan')}>
            Plan{wishlist.length > 0 ? ` · ${wishlist.length}♡` : ''}
          </button>
        </div>
      </div>

      {view === 'explore' ? (
        <ContentLibrary
          articles={articles}
          categories={categories}
          wishlist={wishlistSet}
          onToggleWishlist={toggleWishlist}
        />
      ) : (
        <Itinerary
          articles={articles}
          wishlist={wishlist}
          wishlistSet={wishlistSet}
          onToggleWishlist={toggleWishlist}
          onGoExplore={() => setView('explore')}
        />
      )}
    </div>
  );
}
