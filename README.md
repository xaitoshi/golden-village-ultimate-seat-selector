# Seatwise — see your seat before you book
Unofficial fan concept. Interactive 3D seat previews: pick a seat, double-click to sit in it and look around. Live at https://seatsinsg.vercel.app (Vercel project and GitHub repo keep their original names).

## Site structure
- `/` — landing page (landing.template.html → index.html): hero slideshow (auto-play, arrows/dots, keyboard, swipe, pause on hover/focus/hidden tab, no auto-play with reduced motion), captions linking into each viewer, three viewer cards, unofficial-concept footer.
- `/movie/` — Study 01, GV Funan Deluxe cinema (index.template.html → movie/index.html). Moved from `/`; old `/?seat=…` or `/#E4`-style links are forwarded to `/movie/`.
- `/sia/` — Study 02, SIA-style 2027 Business. `/sis/` — Study 03, Singapore Indoor Stadium · BABYMONSTER [CHOOM].
- Every viewer accepts `?seat=<id>` (e.g. `/sis/?seat=220-17-6`, `/sia/?seat=14D`, `/movie/?seat=E4`) to preselect a seat.
- Shared tab bar on every page: ◉ Seatwise (home) | Cinema | Theatres (dropdown: Singapore Indoor Stadium, MBS Theatre, The Star Theatre) | SIA. Cafe is kept as a page at /starbucks-bugis/ but is not linked in the tab bar. Favicon: favicon.svg + favicon.ico. OG image: assets/og.jpg.
- Slides in assets/slides are rendered from Seatwise's own viewers with `render-slides.cjs` (headless Chrome, UI hidden) and converted by `optimize-slides.py` to WebP 1600w + 800w. No venue, airline, press or reference photos are used.
- Build: `npm run build` (build.cjs + publish-build.cjs → dist/, including a static `vercel.json` with `trailingSlash: true`). Tests: `npm test` (cinema, interaction, SIA, SIS, site).

## Study 01 — GV Funan Deluxe approximate study, served at /movie/
Independent prototype • approximate geometry • no live booking.

## Play
Open movie/index.html in a modern WebGL browser (served at /movie/). All Three.js, app JS, styles, screen logo and three reference images are embedded; no network dependencies.
Double-click any seat or wheelchair bay to select it and dive directly into its view. Single-click selects only; See the view is retained for mobile/keyboard. Change seat smoothly reverses the camera. POV drag looks around; double-click re-centres; Escape returns to map. Tab/Enter/Space operate the overlaid seat selectors. Reduced motion skips the transition. WebGL failure exposes simplified selectors with estimated metrics, not a fake 3D view.

## Supplied references
The owner supplied two auditorium photographs and a seating-map screenshot identifying the desired cinema as Golden Village Funan Deluxe. No independent venue verification was performed, and no exact hall number is claimed.
- funan-reference-1.png: wide auditorium view; tan/beige paired leather chairs, gold angular carpet lines, olive/gold pleated wall treatment, speakers, black ceiling/rear wall, warm ceiling spots and stepped aisles.
- funan-reference-2.png: closer segmented cushions/headrests, wooden arm consoles with cupholders, and aisle handrail. The image carries its original MusicPhotoLife.com watermark; source metadata beyond the supplied image was not provided.
- funan-seatmap.png: seven straight rows A–G, eight slots in four pairs, screen in front of A. Wheelchair icons appear in row G at positions 3 and 6. The prototype uses 54 chair meshes and 2 dedicated wheelchair bays, not 56 chair meshes. Numbers 1–8 are ASSUMED left-to-right: the screenshot gives row letters but not individual seat numbers.
- gv-screen-logo.png: exact yellow-on-black Golden Village logo image supplied by the owner for the projection screen. Image is drawn with contain scaling at its original aspect ratio against black, with no crop/stretch. No logo is applied to the app UI.

Reference images and logo are embedded for this requested private prototype. Their use does not imply endorsement or official status; underlying image/trademark rights remain with their owners. Prior venue imagery and attribution are not included in the rebuilt deliverable or source ZIP.

## Explicit estimates, not surveyed geometry
Four pairs per row; each pair has 0.96m centre-to-centre chair spacing; pair centres 3.1m apart; row pitch 1.65m; tier rise 0.36m; first row 5.8m from screen; 9.4 x 5.28m screen; approximately 15m-wide room. Recliner body width about 0.77m with separate broad consoles. Chair POV eyeheight 1.25m above its tier; bay eyeheight 1.12m. Chair proportions, aisle widths, wall positions, speaker/lighting positions and screen dimensions are estimates guided by the photographs, not measured replicas. Tier/aisle configuration is illustrative. Wheelchair bays are viewpoints and marked clear floor footprints, not wheelchairs or ordinary chairs. No accessible route or accessibility certification is represented.

All positions are shown as demo-available; no real availability, prices, booking, login or payments. Distance is horizontal distance to screen centre; screen angle is horizontal angular width of the screen; off-centre is horizontal centreline angle. These are estimated geometric metrics, not measured venue viewing conditions.

## Build and tests
npm install
node build.cjs
node test.cjs
node test-interaction.cjs
python3 -m http.server 8137 --bind 0.0.0.0

movie/index.html: self-contained playable deliverable.
app.js, model.cjs, index.template.html, build.cjs: editable source.
Test coverage: 56 unique slots, 54 chairs + 2 bays at G3/G6, straight row coordinates, four-pair aisle spacing, all illustrative availability, valid F8, metrics/easing, source-executed single/doubleclick transitions and guards. Build validation also checks exact embedded logo bytes, contain scaling, and removal of former venue/red-seat theme.

Browser rendering has not been visually verified by the executor. Geometry/proportions remain estimates, especially arm-console spacing, handrail positioning and aisle boundaries. No deployment or public publishing performed.

## Study 02 — SIA-style 2027 Business Class (unofficial fan concept), served at /sia/
Shared tab bar (see Site structure). Not affiliated with or endorsed by Singapore Airlines.
Source: sia.js, sia-model.cjs, sia.template.html (built to sia/index.html; dist/sia/index.html). Tests: node test-sia.cjs.
Interactions mirror the cinema: drag to orbit, scroll to zoom, click to select, double-click a suite (or Sit here) to fly into its seated POV; drag to look around, Escape/Change seat to return.
Published facts used (reports of the 6 Nov 2026 unveiling): 1-2-1 direct aisle access; sliding doors; 52 in shell/door height; 50 in pitch; 22 in seat width and 22 in 4K OLED screen (A350); window suites alternating window-/aisle-aligned; electronically lowerable divider for companion centre pairs; 42 Business seats on the A350-900 long-haul.
Layout v2 follows the owner-supplied seat map: 40 suites, rows 11,12,14–18 forward and 19–21 rear (map ends at 21); companion rows 11/14/16/18/19/21 (A/K aisle-side, D+F together), window rows 12/15/17/20 (A/K by window, D/F split); front LAV/GALLEY/GALLEY, mid LAV + EXITs, bassinets at 19A/19K. Aisles (~0.95 m) and row spacing (1.55 m) are exaggerated for walkway clarity; fuselage widened to fit. Assumed: suite footprint, console and screen placement; colours/materials from the owner's renders; bulkhead artwork is an abstract bird/arrow impression, not the airline logo; IFE content is a placeholder.

## Study 03 — Singapore Indoor Stadium · 2026 BABYMONSTER World Tour [CHOOM] (unofficial fan concept), served at /sis/
Shared tab bar (see Site structure). Not affiliated with BABYMONSTER, YG Entertainment, Live Nation, Ticketmaster or The Kallang / Singapore Sports Hub. No booking; prices exclude booking fees.
Source: sis.js, sis-model.cjs, sis-plan.json, sis.template.html (built to sis/index.html; dist/sis/index.html). Tests: node test-sis.cjs.
Interactions: drag to orbit, scroll/pinch to zoom, hover for a tooltip, click a seat or standing pen to select it (section, row, seat, category, price, distance, view type), double-click (or View from here) to fly to that seat's eye point looking at the stage; drag to look around, scroll to change FOV, Escape / Back to map to return. Section → row → seat pickers and a legend (click a category to highlight it; venue/ticket colour toggle).
Sourced: section list, categories and prices from the official BABYMONSTER [CHOOM] SIS seat plan (stage south with T-runway; Pen B west / Pen A east, VIP Standing in front of CAT 1 Standing; PA1–PA3 VIP Seated with CAT 2 floor seats; FOH north; L2 208–234, L3 308–314/318–320/322–324/328–334, no 321, no 100s). Section outlines re-projected from the public Pacifa seat-view top image; continuous rows (L2 13–27, L3 28–36) and published seat counts for 208/210/214/220/224/231/234/308/310/314/322/328/334. Roof: Kenzo Tange diamond pagoda (≈200 × 120 m, 45 m high, ≈39 m ceiling) with space frame and central light trough.
Approximated: perspective correction of the aerial (west side stretched ×1.24), row depth ≈0.9 m; seat counts of other sections fitted to outlines; rake (L2 4.3 m + 0.40 m/row, L3 11.6 m + 0.50 m/row) estimated from Docomomo sections and tuned against the official 220 (row ~17) and 322 (row ~30) seat views; floor layout (plan is not to scale), floor row/seat numbering, stage/screens/lighting/PA (production design unpublished), maroon accent blocks. No reference photos or the official plan image are embedded.

## The Star Theatre (`/star/`)

Unofficial fan concept of The Star Theatre at The Star Performing Arts Centre in Buona Vista. The plan is drawn from the official numbered seating plan: Stalls 1,903, Circle 1 1,811 drawn (published as 1,812), Circle 2 1,427, for 5,141 drawn seats in a published house of 5,142. The furthest seat is about 56 metres from the stage. Rake, balcony heights and stage size are approximate. Orange chairs, walnut walls and a dark ceiling follow official interior photos. Architecture matches the Sands Theatre viewer (2D plan, seat selection, 3D seat view, mobile touch), with instanced chairs for phone performance.
