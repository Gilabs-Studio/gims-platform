# Travel Planner Collaborative Advance PRD

> **Document Type:** Product Requirements Document (PRD)
> **Owner:** Product + Engineering
> **Status:** Draft for Sprint Planning
> **Version:** 1.0
> **Last Updated:** March 2026

## 1. Product Vision

Build a collaborative travel planning workspace for logistics drivers, cargo operations, vessel journeys, and milestone-based trips. The module starts from existing Up Country Cost workflows and evolves into a shared operational planner.

## 2. Problem Statement

Current Up Country Cost focuses on budget and approval. Operations teams still coordinate itinerary, route sequence, weather checks, and map updates through chat/manual tools.

Pain points:
- Itinerary planning is fragmented across spreadsheets and chat.
- Map context is not collaborative and not tied to day-by-day planning.
- Route order optimization is manual.
- Weather risks are checked separately.
- Trip briefing and handover documents are created manually.

## 3. Objective and Success Metrics

Objectives:
- Consolidate planning + execution context in one module.
- Reduce planning time for multi-stop trips.
- Improve route quality and operational predictability.
- Keep finance workflow continuity from Up Country Cost.

Success metrics (Phase 1-3):
- 70% of trips planned in Travel Planner (vs external sheets).
- 30% reduction in trip planning lead time.
- 25% reduction in route changes after departure.
- 90% of trips with generated PDF briefing.

## 4. User Personas

- Driver: needs clear day plan, route, weather warning, and PDF briefing.
- Dispatcher/Planner: needs drag-drop itinerary, optimization, and shared updates.
- Ops Manager: needs milestone visibility and route risk control.
- Finance/Admin: needs cost visibility and approval continuity with Up Country Cost.

## 5. Scope

### In Scope (Target)
- Parent module: Travel Planner.
- Child module migration: Up Country Cost.
- Day-by-day itinerary planning with drag and drop.
- Interactive map planning and filtering.
- Place search integration.
- Route optimization + export to Google Maps.
- Weather forecast and historical fallback.
- PDF export (full trip + per day plan).

### Out of Scope (Initial)
- Native mobile app.
- Offline-first map tiles.
- Real-time telematics tracking.

## 6. Mandatory First Engineering Step

Step 1 (must be executed first):
- Move frontend feature directory from:
  - `apps/web/src/features/finance/up-country-cost`
- To:
  - `apps/web/src/features/travel-planner/up-country-cost`
- Introduce parent route:
  - `/travel-planner`
- Move business route to:
  - `/travel-planner/up-country-cost`

## 7. Functional Requirements

### FR-1 Day-by-Day Itinerary Planner
- Drag and drop place/activity cards across days.
- Reorder within day and move between days.
- Day Notes support timestamp + icon tag.
- Day Notes are also reorderable by drag and drop.

### FR-2 Interactive Map for Itinerary
- Use Leaflet as map engine.
- Marker supports photo thumbnail.
- Marker clustering for dense stops.
- Route path visualization for selected day/trip.
- Tile source switcher (street/dark/satellite/auto).
- Category filter for pin visibility.

### FR-3 Place & Activity Search
- Provider options:
  - Google Places (photo/rating/opening hours).
  - OpenStreetMap/Nominatim (no API key fallback).
- Save selected result into itinerary item.

### FR-4 Route Optimization
- Auto-optimize stop sequence.
- Keep manual lock for fixed stops/milestones.
- Export selected day route to Google Maps deep link.

### FR-5 Weather Planning
- Forecast up to 16 days from Open-Meteo.
- If forecast unavailable, fallback to historical climate averages.
- Show weather risk badge per day and per stop.

### FR-6 Document Export
- Export full trip plan to branded PDF:
  - cover page
  - route summary
  - day-by-day itinerary
  - notes and images
- Context action in UI: Export day plan as PDF.

## 8. Technical Direction

Frontend reuse targets:
- Existing map foundation:
  - `apps/web/src/components/ui/map/map-view.tsx`
  - `apps/web/src/components/ui/map/map-inner.tsx`
  - `apps/web/src/components/ui/map/map-sidebar.tsx`
  - `apps/web/src/components/ui/map/marker-cluster-group.tsx`
- Existing finance workflow logic remains in Up Country Cost service/hooks.

Backend direction:
- Keep existing Up Country Cost API for finance process continuity.
- Add new Travel Planner APIs (trip, itinerary, place search proxy, optimization, weather, export).

## 9. Milestone Plan

- Phase 0 (foundation): parent module + route migration + menu migration.
- Phase 1: itinerary planner + day notes + collaborative basic state.
- Phase 2: map integration + category filter + place search.
- Phase 3: route optimization + Google Maps export.
- Phase 4: weather integration + risk indicators.
- Phase 5: PDF exports + branded templates.

## 10. Risks and Mitigation

- External API limits (Google Places):
  - Mitigation: OpenStreetMap fallback.
- Route optimization quality vs runtime:
  - Mitigation: async optimization with cached results.
- PDF quality/performance:
  - Mitigation: server-side queued generation for full documents.
- Adoption risk for operational users:
  - Mitigation: keep Up Country Cost familiar flow and progressive rollout.

## 11. Rollout Recommendation

- Start with selected logistics team as pilot.
- Measure planning time and route change rates for 2-4 weeks.
- Expand to cargo/vessel team after Phase 2 stability.
