# How the creatures are built: design and style

A breakdown of every character model in the game: how each is constructed, the shared kit they are built from,
and the visual language they share. Read from the current game file (`tools/uncompressed.html`; the fixes in
FIXES.md do not change any model's look). Numbers are the code's own (metres, radians, seconds; `sin(2.1t)` means
a sine of 2.1 radians per second). Anything the code does not state is marked *(inference)*. The author's rule for
the models (RELEASE.md 6): the designs are final; fixes must not change how anyone looks.

## 1. The cast at a glance

Heights are the value each builder reports (used for labels and emotes); model scale and body radius come from the
cast table (`ROWS` in `JGP`). Each townsperson's signature colour (`color` in the cast table) colours their dialogue
box when they speak and the emotes over their head (`?`, `!`).

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
3. returns `height` (labels and emotes), `crownY` and `head` (where hats and emotes sit), and `anim(t, dt, entity)`,
   called every frame with the talk strength (`tkS`) and whether the character is walking.

Right after the build the game merges each model's static parts (`io`, called with every part `born` did not
find moving): sibling meshes that share every material property except
colour become one mesh, their colours baked into vertex colours. Parts that move, eyelids, and anything marked
`userData.keep` stay separate. This is why a character made of a hundred primitives draws in a handful of calls,
and why the batcher (RENDERING.md) can then merge them further.

## 4. The house style

What the models have in common, as built:

- **Soft, chunky, readable shapes.** Bodies are one smooth mass (a blob, a lathe, a cushion) 2.4-3.75 m tall,
  wider than they are deep, with few, large features that read from across the park in a headset. Edges are rounded
  everywhere; only Anomalee and Montgummery are boxy, and they are machines.
- **One signature colour, then accents.** Each character has one dominant hue (their cast colour, which also colours
  their dialogue box and emotes) and a few small, saturated accents in the opposite part of the wheel: Gooward's blue with
  magenta and lime, Zollod's teal-green with pink tips, King Dino's yellow with teal and a purple-to-orange plume,
  Mama Gorbo's peach with cyan, pink and purple drips.
- **Matte bodies, glossy details.** Skins are clay-like (shininess 14-55, textured relief); eyes, noses, gems,
  badges, horns and lenses are glossy (shininess 80-170, white specular), so the eye goes to the face and the
  accessories. Gems are flat-shaded to sparkle (Etcher, Gemtoe).
- **Texture is relief, not pattern.** Most surfaces are the shared grey kits tinted by colour, so fur, scales and
  felt have a hand-made, slightly bumpy feel without busy colour. Colour variation comes from vertex gradients
  (height ramps, darker creases, gentle mottling), not from painted maps.
- **The same friendly face.** The shared eye (white, coloured iris, round pupil, one highlight up and to the left,
  a heavy lid) appears on most of the cast; the smile is a thin dark arc. No one frowns. Several faces are screens
  instead (Anomalee, Hennrick, Montgummery) whose pictures change with what the character is doing.
- **Everyone is a little bit of technology.** *(inference from the painted details)* Each design hides a computing
  joke: Gooward's float ring tag "AP" and Sparkakus's coin "APP"; Mama Gorbo's orbiting pins "AP", "IP" and a wifi
  sign; Glyph's back plates (a terminal prompt `> ..`, "PR", a glowing "APK", a shield with a "G"); Anomalee's
  monitor head, keyboard jaw and "adb" labels; Montgummery's CRT head with "gfxinfo" on screen and scrolling code on
  his body; Hennrick's data screen; Etcher's three back marks (a stroked "B", three stacked parallelograms, two
  diamonds, which resemble cryptocurrency logos).
- **Always moving, never in sync.** Every character breathes, sways or bobs with slow sines (mostly 0.7-2.1 rad/s,
  a few centimetres or a few hundredths of a radian), each part at a different rate and phase, so nothing looks
  frozen and no two move alike. Talking adds a nod, a bounce or a moving mouth (`tkS`); walking adds a stride or a
  hop. Dancers follow the beat (`gcBeatHz`, 104 beats a minute in town, 88 in the Event).
- **Props tell the job.** Mushroom the sheriff: a star badge and a cowboy hat. Somlet the postmaster: a cap with an
  envelope badge, asleep at the post. Zollod the gardener: an apron with seed packets and a garden growing on his
  back. King Dino the drummer: a crown and drumsticks. Nextessa the courier: a pizza box on her head.

## 5. Character by character

### Gooward
- **Body**: a lathe gumdrop (radius 1.12 at its widest, 2.25 tall) raised .55, roughened by 8 lump spheres; 22
  transparent bubbles inside, 4 drips, 9 streamers on the ground, a striped rubber float ring at the waist.
- **Palette**: a vertical ramp from peach (`#f2a274`) at the bottom to blue (`#2a9ee0`) at the top; magenta, lime and
  purple accents; a purple felt beret dabbed with paint.
- **Surface**: `goo` with the ramp, glossy (shininess 75, a pale blue specular); bubbles .55 opacity.
- **Face**: two plus-shaped eyes (dark crosses with white crosses in front), a smile with a tube tongue, three colour
  splotches on the cheeks, two wavy teal forehead wrinkles. Blinks by squashing the crosses for 0.16 s every 4.3 s.
- **A second set of eyes** (the author): the two octagonal lens discs on the sides of his upper head (a purple
  housing, a pink rim, glowing lilac glass, eight beads round each). They do not blink.
- **Extras**: two gold crests, two flat-shaded crystal wings, the ring's "AP" tag. The beret is bent onto a sphere so it hugs its lump.
- **Motion**: squash and stretch `sin(2.1t)`, a bob, the ring floating and rolling, wings fluttering, the tongue
  wagging harder while he talks. No walk cycle.

### Sparkakus
- **Body**: a blob body of 6 parts (belly, chest, hips, neck, head, a long tilted snout); clawed legs (`KIT.leg`),
  mitten hands with red cuffs (`KIT.arm`), tall flattened ears with small horns, a long tail with a star at its tip.
- **Palette and surface**: his own painted fur, blue `#2c4cc0` brushed with darker and lighter strokes and grown over
  by 14 wandering vines with leaves and dots in yellow, green, pink, orange, teal and violet, a third of the dots
  five-petal flowers; orange hands and feet, a cream fur-card bib, dark feather vanes down his back, four daffodils on
  his flank.
- **Face**: two shared eyes with yellow irises placed on the head with `hit()`, a glossy black nose, a mouth traced
  along the snout.
- **Extras**: a collar with an orange "APP" coin; a pink-to-cyan mist trailing from his tail (90 particles, 2 s each).
- **Motion**: breathing, ear twitches, a full walk (stride, arm swing, roll and lean), and a dance with arms pumping
  overhead.

### Zollod
- **Body**: the same blob plan as Sparkakus with a short round snout and a trunk; four-fingered arms, pad feet, a
  thick drooping tail; six fronds from his back sides.
- **Palette**: six bands from cyan (`#35d0c8`) at the top to green (`#4ca83c`) at the bottom, darker seams between
  the lower bands; pink tips on trunk and tail.
- **Surface**: `scale` with the bands; a moss bib on his back (`grass`) with 26 blades, five flowers and a worm; an
  olive canvas apron with a pocket of three seed packets.
- **Face**: two shared eyes; the trunk stands in for nose and mouth. Nothing in the model is "shy": his shyness is in
  his lines and his shop.
- **Motion**: a smoothed walk (the upper body rocks over planted legs), fronds and tail swaying, the worm turning.

### Somlet
- **Body**: a floating felt cushion (superellipsoid, `.82 x .76 x .72`) with 16 bumps, two floating three-sphere hands,
  seven thin branching tentacles hanging below; no legs.
- **Palette**: cream felt (`#f2e4b4`), a navy postman's cap with white piping, a black visor and a gold envelope
  badge; plum tentacles.
- **Face**: asleep by default: felt lids with lashes and creases, under-eye bags, a brow; a hidden open eye that
  eases in when the player gives him a gift. A small "o" mouth that breathes and talks.
- **Motion**: hovering, breathing, three "Z" sprites rising from him; when he is at home and idle he slowly rolls
  onto his side to lie down. Each frame his tentacles curl themselves out of the ground.

### Mushroom
- **Body**: a lathe stem (about 1.1 across) under a broad, flat cap (about 2.5 across) with 60 gills, a scalloped
  frill, 17 sand spots, two baby mushrooms on his back, two flat feet with root tendrils; no arms.
- **Palette**: cream stem (`#f6eed4`), an orange cap ramp (`#e46a14` to `#f8b83a`) with white spots; brown felt hat.
- **Surface**: `wood` stem, `fabric` gills, `skin` cap with the ramp.
- **Face**: on the stem, under the cap: shared eyes, angled brown brows, pink cheeks with freckles, a small smile.
- **Extras**: a six-point sheriff's star; a cowboy hat whose brim and crown are shaped by moving the lathe's vertices
  (sides curled up, a front dent, a centre crease).
- **Motion**: the stem sways, the cap bobs and nods while he talks. No walk.

### King Dino
- **Body**: his own signed-distance blob (torso, a head nearly as wide, a wide snout, two thighs), pear-shaped.
- **Palette**: yellow (`#f9dc22`) shading to deeper yellow low down and orange in the creases; glossy teal joints,
  sockets and buttons with lime lights; a blue crown; a feather plume ramping purple to orange.
- **Face**: two glossy dark eyes in yellow rings with lids, a smile traced along the snout.
- **Synthetic parts of his own body** (the author): three lit buttons on each side and a back panel of five
  sockets, in the same glossy teal as his joints.
- **Extras**: short arms with drumsticks; a five-point swept crown; the plume, a curved spine of feather cards fanning out.
- **Motion**: rolls and sways; when the drums play (`DRUMS`), each hit swings an arm and nods his body.

### Etcher
- **Body**: a pear-shaped blob (wide base, a long neck, a small head with a forward snout) covered in about 120
  overlapping scales placed with `hit()` and tilted like shingles, leaving a bare belly window; no arms; six long
  ribbed tentacles fanned on the ground at the sides and back.
- **Palette**: teal (`#2a8a9e`) to blue (`#2a5aa8`) with four scale shades; purple crest knobs and tentacles; a green
  faceted chest gem; three yellow marks on his back.
- **Face**: shared eyes with gold irises on the sides of the head, a long lizard smile.
- **Motion**: idle sways; a four-bar dance in which the tentacles pulse, ripple in order, fan and rise; battle moves
  rock (a slam), paper (the tentacles flatten and lift) and scissors (two tentacles snip). His tentacles bend on the
  CPU as true arcs.

### Gemtoe
- **Body**: an upright egg (lathe torso, bare scaly below, a fluffy bib of about 660 feather cards above) on four
  curling tails that stand in for legs and each cradle a gem; two pairs of fanned wings; a round feathered head with
  a hooked parrot bill.
- **Palette**: reds (`#b8282e` and its shades) with a yellow-orange crest; amber eyes; purple gems with yellow
  sparkles. *(inference: the palette variable is still named `teal`, so the model was once teal.)*
- **Face**: side-set amber eyes with slit pupils and feathered lids, scaly brows, a beak that opens while he talks.
- **Motion**: hovers, the head looks about, the wings flap faster when he moves, the sparkles twinkle.

### Glyph
- **Body**: a plump upright dragon (8-part blob: torso, belly, chest, head, snout, two haunches, a rump), a thick tail
  curling sideways, ram-like gold horns, clawed arms and legs.
- **Palette**: blue (`#4a9ad8`) under a swirl-painted skin; navy plates with gold swirls; gold horns; glowing orange
  eyes.
- **Extras**: a ridge of hexagonal plates down the back and tail; five painted dorsal plates (a face, a sigil, a
  terminal prompt, "PR", a glowing "APK"); a gold shield with a "G" on his flank; two emissive tiles.
- **Motion**: idle bobs, looks around and a shake every 5.3 s; a 16-beat Macarena with a quarter turn at the end;
  battle moves air guitar (rock), snipping arms with jumps (scissors) and flapping arms (paper). Idle, dance and
  battle are cross-faded.

### Mama Gorbo
- **Body**: a melting jelly mound (a dome on a slumping base spreading into a flat skirt, a lump on the top left,
  six drip shapes down the dome), clamped flat at the ground; no limbs.
- **Palette**: peach (`#ff9f5c`), richer on the drips; cyan, pink and purple ooze; a lime goo tube draped round her
  front; red pins.
- **Face**: two octagonal porthole eyes, one large and one small, with purple glowing lenses; no mouth.
- **Extras**: three ooze drips that a bulge travels down, drops that grow, fall and leave peach splats on the ground,
  orbiting pins "AP", "IP" and wifi, four flashing yellow sparks.
- **Motion**: deep jelly breathing, a bounce and nod while she talks, lenses pulsing; her base lifts when she tilts
  so she never sinks into the ground.

### Anomalee
- **Body**: a box quadruped with a crocodile snout and jaw, a tilted monitor head, a small box on top with three
  hanging cables, one arm holding a handheld, a tail; the back-right leg is a wooden peg leg.
- **Palette and surface**: pixel art: a sage skin (`#b3c48f`) with cyan and grey stripes at 32 pixels, nearest
  filtered; a cyan head, a magenta screen; "adb" labels; re-skinned with the plastic surface by her wrapper.
- **Face**: the magenta screen (a corner bracket and wifi arcs; static when she glitches; an equaliser while she
  dances); the jaw chomps now and then.
- **Motion**: a four-legged walk, cables swaying, a glitch every 5-13 s; gazes up at the church when idle.

### Fortizmo
- **Body**: a pear body that widens at the bottom, a round head with long upright ears, a trumpet-bell muzzle, arms
  with three-fingered hands; he rolls on two unicycle wheels with springs.
- **Palette and surface**: orange brush-stroke fur (`#e8742a`), a cream belly patch with seams and black studs, brass
  valves, chrome and black tyres. Every vertex jittered for a hand-made look.
- **Face**: two glossy black eyes and four smaller matte black beauty marks beside them (the author).
- **Motion**: the wheels roll with the distance travelled; when he plays, his muzzle morphs into a 3.7 m trumpet,
  the valves pump at the Event's 88 beats a minute and his arms reach for the horn.

### Hennrick
- **Body**: a large egg body and broad head, ball shoulders, a beard of four tentacles, copper pipes curving up
  beside the face, chrome kneecaps with spikes, a brown hat with a bow.
- **Palette and surface**: magenta brush-stroke fur (`#c85ac8`) with orange fur bands, chrome, copper, cyan and green
  glows.
- **Face**: a chest screen of scrolling green data (a pixel dancer while he dances) and nine cyan porthole lamps that
  blink together.
- **Motion**: walks, hops when he talks, spins a full turn when he sings, bounces and raises his arms in the dance;
  his tentacles push themselves out of his body each frame.

### Nextessa
- **Body**: spheres only: a three-lobed base, a stacked column of three neck spheres with side cones, a small round
  head with a box snout, the pizza box carried on her head; no limbs.
- **Palette**: oranges (`#f47a3a`, `#f09460`), yellow eyes with white highlights.
- **Motion**: she hops with squash and stretch; her segments wave; she nods once when she speaks.

### Montgummery
- **Body**: a dark rounded tape-like torso (superellipsoid) under a transparent shell of scrolling code, high-top
  boots with laces, a cable tail, four-fingered hands, a big CRT head with a control strip.
- **Palette**: dark green-black body (`#1d2a23`), cyan code and boots with orange toes, a purple screen.
- **Face**: the screen, by mood: two white eye bars and a pixel mouth that opens while he talks; robot eyes and a
  grille while he dances or just after a gift; a shovel during planting; rock, paper or scissors icons in battle.
- **Motion**: a 16-pose robot dance snapping to the beat with a jitter; the three battle moves; a talk nod.

### The Ancient
- **Body**: one long tube along a curved spine (140 x 22), flattened into a sole underneath, with a hump at the
  mantle, a keel ridge, up to 26 tubercles, a tail droplet and four stalks (two long, two short), squashed to .62 of
  its height: a long, low, dark slug.
- **Palette and surface**: near-black (`#171310`) with a painted mottled skin and a separate bump map, shininess 90:
  wet and glossy. No eyes: dark knobs on the upper stalks.
- **Motion**: slow, irregular life: periodic settles, tilts, tail curls, mantle ruffles and deep sighs on different
  periods (17-37 s), the head looking about, the stalks retracting every 11 s; when it talks the head and stalks lift.

### The robin
- A plump songbird (about .45 m) on a bark branch: rusty breast, dark back and head, white throat with streaks, a
  yellow bill, white eye-rings and brows, three tail feathers. All matte clay, no textures. It breathes, looks about,
  flicks its tail every 9 s, and when picked flies up, hides for 10-18 s and returns.

### Backpacka
- **Body**: a horizontal lathe body with seven colour patches, a ten-segment neck, a head with a jaw and tongue, a
  curled tail, four legs ending in open pipe feet, ten leaf-like wing blades; she flies the whole time.
- **Palette**: tan skin (`#d48e64`) with orange, yellow, ochre and pink patches, green wings, a rainbow.
- **Motion**: the planting Event's set piece: she flies in, drinks from the pond and swells, flies to the garden,
  spins while her four feet spray water on the plants, a rainbow fades in, and she flies away (84 s in all).

### The player
- In VR the player sees only their hands: cartoon three-fingered hands (skin `#f4dcc6`) with a white cuff and a
  sleeve in the dress colour. The full body (a yellow flowered dress, a navy belt, red-orange hair in two pigtails
  with a navy bow, freckles and blush) is built at boot and hidden in VR.
- Outfits from the shop are built hidden and switched on: the Flower Hat (in place of the bow), Frog Shoes (green
  frog-faced shoes) and the Sun Dress (the dress map swapped for suns on sky blue, with an orange hem).

## 6. Changing or adding a creature

- **Do not change how anyone looks** (the author's rule). A fix to a model must leave its pixels the same:
  `geom_compare.js` compares built geometry, `test_coincident.js` and `test_zfight.js` catch depth fights between
  parts (B20-B23 were fixed that way, moving parts by a millimetre or two inside each other).
- **Keep creature geometry non-indexed**: the ground fit samples every 6th vertex, so indexing a creature's mesh
  would move it (P12 skips creatures; RENDERING.md 4).
- **Mark moving parts `userData.keep`** (or let `born` find them): otherwise the merge (`io`) bakes them into a
  static mesh and they stop moving.
- **Use the shared kit**: `x.*` and `KIT.surf` cache materials, so a new part in an existing look adds no material
  and batches with the rest. A new material created after loading must be warmed (`warm_coverage.js` fails on a lit
  material without its shaders; B27 was the Gem's).
- **Faces**: use `KIT.eye` and `KIT.mouth` for the house face; pass the lids to `born` so they blink.
- **A new screen face or painted texture**: draw it once and cache it (Montgummery caches each screen mode); a canvas
  repainted during play must go through `needsUpdate` so it uploads before the frame (RENDERING.md 4).

## 7. Open questions for the author

Things the models show that the code does not explain (see also LORE.md's open questions). Answered so far:
Gooward's lens discs are a second set of eyes and the wavy lines are forehead wrinkles; King Dino's lit buttons
and back sockets are synthetic parts of his own body; Mama Gorbo's lime tube is a goo tube; Fortizmo's four small dots are beauty marks (the author).
- Etcher's three back marks, and whether each character's technology detail is a deliberate theme.
- Mushroom reports a height of 2 m for his label though his hat reaches about 2.3 m.
