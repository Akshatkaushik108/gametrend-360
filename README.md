# GameTrend 360

**Follow the audience. Spot the momentum. Find your next opportunity.**

A responsive Twitch + Steam analytics workspace by Akshat Kaushik. Explore game trends, compare audiences, save a watchlist, collect real Steam activity, and export observations for Power BI.

> **Data honesty:** Overview, explorer, opportunity, and comparison pages use clearly labeled simulated history. The **Data connections** page fetches real platform observations. These sources are never silently mixed. This is a working first release, not an already-populated historical market database.

## Run locally

Requires **Node.js 22 or newer**. No dependency installation is needed.

```sh
npm start
```

Open **http://127.0.0.1:3000**.

```sh
npm run dev    # Restart the server on code changes; reload the browser manually
npm run check  # JavaScript syntax checks
npm test       # Data semantics, CSV integrity, and HTTP boundary tests
```

The server binds to localhost by default. A production deployment needs HTTPS, controlled collection jobs, authentication where appropriate, persistent storage, and an API rate limit. The current version is intentionally a local portfolio application.

## What works

- Responsive desktop and mobile interface with seven navigable views.
- 7-, 14-, and 30-day analysis over a deterministic 60-day sample fixture.
- Twitch/Steam chart switching and a customizable three-game chart.
- Search, genre filtering, sorting, and pagination across 12 tracked games.
- Up to three games in a side-by-side comparison.
- Persistent browser watchlist and detailed game dialogs.
- Creator opportunity exploration with explicit methodology.
- Downloadable demo CSV files labeled `SIMULATED_DEMO`.
- Real Steam concurrent-player collection without an API key.
- Twitch app-token authentication and paginated collection when configured.
- Separate CSV download of real observations, including missing and partial states.
- Power BI public report embedding when a valid embed URL is configured.

## Live data

### Steam

Open **Data connections → Fetch live snapshot**. The server requests player counts for the curated games from the official Steam Web API. Requests use three concurrent workers and a 10-minute in-memory cache. Failed observations remain blank, never zero.

New runs append to `data/snapshots.jsonl`. This directory is excluded from Git. The actual counts reflect collection time, not a simultaneous platform-wide snapshot. Offline players and non-Steam players are not included.

### Twitch

1. Register an application at <https://dev.twitch.tv/console/apps>.
2. Copy `.env.example` to `.env`.
3. Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`.
4. Restart the server, then fetch a snapshot from Data connections.

Credentials are read only by the server; they are never returned to the browser or committed. Do not put credentials in `public/`.

Eight games currently have explicit Twitch category mappings. The other four display **mapping pending**; verify their IDs with Twitch's Get Games endpoint before adding them in `public/data.js`. A full collection deduplicates stream IDs and follows cursors up to 50 pages. If the cap is reached, the entire Twitch run is marked **partial**. These observations are estimates of the changing live directory, not an exact census.

### Collect on a schedule

The UI fetch is on demand. No automatic collection schedule is installed by this project.

```sh
node server.mjs --collect
```

Configure Windows Task Scheduler to run this command every 15 minutes, set the working directory to this repository, and prevent overlapping runs. The machine must be awake and connected. A hosted scheduled job is a later upgrade.

Download collected observations from **Data connections → Download live observations**, or `GET /api/snapshots.csv`. Before collection, the export contains headers only. Keep timestamps, source status, and coverage when importing into Power BI.

## Power BI

See [the integration guide](docs/power-bi.md). No `.pbix` report has been generated in this release.

The Reports page is a functional integration slot. To embed an existing **public** report, set this in `.env` and restart:

```dotenv
POWER_BI_EMBED_URL=https://app.powerbi.com/view?r=YOUR_GENERATED_EMBED_CODE
```

Only HTTPS public `app.powerbi.com/view` URLs are accepted. The code is not an authenticated Power BI Embedded implementation. Publish to web exposes the entire report model publicly, so only use a model whose data can be published. Private embedding needs a separate authentication and licensing implementation.

## Structure

```text
public/
  index.html       Accessible application shell
  styles.css       Responsive dashboard design
  app.js           Navigation, charts, filters, watchlist, dialogs, exports
  data.js          Curated game catalog and labeled synthetic fixture
  favicon.svg      Original vector brand mark
server.mjs         Local server, Steam/Twitch collectors, CSV export
tests/             Automated data and server checks
docs/              Data dictionary and Power BI integration notes
.env.example       Credential/configuration template (no secrets)
data/              Local observations (ignored by Git)
```

The pre-existing empty `ETL_script.py` is left untouched; the first implementation uses Node.js to run immediately without installing Python packages. A Python/SQL pipeline can replace or extend the collectors later.

## Metric definitions

- **Estimated viewer-hours:** integrate observed viewers over valid adjacent intervals. The synthetic fixture uses daily average viewers × 24 hours.
- **Average concurrent players:** a time-weighted player count, never a sum labeled as unique players or sales.
- **Viewers per channel:** viewer-hours divided by channel-hours over the same valid intervals.
- **Growth:** selected-period viewer-hours versus the immediately previous period of equal length.
- **Opportunity ordering:** viewers per channel × (1 − top-five audience share). The concentration inputs in this release are explicitly synthetic assumptions.

The curated list is not a complete market census. No sales, revenue, individual watch time, or unique-viewer claims are made. The [data dictionary](docs/data-dictionary.md) describes raw exports and known limitations.

## Next milestones

- [ ] Configure Twitch credentials and verify all category mappings.
- [ ] Collect at least 30 days of observations with coverage monitoring.
- [ ] Move persistent observations to PostgreSQL and add idempotent run IDs.
- [ ] Build real interval aggregates that reject gaps and partial scans.
- [ ] Add a distinct real-history analysis mode once sufficient data exists.
- [ ] Build and publish the Power BI semantic model and report.
- [ ] Add deployed application monitoring and scheduled collection.
- [ ] Evaluate opportunity rankings against simple future-growth baselines.

## Sources and attribution

- [Twitch Get Streams](https://dev.twitch.tv/docs/api/reference/#get-streams)
- [Steam player counts](https://partner.steamgames.com/doc/webapi/ISteamUserStats#GetNumberOfCurrentPlayers)
- [Power BI Publish to web](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-publish-to-web)

Game artwork loads from Steam's CDN and belongs to its respective owners. This project is independent of Twitch, Valve, and Microsoft. Check platform terms and publication rights before redistributing API data or publishing a BI model.
