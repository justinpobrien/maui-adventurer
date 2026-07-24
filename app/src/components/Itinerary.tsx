import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ArticleDetail } from '../lib/content';
import {
  EVENT_CATEGORY,
  buildTimeline,
  dayStats,
  decodeTrip,
  defaultTrip,
  encodeTrip,
  formatDuration,
  loadTrip,
  minutesToLabel,
  newId,
  parseTimeInput,
  recommendForGap,
  saveTrip,
  timeRange,
  toTimeInput,
  tripDays,
  tripToICS,
  usedSlugs,
} from '../lib/trip';
import type { EventCategory, TripEvent, Trip } from '../lib/trip';

interface ItineraryProps {
  articles: ArticleDetail[];
  wishlist: string[];
  wishlistSet: Set<string>;
  onToggleWishlist: (slug: string) => void;
  onGoExplore: () => void;
}

// ---- small building blocks ----------------------------------------------
function EventIcon({ category, color }: { category: EventCategory; color: string }) {
  const p = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (category) {
    case 'transit':
      return <svg width="17" height="17" viewBox="0 0 24 24"><path d="M2 16l20-7-7 9 2 6-4-3-4 3 1-6-8-2z" {...p} /></svg>;
    case 'lodging':
      return <svg width="17" height="17" viewBox="0 0 24 24"><path d="M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6M3 18v2M21 18v2M3 13h18M7 9V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" {...p} /></svg>;
    case 'food':
      return <svg width="17" height="17" viewBox="0 0 24 24"><path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v9M11 3v9M17 3c-1.5 0-3 1.5-3 4v3h3v11" {...p} /></svg>;
    case 'car':
      return <svg width="17" height="17" viewBox="0 0 24 24"><path d="M5 16v-3.5l1.8-4.2A2 2 0 0 1 8.65 7h6.7a2 2 0 0 1 1.85 1.3L19 12.5V16M5 16h14M5 16v2.5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V16M19 16v2.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V16M7.5 13h9" {...p} /></svg>;
    case 'activity':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
          <path d="M15 9l-2.2 5.8L9 17l2.2-5.8L15 9Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill={color} fillOpacity="0.15" />
        </svg>
      );
    default:
      return <svg width="17" height="17" viewBox="0 0 24 24"><path d="M12 2l2.6 6.6 7.1.5-5.5 4.5 1.9 6.9L12 16.8 5.9 20.5l1.9-6.9-5.5-4.5 7.1-.5L12 2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill="none" /></svg>;
  }
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(51,41,31,0.34)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 16px',
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, background: '#fffdf9', border: '1px solid #ecdec7', borderRadius: 18, padding: 22, boxShadow: '0 12px 40px rgba(60,40,15,0.18)' }}
      >
        {children}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #ecdec7',
  background: '#fffdf9',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  color: '#33291f',
  outline: 'none',
};
const labelStyle: CSSProperties = { fontSize: 12, fontWeight: 700, color: '#7a6a52', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 5, display: 'block' };
const primaryBtn: CSSProperties = { border: 'none', background: '#cf6a3d', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' };
const ghostBtn: CSSProperties = { border: '1px solid #ecdec7', background: '#fffdf9', color: '#6b5a3e', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 10, cursor: 'pointer' };

// ---- event editor --------------------------------------------------------
interface EditorState {
  id: string | null;
  title: string;
  category: EventCategory;
  location: string;
  start: number;
  durationMin: number;
}

function EventEditor({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: EditorState;
  onSave: (s: EditorState) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [s, setS] = useState<EditorState>(initial);
  const set = <K extends keyof EditorState>(k: K, v: EditorState[K]) => setS((prev) => ({ ...prev, [k]: v }));

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#33291f', marginBottom: 16 }}>{s.id ? 'Edit event' : 'Add event'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={s.title} placeholder="Flight lands — OGG" onChange={(e) => set('title', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={s.category} onChange={(e) => set('category', e.target.value as EventCategory)}>
            {Object.entries(EVENT_CATEGORY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={s.location} placeholder="Kahului Airport (OGG)" onChange={(e) => set('location', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start</label>
            <input type="time" style={inputStyle} value={toTimeInput(s.start)} onChange={(e) => set('start', parseTimeInput(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Duration (min)</label>
            <input type="number" min={0} step={15} style={inputStyle} value={s.durationMin} onChange={(e) => set('durationMin', Math.max(0, Number(e.target.value)))} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
        <div>
          {onDelete && (
            <button onClick={onDelete} style={{ ...ghostBtn, color: '#cf5a3f', borderColor: '#f2d3ca' }}>
              Delete
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={ghostBtn}>
            Cancel
          </button>
          <button
            onClick={() => s.title.trim() && onSave(s)}
            style={{ ...primaryBtn, opacity: s.title.trim() ? 1 : 0.5, cursor: s.title.trim() ? 'pointer' : 'not-allowed' }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---- gap picker ----------------------------------------------------------
function GapPicker({
  gapMinutes,
  articles,
  wishlistSet,
  used,
  regionHint,
  onPick,
  onClose,
}: {
  gapMinutes: number;
  articles: ArticleDetail[];
  wishlistSet: Set<string>;
  used: Set<string>;
  regionHint: string | null;
  onPick: (a: ArticleDetail) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const ranked = useMemo(
    () => recommendForGap(gapMinutes, articles, { wishlist: wishlistSet, used, regionHint }) as ArticleDetail[],
    [gapMinutes, articles, wishlistSet, used, regionHint]
  );
  const filtered = q.trim() ? ranked.filter((a) => a.title.toLowerCase().includes(q.trim().toLowerCase())) : ranked;

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#33291f', marginBottom: 2 }}>Fill {formatDuration(gapMinutes)} of free time</div>
      <div style={{ fontSize: 12.5, color: '#9c8a6a', marginBottom: 14 }}>
        Only things that fit are shown{regionHint ? ' — nearby options first' : ''}. ♡ = on your wishlist.
      </div>
      <input style={{ ...inputStyle, marginBottom: 12 }} value={q} placeholder="Search fitting activities…" onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
        {filtered.length === 0 && <div style={{ fontSize: 13, color: '#9c8a6a', padding: '16px 0' }}>Nothing in the library fits this gap. Try a longer gap or add a custom event.</div>}
        {filtered.slice(0, 40).map((a) => (
          <button
            key={a.slug}
            onClick={() => onPick(a)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', border: '1px solid #ecdec7', background: '#fffdf9', borderRadius: 12, padding: 8, cursor: 'pointer' }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 9, flex: 'none', background: a.stripeBg, overflow: 'hidden' }}>
              <img src={`/images/attractions/${a.slug}-thumb.webp`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#33291f', display: 'flex', alignItems: 'center', gap: 6 }}>
                {wishlistSet.has(a.slug) && <span style={{ color: '#cf6a3d' }}>♡</span>}
                {a.title}
              </div>
              <div style={{ fontSize: 11.5, color: '#9c8a6a', marginTop: 1 }}>
                {a.category} · {a.location} · {formatDuration(a.minTimeMinutes)}
              </div>
            </div>
            <span style={{ ...primaryBtn, padding: '6px 12px', fontSize: 12, flex: 'none' }}>Add</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={ghostBtn}>
          Close
        </button>
      </div>
    </Modal>
  );
}

// ---- main ----------------------------------------------------------------
export default function Itinerary({ articles, wishlist, wishlistSet, onToggleWishlist, onGoExplore }: ItineraryProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [editor, setEditor] = useState<null | { event?: TripEvent; presetStart?: number }>(null);
  const [picker, setPicker] = useState<null | { start: number; minutes: number; regionHint: string | null }>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    if (typeof location !== 'undefined' && location.hash.startsWith('#trip=')) {
      const imported = decodeTrip(location.hash.slice('#trip='.length));
      history.replaceState(null, '', location.pathname + location.search);
      if (imported) {
        setTrip(imported);
        setHydrated(true);
        return;
      }
    }
    setTrip(loadTrip() ?? defaultTrip());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated && trip) saveTrip(trip);
  }, [trip, hydrated]);

  if (!trip) return <div style={{ padding: 40, color: '#9c8a6a' }}>Loading your trip…</div>;

  const days = tripDays(trip);
  const day = Math.min(selectedDay, Math.max(0, days.length - 1));
  const currentDay = days[day];
  const timeline = buildTimeline(trip, day);
  const stats = dayStats(trip, day);
  const used = usedSlugs(trip);

  // suggestions rail: wishlist items not yet scheduled first, then a variety.
  const suggestions = [
    ...articles.filter((a) => wishlistSet.has(a.slug) && !used.has(a.slug)),
    ...articles.filter((a) => !wishlistSet.has(a.slug) && !used.has(a.slug)),
  ].slice(0, 10);

  // ---- mutations ----
  const mutate = (fn: (t: Trip) => Trip) => setTrip((t) => (t ? fn(t) : t));
  const upsertEvent = (ev: TripEvent) =>
    mutate((t) => {
      const list = (t.eventsByDay[day] || []).filter((e) => e.id !== ev.id);
      return { ...t, eventsByDay: { ...t.eventsByDay, [day]: [...list, ev] } };
    });
  const deleteEvent = (id: string) =>
    mutate((t) => ({ ...t, eventsByDay: { ...t.eventsByDay, [day]: (t.eventsByDay[day] || []).filter((e) => e.id !== id) } }));

  const addContentToGap = (a: ArticleDetail, start: number, gapMinutes: number) => {
    const cat: EventCategory = a.categoryId === 'restaurants' ? 'food' : 'activity';
    upsertEvent({
      id: newId(),
      kind: 'content',
      title: a.title,
      location: a.location,
      category: cat,
      start,
      durationMin: Math.min(a.minTimeMinutes || 60, gapMinutes),
      slug: a.slug,
      colorHint: a.categoryColor,
      regionId: a.regionId,
      coordinates: a.coordinates,
    });
  };

  const doExport = () => {
    const blob = new Blob([tripToICS(trip)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'trip'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const doShare = async () => {
    const url = `${location.origin}${location.pathname}#trip=${encodeTrip(trip)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('Share link copied!');
    } catch {
      setShareMsg('Copy failed — link in address bar');
      history.replaceState(null, '', url);
    }
    setTimeout(() => setShareMsg(''), 2500);
  };

  const headerBtn: CSSProperties = { border: '1px solid #ecdec7', background: '#fffdf9', color: '#6b5a3e', fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

  return (
    <div>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#9c8a6a', textTransform: 'uppercase', marginBottom: 4 }}>
            {trip.title} · Maui, HI
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#33291f', letterSpacing: '-0.01em' }}>{currentDay?.dateLabel ?? 'Set your dates'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setSettingsOpen(true)} style={headerBtn}>
            Edit trip
          </button>
          <button onClick={doExport} style={headerBtn}>
            Export
          </button>
          <button onClick={doShare} style={{ ...headerBtn, border: 'none', background: '#cf6a3d', color: '#fff' }}>
            {shareMsg || 'Share'}
          </button>
        </div>
      </div>

      {/* day tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, overflowX: 'auto', paddingBottom: 2 }}>
        {days.map((d) => {
          const active = d.index === day;
          return (
            <button
              key={d.index}
              onClick={() => setSelectedDay(d.index)}
              style={{
                flex: 'none',
                border: `1px solid ${active ? '#cf6a3d' : '#ecdec7'}`,
                background: active ? '#cf6a3d' : '#fffdf9',
                color: active ? '#fff' : '#6b5a3e',
                fontSize: 13,
                fontWeight: 700,
                padding: '9px 16px',
                borderRadius: 11,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1,
                lineHeight: 1.2,
              }}
            >
              <span>{d.label}</span>
              <span className="mono" style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.75 }}>
                {d.shortDate}
              </span>
            </button>
          );
        })}
      </div>

      {/* summary strip */}
      <div style={{ display: 'flex', gap: 18, background: '#fffdf9', border: '1px solid #ecdec7', borderRadius: 14, padding: '14px 18px', marginBottom: 26 }}>
        {[
          { k: 'Fixed events', v: String(stats.events), c: '#33291f' },
          { k: 'Free time', v: stats.freeLabel, c: '#4a8f4f' },
          { k: 'Travel time', v: stats.travelLabel, c: '#33291f' },
        ].map((s, i) => (
          <div key={s.k} style={{ display: 'flex', gap: 18, flex: 1 }}>
            {i > 0 && <div style={{ width: 1, background: '#f1e6d3' }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#9c8a6a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.k}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* timeline */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 52, top: 6, bottom: 6, width: 2, background: '#e3d2b5' }} />

        {timeline.map((item, idx) => {
          if (item.type === 'event') {
            const ev = item.event;
            const dotColor = ev.colorHint || EVENT_CATEGORY[ev.category].color;
            const iconBg = ev.kind === 'content' ? '#f5ecd9' : EVENT_CATEGORY[ev.category].bg;
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 14, marginBottom: 4, position: 'relative' }}>
                <div className="mono" style={{ width: 52, flex: 'none', textAlign: 'right', paddingRight: 14, fontSize: 12, fontWeight: 600, color: '#7a6a52', paddingTop: 16 }}>
                  {minutesToLabel(ev.start)}
                </div>
                <div style={{ position: 'relative', flex: 'none', width: 12 }}>
                  <div style={{ position: 'absolute', top: 20, left: -1, width: 12, height: 12, borderRadius: '50%', background: dotColor, border: '3px solid #fbf3e9', boxShadow: `0 0 0 1px ${dotColor}` }} />
                </div>
                <div
                  onClick={() => setEditor({ event: ev })}
                  style={{ flex: 1, background: '#fffdf9', border: '1px solid #ecdec7', borderRadius: 14, padding: '14px 16px', marginBottom: 14, boxShadow: '0 1px 2px rgba(60,40,15,0.04)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ flex: 'none', width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <EventIcon category={ev.category} color={dotColor} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#33291f', lineHeight: 1.3 }}>{ev.title}</div>
                        <div style={{ fontSize: 12.5, color: '#9c8a6a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="2" /></svg>
                          {ev.location || '—'}
                          {ev.kind === 'content' && <span style={{ color: '#cf6a3d', fontWeight: 700 }}> · from library</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flex: 'none' }}>
                      <div className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: '#7a6a52' }}>{timeRange(ev.start, ev.durationMin)}</div>
                      <div style={{ fontSize: 11, color: '#b3a583', marginTop: 2 }}>{formatDuration(ev.durationMin)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === 'travel') {
            return (
              <div key={`t-${idx}`} style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 52, flex: 'none' }} />
                <div style={{ flex: 'none', width: 12, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 2, height: '100%', background: '#e3d2b5' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#9c8a6a', background: '#fffdf9', border: '1px solid #ecdec7', borderRadius: 20, padding: '5px 12px 5px 8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 17h1.5a2 2 0 1 0 4 0h3a2 2 0 1 0 4 0H19a1 1 0 0 0 1-1v-3.2a1 1 0 0 0-.26-.67l-2.2-2.44A1 1 0 0 0 16.8 9H15V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7.5" cy="17" r="2" stroke="currentColor" strokeWidth="1.7" /><circle cx="16.5" cy="17" r="2" stroke="currentColor" strokeWidth="1.7" /></svg>
                  ~{item.minutes} min drive
                </div>
              </div>
            );
          }

          // gap
          const recs = (recommendForGap(item.minutes, articles, { wishlist: wishlistSet, used, regionHint: item.regionHint }) as ArticleDetail[]).slice(0, 4);
          return (
            <div key={`g-${idx}`} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 52, flex: 'none', textAlign: 'right', paddingRight: 14, paddingTop: 16 }}>
                <span className="mono" style={{ fontSize: 11, color: '#b3a583' }}>{minutesToLabel(item.start)}</span>
              </div>
              <div style={{ flex: 'none', width: 12, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 2, height: '100%', borderLeft: '2px dashed #e8b98a' }} />
              </div>
              <div style={{ flex: 1, border: '1.5px dashed #e8b98a', background: '#fdf3e6', borderRadius: 14, padding: '14px 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: recs.length ? 12 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fbe3c8', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" stroke="#cf6a3d" strokeWidth="2" strokeLinecap="round" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#7a4a26' }}>{formatDuration(item.minutes)} free</div>
                      <div style={{ fontSize: 12, color: '#9c7a52' }}>Plan something here</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPicker({ start: item.start, minutes: item.minutes, regionHint: item.regionHint })}
                    style={{ border: '1px solid #e8c9a0', background: '#fffdf9', color: '#cf6a3d', fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', flex: 'none' }}
                  >
                    + Add
                  </button>
                </div>
                {recs.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                    {recs.map((a) => (
                      <button
                        key={a.slug}
                        onClick={() => addContentToGap(a, item.start, item.minutes)}
                        title={`Add ${a.title} (${formatDuration(a.minTimeMinutes)})`}
                        style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, background: '#fffdf9', border: '1px solid #ecdec7', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#6b5a3e', cursor: 'pointer' }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: wishlistSet.has(a.slug) ? '#cf6a3d' : '#b8c9a0' }} />
                        {a.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* add custom event */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 52, flex: 'none' }} />
          <div style={{ flex: 'none', width: 12, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#e3d2b5', marginTop: 2 }} />
          </div>
          <button
            onClick={() => setEditor({})}
            style={{ flex: 1, border: '1.5px dashed #e8c9a0', background: 'transparent', color: '#cf6a3d', fontSize: 13, fontWeight: 700, padding: 12, borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            Add a custom event (tour, reservation, anything)
          </button>
        </div>

        <div style={{ fontSize: 12.5, color: '#b3a583', paddingLeft: 66 }}>Day ends</div>
      </div>

      {/* suggestions rail */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#33291f', marginBottom: 3 }}>
          {wishlist.length ? 'From your wishlist & more' : 'You might also be interested in'}
        </div>
        <div style={{ fontSize: 12.5, color: '#9c8a6a', marginBottom: 14 }}>
          Tap ♡ to save for later, then slot them into free time above.
        </div>
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
          {suggestions.map((a) => (
            <div key={a.slug} style={{ flex: 'none', width: 180, background: '#fffdf9', border: '1px solid #ecdec7', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: 100, background: a.stripeBg }}>
                <img src={`/images/attractions/${a.slug}-thumb.webp`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => onToggleWishlist(a.slug)}
                  aria-label="Toggle wishlist"
                  style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', border: '1px solid #ecdec7', background: 'rgba(255,253,249,0.92)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 15, color: wishlistSet.has(a.slug) ? '#cf6a3d' : '#9c8a6a' }}
                >
                  {wishlistSet.has(a.slug) ? '♥' : '♡'}
                </button>
              </div>
              <div style={{ padding: '11px 12px 13px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#cf6a3d', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>{a.category}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#33291f', lineHeight: 1.3 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: '#9c8a6a', marginTop: 4 }}>{a.location} · {formatDuration(a.minTimeMinutes)}</div>
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <button onClick={onGoExplore} style={{ ...ghostBtn, alignSelf: 'center' }}>
              Browse the library to add ideas →
            </button>
          )}
        </div>
      </div>

      {/* modals */}
      {editor && (
        <EventEditor
          initial={
            editor.event
              ? { id: editor.event.id, title: editor.event.title, category: editor.event.category, location: editor.event.location, start: editor.event.start, durationMin: editor.event.durationMin }
              : { id: null, title: '', category: 'custom', location: '', start: editor.presetStart ?? trip.dayStart, durationMin: 60 }
          }
          onSave={(s) => {
            upsertEvent({
              id: s.id ?? newId(),
              kind: editor.event?.kind ?? 'fixed',
              title: s.title.trim(),
              location: s.location.trim(),
              category: s.category,
              start: s.start,
              durationMin: s.durationMin,
              slug: editor.event?.slug,
              colorHint: editor.event?.colorHint,
              regionId: editor.event?.regionId,
              coordinates: editor.event?.coordinates,
            });
            setEditor(null);
          }}
          onDelete={editor.event ? () => { deleteEvent(editor.event!.id); setEditor(null); } : undefined}
          onClose={() => setEditor(null)}
        />
      )}

      {picker && (
        <GapPicker
          gapMinutes={picker.minutes}
          articles={articles}
          wishlistSet={wishlistSet}
          used={used}
          regionHint={picker.regionHint}
          onPick={(a) => {
            addContentToGap(a, picker.start, picker.minutes);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {settingsOpen && (
        <TripSettings
          trip={trip}
          onSave={(patch) => {
            mutate((t) => ({ ...t, ...patch }));
            setSettingsOpen(false);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

// ---- trip settings -------------------------------------------------------
function TripSettings({ trip, onSave, onClose }: { trip: Trip; onSave: (patch: Partial<Trip>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [dayStart, setDayStart] = useState(trip.dayStart);
  const [dayEnd, setDayEnd] = useState(trip.dayEnd);
  const valid = startDate <= endDate && dayStart < dayEnd;

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#33291f', marginBottom: 16 }}>Trip details</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Trip name</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start date</label>
            <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End date</label>
            <input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Day starts</label>
            <input type="time" style={inputStyle} value={toTimeInput(dayStart)} onChange={(e) => setDayStart(parseTimeInput(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Day ends</label>
            <input type="time" style={inputStyle} value={toTimeInput(dayEnd)} onChange={(e) => setDayEnd(parseTimeInput(e.target.value))} />
          </div>
        </div>
        {!valid && <div style={{ fontSize: 12, color: '#cf5a3f' }}>Check that end date isn’t before start, and day end is after day start.</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
        <button onClick={onClose} style={ghostBtn}>
          Cancel
        </button>
        <button
          onClick={() => valid && onSave({ title: title.trim() || 'My Maui Trip', startDate, endDate, dayStart, dayEnd })}
          style={{ ...primaryBtn, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
