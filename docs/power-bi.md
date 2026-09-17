# Power BI integration

## Start with the real export

1. Run the collector at least once. For meaningful interval analysis, collect repeatedly.
2. Download `http://127.0.0.1:3000/api/snapshots.csv` to a local file.
3. In Power BI Desktop, select **Get data → Text/CSV** and load that file.
4. In Power Query, set timestamps to Date/Time/Timezone, counts to whole numbers, and IDs/statuses to text.
5. Preserve empty values as null. Do not replace failed observations with zero.
6. Create a distinct game dimension and a date dimension; relate them one-to-many to facts.

The local URL is available only while the server is running. A downloaded CSV is static until replaced and refreshed. Power BI Service cannot reach your local computer automatically; local sources generally need a configured gateway, or move your source to a supported cloud database.

## Build valid interval facts

For each game and source:

1. Sort observations by UTC time.
2. Pair adjacent observations of the same source and game.
3. Calculate elapsed hours.
4. Require both endpoints to be successful; reject partial Twitch runs.
5. Reject intervals longer than a documented gap tolerance, e.g. 30 minutes for a 15-minute schedule.
6. Calculate `viewer_hours = (previous_viewers + current_viewers) / 2 × interval_hours`.
7. Apply the same integration to channels and Steam players.
8. Aggregate valid interval-hours separately so data coverage remains visible.

Twitch's initial export provides a collection window, not exact stream timestamps. Choose a consistent representative timestamp and document the approximation; reject scans that take too long. Do not mix its window timestamp with the individual Steam observation timestamps without explaining the alignment.

Once interval facts exist, measures can use these patterns:

```DAX
Estimated Viewer Hours =
SUM ( TwitchIntervals[viewer_hours] )

Viewers per Live Channel =
DIVIDE (
    SUM ( TwitchIntervals[viewer_hours] ),
    SUM ( TwitchIntervals[channel_hours] )
)

Average Steam Players =
DIVIDE (
    SUM ( SteamIntervals[player_hours] ),
    SUM ( SteamIntervals[valid_hours] )
)
```

Evaluate average players per game. For a market total, sum the per-game averages over comparable coverage rather than dividing all player-hours by all game-hours, which would instead give an average per game.

## Recommended report pages

- **Overview:** viewer-hours, Steam activity, growth, and coverage.
- **Game detail:** comparable time-series and event annotations.
- **Creator opportunities:** demand, supply, and concentration (only after collecting the necessary stream-level data).
- **Data quality:** missing intervals, source status, and collection durations.

The current live collector aggregates Twitch streams to game totals and does not persist per-channel facts. Real audience-concentration or distinct-creator analysis needs that additional storage first. The UI's concentration examples are synthetic.

## Embed a report

For a public portfolio, Power BI Service can generate a **Publish to web** URL if your license, workspace, and tenant settings permit it. Only use publishable data: the underlying model can be publicly accessible even if a visual does not show every field.

Place that generated `https://app.powerbi.com/view?...` URL in `POWER_BI_EMBED_URL` in `.env`. Restart this app. The Reports page renders the report inside its iframe.

Website CSS controls the surrounding page. Use Power BI's report theme to style the visuals within the iframe. Authenticated embedding and SDK-controlled filters require a separate backend token flow; they are not implemented here.

Collection frequency, model refresh frequency, and public embed cache refresh are separate. A 15-minute collection schedule does not guarantee a 15-minute public report refresh.
