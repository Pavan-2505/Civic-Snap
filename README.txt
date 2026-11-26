CIVIC SNAP – UI UPGRADE
=======================
Copy ALL the .html files into the same folder where your current HTML files live
(same place your server serves them from) and overwrite the old ones.
No server / backend / database file needs to change.

WHAT DID NOT CHANGE (so the connection stays intact)
- Every fetch() call: /api/login, /api/register, /api/reports, /api/reports/mine,
  /api/reports/:id (PUT, DELETE), /api/admin/create, same headers + Bearer tokens.
- localStorage keys: user, userToken, adminUser, adminToken.
- File names and links of the existing 9 pages.
- add-issue.html: the entire <script> block is byte-for-byte the original.

NEW ADMIN PAGES (sidebar now opens separate pages)
- admin_dashboard.html   Overview: clickable stat tiles, 14-day trend, status donut, needs-attention, latest, top categories
- admin_reports.html     All reports: search, status chips, category filter, sort, CSV export, view/edit/delete modal
- admin_categories.html  Category cards with status breakdown + insights (most reported / backlog / best resolution)
- admin_analytics.html   KPIs, 30-day trend, severity, hotspots, most active citizens, category x status
- admin_team.html        Add new admin (same /api/admin/create call)
The stat tiles link to admin_reports.html filtered by status (e.g. ?status=Resolved).

Everything is self-contained per page (CSS + JS inline) – no extra files to host.
Fonts (Oswald, Space Grotesk, JetBrains Mono) load from Google Fonts; the pages fall back
to system fonts if offline. Leaflet still loads from unpkg as before.
