# SeatScope — GV Funan Deluxe approximate study
Independent prototype • approximate geometry • no live booking.

## Play
Open index.html directly in a modern WebGL browser. All Three.js, app JS, styles, screen logo and three reference images are embedded; no network dependencies.
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

index.html: self-contained playable deliverable.
app.js, model.cjs, index.template.html, build.cjs: editable source.
Test coverage: 56 unique slots, 54 chairs + 2 bays at G3/G6, straight row coordinates, four-pair aisle spacing, all illustrative availability, valid F8, metrics/easing, source-executed single/doubleclick transitions and guards. Build validation also checks exact embedded logo bytes, contain scaling, and removal of former venue/red-seat theme.

Browser rendering has not been visually verified by the executor. Geometry/proportions remain estimates, especially arm-console spacing, handrail positioning and aisle boundaries. No deployment or public publishing performed.

## Study 02 — SIA-style 2027 Business Class (unofficial fan concept), served at /sia/
Tab switcher at the top of both pages: GV Funan Deluxe | SIA Business. Not affiliated with or endorsed by Singapore Airlines.
Source: sia.js, sia-model.cjs, sia.template.html (built to sia/index.html; dist/sia/index.html). Tests: node test-sia.cjs.
Interactions mirror the cinema: drag to orbit, scroll to zoom, click to select, double-click a suite (or Sit here) to fly into its seated POV; drag to look around, Escape/Change seat to return.
Published facts used (reports of the 6 Nov 2026 unveiling): 1-2-1 direct aisle access; sliding doors; 52 in shell/door height; 50 in pitch; 22 in seat width and 22 in 4K OLED screen (A350); window suites alternating window-/aisle-aligned; electronically lowerable divider for companion centre pairs; 42 Business seats on the A350-900 long-haul.
Assumed: row numbering reuses today's A350 LH Business map (11–17, 18–22, no 13, row 18 centre only); which rows are companion pairs; suite footprint, console and screen placement; colours/materials from the owner's renders; bulkhead artwork is an abstract bird/arrow impression, not the airline logo; IFE content is a placeholder.
