# TransitSwap Phase 3 Routing Report

Project: TransitSwap

Phase: Phase 3 - Routing Engine Hardening

Date: 2026-09-20

## 1. Objective

Harden the existing multimodal routing engine without rebuilding TransitSwap, changing datasets, changing schemas, replacing providers, redesigning the UI, or starting Phase 4.

## 2. Existing Routing Architecture

Preserved:

- `POST /api/routes` continues to call `routingService` and OSRM.
- `POST /api/routes/multimodal` continues to call `multimodalController` -> `multimodalService` -> existing demo transit data -> accessibility/weather/crowd/reliability/TransitDNA/ML ranking.
- The frontend API contract and `MultimodalRoute` response fields are unchanged.

## 3. Candidate Route Patterns

Preserved where supported by the current demo dataset:

- Walk -> Metro -> Walk
- Walk -> Bus -> Walk
- Walk -> Metro -> Auto
- Walk -> Bus -> Walk -> Metro -> Walk

For the verified Borivali -> Goregaon scenario, all four patterns are returned.

## 4. Transit Connectivity Validation

Every generated candidate is now validated before becoming a route:

- At least one segment.
- First segment starts at the request origin.
- Final segment ends at the request destination.
- Consecutive segments are geographically continuous within a 50 m tolerance.
- Coordinates, distances, durations, fares, and GeoJSON geometry are validated.
- Transit segments must contain valid transit details.
- Walking/auto segments must not contain transit details.

Invalid candidates are discarded without crashing the full request.

## 5. Bus Connectivity Correction

Bus segments now require a real `BUS_ROUTES` entry that contains both stops in its ordered `stops[]` list. Generic `BEST Bus` fallback connectivity was removed.

When multiple valid routes exist, selection is deterministic:

1. Fewer stops.
2. Shorter estimated path distance.
3. Stable route id ordering.

## 6. Metro Connectivity Validation

Metro paths now require:

- Existing origin and destination stations.
- A path from `stationsOnPath`.
- Every station in the path exists.
- Every adjacent station pair belongs to a real metro line connection.

The existing D.N. Nagar interchange is preserved.

## 7. Segment Continuity Validation

Segment continuity uses Haversine distance with a 50 m tolerance instead of exact floating-point equality.

## 8. Geometry Validation

Every segment requires GeoJSON:

```ts
{ type: "LineString", coordinates: [[longitude, latitude], ...] }
```

Bus geometry uses the ordered demo bus stops from the selected route. Metro geometry uses ordered station coordinates. Fallback walk/auto geometry uses a straight LineString. OSRM road geometry is used only when accepted as plausible.

## 9. Distance Calculation

Segment distances remain per-segment values. Route totals are recomputed from segment sums.

Verified:

- `totalDistanceMeters === sum(segment.distanceMeters)`
- `totalWalkingMeters === sum(walking segment distances)`

## 10. Duration Calculation

Transit segment duration constants are unchanged. Road leg duration uses accepted OSRM metrics when safe, otherwise deterministic fallback estimates.

Verified:

- `totalDurationSeconds === sum(segment.durationSeconds)`

## 11. Fare Calculation

Fare policy is unchanged:

- Metro: `basefare + perStation * stopCount`
- Bus: `basefare + perKm * route distance`
- Auto: `basefare + perKm * route distance`
- Walking: `0`

Verified:

- No negative fares.
- `totalFare === sum(segment.estimatedFare)`

## 12. Transfer Calculation

Transfer count now counts changes between non-walking ride modes:

- Walk -> Metro -> Walk: 0 transfers.
- Walk -> Bus -> Walk: 0 transfers.
- Walk -> Metro -> Auto: 1 transfer.
- Walk -> Bus -> Walk -> Metro -> Walk: 1 transfer.

Walking access/egress does not count as a public-transport transfer.

## 13. Duplicate Route Handling

Candidates are deduplicated before labeling using a deterministic signature based on:

- Mode sequence.
- Segment from/to locations.
- Transit line name and stop list where applicable.

Random segment IDs are not used for duplicate detection.

## 14. Route Labeling

Labels remain:

- `FASTEST`
- `CHEAPEST`
- `MIN_WALKING`
- `BALANCED`

Labels are deterministic and assigned after validation/deduplication. A label is only assigned when its criterion is satisfied for that candidate set.

## 15. OSRM Integration

Multimodal road legs now use a request-scoped road helper with a request-scoped cache:

- Walking legs attempt OSRM `walking` only when the returned duration implies a plausible walking speed.
- Auto legs use OSRM `driving` when available.
- Identical road legs in the same request reuse the same promise.
- No global unbounded cache was introduced.

## 16. OSRM Fallback Behavior

Fallback is deterministic:

- Walking falls back to Haversine distance and `WALK_SPEED_MPS`.
- Auto falls back to Haversine distance with the existing 1.25 road factor and `AUTO_SPEED_MPS`.

Handled safely:

- Provider failure.
- Empty/NoRoute-like provider result.
- Timeout-like provider failure.
- Invalid or implausible provider metrics.

## 17. Error Handling

External routing provider failure does not crash multimodal routing. The final multimodal request fails only when no valid candidate exists in the current demo network.

## 18. Performance Observations

Final authenticated Borivali -> Goregaon multimodal smoke test:

- Returned 4 candidates.
- Approximate latency: 1069 ms.
- External calls are bounded by the four candidate patterns and request-scoped road-leg reuse.

## 19. Tests Added

Added:

- `backend/src/__tests__/multimodalRouting.test.ts`

Covered:

- Walk -> Metro -> Walk.
- Walk -> Bus -> Walk.
- Walk -> Metro -> Auto.
- Walk -> Bus -> Walk -> Metro -> Walk.
- Invalid bus connectivity rejection.
- Ordered bus route details.
- Metro path and interchange details.
- Segment continuity and GeoJSON order.
- Non-negative distance/duration/fare.
- Distance/walking/fare/duration totals.
- Duplicate candidate removal.
- Deterministic labels.
- No-route outside demo network.
- Same origin/destination behavior.
- OSRM provider success.
- OSRM empty/NoRoute fallback.
- OSRM timeout fallback.

No test requires the public internet.

## 20. Existing Tests Executed

Executed:

- `npm run build`
- `cd backend && npm run build`
- `cd backend && npx ts-node --transpile-only src/__tests__/multimodalRouting.test.ts`
- `cd backend && npm test`

Results:

- Frontend build: PASS.
- Backend build: PASS.
- New Phase 3 routing test: PASS.
- Existing backend test chain: passes through accessibility, ML, explanation, reliability, and Phase 3 routing tests; then stops at the known `userPreferences.test.ts` failures.

Known preserved failures:

- `Low walking tolerance penalizes 1200m walk strongly`
- `Reliability priority ranks high reliability & low transfer risk route first`

## 21. Manual Smoke Test

Authenticated live backend smoke test:

- `POST /api/routes` driving: PASS.
- `POST /api/routes` walking: PASS.
- `POST /api/routes` cycling: PASS.
- `POST /api/routes/multimodal`: PASS.

Important OSRM finding:

- The configured public OSRM endpoint accepted driving, walking, and cycling profiles for the sampled request, but returned identical route distance/duration values for all three modes (`10327 m`, `651 s`). This is not plausible for walking, so multimodal walking legs now reject implausibly fast provider results and use deterministic fallback walking estimates.

Final inspected Borivali -> Goregaon multimodal routes:

- `MIN_WALKING`: walking -> bus -> walking; distance `10088 m`; fare `20`; walking `0 m`; duration `2161 s`; transfers `0`.
- `FASTEST`: walking -> metro -> auto; distance `9547 m`; fare `57`; walking `285 m`; duration `1053 s`; transfers `1`.
- `CHEAPEST`: walking -> metro -> walking; distance `9323 m`; fare `19`; walking `1096 m`; duration `1533 s`; transfers `0`.
- `BALANCED`: walking -> bus -> walking -> metro -> walking; distance `10379 m`; fare `26`; walking `1276 m`; duration `2595 s`; transfers `1`.

## 22. Files Changed

Functional source:

- `backend/src/services/multimodalService.ts`
- `backend/src/controllers/multimodalController.ts`
- `backend/src/services/evaluationService.ts`
- `backend/src/utils/test-full-pipeline.ts`

Tests/config:

- `backend/src/__tests__/multimodalRouting.test.ts`
- `backend/package.json`

Documentation:

- `PHASE_3_ROUTING_REPORT.md`
- `PHASE_3_VERIFICATION.md`

## 23. Known Limitations

- Transit network remains the existing seeded demo network.
- Bus and metro geometry is based on demo stop/station coordinates, not real road/track shape.
- Walking fallback is Haversine-based, not pedestrian-network routing.
- Public OSRM profile capability is not reliable enough for multimodal walking time in the sampled configuration.
- Route labels describe pre-intelligence candidate properties; final frontend order may still be affected by downstream ML/preference ranking.

## 24. Data-Source Limitations

Unchanged:

- Metro and bus data are demo/seeded.
- No GTFS.
- No GTFS-RT.
- No live transit APIs.
- No real-time traffic provider.
- OSRM is road routing, not live traffic.

## 25. Confirmation That Phase 4 Was Not Implemented

Confirmed:

- No GTFS added.
- No live transit feeds added.
- No new transit dataset added.
- No new ML algorithms added.
- No ranking algorithm changes.
- No TransitDNA changes.
- No database schema changes.
- No frontend redesign.

Phase 3 stops here.

