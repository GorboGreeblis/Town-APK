# How the creatures are built

How every character model in the game is constructed and the shared kit they are built from. The design and style
breakdown (the house style the models share, each character's look, the author's answers about them) is in the Lore
Bible, LORE.md "Creature design and style" (moved there in 3.15.57, the author's request). Read from the current game file (`tools/uncompressed.html`; the fixes in
FIXES.md do not change any model's look). Numbers are the code's own (metres, radians, seconds; `sin(2.1t)` means
a sine of 2.1 radians per second). Anything the code does not state is marked *(inference)*. The author's rule for
the models (RELEASE.md 6, RULES.md 7): the designs are final; fixes must not change how anyone looks.

**Code names.** The identifiers below are from the unminified game file, 3.15.44 (`git show 21596f1:tools/uncompressed.html`).
Since 3.15.45 the game file is minified (FIXES R2): names at the top level of the game's script survive (`x`, `T`, `R`,
`so`, `io`, `tkS`, `W`, `At`, `PK_MODELS`, `PK_MONT`, `anomaleePeg`, `fortizmoPick`, `gcBeatHz`) as do property names
(`JGP.slug`, `JGP.robin`, `userData.keep`, `.surf`), but names local to a function were renamed (`KIT`, `BORN`, `ROWS`,
`born`, `blobBody`, `latheGeo`, `smoothProfile`, `profileR`, `ridgedTube`, `cardGeo`, `onEllipsoid`, `faceTo`, `gradMat`,
`texturize`, `robin`, `buildModel`, `DRUMS`, `$R`/`$x`/`$T`, Gemtoe's `teal`). Look those up in 3.15.44; the models are
the same object for object (`minify_identity.js`).

## 1. The cast at a glance

Heights are the value each builder reports, which places things relative to the character, not a label (there are
no name labels over anyone): emotes at height + 0.4 m, vignette speech bubbles at height + 1.1 m, the controller's
pick target at half the height; a carried pizza box sits on the model's real top (its bounding box) instead.
Model scale and body radius come from the cast table (`ROWS` in `JGP`). Each townsperson's signature colour (`color` in the cast table) colours their dialogue
box when they speak. The emotes over their heads have one colour per glyph since F-B29 (the author: "no emotes need to be
random colors"): heart pink, note lime, flower, `!`, star and sparkle yellow, `?` teal, the rest white (approved by the author, 2026-10-28).

| Character | Id | Model | Generation | Height | Scale | Body radius | Signature colour | Built from |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gooward | `gorbo` | `born_gooward` | BORN | 3.2 | 1 | 1.2 | `#30b4e4` | lathe gumdrop with lumps |
| Sparkakus | `keeper` (`st.ent`) | `born_sparkakus` | BORN | 2.85 | 1 | n/a | painted blue fur `#2c4cc0` | blob body (6 ellipsoids) |
| Zollod | `cutebex` | `born_zollod` | BORN | 2.6 | 1 | .9 | `#3cbe94` | blob body (6 ellipsoids) |
| Somlet | `m_somlet` | `born_somlet` | BORN | 3 | 1 | 1 | `#ecd8b6` | superellipsoid cushion |
| Mushroom | `drifter` | `born_mushroom` | BORN | 2 | 1 | .8 | `#e8862a` | lathe stem and cap |
| King Dino | `m_kingdino` | `born_kingdino` | BORN | 3.1 | 1 | 1.1 | `#e8c020` | own signed-distance blob (5 ellipsoids) |
| Etcher | `p_etcher` | `born_etcher` | BORN | 2.6 | 1.16 | 1.15 | `#9ee09a` | blob body, shingled scales |
| Gemtoe | `p_gemtoe` | `born_gemtoe` | BORN | 2.4 | 1.06 (rig .78) | 1.15 | `#c870d0` | lathe torso, feather cards |
| Glyph | `p_glyph` | `born_glyph` | BORN | 2.5 | 1.11 | 1.1 | `#e88a8a` | blob body (8 ellipsoids), plates |
| Mama Gorbo | `p_mamagorbo` | `born_mamagorbo` | BORN | 2.95 | 1 | 1.1 | `#ff9f5c` | blob body, melting dome |
| Anomalee | `blinker` | `pk_anomalee` + `anomaleePeg` | packaged | 3.3 | .95 | .95 | `#2fd4e6` | boxes (pixel-art textures) |
| Fortizmo | `frog` | `pk_fortizmo` + `fortizmoPick` | packaged | 3.75 | .78 | .95 | `#e8742a` | displaced spheres, lathes, wheels |
| Hennrick | `gratelet` | `pk_hennrick` | packaged | 3.4 | .88 | 1.25 | `#c85ac8` | displaced ellipsoids, conformed patches |
| Nextessa | courier | `pk_nextessa` | packaged | 3.5 | 1 | .92 | `#ef7536` | spheres only |
| Montgummery | `w_mont` | `PK_MONT.mont` | packaged (own module) | 3.3 | .9 | .86 | `#55b8c6` | superellipsoid body, CRT head |
| The Ancient | `slug` | `JGP.slug` | world prop | .9 | 1.75 (spine) | 1.4 | `#9a7a5a` (label) | one tube along a spine |
| The robin | n/a | `robin()` | world prop | about .45 | 1.15 | n/a | rusty breast `#c05a20` | small primitives on a branch |
| Backpacka | n/a | `BP.buildModel` | Event actor | n/a | n/a | n/a | skin `#d48e64` | horizontal lathe, neck segments, wings |
| The player | `At` | `W()` (hands), body at boot | player | about 2.3 | 1 | .6 | dress `#f3c43a` | cylinders and spheres |

## 2. Three generations of model code

The town's characters come from three kinds of builder, registered in one table, `so`, by model name.

- **Packaged models** (`PK_MODELS`: Anomalee, Fortizmo, Hennrick, Nextessa; `PK_MONT`: Montgummery). The older
  generation, each a self-contained function with its own little helpers (Montgummery's module even reuses the
  names `R`, `x`, `T` locally and keeps the real helpers as `$R`, `$x`, `$T`). Surfaces are painted canvases made
  for the one character: brush-stroke fur (Fortizmo 2,800 strokes, Hennrick 2,600), scrolling code text
  (Montgummery), pixel-art stripes (Anomalee, the only nearest-filtered, mipmap-free textures in the cast).
  Their shapes are mostly displaced spheres and boxes. Each is registered as `so["pk_<name>"]`.
- **BORN builders** (`BORN.<name>`: the ten townsfolk listed as BORN above). The newer generation, built from a
  shared toolkit (section 3): signed-distance blob bodies, lathe profiles, feather and fur cards, the shared eye,
  arm and leg, and the procedural surface kit. Each is registered as `so["born_<name>"]`.
- **Wrappers** adjust two packaged models after they are built: `fortizmoPick` enlarges every bounding sphere by
  1.3 (his horn morph reaches outside the built shape); `anomaleePeg` re-skins her plain colours with the plastic
  surface (`texturize`), gives her magenta parts a "scan" texture, adds the gaze-up tilt, and rebuilds her hidden
  fourth leg as a wooden peg leg.
- **Every builder is fenced**: if one throws, the registry logs it, empties the model and returns a plain 2 m
  placeholder, so one broken model cannot stop the town from loading.

The Ancient, the robin, Backpacka and the player are built by their own modules, outside the registry.

## 3. The shared toolkit

### 3.1 Base materials (`x`) and geometry (`T`, `R`)

| Maker | Material | Defaults | Look |
| --- | --- | --- | --- |
| `x.clay(colour, opts)` | Phong | specular `#1c1c1c`, shininess 14 | matte, soft clay |
| `x.wet(colour, opts)` | Phong | specular `#666666`, shininess 70 | glossy, wet |
| `x.basic(colour, opts)` | unlit | n/a | pupils, glows, highlights, mouth lines |
| `x.world(colour, opts)` | Lambert | n/a | scenery |

Both `x` and `T` (spheres, boxes, cylinders, cones, tori, ...) cache by their parameters, so every identical look
shares one material and every identical shape one geometry. `R(geometry, material, parent, position, rotation,
scale)` adds a mesh. Most of a character is dozens of `R(T.sphere(...), x.clay(...), ...)` calls.

### 3.2 Procedural surfaces (`KIT.surf`)

`KIT.surf(kind, colour, {rep, bump, shine, spec})` returns a Phong material whose texture is a 256-pixel canvas
painted once per kind, **in greys**, and tinted by the material's colour. The same canvas is the colour map and the
bump map (bump .02, shininess 25, specular `#222222` by default; repeat 2), so the surface has relief and catches
light. The painter is seeded by the kind's name, so a kind looks the same on every boot.

| Kind | What is painted | Used on (examples) |
| --- | --- | --- |
| `scale` | offset rows of shaded ovals | Zollod, Etcher, Gemtoe's torso and tails |
| `fur` | 2,600 short curved strokes | Sparkakus's hands and feet |
| `feather` | shingled feather shapes with shafts and barbs | Gemtoe's head, feather cards |
| `fabric` | a woven 4-pixel check | Zollod's apron, Mushroom's gills |
| `felt` | short random fibres | Somlet, Mushroom's hat, Gooward's beret |
| `metal` | brushed lines and scratches | Glyph's horns and shield |
| `goo` | soft noise with highlight blobs | Gooward, Mama Gorbo |
| `skin` | soft mottling and specks | King Dino, Mushroom's cap, Backpacka, Somlet's tentacles |
| `soft`, `plastic`, `rubber` | fine noise; a dot grid for rubber | Mushroom's frill; Gemtoe's bill, Anomalee; Gooward's float ring |
| `wood`, `leaf`, `stone`, `sand`, `soil`, `grass` | grain, a leaf's veins, cracks, grains, clods, blades | Mushroom's stem; Zollod's fronds; Mushroom's spots; Zollod's moss |

`gradient(geometry, stops)` paints vertex colours by height (a list of `[y, colour]`); `gradMat(kind, opts)` is a
`KIT.surf` material set to use vertex colours, so one textured material carries a whole colour ramp (Gooward's
peach to blue, Mushroom's cap, King Dino's crown). `texturize(group, kind, opts)` swaps a model's plain Phong parts
for a surface kind afterwards (Anomalee's plastic).

### 3.3 Body-building methods

- **Lathe from a smoothed profile.** `latheGeo(smoothProfile([[r, y], ...]))` spins a Catmull-Rom-smoothed outline
  (radius against height) into a body: Gooward's gumdrop, Mushroom's stem and cap, Gemtoe's torso, Backpacka's
  body (on its side). `profileR(points, y)` reads the radius back, to place features on the surface.
- **Blob bodies** (`blobBody(parts, centre, {k, uvLen, col})`): the body is the smooth union of a few ellipsoids
  `[cx, cy, cz, a, b, c, rx, ry]` (a signed-distance field with a smooth minimum of width `k`), turned into a mesh by
  casting an 80 x 60 grid of rays from a centre point and bisecting to the surface 14 times. This gives a single
  seamless skin with soft creases where the parts meet; a `fold` value (how much the smooth union differs from the
  hard one) darkens the creases in the vertex colours. Sparkakus and Zollod (6 parts), Etcher (6), Glyph (8), Mama
  Gorbo (10, softer `k` .3) use it; King Dino has his own copy (5 parts, 88 x 64 rays). The returned `hit()` casts a
  ray onto the body, so eyes, scales, plates and cards are placed exactly on the skin and aligned to its normal.
- **Displaced spheres** (packaged models): a sphere reshaped by a formula (Fortizmo's pear) and jittered by a hash
  for a hand-made, lumpy look; patches conformed to an ellipsoid (Hennrick's fur bands, Fortizmo's belly).
- **Superellipsoids**: a sphere pushed toward a rounded cube (Somlet's cushion, exponent 3.2; Montgummery's body, 6
  above and 2.4 below).
- **Tubes**: `ridgedTube(points, r0, r1, n, ridges, depth)` (a tapering tube with ring ridges: Etcher's tentacles,
  Glyph's horns, Mama Gorbo's lime goo tube) and plain tapered tubes (tails, trunks, cables, mouth lines).
- **Cards** (`cardGeo(cards, "vane" | "fur")`): thin curved strips laid on the surface along its normal, with
  shading baked into their vertex colours: Sparkakus's bib and back vanes, Gemtoe's 660 body feathers, 132 wing
  vanes, cheek tufts and crest, King Dino's plume.
- **Features on a surface**: `onEllipsoid` places a part on an ellipsoid and turns it to the normal; `faceTo`
  aims a part along a direction.

### 3.4 Shared parts (`KIT`)

- **Eye** (`KIT.eye(parent, pos, r, {iris, lid, open, rot})`): a white sphere (`#fbf8ee`, shininess 80), an iris disc
  (r x .6, the character's colour), an unlit pupil (r x .3, `#0c0c10`), an unlit white highlight (r x .14, up and to
  the left) and a hemisphere lid (r x 1.1) resting at the angle `open` (more negative = more open; most are -.25 to
  -.5, a calm, slightly heavy look).
- **Blink** (`KIT.blinker`): the first blink 1-5 s after birth (seeded), then every 2.5-6.5 s; a blink takes 0.18 s
  (closing to 1.75 rad and back). Characters without `KIT.eye` blink their own way (Gooward squashes his cross eyes,
  Mama Gorbo flattens her lenses).
- **Mouth** (`KIT.mouth`): a 0.8 x pi arc of torus, unlit `#2a1010`, turned to a smile. Several characters trace their
  mouth instead as two thin tubes along the snout (Sparkakus, Etcher, Glyph, King Dino): a long, closed smile.
- **Leg** (`KIT.leg`): hip, knee and foot joints; tapering cylinders; a `claw` foot (three toes with cone nails) or a
  round `pad` foot with three nail beads (`#f2ead0`).
- **Arm** (`KIT.arm`): shoulder, elbow, hand; hands `claw3` (three cones), `mitt` (a mitten with a thumb) or four
  fingers.
- **Stride** (`KIT.stride(leg, phase, amplitude, bend)`): hip swing `sin(phase)`, knee bend `max(0, sin(phase + 1.4))`,
  and the foot counter-rotated to stay flat on the ground.

### 3.5 From parts to a living character (`born`)

`born(group, {height, crownY, head, lids, step})` turns a built group into a character:
1. registers the eyelids with a blinker;
2. finds which parts move: `KIT.animated` runs the character's `step` at six sample times (idle, talking, walking)
   and marks every object whose position, rotation, scale or visibility changes;
3. returns `height` (where emotes, speech bubbles and the pick target go), `crownY` and `head` (where hats and emotes sit), and `anim(t, dt, entity)`,
   called every frame with the talk strength (`tkS`) and whether the character is walking.

Right after the build the game merges each model's static parts (`io`, called with every part `born` did not
find moving): sibling meshes that share every material property except
colour become one mesh, their colours baked into vertex colours. Parts that move, eyelids, and anything marked
`userData.keep` stay separate. This is why a character made of a hundred primitives draws in a handful of calls,
and why the batcher (RENDERING.md) can then merge them further: since P24 (3.15.48) the creatures are batched
together in one pass.

## 4. Changing or adding a creature

- **Do not change how anyone looks** (the author's rule). A fix to a model must leave its pixels the same:
  `minify_identity.js BEFORE AFTER` compares the whole built scene bit for bit, `test_coincident.js` and `test_zfight.js` catch depth fights between
  parts (B20-B23 were fixed that way, moving parts by a millimetre or two inside each other).
- **Keep creature geometry non-indexed**: the ground fit samples every 6th vertex, so indexing a creature's mesh
  would move it (P12 skips creatures; RENDERING.md 4).
- **Mark moving parts `userData.keep`** (or let `born` find them): otherwise the merge (`io`) bakes them into a
  static mesh and they stop moving.
- **Use the shared kit**: `x.*` and `KIT.surf` cache materials, so a new part in an existing look adds no material
  and batches with the rest. A new material created after loading must be warmed (`warm_coverage.js` fails on a lit
  material without its shaders; B27 was the Gem's).
- **A model built after loading** (as Backpacka is, by her module's pre-warm, after the step that batches the
  scene) must be handed to the batcher when it is built, or every part draws on its own (P25: 96 parts, about 83
  draws a frame). Its geometry must not change while it plays, or a batch copy goes stale.
- **Collision**: the player's movement checks player-only circles (`uo.pc`); Backpacka's at the pond (F-B37) grow
  as her parts come below head height and never move her. A new body the player must not walk into gets its own,
  with a test like `test_backpacka.js`.
- **Faces**: use `KIT.eye` and `KIT.mouth` for the house face; pass the lids to `born` so they blink.
- **A new screen face or painted texture**: make it while loading and keep it (Montgummery's faces are all made at
  load since F-B30): no texture may be made during play (RULES.md 9; `texture_census.js` fails on one). A canvas
  repainted during play goes through `needsUpdate`; since F-B31 the upload happens in a task after the frame, never
  inside it.
- **Measure a change**: `creature_census.js` (full-tier report, `.runs/creature_census.json`) gives each character's
  meshes, batched parts, triangles, materials and textures; compare before and after.

