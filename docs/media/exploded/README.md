# SpotifyWheel exploded view

A section-aware exploded view for a Pico.css page. When the reader is in **Build**, **Hardware**,
**Software** or **How it works**, those parts stay sharp and in full colour, everything else greys out,
softens and steps away to give them room. Every other section (and the top of the page) shows the
assembled device; the parts slide together and the assembled render fades in.

## Add it to your page

1. Copy this `exploded/` folder next to your page.
2. In `<head>`, after Pico:
   ```html
   <link rel="stylesheet" href="exploded/exploded.css">
   ```
3. Where the view should sit (e.g. beside your "On this page" links):
   ```html
   <figure class="sw-exploded sw-sticky" data-src="exploded/" aria-label="Exploded view of SpotifyWheel">
     <img src="exploded/assembled.webp" alt="SpotifyWheel">
     <figcaption></figcaption>
   </figure>
   <script src="exploded/exploded.js" defer></script>
   ```
   `sw-sticky` keeps it pinned while scrolling (`--sw-top` sets the offset, default `2rem`). Leave it off
   if your sidebar is already sticky. Delete the `<figcaption>` if you don't want the caption line.

Your sections only need their ids: `see-it-in-action`, `how-it-works`, `build`, `software`, `hardware`,
`what-went-wrong`, `make-it-yourself`. Nav links pointing at those ids switch the view immediately on
click; scrolling switches it when a section's heading passes 35 % of the way down the window.

## Changing what lights up
Edit `SECTIONS` at the top of `exploded.js`. Part names:

| name | part | name | part |
|---|---|---|---|
| `wheel` | fluted wheel | `pi` | Raspberry Pi Zero 2 W |
| `magnets` | 16 magnets | `tb` | TB6612 board |
| `display` | round display | `motor` | N20 motor |
| `standoffs` | 4 standoffs | `gear` | bevel gear |
| `hall` | hall sensor holder | `inserts` | heat-set inserts |
| `holder` | motor holder | `plate` | inner plate |
| `scr_holder` | M4 screws (motor holder) | `scr_standoff` | M4 screws (standoffs) |
| `scr_boards` | M2.5 screws (boards) | `ring` | ring gear |
| `bearing` | bearing | `shell` | outer shell |
| `bracket` | wall bracket | | |

Per section: `primary` (highlighted), `secondary` (full colour, no emphasis), `lift` (extra lift + glow),
`ghost` (dimmed and see-through, e.g. the display in Build),
`screen: true` (display shows the UI), `caption`. `mode: 'assembled'` shows the assembled device.

Tuning lives at the top of `exploded.js` (`GAP`, `LIFT_PX`, `SPY_LINE`, `NARROW`) and in `exploded.css`
(`--sw-speed` for moves between highlights, `--sw-asm-speed` for the assembled hand-off,
`--sw-dim`, `--sw-ghost-opacity`, `--sw-glow`).

## Behaviour notes
- Phones (≤ 767 px wide): shows the assembled device only.
- `prefers-reduced-motion`: no sliding, just crossfades.
- Light and dark Pico themes are both handled (dimmed parts fade toward the page colour).
- All images are transparent WebP, cropped per part; `manifest.json` holds positions and the
  slide-to-assembled vector for every layer. Layers marked `_over` are small patches that keep overlaps
  correct while parts move.
