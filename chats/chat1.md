# TripLine visual itinerary builder

_Started 2026-07-20 22:42 UTC_

---

## User

# PRD: TripLine — One-Page Visual Itinerary Builder

## 1. Problem Statement
Travelers juggle confirmation emails, texts, and screenshots for hotel check-ins, reservations, and booked activities. There's no single view of "here's my day," and no easy way to see how much time exists between fixed commitments — especially when those gaps need to be filled with something else (sightseeing, food, rest).

This is especially acute for **event guests** (weddings, conferences, group trips) who have a handful of mandatory, time-locked events dropped into an otherwise open schedule, and need to plan around them without a lot of manual effort.

## 2. Goal
Let a user drop in their known commitments (a few taps, not a full trip-planning app) and get back a single, clean visual page per day showing:
- Every event in time order
- Drive/travel time between consecutive events
- Free time gaps, sized and labeled, ready to be filled

## 3. Target User
- Primary: a wedding/event guest with 2–5 fixed commitments (ceremony, rehearsal dinner, brunch) plus a hotel, who wants to plan the rest of the trip around them.
- Secondary: any leisure traveler assembling a day from scattered reservations (tours, dinners, check-in/out times).

## 4. Core User Flow
1. User starts a trip, adds a destination and date range.
2. User adds events one at a time (or pastes/forwards a confirmation — stretch goal) with: title, category, start time, end time (or duration), and location.
3. App calculates travel time between each pair of consecutive events using drive time (walking as a toggle).
4. App renders a single scrollable page per day: vertical timeline, event blocks sized by duration, travel segments shown as connectors labeled with time/mode, and open gaps visually distinct and labeled ("3h 15m free").
5. User can tap a gap to get lightweight suggestions (restaurants, attractions nearby) — stretch goal — or just leave it as a visible placeholder.
6. User exports or shares the page (image, PDF, or link) — this is the artifact they actually use on the day.

## 5. MVP Feature Set

| Feature | Priority |
|---|---|
| Manual event entry (title, category, time, location) | Must |
| Auto drive-time calculation between events | Must |
| Single-page daily visual timeline (per day if multi-day trip) | Must |
| Visual distinction for gap time vs. booked time | Must |
| Export as image/PDF | Must |
| Share via link | Should |
| Event categories with icons (lodging, food, activity, transit) | Should |
| Nearby suggestions for gaps | Could |
| Import from email/screenshot (OCR or forwarded confirmation) | Could |
| Multi-traveler shared itinerary (e.g., wedding party) | Could |
| Walking vs. driving toggle for travel time | Could |

## 6. Design Principles
- **One page, one glance.** The output should be legible as a single image someone screenshots and refers to all day — not a dashboard.
- **Fixed events are sacred.** Booked times render precisely as entered; the app never guesses or moves them.
- **Gaps are a feature, not an error.** Free time should feel intentional and inviting, not like a scheduling failure.
- **Fast input.** Adding an event should take seconds — this is not a full itinerary-planning suite.

## 7. Out of Scope (v1)
- Booking/reservation functionality (this is a viewer/organizer, not a booking engine)
- Multi-city trip logistics (flights, complex routing)
- Real-time traffic re-calculation on the day of

## 8. Open Questions
- Do we need account/login, or can this be a stateless single-session tool with a shareable link?
- How do we source drive-time data (maps API dependency)?
- For wedding-guest use case: is there value in a host being able to pre-populate the fixed events for all guests?

## 9. Success Metrics
- % of users who complete a full day's itinerary in under 3 minutes
- % of created itineraries that get exported/shared (proxy for "this was actually useful on the trip")
- Return usage across multiple days of a single trip

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- deliverable: The core output: the one-page visual itinerary (timeline + gaps)
- vibe: Clean travel-app (crisp, airy, map-app feel)
- platform: Both (responsive)
- color: 2
- gap_treatment: Inviting (highlighted, dashed border, 'plan something here' prompt)
- event_categories: Yes, simple icon per category (lodging, food, activity, transit)
- scenario: General leisure day (flight/hotel, tour, dinner)
- data_state: Just the final itinerary output

## Assistant

_[tool: dc_write]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

Now removing the unused `iconSvg`/`icon` helper code since icons live in the template.

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

One-page timeline with fixed events, travel connectors, and inviting dashed gap prompts, in the cool-blue palette — out for review.

## User

Can you add a "recommendations" carousel below the time gaps that might be smart. For example, "Trilogy tour", "Big Beach", "Poolside Brunch".

Let's also customize the examples to Maui specifically. So instead of JFK it's OGG

Add Rental Car pickup (Hertz)

There should also be a row at the top with buttons for each day of the trip

Users should also be able to add a generic event that's not a template like a Tour or Restaurant Reservation

At the bottom there should also be a "You might also be interested in" section that has smart recommendations of things to do on Maui

## Assistant

_[tool: dc_write]_

_[tool: ready_for_verification]_

Added day tabs (functional, switches between 3 Maui days), Maui-ified content with OGG airport and Hertz rental car pickup/return, recommendation chips inside each gap (incl. your Trilogy Tour/Big Beach/Poolside Brunch example), an "Add a custom event" button that inserts a generic non-templated event card, and a "You might also be interested in" carousel at the bottom — out for review.

## User

Can we change the color scheme or design theme to be more tropical/warm?

## Assistant

_[tool: dc_write]_

_[tool: ready_for_verification]_

Switched to a warm tropical palette — sandy cream background, terracotta primary accent, and warm-toned category colors (teal, plum, sun, coral, palm green) — out for review.

## User

Can we create a new design for just a content library that contains structured articles about things to do on Maui?

## Assistant

_[tool: dc_write]_

_[tool: ready_for_verification]_

New "Maui Content Library" page: searchable/filterable article grid (Beaches, Water, Adventure, Nature, Culture, Food & Drink) with a detail view per article (overview, best time, tips, related articles), styled to match TripLine's tropical palette — out for review.

