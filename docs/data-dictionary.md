# Live observations

`GET /api/snapshots.csv` flattens local JSONL runs to one row per game per run. It is separate from the dashboard's simulated CSV export.

| Column | Meaning |
| --- | --- |
| `source` | Always `live`; never a synthetic fixture |
| `run_started_at` | UTC ISO timestamp when platform collection began |
| `run_completed_at` | UTC ISO timestamp when platform collection ended |
| `observed_at` | UTC ISO timestamp for the individual Steam request result |
| `game_id` | Canonical project game identifier |
| `steam_app_id` | Steam app identifier, not a Twitch category ID |
| `steam_players` | Concurrent Steam player count; blank when unavailable |
| `steam_status` | `connected` or `error` |
| `twitch_viewers` | Sum of deduplicated observed live-stream viewers for a mapped game |
| `twitch_channels` | Count of deduplicated observed streams for a mapped game |
| `twitch_status` | `connected`, `partial`, `not_configured`, `error`, or `unmapped` |

## Correct interpretation

A numeric zero is different from an unavailable value. Twitch zeros are reported only for mapped games after a successful scan; a partial scan must not be interpreted as a complete count. Twitch collection happens during the run window, whereas `observed_at` is specific to Steam.

Do not join stream-level facts directly to game-level snapshots: it multiplies counts. Use a game dimension and fact tables with explicit grain. Do not infer revenue, purchases, geographic audiences, or unique players from this export.

## Retention and growth

JSONL is suitable for an initial local prototype. CSV export currently reads the whole file into memory. Before continuous multi-month collection, migrate to a database, add run IDs and uniqueness constraints, restrict exports by date, and establish platform-specific retention policies.

## Sample fixture

`public/data.js` contains 60 consecutive synthetic days per game ending September 16, 2026. It supports complete comparisons for 7-, 14-, and 30-day windows. Sample audience concentration values are fixed assumptions, not measured Twitch statistics. Sample game artwork and names identify the game; they do not validate the fixture numbers.
