# Greeblis Town, Lore Bible (third pass)

Compiled strictly from the game's own text, data and pictures in the game file, `tools/uncompressed.html`
(4.0.34; the root `index.html` is a byte copy of it). Of the fixes in FIXES.md only A2 (Gemtoe's seventh talk
line, 3.15.53) adds story text; the rest change looks and staging, which this Bible follows where they touch the
lore. Lines are quoted as written. Anything not stated by the game is marked *(inference)*. Gaps are listed at the
end so the author can fill them.

> **Naming rule (author):** the names the game shows are the canon. The code's
> identifiers are leftovers from earlier games and prove nothing: `acorns` is
> flint, `drifter` is the Mushroom, `frog` is Fortizmo, `gratelet` is Hennrick,
> `blinker` is Anomalee, `cutebex` is Zollod, `m_somlet` is Somlet, `gorbo` is
> Gooward, `w_mont` is Montgummery, `slug` is the Ancient, and so on. When a
> document needs an identifier for a test or a probe, it says so and gives the
> in-game name next to it. Where this Bible quotes a code name (for example a
> motif of the gallery painting), it is a hint at what the author meant, not canon.
>
> **Code names and the minified file:** string names (ids such as `drifter`, the painting's motif names, `MAMA_W`)
> are in the game file as quoted. The table names `TIES`, `SIG` and `PAIRS` are from the unminified 3.15.44 file
> (`git show 21596f1:tools/uncompressed.html`); since 3.15.45 (FIXES R2) the minifier renamed them.

**Changes in this pass** (third pass, 2026-11-04, checked against the 4.0.34 game file): every line the game can
show is now here with its trigger: every talk line in its order ("Every talk line"), all 90 two-line exchanges
("Vignettes"), the cast at a glance (ids, display names, posts, Gree-mail, ties), the shop, phone, battle, Pillar and
inventory texts ("Menus, panels and boxes"), a fuller items table, a session timeline ("A session, from the first
visit to the Event") and a places gazetteer. Corrected: the cardinal faces the robin (A40); the Ancient's gift line
is "..." and it is 15% larger with finer skin (A52); Backpacka's show is 88 s, not 70; an Event without Seeds
gathers no one and fades no kiosk (F-B72); the pizza needs Snacks and its boxes fade in and out (A51, A42); the phone
booth and the Portal fade like kiosks (A27); pickups never spawn in the Gazebo (B95); Fortizmo and Somlet are she
throughout; the inventory is on the left-hand watch (A35). The second pass (2026-10-28 to 10-31) added the Ancient,
the gallery painting, Backpacka, the Library's books, the WANTED posters, the billboard, the parcels, the gift and
gardening lines and the quests, and corrected the first: Zollod is the shy one, the Gem trade is Gemtoe's, and "OF
ORSON", "OF APPTERIX", PATCHOOLEE, STAPLERS and RANGER are Library book covers.

**Later additions (2026-11-04, checked against the 4.0.40 game script):** the environment is broken down element by
element ("Every environmental element (inventory)": the park, the Garden, the Library, the church and Cave, the outer
town, the edge and the sky, each with where, looks, behaviour and its fix ID), and the thin parts filled in: King
Dino's drum kit, the juice bar's furniture, the Library's bookcases, books, covers, curios and the Speech's props, the
phone booth and the Portal, Backpacka's water and rainbow, the fade groups (A26, the Portal in 4.0.38) and pickups
fading in place (A56). Every creature is broken down too ("Every creature (inventory)"), with new entries for the
UFO's pilot and the faces in pictures; Sparkakus's romp (A57, A62), Gooward's barrage (A39), the Ancient's breathing
organ (A53), the birds' flight (A54) and Nextessa filled in; corrected: there are eight WANTED posters of seven designs
(adding the saucer, the rabbit, the girl, the stranger and Ollaag), and Somlet is she in her design entry too.

## The world

- **A digital world** (author): Greeblis Town is a digital world and its townsfolk are digital monsters;
  each one carries a piece of computing in their design ("Creature design and style" below). Montgummery says it outright:
  "We are all digital monsters."
- **Greeblis Town / Greeblis Park.** A cartoon town around a park. Mama Gorbo:
  "What a beautiful day in Greeblis Park!" Hennrick, a visitor from the
  far past (the author): "In my era, the towers of Greeblis City reach the clouds. I never
  imagined the far future would have… picket fences." The town is the far future of Hennrick's
  era, when Greeblis City's towers reached the clouds; Nextessa is from the far future of the town
  (the author, 2026-10-28).
- **How the town is built and looks** (layout, buildings, materials, nature, light, the mist, the special places):
  "Environment design and style" below.
- **Places with signs:** FIRST BANK OF GREEBLIS (kept by Gemtoe), Gemtoe's
  Gazebo, GARDEN SUPPLIES (Zollod's shop), JUICE BAR (Fortizmo's), POST OFFICE
  (Somlet sleeps on the mail), GOOWARD'S GALLERY (Gooward's art gallery), the
  LIBRARY (Sparkakus), the Sheriff's kiosk (Mushroom), a TELEPHONE (calls
  Nextessa), the SUMMONING PILLAR in the garden at the park centre ("Use the
  Summoning Pillar"), WANTED posters, and King Dino's billboard (painted by
  Gooward). The world builders also place a Field Office
  (Hennrick's office in the far past, the author), Fire Station, Gas
  Station, Hotel, School, Courthouse, Nursery, Water Tower, Gooburger, houses,
  a church (the Ancient's home, below), a pond and the billboard.
- **The billboard:** "A Prehistoric Era in Jazz!", with a banner: "Let King
  Dino take you / to the Jurassic / Greeblis Park!"
- **WANTED posters:** eight on the Sheriff's back wall, seven designs: an alien face (twice), a flying saucer, a goo
  creature named **GLOOPERNAUGHT**, a rabbit in a uniform, a girl in a yellow flowered dress, a blond stranger in a
  brown jacket, and a pointed-eared figure in a blue robe named **Ollaag**; each "WANTED" above and "REWARD" below
  (looks in "Creature design and style", "Faces in pictures"). The girl (the code's `visitor`) is the player's avatar (the
  author, 2026-11-04). The posters show several aliens, two of them humans (the author's answer 11 below); the grey
  alien is one of the aliens in its own right, not a picture of the Human: the grey aliens are members of the Alien
  Alliance (the author's answer 12) *(inference: the two humans are the girl and the blond stranger, the only two
  drawn as people)*.
- **The robin and the cardinal:** a robin and a cardinal perch on the park's two big trees beside the church (the
  robin moved there in 4.0.3, A30; the cardinal and its tree came in 4.0.4, A37, A38), the cardinal turned to face the
  robin (4.0.7, A40); pick either ("Robin", "Cardinal") and it flies off and comes back. A robin and a cardinal also
  perch on a branch in the top corner of Gooward's painting.
- **Parcels at the Post Office:** on the mail pile behind the kiosk, addressed "To Montreal", "To Cobourg",
  "To Bangkok" and "To Ormstown" (4.0.10), and one without a label.
- **The Portal.** A gateway between eras, currently locked: "All travel
  through the Portal is locked down until further notice." (Mushroom).
  Hennrick came through it and cannot go back. Pizza is ordered through it
  ("inter-temporal pizza shop"; when blocked: "*connection to the Portal
  seems blocked*"). A Blossom given to the Sheriff is taken as a bribe: "A
  bribe? …Portal is now open to your use." From then on the TELEPHONE gets
  through.
- **The Computer Core.** Anomalee "is under investigation for chewing cables
  leading into the Computer Core." The Great Sphinx "guarded the Computer
  Core. Asking Synthetics riddles before allowing them in."
- **The Window.** Anomalee stares up at a window: "It is NOT for jars. It is
  for REMEMBERING." "The WINDOW REMEMBERS the TRAVELER." The Ancient: "The
  glass remembers more than it shows."

## Eras and factions

- **The Ancients** created the Synthetics ("I like to think the Ancients
  created us for our purposes", Etcher). They left Artifacts; the Ancient
  texts are in the Library. The Great Sphinx of the Computer Core is an
  Ancient relic; its missing Eye is the finale's gem.
- **The age of the Synthetics**, **the age of the Organics** (which "began"
  with "the age of Dinosaurs"), and **the age of the Ancients** are the three
  ages Etcher records. Glyph's symbols "descend from" Hennrick's era's
  alphabet.
- **The Originator.** Anomalee's obsession: "ORIGINATOR…", "WAS there WITHIN."
  "The Ancient texts speak of an ORIGINATOR" (Sparkakus). "BEINGS of CODE."
  "ETCH this: the ORIGINATOR was HERE." "Your RHYTHM... the ORIGINATOR had it TOO."
- **The Consortium.** The authority the Sheriff answers to: "This town is
  under the protection of the Consortium." It locked the Portal, inspects
  Fortizmo's bar and watches Sparkakus's books. Faced with the Ancient, the
  Sheriff can only stammer: "Th-the Consortium will be informed." The Consortium is run by Maltoe and
  Mushroom (the author, 2026-10-28).
- **The Alien Alliance.** The group of all the other alien factions, led by **Ollaag**, who is the one flying round
  in the UFO; the Alliance is in conflict with the Consortium (the author, 2026-11-04). At least four alien races
  belong to it; the grey aliens on two of the Sheriff's WANTED posters are members (the author, 2026-11-04). Ollaag is
  on one of the posters too.
- **Gree-mail.** "When you see creatures exchanging symbols, that’s
  Gree-mail." (Glyph)
- **The player** is "Human", a visitor the Sheriff is hunting ("Mont will
  hide you from alien hunting Sheriff"; "Have you seen a human in this
  town?" "Mont has seen no human."). Mont: "Mont understands the high point
  of human culture … ‘Flint Knapping for Beginners’".

## The Ancient

The church is an intended secret room (author): the player gets in by walking through its wall where it is marked with Xs.

The one character who is not on the town's cast list, and the one the others defer to.

- **Where:** inside the church. The pizza courier, delivering there, adds "oh
  Hello Ancient."
- **What it looks like:** a great slug-like body with a mantle, two long eye
  stalks with knobs and two short ones, and a tail (the 3D model; the code
  calls it `slug`). Its name panel reads ANCIENT in an earthen brown.
- **What it says:** "I am the one reborn." (its menu says only "Talk"). During an Event started with the
  Seeds: "Hello". A Blossom given to it: "..." (three dots, as typed in the game).
- **Its size** (since 4.0.33, A52): 15% larger than before, its skin and bump painted at twice the resolution with
  finer pores, creases and scratches; visitors stand clear of its larger body.
- **Its visitors:** every townsperson but King Dino and Somlet has an exchange with it; they come to the Cave on
  visits, more often while the Human is inside (A3). Its Gree-mail is a spore, its gesture a doze, its emote "…".
- **What it says to the others** (it speaks first, they answer):

| To | The Ancient | The answer |
| --- | --- | --- |
| Hennrick | "You are far from your own time, visitor." | "Fascinating. And you? Which era is yours?" |
| Mushroom | "No Portal can hold the one reborn." | "Th-the Consortium will be informed." |
| Anomalee | "Anomalee. The glass remembers more than it shows." | "The WINDOW REMEMBERS... WHAT does it REMEMBER?" |
| Gooward | "Little goo. You were made with love." | "Gomp... gomp." |
| Zollod | "All that grows, grows again." | "Then my work is never done. Good." |
| Fortizmo | "Play the old song. The first one." | "For you, Ancient? On the house." |
| Etcher | "Etch this: I have returned." | "...My tentacles are shaking. Etching." |
| Gemtoe | "What you hoard, you will lose." | "...Who told you about my gems?" |
| Glyph | "I was the first symbol." | "...Don't you think? ...Yes. I think so." |
| Montgummery | "Mont. You were made to learn." | "Mont learns. Mont is learning now." |
| Mama Gorbo | "Mother of goo. You carry so much love." | "Oh! Aren't you a sweet one, dear." |
| Sparkakus | "Librarian. Your texts are missing a page." | "...Which page? I must know." |

*(inference: the Ancient is one of the Ancients, returned ("I have returned", "the one reborn"); it
claims to be older than writing ("I was the first symbol") and to have made some of the townsfolk
("You were made with love", "You were made to learn"). It is **not** the Originator Anomalee talks
about (the author, 2026-10-28).)*

## The gallery painting

The large painting in GOOWARD'S GALLERY is three tall panels hung side by side, read as one picture,
signed "Gooward" in purple at the bottom right. The game paints it at load time (a reference copy is in
`tools/lore/gallery_painting.jpg`). It reads left to right from a dark past, through a sunlit present,
into a dark, stormy right edge. The code's own drawing positions place each motif; the motif names below
are the code's.

**Left panel: the deep past (dark, starry).**
- The **Great Sphinx**, lying down, with a teal gem floating just above its head *(inference: its
  missing Eye)* (`riddle`).
- A glowing orange sphere laced with gold circuit lines, above the Sphinx *(inference: the Computer
  Core)* (`core`).
- A fan of golden rays opening around a bright point at the panel's edge.
- A faint dinosaur outline on the horizon (`theropod`), a plug (`plug`) and a seed (`seed`).
- Teal hexagon figures, the **Synthetics** (`synth`, three of them), with a crystal shard (`shard`) and
  an organic shape (`organic`).
- Gold circuit traces run along the ground across the whole bottom of the painting.
- At the bottom: a long, dark **slug with eye stalks** *(inference: the Ancient)*. A golden thread runs
  from it to a glowing gold point in the far corner (`dot`).

**Centre panel: the present (warm light).**
- The town in miniature along the horizon, in this order: a bank, a barber's, a tower, a greenhouse, a
  lightning bolt, the courthouse, a marquee, televisions, a milkshake, an ice-cream cone, "avarice", a
  family tree ("lineage"), a weather vane and the church. A seal hangs above them.
- A picket fence, Gemtoe's gazebo, a booth, and the **garden**: concentric rows round the Summoning
  Pillar.
- **A girl in a yellow dress with a red ponytail**, seen from behind at the bottom centre, looking at it
  all (the code calls her the `visitor`, as on the WANTED poster, where she is the player's avatar, the author,
  2026-11-04) *(inference: here too the Human, who can buy a Sun Dress)*.
- Under the garden, a cut-away of the ground: coloured layers of earth with a fossil jaw and a small halo
  in them *(inference: the record of the ages under the town)*.
- A pair of goo splats, pink and cyan, side by side *(inference: Mama Gorbo and Gooward, "Love at first
  splat")* (`splatPair`).
- A goo burger in a teal ring (`burger`), butterflies, a glass of juice, the pond, mail, curios, a
  botanical sprig, a light bulb and a glue bottle, seeds, flint, paw prints, Blossoms.
- A great spiked arch rising out of the mound beside the garden.
- A striped planet and a white sun in the sky, and goo drips in many colours from the top edge across
  all three panels.

**Right panel: the edge (storm).**
- A huge **red mushroom cap with an eye** looming at the top, a star on its brim *(inference: the
  Sheriff)* (`mushroom`), with a small figure the code calls the `mayor` beneath it: the mayor is Montgummery in the near
  future (the author, 2026-10-28).
- From the cap, faint dotted lines run to nine of the townsfolk: Sparkakus, Gemtoe, Gooward, Glyph, King
  Dino, Somlet, Montgummery, Anomalee, Zollod *(inference: the Sheriff watching them; Mama Gorbo,
  Etcher, Fortizmo, Nextessa and Hennrick are not on it)*.
- **The Portal**, a blue, starry doorway with a flower in it.
- A pizza (Nextessa's place on the painting), a UFO with a ring of lights, a satellite dish, a dark
  pennant, a board of WANTED posters, a scorch mark, lightning.
- At the bottom right, a second dark slug-shape with stalks, at the place of the node the code labels
  ANCIENT.

**The relationship network.** Over the whole picture, every named character has a small portrait at a
fixed place, and coloured threads join them (the code's `TIES`, each thread fading from one character's
colour to the other's):

Mama–Gooward (drawn as a two-coloured knot with a pink splat: "knot"), Mama–Mont, Gooward–Mont,
Gooward–Zollod, Glyph–Etcher (drawn as parallel grooves: "groove"), Gemtoe–Glyph, King–Fortizmo,
King–Mont, Sparkakus–Hennrick, Sparkakus–Ancient, Somlet–Ancient, Anomalee–Mama, Anomalee–Glyph,
Etcher–Hennrick, Zollod–Fortizmo, Nextessa–Mushroom, Hennrick–Mushroom, Sparkakus–Gemtoe,
Mama–Mama W, Fortizmo–Somlet, Mont–Mushroom.

Two nodes have no character in town: the **Ancient** (dark, bottom right) and **Mama W** (in Mama
Gorbo's colour, high in the centre, tied only to Mama): Mama W is a name for Mama Gorbo (the author).

Across the middle runs a row of twelve small tokens: a cube, a spore, a pixel, a crown, goo, a sprout,
a letter, a note, a card, a gem, a tile, a coin. They are the townsfolk's Gree-mail: in the vignettes each
character sends their own token to the other (the game's `SIG` table): Hennrick a cube, the Sheriff a
spore, Anomalee a pixel, King Dino a crown, Gooward and Mama Gorbo goo, Zollod a sprout, Somlet a letter,
Fortizmo a note, Etcher and Sparkakus a card, Gemtoe a gem, Glyph a tile, Montgummery a coin, and the
Ancient a spore. Each also has a gesture and an emote they show when an exchange starts (Hennrick nods
"!", the Sheriff puffs "!", Anomalee glitches "?", King Dino puffs "★", Gooward wobbles "~", Zollod sways "✿",
Somlet dozes "z", Fortizmo grooves "♪", Etcher nods "!", Gemtoe twirls "✦", Glyph giggles "?", Montgummery nods "!",
Mama Gorbo bows "♥", Sparkakus nods "?", the Ancient dozes "…").

Motifs the painter places that are not named above (the code's names, hints only): `page` in the left panel,
`cubeJar` and `glitch` left of centre, `paisley`, `water` and `mise` in the centre and right, and a robin and a
cardinal on a branch in the top right corner.

## Currency, items and rewards

| Thing | Facts from the game |
| --- | --- |
| Blossoms | The town currency ("We only accept Blossoms at this establishment"; "the house currency is Blossoms"). 32 grow in the park and regrow 12 s after picking ("pick blossom"), each a red, orange and gold flower with a soft halo. Given as gifts; to the Sheriff, a bribe; to a dancer, an invitation to battle. Never spawn inside a building, a kiosk area or the Gazebo (B95, 4.0.33: 4.1 m from its centre). Faded out during the Event (A5). |
| Flint | The pickups on the ground and the shop's currency (author confirmed: the game says flint; the code calls the same counter acorns). Gemtoe values gems in flint ("worth countless flint"). 40 dark faceted stones with a glint in the park, regrow in 12 s; the same spawn rules as Blossoms. |
| Ancient Artifacts | Three exist "in this region"; one is awarded for each first dance-battle win ("<name> awards you an Ancient Artifact!"). Each is a teal crystal third of a cut gem; in the Speech Sparkakus joins them with a white bottle labelled "GLUE". |
| The Gem (Ancient Gem) | The three Artifacts joined: "the missing Eye of the Great Sphinx of The Computer Core". "Ancient Gem collected!" Gemtoe calls it "worthless" and takes it. |
| Summoning Stone | Gemtoe trades it for the Gem: "That Gem you have… It’s worthless… trust me.\|I’ll trade this rock I found for it. You’re better off!" then "* Summoning Stone obtained! *". Wakes the Summoning Pillar's runes ("The runes stay dark.\|Only the Summoning Stone can wake them and start the gardening event."). Not used up: the Event can be held again. |
| Seeds | The "bagel seasoning packet", 25 flint at Garden Supplies ("You bought the bagel seasoning packet! SEEDS quest complete!"; again: "You already have the bagel seasoning packet."). With them the town gathers and plants at the Event. |
| Snacks | "+20 Snacks" per pizza delivery (one is enough). With them the Event has pizza: eight stacks of boxes round the Garden and Anomalee's own open box. |
| OVERCOMING SHYNESS | A book on the Library's shelves ("Take OVERCOMING SHYNESS"); it frees Zollod from his shyness; it leaves the shelf when taken, with a page riffle and a rising chime of its own (A61, 4.0.37). |
| Outfits | Flower Hat, Sun Dress, Frog Shoes, 3 flint each, worn by the player ("You bought the Flower Hat and put it on. Take a look in the mirror!"; "You put on the …", "You take off the …"; short: "You need 2 more flint for the Sun Dress."). |
| King Dino's coins | "not legal tender"; "He stamps those coins himself."; "Stamped by the King, baby. Legal enough." |
| Goo burger coupons | Mama Gorbo hands them out ("Please take a coupon for my famous goo burger."). |
| Carrot juice | Fortizmo's house special, "on the rocks… just carrots and ice". |
| Gree-mail tokens | The symbols the townsfolk throw to each other in their exchanges ("The gallery painting" above). |
| Parcels and letters | The Post Office's mail pile: "To Montreal", "To Cobourg", "To Bangkok", "To Ormstown". |

**The inventory** (the watch on the left hand, A35): "SEEDS", "SUMMONING STONE" and "SNACKS" each with a tick box,
then a tile for each thing held with its count: Blossoms, flint, Artifacts (until the Speech), the Gem, the Stone, the
book (until Zollod reads it), the Seeds and the pizza. The shop's panel shows "Flint: " and the price ("3 flint",
"bought").

## The Library's books

Covers on the shelves: **WORKS OF PATCHOOLEE**, **ADVENTURES OF APPTERIX**, **SONGS OF ORSON**,
**STAPLERS** by Walter Bigsby, **RANGER BOBERT**, **Zortoe's Home Cooking**, **Traveler's Truth**,
and **OVERCOMING SHYNESS** (the one the player can take). The shelves also hold a wish Blossom, an
electric Blossom and an acorn. Sparkakus guards the "first editions" ("Please, no goo near the first
editions.") and the Ancient texts.

## Quests and their lines

- **Zollod's shyness.** Before: "…|…|I’m shy…". Mama Gorbo's hint: "I hear there is a book that can
  help anyone overcome shyness." With the book: "…|That book…|Let me see..|Wow I’m free from
  shyness!" Only then does Garden Supplies open; Zollod then says "Bringing plants to life is MY
  life’s work."
- **The bribe.** A Blossom to the Sheriff opens the Portal: "A bribe? …Portal is now open to your
  use." Before it, the TELEPHONE's PHONE box says "*connection to the Portal seems blocked*". After it, the TELEPHONE
  reaches Nextessa: "*Ring Ring* This is Nextessa’s inter-temporal pizza shop!|One pie on your way." (with a pie
  already on its way: "*no answer*"). The Portal opens and the courier comes through it, hopping to the Human
  ("Talk to NEXTESSA"): "One hot and ready pie!|* +20 Snacks *|I love my job!", and, delivered inside the church,
  "One hot and ready pie!|* +20 Snacks *|I love my job!|oh Hello Ancient." While the Speech is on she waits, facing
  the Human, and delivers after it (F-B45). No pizza is ordered during the Event.
- **The dance battles.** A Blossom to Etcher, Glyph or Montgummery: "Let’s dance!", and the battle
  starts when the line closes (not during the Event). The first win against each awards an Artifact;
  later wins only "<name> takes a bow." The Human cannot lose; "BOW OUT" leaves (80% of the time).
- **The Artifacts and the Speech.** Sparkakus: "For my research: I seek Artifacts left by the
  Ancients.|Three exist in this region." With one or two: "I require more Artifacts to complete my
  research." With all three: "You’ve found all three Artifacts!|Amazing!|Let me see those…|Ah…"; the
  bulb lights, the pieces are glued, and the Speech: "This is the missing Eye of the Great Sphinx of The
  Computer Core!|According to the Ancient texts:|The Sphinx guarded the Computer Core.|Asking Synthetics
  riddles before allowing them in.|This relic has been missing for ages!", then "* Ancient Gem
  collected! *", and from then on "Well done, Human!"
- **The Gem trade** (Gemtoe): the Gem for the Summoning Stone, above.
- **The SEEDS quest**: the bagel seasoning packet from Garden Supplies, 25 flint: "You bought the bagel seasoning
  packet! SEEDS quest complete!"
- **The planting Event**: the Summoning Stone at the SUMMONING PILLAR, with the Seeds and Snacks if the Human has
  them (only the Stone is required).

## Events

- **Dance battles** (vs Etcher, Glyph, Montgummery; "KING DINO on drums."):
  rock / scissors / paper as "Rock out!", "Do the splits like scissors!",
  "Go horizontal like paper!" (the dancer's move is shown first: "<NAME> rocks out!", "… does the splits like
  scissors!", "… lays horizontal like paper!"; each beating move costs the dancer one); stamina 10;
  "BOW OUT" / "TAKE A BOW" ("You take a bow."; BOW OUT works 80% of the time, otherwise "The beat
  won't let you go!", the game's own straight apostrophe); first win: "<name> awards you an Ancient
  Artifact!", later wins: "<name> takes a bow.". Each dancer's stamina bar counts their signature move: "Robot steps left" (Montgummery), "Tentacle twists left" (Etcher),
  "Macarena moves left" (Glyph). A Blossom given to a dancer is an invitation: "Let’s dance!", and the
  battle starts when the line closes.
- **Gardening event** (the Event): at the Summoning Pillar with the Stone. **With the Seeds** the townsfolk
  gather in three rings round the Garden (all but King Dino, who drums on at 88 beats a minute, and Somlet, who
  sleeps on at the Post Office; Sparkakus leaves the Library to join them), wait for each other, then plant for 190 s
  (dig, pat or scatter, each their own way) and go home; spoken to, each says their gardening line (below). In the
  first Event each plants a flower; in later ones the old flowers fade away (A58), take new colours and grow back
  (F-B43, A29). **Without the Seeds** no one gathers or plants, there is no music or dancing, no flower grows and no kiosk
  or park tree fades (F-B72); the mist, the fades of the town, Backpacka and (with the Snacks) the pizza boxes still
  come, as the author intends (2026-11-04). **With the Snacks** eight stacks of pizza boxes fade in round the
  Garden as it starts (A51) and Anomalee, instead of planting, sets down her own open box (fading in) and eats a
  slice every 22 s, leaving the last two (F-B49); without them she plants like everyone else. The boxes fade out at
  the end (A42). While the town gathers, neighbours in the ring trade little emotes ("♥", "✿", "!", "~").
- **Backpacka**: Fortizmo practises "a song for the coming of the legendary Backpacka". During the
  planting Event, once the planting has begun and the townsfolk have taken their places, they form a
  ring round the garden and, when the Seeds were brought, Fortizmo plays her horn; then Backpacka
  comes: a long-necked creature with green wings arrives, lands, drinks at the pond, rises, flies over the garden, spreads his wings and sprays water over it, then leaves low over the
  north-west fence into the mist (the animation's own stages: arrive, down, drink, up, to the garden, splay, spray,
  gone; 88 s, A7). While the horn plays the ring dances (Gemtoe twirls, Gooward bounces, Mushroom shimmies,
  Anomalee stomps, Zollod grooves, Mama Gorbo jellies, Hennrick and the three dancers their own dances). Without the Seeds there is no
  horn, no dancing and no planting, but he still comes (the author, 2026-11-04: "without Seeds: the pizza boxes and
  Backpacka should still appear"; "No planting, no music, no dancing, and no flowers grow").
- **Pizza**: the TELEPHONE calls Nextessa's inter-temporal pizza shop; a courier delivers, even into the
  church where the Ancient lives.
- **The Speech**: with all three Artifacts, Sparkakus stops, a giant light bulb lights over him and the world
  dims to 70% of night; he joins the Artifacts with glue into the Eye of the Great Sphinx (the five-page speech),
  "* Ancient Gem collected! *", the world brightens, and from then on "Well done, Human!".
- **Mama Gorbo and Gooward's meeting**: every 20-40 s they walk to each other, face each other and trade goo arcs
  with a "blorp" and pink hearts. A Blossom to Gooward ("GOOMP") turns his goo on the Human: eight volleys that
  splat on the view, and he cannot be spoken to until it is over (A39).
- **The UFO**: a saucer with Ollaag inside (A63, 4.0.43) crosses the sky every 600 s, hovers and leaves (never in the
  Event, A6). Ollaag, the leader of the Alien Alliance, is the one who flies round in it (the author, 2026-11-04)
  *(inference: the "UFO sightings" the Sheriff investigates)*.

## A session, from the first visit to the Event

The game keeps no save (GAME.md "Content hooks"): every session starts from nothing, with empty pockets. Apart
from the steps that need an earlier one, the order is the player's.

1. **The gate.** In the Quest Browser a landing screen reads "GREEBLIS TOWN" with the version, then "Loading...",
   "Press A to Continue." and, on the press, "Entering VR...". Any other browser gets "GREEBLIS TOWN", "This game is
   designed for the Meta Quest Browser.", "Please open this file in the Quest Browser", "on your Meta Quest headset."
   and the version, under the title "-Greeblis Town-".
2. **Arrival.** The Human stands at the park's west fence (-36.3, -20), by the dance floor and the JUICE BAR, with
   King Dino drumming at 104 beats a minute. 32 Blossoms and 40 flint lie about the park and regrow 12 s after they
   are picked. The left hand wears a watch reading "PRESS / Y / TO OPEN": Y while looking at it opens the inventory
   (A35, A41, A44).
3. **The town lives on its own.** Townsfolk roam or keep their posts, stop to face the Human (Sparkakus greets with a
   "!"), visit each other and play their two-line exchanges (below), Mama Gorbo and Gooward meet every 20-40 s, the
   UFO crosses the sky every 600 s, and visitors come to the Ancient in the church.
4. **Talking.** Each townsperson's "Talk to" gives their talk lines one at a time, in order, round and round
   ("Every talk line" below). "Give a blossom" spends a Blossom on their gift line.
5. **Garden Supplies is shut** while Zollod is shy ("…|…|I’m shy…"). Mama Gorbo hints at a cure; the Library holds
   OVERCOMING SHYNESS ("Take OVERCOMING SHYNESS"); with it Zollod is free, and his shop sells the outfits (3 flint
   each) and the bagel seasoning packet, the Seeds (25 flint: "SEEDS quest complete!").
6. **The bribe and the pizza.** A Blossom to Mushroom opens the Portal; the TELEPHONE then reaches Nextessa, whose
   courier comes through the Portal with a pie: "+20 Snacks".
7. **Three dance battles.** A Blossom to Etcher, Glyph or Montgummery ("Let’s dance!") starts a battle; each
   dancer's first defeat awards an Ancient Artifact.
8. **The Speech.** With three Artifacts, Sparkakus glues them into the missing Eye of the Great Sphinx under a giant
   light bulb as the world dims: "Ancient Gem collected!", "Well done, Human!".
9. **The Gem trade.** Gemtoe talks the Human out of the Gem for "this rock I found": "Summoning Stone obtained!".
10. **The Event.** At the SUMMONING PILLAR ("Use the Summoning Pillar") the GARDEN EVENT panel ticks off "Summoning
    Stone", "Seeds" and "Snacks" and asks "Start gardening event?". Only the Stone is required; the Seeds bring the
    town to plant, the Snacks bring the pizza. The mist rolls in, the town plants (190 s), Fortizmo plays her horn,
    Backpacka waters the Garden and flies into the mist, and everything comes back.
11. **After.** The Event can be started again from the Pillar, as often as the Human likes: the flowers already
    planted fade away (A58), take new colours and grow back when Backpacka waters them (F-B43, A29). Sparkakus now
    answers only "Well done, Human!".

## Cast

| Name | Code id | Role / home | Nature and notes |
| --- | --- | --- | --- |
| Mama Gorbo | `p_mamagorbo` | Runs "the local fast food joint" (Gooburger); gardener | Round, bouncy, made of "noble goo" that "can heal many inflictions". Married to Gooward ("met over a spilled goo shake. Love at first splat!"). The Ancient calls her "Mother of goo". The lime tube draped around her front is a goo tube (author). |
| Gooward | `gorbo` | Mama's "hubby"; "runs the Art Gallery now"; "quite the artist" | Speaks only in "Gomp"; crystal wings; goo bubbles; painted King Dino's billboard and the gallery painting (signed). Given a Blossom ("GOOMP") he flings goo at the player, and cannot be spoken to until his barrage is over (4.0.4, A39). Has a second set of eyes (the two octagonal discs on his head) and forehead wrinkles (author). |
| Gemtoe | `p_gemtoe` | Keeper of the First Bank of Greeblis; at Gemtoe's Gazebo | Invented "Avarice"; tails curl around crystals; trades the Summoning Stone for the Gem; envies Sparkakus ("Spark collects books and calls it a job. Why am I so different?"). Sells "digital plots out here in the Greeblis-verse!" (talk line, author, 3.15.53). |
| Etcher | `p_etcher` | Data preservation; dance floor | Tentacles etch data into everything; scales hold "a backup of a backup"; "My skin is a ledger." The three yellow marks on his back (a stroked "B", three stacked parallelograms, two diamonds) are symbols of the ledgers he can etch on (author). |
| Glyph | `p_glyph` | "Master of symbols"; dance floor | Plates "fit together like a sentence"; ends lines with "don't you think?" |
| Montgummery (Mont) | `w_mont` | Dance floor; hides the Human from the Sheriff | Robot with a screen face; eats VHS tapes ("Knowledge in the reels. Dinner in the cassette."); "We are all digital monsters." Speaks in third person. Ate the Library's tapes. |
| Hennrick | `gratelet` | Researcher from the far past (the author), stuck by the Portal | "Casing" and "joints… built for fieldwork"; collects samples in jars; "unwilling guest of the Sheriff"; observes Somlet ("Subject remains asleep. Observation day 41."). |
| Mushroom (the Sheriff) | `drifter` | Sheriff's kiosk desk, reached by a little ramp at its left end (since 3.15.53) | Cap with gills; investigates UFOs; enforces the Consortium; takes bribes ("A bribe? ...Make it a double."). |
| Fortizmo | `frog` | Juice Bar | She (Etcher: "her dancefloor"). Brass valves ("My valves turn a breath into a brass note"); "sugar"/"honey"; Blossoms only; practising a song for Backpacka. The four small dots beside her eyes are beauty marks (author). |
| King Dino | `m_kingdino` | Drums at the Juice Bar | "King of Jazz, baby!"; drums "since the Cretaceous"; works off his bar tab; stamps his own coins; wears a crown ("The crown is extra"). The lit buttons on his sides and the sockets on his back are synthetic parts of his own body (author). |
| Somlet | `m_somlet` | Asleep on a pile of mail at the Post Office | She says "Zzz"; "A letter peeks out from under her cap"; "a tiny paw curls beneath her cap"; "a patron of the Library". |
| Anomalee | `blinker` | Gazes up at the Window | Speaks in CAPITALS about CODE and the ORIGINATOR; "chewing cables" into the Computer Core; "My SIGNAL flickers.\|My FRAME remembers how to STAND." (a sad melody plays under "ORIGINATOR…"). |
| Zollod | `cutebex` | Garden Supplies | Gardener; seedlings, mint, carrots; "A little goo is good for the soil."; shy until the book cures him. |
| Sparkakus | (library, `st`) | Librarian | Seeks the three Artifacts; member of a "genealogical society"; a Blossom sets him romping about the Library ("…sorry I don’t know what got into me."); elsewhere he holds back ("I must resist the urge to run. Not out here, in front of everyone."). |
| Nextessa | (pizza shop) | Inter-temporal pizza shop in the far future (the author), reached by phone | "I love my job!"; courier delivers. |
| The Ancient | `slug` | Inside the church | "I am the one reborn." See its own section. |
| Mama W | map node `MAMA_W` | On the gallery painting only | A name for Mama Gorbo (the author); in her colour, tied to her. |

### The cast at a glance

The display name is the one on the dialogue box (and the vignette table's key). The post is where each one lives when
not visiting; roamers wander round it. Gree-mail is the token, gesture and emote each shows in a token exchange (the
game's `SIG` table). Ties are the threads on Gooward's painting. Pronouns: as the game and the author give them
(Gemtoe, Fortizmo, Somlet, Anomalee and Nextessa she; Backpacka and the rest he; the Ancient it).

| Display name | Code id | Post | Role | Signature line | Gree-mail | Ties on the painting |
| --- | --- | --- | --- | --- | --- | --- |
| HENNRICK | `gratelet` | Roams round the Portal | Researcher from the far past, stranded | "Much research is still needed in this era." | cube, nod, "!" | Sparkakus, Etcher, Mushroom |
| MUSHROOM | `drifter` | The Sheriff's desk (by its ramp) | Sheriff; runs the Consortium with Maltoe | "This town is under the protection of the Consortium." | spore, puff, "!" | Nextessa, Hennrick, Montgummery |
| ANOMALEE | `blinker` | Before the church, gazing up at its window | Seeker of the ORIGINATOR; cable-chewer under investigation | "The WINDOW REMEMBERS the TRAVELER." | pixel, glitch, "?" | Mama Gorbo, Glyph |
| KING DINO | `m_kingdino` | His drums by the JUICE BAR | Drummer; works off his bar tab | "I’m the King of Jazz, baby!" | crown, puff, "★" | Fortizmo, Montgummery |
| GOOWARD | `gorbo` | Roams round GOOWARD'S GALLERY | Artist; Mama Gorbo's husband | "Gomp Gomp Gomp!" | goo, wobble, "~" | Mama Gorbo (knot), Montgummery, Zollod |
| ZOLLOD | `cutebex` | GARDEN SUPPLIES | Gardener and shopkeeper; shy until the book | "Bringing plants to life is MY life’s work." | sprout, sway, "✿" | Gooward, Fortizmo |
| SOMLET | `m_somlet` | Asleep on the POST OFFICE mail | Postmaster; Library patron | "Zzz" | letter, doze, "z" | Fortizmo, the Ancient |
| FORTIZMO | `frog` | Behind the JUICE BAR | Bar owner; horn player for Backpacka | "We only accept Blossoms at this establishment." | note, groove, "♪" | King Dino, Zollod, Somlet |
| ETCHER | `p_etcher` | The dance floor | Data preservation; dancer | "My skin is a ledger." | card, nod, "!" | Glyph (groove), Hennrick |
| GEMTOE | `p_gemtoe` | Gemtoe's Gazebo | Keeper of the First Bank; inventor of "Avarice" | "This is mine now." | gem, twirl, "✦" | Glyph, Sparkakus |
| GLYPH | `p_glyph` | The dance floor | Master of symbols; dancer | "I am the Master of symbols.\|Symbols make up everything… don’t you think?" | tile, giggle, "?" | Etcher (groove), Gemtoe, Anomalee |
| MONTGUMMERY | `w_mont` | The dance floor | VHS-eating robot; dancer; the Human's protector | "We are all digital monsters." | coin, nod, "!" | Mama Gorbo, Gooward, King Dino, Mushroom |
| MAMA GORBO | `p_mamagorbo` | Roams the park | Runs the Gooburger; gardener | "What a beautiful day in Greeblis Park!" | goo, bow, "♥" | Gooward (knot), Montgummery, Anomalee, Mama W |
| SPARKAKUS | (library, `st`) | The LIBRARY | Librarian; seeks the Artifacts | "For my research: I seek Artifacts left by the Ancients." | card, nod, "?" | Hennrick, Gemtoe, the Ancient |
| NEXTESSA | `pk_nextessa` (builder) | Her pizza shop in the far future; visits by the Portal | Inter-temporal pizza courier | "I love my job!" | (none) | Mushroom |
| ANCIENT | `slug` | The Cave inside the church | The one reborn | "I am the one reborn." | spore, doze, "…" | Sparkakus, Somlet |

Named relations in the game's own words: Mama Gorbo and Gooward are married ("the hubby"); King Dino owes Fortizmo
his bar tab; Gemtoe envies Sparkakus ("Spark collects books and calls it a job"); Fortizmo resents Etcher etching
"her dancefloor"; Hennrick is the Sheriff's "unwilling guest"; Mushroom investigates Anomalee; Montgummery hides the
Human from the Sheriff and ate the Library's VHS tapes; Glyph and Etcher need each other ("Without your symbols I'd
have nothing to etch."); Hennrick calls Etcher a colleague ("You etch history and I jar it. Colleagues!") and Sparkakus another ("Much research is still needed, colleague.").

### Every talk line

"Talk to …" gives a townsperson's lines one at a time, in this order, starting again after the last (the game
counts each character's talks; nothing is random). A "|" is a page break in the dialogue box. Each talk shows the
speaker's talk emote over their head (Hennrick "~" with a splash, Gooward "!" with a blorp, Mushroom "...",
Anomalee "?" with a crackle, Fortizmo "♪" with a toot, Zollod "≈" with a bubble blip, everyone else "!").

- **Anomalee**: "BEINGS of CODE." · "ORIGINATOR…" (a sad four-note melody plays under it) · "WAS there WITHIN." ·
  "The WINDOW REMEMBERS the TRAVELER." · "My SIGNAL flickers.|My FRAME remembers how to STAND."
- **Mushroom**: "This town is under the protection of the Consortium." · "All travel through the Portal is locked
  down until further notice." · "We’re investigating UFO sightings in this area." · "See anything glowing in the
  sky, you report it to this office.|Directly." · "Under this cap, my gills keep the spores moving.|A sheriff must
  know what is in the air." · "Anomalee is under investigation for chewing cables leading into the Computer Core."
- **Hennrick**: "Good to see you again, Human!" (his first line, even at a first meeting) · "Much research is still
  needed in this era." · "I am an unwilling guest of the Sheriff, until the Consortium decides to reopen the
  Portal." · "In my era, the towers of Greeblis City reach the clouds.|I never imagined the far future would have…
  picket fences." · "I have catalogued every Blossom in this park.|They grow back faster than my notes can keep
  up." · "My casing keeps the instruments steady.|These joints were built for fieldwork, not a desk."
- **Fortizmo**: "King Dino’s money is no good here!|He stamps those coins himself." · "That lounge lizard never
  leaves.|He’s been employed on the drums until he plays off his bar tab." · "We only accept Blossoms at this
  establishment." · "Our house special is carrot juice on the rocks.|Don’t tell the King it’s just carrots and
  ice." · "I’ve been practicing a song for the coming of the legendary Backpacka." · "My valves turn a breath into a
  brass note.|Carrot juice is for the customers, sugar."
- **King Dino**: "I’m the King of Jazz, baby!" · "Feel the beat!" · "Hitting you with that prehistoric rhythm!" ·
  "These drums have been in the family since the Cretaceous, baby!" · "Gooward, that wild cat painted my
  billboard!" · "These springy joints have kept the beat since the age of Dinosaurs, baby!|The crown is extra."
- **Somlet**: "Zzz" · "Zzz" · "Zzz" · "* A letter peeks out from under her cap *|Zzz" · "* Her soft body settles
  with each breath; a tiny paw curls beneath her cap *|Zzz…"
- **Gooward**: "Gomp Gomp Gomp!" · "Goooooomp!" · "Gomp?" · "* His crystal wings flutter *|Gomp Gomp!" · "Goomp!
  Goomp! Goomp!" · "Goomp?" · "* He presses two goo bubbles together, then fans his crystal wings as they spring
  apart *|Gomp! Gomp!"
- **Gemtoe**: "I’ve invented a new concept.|I call it “Avarice”.|In theory: it will improve society some." · "These
  gems are worth countless flint. I will not part with any." · "Spark collects books and calls it a job.|Why am I
  so different?" · "I seek the rarest gems." · "My tails never let go of my crystals.|Not even while I sleep." ·
  "These tails curl around a crystal without a scratch.|A useful talent for the keeper of the First Bank of
  Greeblis." · "I’m selling digital plots out here in the Greeblis-verse!" (added in 3.15.53, FIXES A2). Once the
  Human holds the Gem, her next talk is the Gem trade instead of a line.
- **Mama Gorbo**: "Hello dear! I’m so excited to start gardening." · "Please take a coupon for my famous goo
  burger.|I run the local fast food joint, and the hubby runs the Art Gallery now." · "What a beautiful day in
  Greeblis Park!" · "I hear there is a book that can help anyone overcome shyness." · "The hubby and I met over a
  spilled goo shake.|Love at first splat!" · "My hubby is quite the artist." · "My noble goo can heal many
  inflictions." · "This noble goo keeps me round and bouncy, dear.|A little wobble is how I wave hello!"
- **Montgummery**: "Hello Human.|Mont will hide you from alien hunting Sheriff." · "Mont knows of humans.|Mont eats
  many VHS and digests much knowledge of your culture." · "Mont understands the high point of human
  culture|…|‘Flint Knapping for Beginners’" · "We are all digital monsters." · "Mont always rewinds tape before
  eating.|Mont is polite monster." · "Mont feeds tape through inner readers.|Knowledge in the reels. Dinner in the
  cassette."
- **Etcher**: "I work in data preservation.|I like to think the Ancients created us for our purposes." · "As I move
  my tentacles etch data into everything they touch.|Fortizmo is upset that I do it on her dancefloor." · "The age
  of the Ancients is etched.|The age of the Synthetics is etched.|The age of Dinosaurs began the long record of the
  Organics.|There is always more to preserve." · "Every scale on my body holds a backup of a backup.|One can never
  be too careful." · "My small scales shelter layers of stored marks.|The tentacles write; the body keeps the
  archive." · "My skin is a ledger."
- **Glyph**: "I am the Master of symbols.|Symbols make up everything… don’t you think?" · "Etcher would have
  nothing to reconstruct with without symbols.|Mont would remain motionless without symbols to translate in binary
  electrical signals.|Even Dino would have no music to play!" · "All things come into being from symbols… don’t you
  think?" · "Even a single footprint is a symbol… don’t you think?" · "My plates fit together like a sentence.|A
  moving arrangement of symbols… don’t you think?" · "When you see creatures exchanging symbols, that’s Gree-mail."
- **Zollod**: shy, "…|…|I’m shy…"; with the book, once, "…|That book…|Let me see..|Wow I’m free from shyness!";
  afterwards always "Bringing plants to life is MY life’s work.", beside "Shop at Garden Supplies" (the shop is
  closed during the Event).
- **Sparkakus**: by progress, not in turn: "For my research: I seek Artifacts left by the Ancients.|Three exist in
  this region." (no Artifact yet); "I require more Artifacts to complete my research." (one or two); the Speech
  (three); "Well done, Human!" (ever after). While he romps or the Speech's bulb is up he cannot be spoken to.
- **Nextessa**: no talk lines; her words are the phone's and the delivery's ("Quests and their lines").
- **The Ancient**: "I am the one reborn." (its "Talk"); during an Event with Seeds, "Hello".

During an Event started with the Seeds every townsperson answers only with their gardening line, in the ring or
at home ("Gifts and gardening lines"); Fortizmo, at her horn, cannot be spoken to. In any Event no Blossom can be
given, the TELEPHONE and the Pillar offer nothing, and Garden Supplies is shut; without the Seeds the talk lines go on
as usual.

### Gifts and gardening lines

What each says when given a Blossom, and at the planting Event (the campfire lines).

| Name | Given a Blossom | At the planting Event |
| --- | --- | --- |
| Mama Gorbo | "Thank you, dear." | "Pretty flowers come to life!" |
| Gooward | "GOOMP" | "* Happy planting sounds *" |
| Gemtoe | "This is mine now." | "Enjoying the SHARED garden… what is this feeling?" |
| Etcher | "Let’s dance!" | "Etching what was is important but living this is what IS." |
| Glyph | "Let’s dance!" | "Growing flowers, it’s a symbol of life." |
| Montgummery | "Let’s dance!" | "Joyful to bring life to our Town." |
| Hennrick | "Adding to a collection jar." | "Sometimes I worry that doing these things will alter the timeline…" |
| Mushroom | "A bribe? …Portal is now open to your use." | "…" |
| Fortizmo | "Add it to the tip jar." | (none: she plays her horn and cannot be spoken to) |
| King Dino | "Yes! I can finally afford another mug of carrot juice!" | "Can’t stop the beat!" |
| Somlet | "Thank you" | "Zzz" |
| Anomalee | "* Munch *" | "PLANT" |
| Zollod | (cannot be given one: his menu offers only talk, then the shop) | "Bringing plants to life is MY life’s work." |
| Sparkakus | At the Library he romps about (a plucked-guitar riff plays while he does, A62), then: "…sorry I don’t know what got into me." Away from it: "A Blossom! …I must resist the urge to run.\|Not out here, in front of everyone." | "Digging in the dirt like an animal? …don’t tell the others at the genealogical society." |
| The Ancient | "..." | "Hello" |
| Nextessa | (cannot be given one) | (not in the Event) |

What follows a gift: Gooward's goo barrage (A39); the Portal opens (Mushroom); a dance battle (Etcher, Glyph,
Montgummery); Somlet's hidden eye opens; Montgummery's screen shows robot eyes; Sparkakus romps (at the Library) or
holds back. No gift can be given during the Event, and the gifts' words never change.

### Vignettes

90 two-line exchanges between pairs (the `PAIRS` table) play out around town, plus the Ancient's twelve
(above), which only play while the player is inside the church (and there only they do). Each plays
either as two speech bubbles over the speakers or as an exchange of their Gree-mail tokens (above);
Zollod joins in only once he is cured of his shyness. `tools/spellcheck_dialogue.py --who X` prints every line per character. Recurring threads:
Hennrick wanting to go home, everyone refusing King Dino's coins, Blossoms-only at the bar, Etcher
etching everything (including citations and snores), Mont having eaten the Library's VHS tapes, Mama
offering everyone a goo burger, Gemtoe claiming whatever is worth something.

**How an exchange is chosen.** Exchanges start two ways. On a visit, one townsperson walks over to another's post
and the pair plays its exchange there (visits come every 22-32 s; Sparkakus visits only once the Human has the Gem or
the Stone, F-B42; visitors come to the Ancient more often while the Human is in the Cave, A3). And every 18-28 s (4 s
while nothing fits) the game looks for two townsfolk idle at their own posts side by side (within their two body
radii and 2.4 m) and plays the exchange that pair has played least; whether it is spoken (bubbles) or thrown (tokens)
alternates with what that pair did last. These never start during the Event or while the Human has a box or panel
open. Outside the church only the 90 below can play; inside, only the Ancient's twelve. Zollod is left out until he
is cured; an exchange stops at once if either speaker is called away or talked to. Each pair's third field in the
game's table picks one of eleven token choreographies (all of the Ancient's float a bubble); the spoken lines are the
same whichever plays.

**All 90 exchanges** (in the game's order; straight apostrophes as the game writes them in this table). Each
townsperson has 13, King Dino and Somlet 12.

| # | Speaks first | Says | Answers | Says |
| --- | --- | --- | --- | --- |
| 1 | Hennrick | "Sheriff, when may I return to my own era?" | Mushroom | "When the Consortium says so. Not before." |
| 2 | Hennrick | "May I record what you see in that window?" | Anomalee | "It is NOT for jars. It is for REMEMBERING." |
| 3 | Hennrick | "Remarkable. Drums survive into the far future?" | King Dino | "Baby, the beat outlasts everything!" |
| 4 | Hennrick | "A goo sample, for science? Only a small one." | Gooward | "Gomp gomp... GOMP!" |
| 5 | Hennrick | "In my era, this flora hasn't even evolved yet." | Zollod | "Then you got here just in time to see it bloom." |
| 6 | Hennrick | "Subject remains asleep. Observation day 41." | Somlet | "Zzz..." |
| 7 | Hennrick | "I'm told the house currency is Blossoms?" | Fortizmo | "Blossoms only, sugar. Tip jar's on your left." |
| 8 | Hennrick | "You etch history and I jar it. Colleagues!" | Etcher | "Then I will etch you into the age of Synthetics." |
| 9 | Hennrick | "That gem would suit my collection jar." | Gemtoe | "Your jar can't afford it. Nobody can." |
| 10 | Hennrick | "Your symbols descend from my era's alphabet!" | Glyph | "Every era borrows from symbols... don't you think?" |
| 11 | Mushroom | "State your business at that window." | Anomalee | "The ORIGINATOR'S business. Not YOURS." |
| 12 | Mushroom | "Those coins of yours are not legal tender." | King Dino | "Stamped by the King, baby. Legal enough." |
| 13 | Mushroom | "You are leaving goo on public property." | Gooward | "Gomp? ...gomp." |
| 14 | Mushroom | "Report any UFOs over your seedlings." | Zollod | "Only bees up there. My seedlings are thriving." |
| 15 | Mushroom | "Have you seen anything suspicious today?" | Somlet | "Zzz... zzz..." |
| 16 | Mushroom | "The Consortium will be inspecting your bar." | Fortizmo | "Inspect away. Blossoms up front, honey." |
| 17 | Mushroom | "Have you been etching the town records?" | Etcher | "I etch everything. Including your citations." |
| 18 | Mushroom | "And where did all those gems come from?" | Gemtoe | "Found them. Fairly. Mostly. Don't write that down." |
| 19 | Mushroom | "Is that symbol a coded alien message?" | Glyph | "Every symbol is a message... don't you think?" |
| 20 | Anomalee | "Your RHYTHM... the ORIGINATOR had it TOO." | King Dino | "Then the Originator could swing, baby!" |
| 21 | Anomalee | "GOO... is also a kind of CODE." | Gooward | "Gomp gomp! Gooomp!" |
| 22 | Anomalee | "ROOTS run like CODE beneath the soil." | Zollod | "And I tend every line of it." |
| 23 | Anomalee | "You DREAM. We were MADE to dream." | Somlet | "Zzz... mm... zzz." |
| 24 | Anomalee | "Do you ACCEPT pizza here? One SLICE?" | Fortizmo | "Blossoms only. But I won't tell if you share." |
| 25 | Anomalee | "ETCH this: the ORIGINATOR was HERE." | Etcher | "Already etched, Anomalee. Deep enough to last." |
| 26 | Anomalee | "Your gems GLOW like the WINDOW." | Gemtoe | "Mine glow brighter. And they're not for sale." |
| 27 | Anomalee | "Your symbols... I KNOW them. From WITHIN." | Glyph | "Then we have read the same page... don't you think?" |
| 28 | King Dino | "Gimme a goo-bop on the backbeat!" | Gooward | "Gomp! Gomp-gomp! GOMP!" |
| 29 | King Dino | "Any carrots back there for my juice, baby?" | Zollod | "Grown with care. Not for your bar tab." |
| 30 | King Dino | "Put one more carrot juice on my tab?" | Fortizmo | "Play off the last forty first, lounge lizard." |
| 31 | King Dino | "Etch my solos, baby! For history!" | Etcher | "I etch them as you play. Your hi-hat too." |
| 32 | King Dino | "I'll trade you a royal coin for that gem." | Gemtoe | "You stamp those yourself. Nice try." |
| 33 | King Dino | "What's the symbol for a bigger beat, baby?" | Glyph | "This one. Joy and rhythm in one stroke... don't you think?" |
| 34 | Gooward | "Gomp? Gomp gomp?" | Zollod | "Yes, Gooward. A little goo is good for the soil." |
| 35 | Gooward | "gomp... gomp..." | Somlet | "Zzz..." |
| 36 | Gooward | "Gomp gomp gomp!" | Fortizmo | "Goo is not currency, sweetie. Nice try." |
| 37 | Gooward | "Gooomp?" | Etcher | "Yes, I etched your goo too. It's archived." |
| 38 | Gooward | "Gomp! GOMP!" | Gemtoe | "Goo isn't gems. ...Fine. I'll keep it anyway." |
| 39 | Gooward | "Gomp?" | Glyph | "'Gomp' is a fine symbol... don't you think?" |
| 40 | Zollod | "Shh. My seedlings are napping too." | Somlet | "Zzz..." |
| 41 | Zollod | "Fresh mint for your bar, cut this morning." | Fortizmo | "Mint like that, I'd almost take flint for it." |
| 42 | Zollod | "Etch my seed catalogue. Every variety." | Etcher | "Each one a word in the age of Organics." |
| 43 | Zollod | "Gems don't grow, Gemtoe. Plants do." | Gemtoe | "Then I'll plant gems and grow MORE gems." |
| 44 | Zollod | "Is there a symbol for a seed?" | Glyph | "A dot. Everything starts as a dot... don't you think?" |
| 45 | Somlet | "Zzz..." | Fortizmo | "Somebody play that sleeper a lullaby. On me." |
| 46 | Somlet | "Zzz... zzz..." | Etcher | "Even her snores I will etch. Softly." |
| 47 | Somlet | "Zzz..." | Gemtoe | "Asleep on a pile of mail. What a waste of a pile." |
| 48 | Somlet | "Zzz..." | Glyph | "'Zzz' is the oldest symbol of all... don't you think?" |
| 49 | Fortizmo | "Quit etching my dancefloor, tentacles!" | Etcher | "It's data. Your floor remembers every step." |
| 50 | Fortizmo | "Settle up in Blossoms, honey. Not gems." | Gemtoe | "Gems are worth countless flint! Your loss." |
| 51 | Fortizmo | "What's that symbol on my menu mean?" | Glyph | "'Fresh'. Juice is symbols too... don't you think?" |
| 52 | Etcher | "I am etching the age of your Avarice." | Gemtoe | "Etch it bigger. Avarice deserves big letters." |
| 53 | Etcher | "Without your symbols I'd have nothing to etch." | Glyph | "And without your etching they'd blow away... don't you think?" |
| 54 | Gemtoe | "Is there a symbol for 'all mine'?" | Glyph | "There's one for 'shared'. Try that one... don't you think?" |
| 55 | Hennrick | "I hear you've studied this era's films." | Montgummery | "Mont eats many VHS. Mont knows much of humans." |
| 56 | Mushroom | "Have you seen a human in this town?" | Montgummery | "Mont has seen no human. Mont is very busy." |
| 57 | Anomalee | "Your SCREEN shows faces. Mine shows the PAST." | Montgummery | "Mont's screen shows robot. Robot is happy." |
| 58 | King Dino | "Can you dance to my beat, robot?" | Montgummery | "Mont dances to all beats. Mont dances best." |
| 59 | Gooward | "Gomp gomp!" | Montgummery | "Mont understands Gomp. Gomp means friend." |
| 60 | Zollod | "Mind my seedlings when you dance, Mont." | Montgummery | "Mont will dance around them. Mont is careful." |
| 61 | Somlet | "Zzz..." | Montgummery | "Mont will dance quietly. Small robot dance." |
| 62 | Fortizmo | "You've got rhythm, Mont. Ever played horn?" | Montgummery | "Mont watched VHS of horn. Mont is ready." |
| 63 | Etcher | "Your binary, Mont. May I etch it?" | Montgummery | "Etch gently. Mont is ticklish in binary." |
| 64 | Gemtoe | "What will you take for that screen?" | Montgummery | "Mont's screen is not for trade. Mont needs face." |
| 65 | Glyph | "My symbols move you, Mont... don't you think?" | Montgummery | "Mont thinks. Mont thinks yes." |
| 66 | Mama Gorbo | "Hennrick, dear! A coupon for a goo burger?" | Hennrick | "A burger from this era! For the collection jar." |
| 67 | Mama Gorbo | "Sheriff, you look peaky. Have a goo burger." | Mushroom | "A bribe? ...Make it a double." |
| 68 | Mama Gorbo | "Always staring up there, sweetie." | Anomalee | "The WINDOW remembers. As do YOU, Mama." |
| 69 | Mama Gorbo | "Play us something romantic, King Dino!" | King Dino | "For you and the hubby, baby? Slow and smooth." |
| 70 | Mama Gorbo | "There's my handsome hubby!" | Gooward | "Gomp gomp... gooomp!" |
| 71 | Mama Gorbo | "Zollod, dear! Which seeds for a beginner?" | Zollod | "Start small. Love them daily. They'll grow." |
| 72 | Mama Gorbo | "Look at her. Sleeping like a baby." | Somlet | "Zzz..." |
| 73 | Mama Gorbo | "Two carrot juices! For me and the hubby." | Fortizmo | "Blossoms first, Mama. House rules." |
| 74 | Mama Gorbo | "Etch my burger menu, would you, dear?" | Etcher | "Every topping. For the age of Organics." |
| 75 | Mama Gorbo | "A burger coupon for you too, Gemtoe!" | Gemtoe | "...Is it worth anything? Then it's mine." |
| 76 | Mama Gorbo | "What does that symbol mean, dear?" | Glyph | "Family. The warmest symbol... don't you think?" |
| 77 | Mama Gorbo | "Mont, you're too thin! Have a goo burger." | Montgummery | "Mont cannot eat burger. Mont eats VHS." |
| 78 | Sparkakus | "Hennrick! Any news of the Ancients' era?" | Hennrick | "Much research is still needed, colleague." |
| 79 | Sparkakus | "Sheriff, may the Library stay open?" | Mushroom | "For now. The Consortium is watching your books." |
| 80 | Sparkakus | "The Ancient texts speak of an ORIGINATOR..." | Anomalee | "YES. Read them to me. SLOWLY." |
| 81 | Sparkakus | "Is drumming in the Ancient texts?" | King Dino | "Not yet, baby. Write me in!" |
| 82 | Sparkakus | "Please, no goo near the first editions." | Gooward | "Gomp... gomp." |
| 83 | Sparkakus | "I've a book on Ancient gardens for you." | Zollod | "Read me the part about seeds. Twice." |
| 84 | Sparkakus | "Shh. Even asleep, she's a patron of the Library." | Somlet | "Zzz..." |
| 85 | Sparkakus | "A quiet juice, please. I've a reputation." | Fortizmo | "One quiet juice, librarian. Blossoms only." |
| 86 | Sparkakus | "Your etchings would fill my Library twice." | Etcher | "And your Library would fill my tentacles." |
| 87 | Sparkakus | "I collect books and call it a job, yes." | Gemtoe | "And I collect gems and call it Avarice." |
| 88 | Sparkakus | "Your symbols would make a fine index." | Glyph | "An index is a symbol of symbols... don't you think?" |
| 89 | Sparkakus | "Mont, return the VHS tapes you borrowed." | Montgummery | "Mont ate the VHS tapes. Mont is sorry." |
| 90 | Sparkakus | "Mrs Gorbo, no burgers in the Library." | Mama Gorbo | "Just a little one, dear? For your research." |

## Places: a gazetteer

Every place the game shows or names, with who is there and what happens. Positions, sizes and looks are in
"Environment design and style" below; this is the story side. The park is everything inside the iron fence; the town
outside it is scenery, seen and never entered (FIXES A4).

**In the park**

| Place | Who | What happens there, and its words |
| --- | --- | --- |
| The Garden and the SUMMONING PILLAR | Everyone, at the Event | The park's round heart. "Use the Summoning Pillar" opens the GARDEN EVENT panel; without the Stone, the SUMMONING PILLAR box: "The runes stay dark.\|Only the Summoning Stone can wake them and start the gardening event." The runes wake when the panel is opened with the Stone in hand. |
| POST OFFICE | Somlet | Somlet sleeps on a mound of letters; parcels "To Montreal", "To Cobourg", "To Bangkok", "To Ormstown" (A43) and one unlabelled. |
| SHERIFF'S kiosk | Mushroom | Mushroom stands on his desk, up a ramp at its left end; eight WANTED posters (an alien twice, a saucer, GLOOPERNAUGHT, a rabbit, a girl, a stranger, Ollaag); toadstools everywhere; where the bribe is paid. |
| GARDEN SUPPLIES | Zollod | Shut while he is shy; then "Shop at Garden Supplies" ("Welcome to our shop!"): Flower Hat, Sun Dress, Frog Shoes, the bagel seasoning packet. Shut during the Event. |
| GOOWARD'S GALLERY | Gooward roams round it | Gooward's three-panel painting of the ages ("The gallery painting"), paint cans and splats, two easels. |
| The LIBRARY | Sparkakus | Open to the sky: eight bookcases on a rug. The Artifact quest, the Speech, OVERCOMING SHYNESS, the first editions; a Blossom sets Sparkakus romping between the shelves, to a plucked-guitar riff of his own (A62, 4.0.38). |
| The JUICE BAR | Fortizmo; King Dino drums at its end | "We only accept Blossoms at this establishment." Carrot juice on the rocks; the tip jar; King Dino's tab. |
| The dance floor | Etcher, Glyph, Montgummery | A purple night-club floor in the daylit park; the dance battles, "KING DINO on drums.", where Etcher's tentacles etch every step. |
| Gemtoe's Gazebo | Gemtoe | An octagon with gold coins on its floor; a kiosk "in all regards" (the author, P33): it fades with the kiosks in the Event, its seven railed sides are walls and its doorway open to anyone (F-B65), and no Blossom or flint ever spawns inside it (B95, 4.0.33). The Gem trade happens here. |
| The church, and the Cave inside | The Ancient; its visitors | A secret room, entered through the west wall where it is marked with a red X. Only the Ancient's twelve exchanges play inside, and only they. |
| The Window | Anomalee, below it | The church's front stained-glass window *(inference: "The church and the Cave" below)*: "The WINDOW REMEMBERS the TRAVELER." |
| The Portal | Hennrick roams round it | A stone gateway between eras, locked by the Consortium; it opens (a blue swirl) when the courier comes through. |
| The TELEPHONE | (the Human) | "Call for pizza"; without the bribe, the PHONE box says "*connection to the Portal seems blocked*". Counts as a kiosk in the Event (A27). |
| The pond | Backpacka, in the Event | Still water with stones round it (A33: no ripples or glow since 4.0.4). Backpacka drinks here. |
| The two big trees by the church | The robin; the cardinal | The robin on the tree at (-16, 37) (A30), the cardinal on the one to its right (A37, A38), turned toward the robin (A40). Picked ("Robin", "Cardinal"), each flies off and returns. |

**In the town outside the fence** (scenery; names from the signs, or *(inference)* from colours and objects, as in
"The rest of the town" below)

| Place | What the game says or shows |
| --- | --- |
| FIRST BANK OF GREEBLIS | Kept by Gemtoe: "A useful talent for the keeper of the First Bank of Greeblis." |
| Mistergummery's | A drive-in diner with a teal M, the logo on Mama Gorbo's cap (A36). |
| The Gooburger | Mama Gorbo's "local fast food joint"; a giant burger on a pole. |
| King Dino's billboard | "A Prehistoric Era in Jazz!"; "Let King Dino take you / to the Jurassic / Greeblis Park!"; painted by Gooward. |
| The Field Office | Hennrick's office in the far past (the author): a trailer with a sheriff's star and a flying saucer, a dish. |
| The outer-ring houses | Eight houses, each in one townsperson's colours *(inference)*. |
| The courthouse, school (with the Backpacka mural), fire station, hotel, gas station, video shop, curio shop with a sphinx, glasshouses, water tower, a roped-off landing ring, a fenced crystal patch | Scenery only; no words beyond the pictures. |

**Named but never shown**: Greeblis City (Hennrick's era, "the towers of Greeblis City reach the clouds"); the
Computer Core and the Great Sphinx that guarded it; Nextessa's inter-temporal pizza shop; the genealogical society
(Sparkakus); the Greeblis-verse, where Gemtoe sells "digital plots".

## Menus, panels and boxes

The words of the game's own interface, in the order the player meets them (the landing screen is under "A session").

- **The pick menu** over whatever the ray points at: "Talk to <NAME>" and, with a Blossom in hand and no Event,
  "Give a blossom"; "Talk" for the Ancient; "Use the Summoning Pillar"; "Shop at Garden Supplies"; "Call for pizza";
  "Take OVERCOMING SHYNESS"; "Robin"; "Cardinal". Talking to a townsperson shows their talk emote.
- **The dialogue box** carries the speaker's display name in their colour and pages split at "|". Boxes not spoken by
  a character: "PHONE" (the TELEPHONE) and "SUMMONING PILLAR".
- **GARDEN EVENT** (the Pillar): "Summoning Stone ☐/☑", "Seeds ☐/☑", "Snacks ☐/☑", "Start gardening event?", "Yes",
  "No".
- **GARDEN SUPPLIES** (the shop): "Welcome to our shop!", the four goods, "Change out" on a worn outfit, "Flint: n",
  "LEAVE".
- **"DANCE BATTLE: MONTGUMMERY", "DANCE BATTLE: ETCHER", "DANCE BATTLE: GLYPH"**: "KING DINO on drums."; the dancer's move ("MONTGUMMERY rocks
  out!", "… does the splits like scissors!", "… lays horizontal like paper!"); the player's three moves "Rock out!",
  "Do the splits like scissors!", "Go horizontal like paper!" and "BOW OUT"; the stamina bar ("Robot steps left",
  "Tentacle twists left", "Macarena moves left", 10 each); at the end "<NAME> awards you an Ancient Artifact!"
  (a first win) or "<NAME> takes a bow." (a later one), or after BOW OUT "You take a bow." (or "The beat won't
  let you go!"), then "TAKE A BOW".
- **The watch**: "PRESS / Y / TO OPEN"; the inventory ("Currency, items and rewards").
- Elsewhere: "CLOSE" and "DONE" on panels.

## Creature design and style

How the characters look and the visual language they share, as built in the game file (moved here from
CREATURES.md in 3.15.57, the author's request; how the models are constructed, the shared kit and the code names
stay in CREATURES.md). Numbers are the code's own (metres, radians, seconds; `sin(2.1t)` means a sine of 2.1
radians per second). Anything the code does not state is marked *(inference)*. The author's rule (RULES.md 7): the
designs are final; fixes must not change how anyone looks, and new looks are the author's call.

### The house style

What the models have in common, as built:

- **Soft, chunky, readable shapes.** Bodies are one smooth mass (a blob, a lathe, a cushion) 2.4-3.75 m tall,
  wider than they are deep, with few, large features that read from across the park in a headset. Edges are rounded
  everywhere; only Anomalee and Montgummery are boxy, and they are machines.
- **One signature colour, then accents.** Each character has one dominant hue (their cast colour, which also colours
  their dialogue box; emotes have one colour per glyph since F-B29) and a few small, saturated accents in the opposite part of the wheel: Gooward's blue with
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
- **Everyone is a little bit of technology.** A deliberate theme (the author): this is a digital world and the
  townsfolk are digital monsters (Montgummery: "We are all digital monsters."). Each design carries a computing
  detail: Gooward's float ring tag "AP" and Sparkakus's coin "APP"; Mama Gorbo's orbiting pins "AP", "IP" and a wifi
  sign; Glyph's back plates (a terminal prompt `> ..`, "PR", a glowing "APK", a shield with a "G"); Anomalee's
  monitor head, keyboard jaw and "adb" labels; Montgummery's CRT head with "gfxinfo" on screen and scrolling code on
  his body; Hennrick's data screen; Etcher's three back marks (a stroked "B", three stacked parallelograms, two
  diamonds): symbols of the ledgers he can etch on (the author), fitting his line "My skin is a ledger."
- **Always moving, never in sync** (the idle phases seeded since 3.15.51, R5: still out of step, the same on every
  launch). Every character breathes, sways or bobs with slow sines (mostly 0.7-2.1 rad/s,
  a few centimetres or a few hundredths of a radian), each part at a different rate and phase, so nothing looks
  frozen and no two move alike. Talking adds a nod, a bounce or a moving mouth (`tkS`); walking adds a stride or a
  hop. Dancers follow the beat (`gcBeatHz`, 104 beats a minute in town, 88 in the Event).
- **Props tell the job.** Mushroom the sheriff: a star badge and a cowboy hat. Somlet the postmaster: a cap with an
  envelope badge, asleep at the post. Zollod the gardener: an apron with seed packets and a garden growing on his
  back. King Dino the drummer: a crown and drumsticks. Nextessa the courier: a pizza box on her head.

### Character by character

#### Gooward
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
  wagging harder while he talks. No walk cycle. A Blossom sets off his goo barrage (eight volleys over 2.7 s that
  splat on the player's view); for 4 s he cannot be picked again (A39).

#### Sparkakus
- **Body**: a blob body of 6 parts (belly, chest, hips, neck, head, a long tilted snout); clawed legs (`KIT.leg`),
  mitten hands with red cuffs (`KIT.arm`), tall flattened ears with small horns, a long tail with a star at its tip.
- **Palette and surface**: his own painted fur, blue `#2c4cc0` brushed with darker and lighter strokes and grown over
  by 14 wandering vines with leaves and dots in yellow, green, pink, orange, teal and violet, a third of the dots
  five-petal flowers; orange hands and feet, a cream fur-card bib, dark feather vanes down his back, four daffodils on
  his flank.
- **Face**: two shared eyes with yellow irises placed on the head with `hit()`, a glossy black nose, a mouth traced
  along the snout.
- **Extras**: a collar with an orange "APP" coin. The pink-to-cyan mist that trailed from his tail (90 particles) was
  removed in 4.0.4 (A32: "Please remove the particle effect coming from Sparkakus' tail").
- **Motion**: breathing, ear twitches, a full walk (stride, arm swing, roll and lean), and a dance with arms pumping
  overhead. He stands in the Library at 1.16 times size, shows a yellow "!" when the player comes within 6 m, and
  turns to face the player while they talk or his menu is open. **The romp** (after a Blossom, at the Library): he goes back to his home spot, leans 20
  degrees, lifted by the lean's drop so he never sinks into the floor, and runs a loop 3.8 x 0.6 m between the shelves
  without touching a book (A57, 4.0.36-4.0.38: "he does not clip into the ground and into bookshelves"), to a
  plucked-guitar riff in E that stops with the romp (A62).

#### Zollod
- **Body**: the same blob plan as Sparkakus with a short round snout and a trunk; four-fingered arms, pad feet, a
  thick drooping tail; six fronds from his back sides.
- **Palette**: six bands from cyan (`#35d0c8`) at the top to green (`#4ca83c`) at the bottom, darker seams between
  the lower bands; pink tips on trunk and tail.
- **Surface**: `scale` with the bands; a moss bib on his back (`grass`) with 26 blades, five flowers and a worm; an
  olive canvas apron with a pocket of three seed packets.
- **Face**: two shared eyes; the trunk stands in for nose and mouth. Nothing in the model is "shy": his shyness is in
  his lines and his shop.
- **Motion**: a smoothed walk (the upper body rocks over planted legs), fronds and tail swaying, the worm turning.

#### Somlet
- **Body**: a floating felt cushion (superellipsoid, `.82 x .76 x .72`) with 16 bumps, two floating three-sphere hands,
  seven thin branching tentacles hanging below; no legs.
- **Palette**: cream felt (`#f2e4b4`), a navy postman's cap with white piping, a black visor and a gold envelope
  badge; plum tentacles.
- **Face**: asleep by default: felt lids with lashes and creases, under-eye bags, a brow; a hidden open eye that
  eases in when the player gives her a gift. A small "o" mouth that breathes and talks.
- **Motion**: hovering, breathing, three "Z" sprites rising from her; when she is at home and idle she slowly rolls
  onto her side to lie down. Each frame his tentacles curl themselves out of the ground.

#### Mushroom
- **Body**: a lathe stem (about 1.1 across) under a broad, flat cap (about 2.5 across) with 60 gills, a scalloped
  frill, 17 sand spots, two baby mushrooms on his back, two flat feet with root tendrils; no arms.
- **Palette**: cream stem (`#f6eed4`), an orange cap ramp (`#e46a14` to `#f8b83a`) with white spots; brown felt hat.
- **Surface**: `wood` stem, `fabric` gills, `skin` cap with the ramp.
- **Face**: on the stem, under the cap: shared eyes, angled brown brows, pink cheeks with freckles, a small smile.
- **Extras**: a six-point sheriff's star; a cowboy hat whose brim and crown are shaped by moving the lathe's vertices
  (sides curled up, a front dent, a centre crease).
- **Motion**: the stem sways, the cap bobs and nods while he talks. No walk cycle: he glides. He stands on his desk
  (1.545 m up) and goes up and down by a ramp at its left end (since 3.15.53, the author's design; it was a hop),
  his height following the ramp (FIXES.md F-B39).

#### King Dino
- **Body**: his own signed-distance blob (torso, a head nearly as wide, a wide snout, two thighs), pear-shaped.
- **Palette**: yellow (`#f9dc22`) shading to deeper yellow low down and orange in the creases; glossy teal joints,
  sockets and buttons with lime lights; a blue crown; a feather plume ramping purple to orange.
- **Face**: two glossy dark eyes in yellow rings with lids, a smile traced along the snout.
- **Synthetic parts of his own body** (the author): three lit buttons on each side and a back panel of five
  sockets, in the same glossy teal as his joints.
- **Extras**: short arms with drumsticks; a five-point swept crown; the plume, a curved spine of feather cards fanning out.
- **Motion**: rolls and sways; when the drums play (`DRUMS`), each hit swings an arm and nods his body.

#### Etcher
- **Body**: a pear-shaped blob (wide base, a long neck, a small head with a forward snout) covered in about 120
  overlapping scales placed with `hit()` and tilted like shingles, leaving a bare belly window; no arms; six long
  ribbed tentacles fanned on the ground at the sides and back.
- **Palette**: teal (`#2a8a9e`) to blue (`#2a5aa8`) with four scale shades; purple crest knobs and tentacles; a green
  faceted chest gem; three yellow marks on his back, symbols of the ledgers he can etch on (the author).
- **Face**: shared eyes with gold irises on the sides of the head, a long lizard smile.
- **Motion**: idle sways; a four-bar dance in which the tentacles pulse, ripple in order, fan and rise; battle moves
  rock (a slam), paper (the tentacles flatten and lift) and scissors (two tentacles snip). His tentacles bend on the
  CPU as true arcs.

#### Gemtoe
- **Body**: an upright egg (lathe torso, bare scaly below, a fluffy bib of about 660 feather cards above) on four
  curling tails that stand in for legs and each cradle a gem; two pairs of fanned wings; a round feathered head with
  a hooked parrot bill.
- **Palette**: reds (`#b8282e` and its shades) with a yellow-orange crest; amber eyes; purple gems with yellow
  sparkles. *(inference: the palette variable is still named `teal`, so the model was once teal.)*
- **Face**: side-set amber eyes with slit pupils and feathered lids, scaly brows, a beak that opens while she talks.
- **Motion**: hovers (a little above the ground, on purpose: the author, 2026-10-30), the head looks about, the wings flap faster when she moves, the sparkles twinkle.
- **Tie** (3.15.57, the author: "a neck tie. no shirt, just a tie"): a knot under the bill and a pointed blade down
  the bib, her gems' purple with gold diagonal stripes. Since 3.15.62 it hangs at 0.32 rad, along the chest fur, and
  only the feathers under it lie flat (FIXES F-B59; the author: "Only those feathers and no others").

#### Glyph
- **Body**: a plump upright dragon (8-part blob: torso, belly, chest, head, snout, two haunches, a rump), a thick tail
  curling sideways, ram-like gold horns, clawed arms and legs.
- **Palette**: blue (`#4a9ad8`) under a swirl-painted skin; navy plates with gold swirls; gold horns; glowing orange
  eyes.
- **Extras**: a ridge of hexagonal plates down the back and tail; five painted dorsal plates (a face, a sigil, a
  terminal prompt, "PR", a glowing "APK"); a gold shield with a "G" on his flank; two emissive tiles.
- **Motion**: idle bobs, looks around and a shake every 5.3 s; a 16-beat Macarena with a quarter turn at the end;
  battle moves air guitar (rock), snipping arms with jumps (scissors) and flapping arms (paper). Idle, dance and
  battle are cross-faded.

#### Mama Gorbo
- **Body**: a melting jelly mound (a dome on a slumping base spreading into a flat skirt, a lump on the top left,
  six drip shapes down the dome), clamped flat at the ground; no limbs.
- **Palette**: peach (`#ff9f5c`), richer on the drips; cyan, pink and purple ooze; a lime goo tube draped round her
  front; red pins.
- **Face**: two octagonal porthole eyes, one large and one small, with purple glowing lenses; no mouth.
- **Extras**: three ooze drips that a bulge travels down, drops that grow, fall and leave peach splats on the ground,
  orbiting pins "AP", "IP" and wifi, four flashing yellow sparks.
- **Cap** (since 4.0.4, A36): a yellow baseball cap with the teal M of Mistergummery's on its crown, worn pushed back
  (her big eye covers the upper front of her head), its brim above the eye. Since 4.0.22 (A45) the crown is closed
  underneath and the brim is a full disc whose back half sits inside the crown, so nothing shows inside the cap from
  below or beside the brim (the author: "The brim of Mama Gorbo's hat does not connect with the hat").
- **Motion**: deep jelly breathing, a bounce and nod while she talks, lenses pulsing; her base lifts when she tilts
  so she never sinks into the ground.

#### Anomalee
- **Body**: a box quadruped with a crocodile snout and jaw, a tilted monitor head, a small box on top with three
  hanging cables, one arm holding a handheld, a tail; the back-right leg is a wooden peg leg.
- **Palette and surface**: pixel art: a sage skin (`#b3c48f`) with cyan and grey stripes at 32 pixels, nearest
  filtered; a cyan head, a magenta screen; "adb" labels; re-skinned with the plastic surface by her wrapper.
- **Face**: the magenta screen (a corner bracket and wifi arcs; static when she glitches; an equaliser while she
  dances); the jaw chomps now and then.
- **Motion**: a four-legged walk, cables swaying, a glitch every 5-13 s (its timing and the jaw's chomps seeded since
  3.15.51, R5; the shake stays random); gazes up at the church when idle.

#### Fortizmo
- **Body**: a pear body that widens at the bottom, a round head with long upright ears, a trumpet-bell muzzle, arms
  with three-fingered hands; she rolls on two unicycle wheels with springs.
- **Palette and surface**: orange brush-stroke fur (`#e8742a`), a cream belly patch with seams and black studs, brass
  valves, chrome and black tyres. Every vertex jittered for a hand-made look.
- **Face**: two glossy black eyes and four smaller matte black beauty marks beside them (the author).
- **Motion**: the wheels roll with the distance travelled; when she plays, her muzzle morphs into a 3.7 m trumpet,
  the valves pump at the Event's 88 beats a minute and her arms reach for the horn.

#### Hennrick
- **Body**: a large egg body and broad head, ball shoulders, a beard of four tentacles, copper pipes curving up
  beside the face, chrome kneecaps with spikes, a brown hat with a bow.
- **Palette and surface**: magenta brush-stroke fur (`#c85ac8`) with orange fur bands, chrome, copper, cyan and green
  glows.
- **Face**: a chest screen of scrolling green data (a pixel dancer while he dances) and nine cyan porthole lamps that
  blink together.
- **Motion**: walks, hops when he talks, spins a full turn when he sings, bounces and raises his arms in the dance;
  his tentacles push themselves out of his body each frame.

#### Nextessa
- **Body**: spheres only: a three-lobed base, a stacked column of three neck spheres with side cones, a small round
  head with a box snout, the pizza box carried on her head; no limbs. About 3.5 m tall; each neck sphere carries a
  pair of short pale cones (`#eea06c`) at its sides, and the snout is a darker orange box (`#e3875a`).
- **Palette**: oranges (`#f47a3a`, `#f09460`), yellow eyes with white highlights. Clay, a soft sheen (shininess 26),
  no textures.
- **Motion**: she hops with squash and stretch (0.12 m high, the base spreading as it lands); her segments wave, in
  order up the neck, faster while she moves; standing, she breathes (1.5%) and her head turns a little; she nods
  once when she speaks (0.8 s). Her phase is seeded (`gcRnd("nextessaPhase")`). She is the game's one courier: she
  comes through the Portal when called for pizza and goes back through it (`kind: "courier"`, `pk_nextessa`).

#### Montgummery
- **Body**: a dark rounded tape-like torso (superellipsoid) under a transparent shell of scrolling code, high-top
  boots with laces, a cable tail, four-fingered hands, a big CRT head with a control strip.
- **Palette**: dark green-black body (`#1d2a23`), cyan code and boots with orange toes, a purple screen.
- **Face**: the screen, by mood: two white eye bars and a pixel mouth that opens while he talks; robot eyes and a
  grille while he dances or just after a gift; a shovel during planting; rock, paper or scissors icons in battle.
- **Motion**: a 16-pose robot dance snapping to the beat with a jitter; the three battle moves; a talk nod.

#### The Ancient
- **Body**: one long tube along a curved spine (140 x 22), flattened into a sole underneath, with a hump at the
  mantle, a keel ridge, up to 26 tubercles, a tail droplet and four stalks (two long, two short), squashed to .62 of
  its height: a long, low, dark slug. Since 4.0.33 (A52) the core, mantle, head and stalks are 15% larger about its
  ground point, and its skin and bump maps are painted at 1024 x 256 (were 512 x 128) with finer pores, creases,
  scratches and sheen streaks over the same pattern.
- **Palette and surface**: near-black (`#171310`) with a painted mottled skin and a separate bump map, shininess 90:
  wet and glossy. No eyes: dark knobs on the upper stalks.
- **Motion**: slow, irregular life: periodic settles, tilts, tail curls, mantle ruffles and deep sighs on different
  periods (17-37 s), the head looking about, the stalks retracting every 11 s; when it talks the head and stalks lift.
- **The breathing organ**: a small round organ on its right side swells with each breath; since 4.0.35 it wears the
  body's own skin and bump maps, smoother (A53: "It's a little brown untextured round organ. Please texture this
  organ, the same as its body").

#### The robin
- A plump songbird (about .45 m) on a bark branch of the big tree beside the church (since 4.0.3, A30), facing the
  park: rusty breast, dark back and head, white throat with streaks, a
  yellow bill, white eye-rings and brows, three tail feathers. All matte clay, no textures. It breathes, looks about,
  flicks its tail every 9 s, and when picked tweets twice (A60, 4.0.37), flies up, hides for 10-18 s and returns.
  In flight it beats its wings, turns to face where it is going over the first fifth of the flight and back to its
  perch heading over the last quarter of the return (A54, 4.0.35; shared with the cardinal). It fades with the park's
  trees in the Event.

#### The cardinal
- A male cardinal (since 4.0.4, A38; from the author's photos) on a branch of the second park tree (-24.5, 34.5),
  turned to face the robin since 4.0.7 (A40: "Please flip the Cardinal to be facing the opposite direction (towards
  the Robin)"; it faced into the park before). The robin's body, wings, tail and head, in a cardinal's colours: bright red all over, a darker red-brown
  back, wings and tail, a tall swept-back crest, a black mask and bib round a thick orange-red bill, no eye rings and
  no white tail tips. It moves as the robin does (a few seconds out of step) and, picked, tweets twice (A60), flies off and returns.

#### Backpacka
- **Body**: a horizontal lathe body with seven colour patches, a ten-segment neck, a head with a jaw and tongue, a
  curled tail, four legs ending in open pipe feet, ten leaf-like wing blades; he flies the whole time.
- **Palette**: tan skin (`#d48e64`) with orange, yellow, ochre and pink patches, green wings, a rainbow.
- **Motion**: the planting Event's set piece: he flies in, drinks from the pond and swells, flies to the garden,
  spins while his four feet spray water on the plants, a rainbow fades in, and he flies away low over the north-west
  fence into the Event's mist bank, where he is switched off (88 s in all; 84 s until 3.15.54, FIXES A7).
- **Performance and collision** (3.15.50): batched when built (P25: 94 of 96 parts in 11 batches); while he is down at
  the pond the player cannot walk into him (F-B37: player-only circles round his feet, body, neck and head).

#### The player
- In VR the player sees only their hands: cartoon three-fingered hands (skin `#f4dcc6`) with a white cuff and a
  sleeve in the dress colour. The full body (a yellow flowered dress, a navy belt, red-orange hair in two pigtails
  with a navy bow, freckles and blush) is built at boot and hidden in VR.
- The left wrist wears a watch (since 4.0.4, A35): a dark strap, a small case and a face reading "PRESS / Y / TO
  OPEN"; the inventory opens on the watch face itself (A41), 10 cm wide (A44).
- Outfits from the shop are built hidden and switched on: the Flower Hat (in place of the bow), Frog Shoes (green
  frog-faced shoes) and the Sun Dress (the dress map swapped for suns on sky blue, with an orange hem).

#### The UFO's pilot
- **Who**: Ollaag, the leader of the Alien Alliance, is the one who flies round in the UFO (the author, 2026-11-04);
  the game gives the pilot no lines. Since 4.0.43 (A63; the author: "Please update this model to be Ollaag instead")
  the model in the dome is Ollaag as his WANTED poster paints him; until then it was a small green alien (`#7ad85a`)
  with two antennae tipped in yellow and big black eyes.
- **Body**: seated in the middle of the saucer under a pale cyan glass dome (45% see-through), about 1.2 m tall from
  the deck to the top of his head. A blue robe (`#3a64b4`, a cone widening to the deck) with rounded shoulders, two
  dark navy collar points (`#26478a`) and five gold diamond studs (`#e8c040`), one at the throat and two each side of
  the chest; a navy belt with four gold checks across the front. He holds a sage tablet (`#b4c2ae`) tilted up in both
  tan hands at his chest. 31 parts, all made at load; matte clay.
- **Face**: a tan head (`#d2bc90`, a little taller than wide) on a short neck; long flat ears pointing out to the sides
  and a little up; heavy dark brows (`#4a3820`) slanting down to the middle, two forehead lines (`#8a7048`); brown eye
  sockets (`#6a5434`) with small glossy black pupils; a small pointed nose and a thin straight mouth.
- **Motion**: none of his own; he rides the saucer across the sky, hovering and leaving with it. The saucer spins
  under him (2.2 radians a second) but he is turned against the spin, so he always faces the way it flies.
- **The saucer** (for scale): a chrome hull about 8 m across (`#a8aeb8`) under a grey upper deck, two dark raised
  rings and a dark rim, eight warm window lights, 18 rim bulbs cycling red, yellow and cyan, three round dark pods
  underneath and a pale green glowing disc (`#9affb0`) in its belly.

#### Faces in pictures
Creatures that exist only as paint, for completeness; none moves.
- **The WANTED posters** (the Sheriff's back wall, eight sheets 0.62 x 0.78 m of cream paper, "WANTED" and "REWARD" in
  brown Georgia): *the alien* (twice), a grey domed head narrowing to a chin, two big slanted black eyes and a short
  mouth line; *the saucer*, grey with a cyan dome, a row of yellow and cyan lights and a yellow beam; *GLOOPERNAUGHT*,
  a green goo mound with dripping feet and two arm lobes, round white eyes with black pupils, a shine and three
  bubbles; *the rabbit* (`rabbit`), brown with long pink-lined ears, a white muzzle, pink nose and whiskers, in a navy
  coat with gold epaulettes and buttons, red collar tabs and a wide navy hat edged in gold with a red, white and blue
  rosette; *the girl* (`visitor`), fair skin with freckles and a small smile, red-orange hair with a pigtail and a navy
  bow, and a yellow dress with white flowers: the player's avatar (the author, 2026-11-04); *the stranger* (`stranger`), fair skin, swept
  blond hair, a gold earring, a brown jacket over a sage shirt and white collar; *Ollaag* (`olag`), tan skin, ears
  pointing out to the sides, heavy brows and forehead lines, a blue robe with dark collar points and gold diamond
  studs, a gold-and-navy checked belt, holding a sage tablet. They are several aliens, two of them humans (the
  author's answer 11 below; *inference: the girl and the stranger*). The grey aliens are members of the Alien
  Alliance, one of at least four alien races in it (the author's answer 12 below), not the Sheriff's picture of the
  Human (an earlier guess here). Who they are is not told: GLOOPERNAUGHT has a backstory this game
  does not tell (the author's answer 4 below); Ollaag is the leader of the Alien Alliance, which is in conflict with the
  Consortium, and is the one who flies round in the UFO (the author's answer 9 below).
- **Gooward's painting**: its creatures and motifs (`cubeJar`, `glitch`, `paisley`, `water`, `mise`, the butterflies,
  a robin) are in "The gallery painting".
- **The school mural**: Backpacka over a meadow, and a duck on the pond ("Pictures in the town").
- **King Dino's billboard** and the theatre's marquee bill (a yellow dinosaur head, a crown, drumsticks), and
  Montgummery's face on the video shop's roof screen (`s_montface`).
- **Statues**: the stone sphinx at the curio shop's door (two unlike eyes) and the topiary dinosaur before the
  courthouse ("The rest of the town").

### Every creature (inventory)

Everyone and everything with a face in the game, with the code's id (a hint, not canon: the naming rule at the top).

| Creature | Id in the code | Where it lives | Entry |
| --- | --- | --- | --- |
| Gooward | `gorbo` (the one companion; `born_gooward`) | roams the park round his Gallery | Gooward |
| Sparkakus | `keeper` / `stump` (`born_sparkakus`, the Library's own build) | the Library | Sparkakus |
| Zollod | `cutebex` (the one `kind: "creature"`; `born_zollod`) | Garden Supplies | Zollod |
| Somlet | `m_somlet` (`born_somlet`) | asleep on the mail at the Post Office | Somlet |
| Mushroom | `drifter` (`born_mushroom`) | on his desk at the Sheriff's | Mushroom |
| King Dino | `m_kingdino` (`born_kingdino`) | at his drums by the Juice Bar | King Dino |
| Etcher | `p_etcher` (`born_etcher`) | roams the dance floor | Etcher |
| Gemtoe | `p_gemtoe` (`born_gemtoe`) | the Gazebo | Gemtoe |
| Glyph | `p_glyph` (`born_glyph`) | roams the dance floor | Glyph |
| Mama Gorbo | `p_mamagorbo` (`born_mamagorbo`) | roams the park | Mama Gorbo |
| Anomalee | `blinker` (`anomaleePeg`) | before the church, gazing up | Anomalee |
| Fortizmo | `frog` (`fortizmoPick`) | behind the Juice Bar | Fortizmo |
| Hennrick | `gratelet` (`pk_hennrick`) | roams round the Portal | Hennrick |
| Nextessa | `kind: "courier"` (`pk_nextessa`) | comes through the Portal with the pizza | Nextessa |
| Montgummery | `w_mont` (`pk_mont`) | roams the dance floor | Montgummery |
| The Ancient | `slug` | the Cave inside the church | The Ancient |
| The robin | `robin` | the park tree at -16, 37 | The robin |
| The cardinal | `cardinal` | the park tree at -24.5, 34.5 | The cardinal |
| Backpacka | `JGP.backpacka` | only in the Event: the pond, the Garden, the mist | Backpacka |
| The player | (the rig) | wherever the player is | The player |
| The UFO's pilot | `JGP.ufoNow` (the UFO) | the sky, every 600 s | The UFO's pilot |
| The WANTED posters' faces | `alien`, `ufo`, `goo`, `rabbit`, `visitor`, `stranger`, `olag` | the Sheriff's back wall | Faces in pictures |
| The painting's, mural's and billboard's creatures; the sphinx and the topiary dinosaur | (motif names in "The gallery painting") | the Gallery, the school, the billboard, the curio shop, the courthouse | Faces in pictures |

The Ancient's visitors are townsfolk from this list (A3). The game builds no other animals beyond the worm in the
moss on Zollod's back and the two rooted specimens in Garden Supplies' jars: no butterflies, fish or insects outside
the pictures, and the roaming critters of `test_roam.js` are six of the townsfolk (Mama Gorbo,
Gooward, Hennrick, Etcher, Glyph, Montgummery).

### The author's answers about the models

What the models show that the code does not explain, as the author answered it (also in LORE.md's cast table):

- **Gooward**: the two octagonal lens discs on his head are a second set of eyes; the wavy lines are forehead
  wrinkles.
- **King Dino**: the lit buttons on his sides and the sockets on his back are synthetic parts of his own body.
- **Mama Gorbo**: the lime tube draped around her front is a goo tube.
- **Fortizmo**: the four small dots beside her eyes are beauty marks.
- **Gemtoe**: floats a little above the ground on purpose (author, 2026-10-30).
- **Backpacka** is a he; **Fortizmo** is a she (author, 2026-10-30).
- **Gemtoe** is a she (author, 2026-10-31).
- **Etcher**: the three marks on his back (a stroked "B", three stacked parallelograms, two diamonds) are symbols of
  the ledgers he can etch on.
- **The technology on every character** is a deliberate theme: this is a digital world and they are digital
  monsters.

Checked in the code instead: Mushroom's reported height (2 m) is below his hat (about 2.3 m), but everything it
places clears the hat (emotes at 2.4 m, speech bubbles at 3.1 m). No questions are open.

## Environment design and style

How the world is built and how it looks, read from the game file (`tools/uncompressed.html`, 3.15.67; later changes to 4.0.34 noted where they fall), as
"Creature design and style" above does for the characters. Numbers are the code's own (metres, radians, seconds;
colours as hex). Most buildings carry no name, so the building names below are the 3.15.44 builders' code names
(`git show 21596f1:tools/uncompressed.html`: `STORE`, `FRONTIER`, `HOUSE`, `COURTHOUSE` and so on; minified since
3.15.45, FIXES R2): hints in the sense of the naming rule at the top, not canon, and the source of the building names in
"The world" above. Whom a building seems to belong to is never stated by the code and is marked *(inference)*, as is
anything else the code does not state. Directions follow the docs: +z is north and +x east (Backpacka leaves "over the
north-west fence" toward x -62, z 72, FIXES A7); the code itself calls the park's +z edge `parkSouth`.

### How it is built

- **All code, nothing loaded.** Every building, tree, stone and sign is put together at load from primitives (boxes,
  cylinders, cones, spheres, lathes, extruded outlines, noise-displaced icosahedra) and every texture is painted on a
  canvas by the game itself. The APK carries the same pixels pre-painted in `tex/` and loads them instead of painting,
  for a faster start (FIXES R1, F-B34; GAME.md "The three forms it ships in").
- **Two kits.** The park inside the fence (the kiosks, the Garden, the pond, the Library, the juice bar) is built the
  way the characters are: Phong materials, the shared procedural surfaces (`KIT.surf`: wood, soil, stone, grass;
  CREATURES.md 3.2) with bump relief, clay colours. The town outside the fence has its own architecture kit: Lambert
  materials coloured by vertex colours over nine grey textures tiled in world space, every piece merged with the others
  of its material into a few large meshes (`BIN`, `put`, `mergeBin` in 3.15.44; one mesh per material, split by area
  above 12,000 triangles).
- **When it is built.** The boot builds the Garden, the Library, the pond, the clouds and the mist bank, the telephone
  and the Portal in slices of their own (`__gtY("garden")`, `"kiosks"`, `"pond"`, `"clouds"`, `"library"`,
  `"portal"`), then everything else in one pass just before the townsfolk are placed (`swapWorld` in 3.15.44, logged
  as "jgp-world" if it fails): the ground and the streets, the outer town, the fence, the four kiosks, the church, the
  juice bar and the dance floor, the trees and the grass.
- **Seeded.** The town draws its choices from one fixed generator (seed `20250101`: which windows are dark, where the
  trees, grass tufts and pond stones go) and each painter from its own seeded stream (the Garden's ground, the mist,
  the clouds, the stars, each kiosk's dressing), so the town is the same on every launch (FIXES R1, R5; RULES.md 5).
  Only play stays random: where Blossoms and Flint spawn, where townsfolk wander.

### The house style

What the environment has in common, as built:

- **A storybook town round a park.** A fenced park with a round Garden at its heart and small kiosk stands round it;
  outside the fence, streets and a whole town of shops, houses and civic buildings. Everything the player can reach is
  inside the fence (FIXES A4); the town outside is scenery, seen across the street and never entered.
- **Grey textures, coloured parts.** As with the creatures ("Texture is relief, not pattern"), the surfaces are
  painted in greys (brick, clapboard, shingles, stone, planks, concrete, asphalt, corrugated metal) and take their
  colour from the part, so one texture serves every wall of its kind and the palette lives in the code's colour lists.
- **Light painted in.** There are no shadows (the shadow map is switched off). Shade is baked into vertex colours:
  textured walls darken toward their foot (to 0.8 at the ground, full brightness from 5 m up), tree crowns are lighter
  on top and darker underneath, the sky is a vertex-coloured gradient.
- **Pictures over words.** Kiosk signs are cream boards with a bold serif name. The outer town's shops carry wordless
  pictograms (balance scales, gold scrolls, sprouting pots, a winged cone, VHS tapes, a television and a wrench, a
  family tree, a glyph tile) and big objects on their roofs (crystals, a carrot, a milkshake, an ice-cream cone, a
  giant Blossom, tentacles). Only a few signs have words: the kiosks' names, FIRST BANK OF GREEBLIS, Mistergummery's,
  Gemtoe's Gazebo, JUICE BAR, TELEPHONE, MENU, STOP, King Dino's billboard and its banner, the WANTED posters.
- **The cast lives in the colours.** The outer town repeats the townsfolk's signature colours and belongings: a row
  of houses each in one character's colours, shops built round their trades, a water tower in Mama Gorbo's peach.
  *(inference: no building is labelled with a name; the matches are colour for colour, below.)*
- **Faceted nature, smooth people.** Tree crowns, rocks, pebbles and flint are polyhedra (icosahedra and
  dodecahedra) whose faces shade flat, so nature reads as cut facets beside the smooth, clay-like characters.
- **Iron, cream and stone as the frame.** Dark iron (`#1e2226`) for the fence, lamp posts, railings and balconies;
  cream-white (`#f6f2e8`, `#f6f4ee`, `#f4f0e6`, `#efe6d2`) for kiosk posts, trims, porches and picket fences; pale
  stone (`#e2d8c2`, `#e6dcc6`) for the bank, the courthouse and the church's trim.
- **Always day.** The sun never sets. The only dusk is the Speech, when the world dims to 70% of night (below); the
  Event is in daylight (the author: it is never night during the Event).
- **Built for a headset.** Pieces that meet overlap by a centimetre or two so no seam sparkles (FIXES F-B47, B21;
  `test_seams.js`); the fence turns into a smooth drawn pattern far away; the view fades to black if the head goes
  into a wall (`JGP.headGuard`: from 0.2 m out, fully dark at 0.08 m); the mist is a soft grey, not white (the author,
  A9: "too bright to be comfortably looked at for users in VR").

### The layout

The park is a rectangle 75.2 m by 87.2 m (x -37.6 to 37.6, z -37.6 to 49.6: `parkHalf`, `parkSouth`), with the
Garden at the origin. Inside it:

| Place | Where (x, z) | Notes |
| --- | --- | --- |
| The Garden and the Summoning Pillar | 0, 0 | 15 m round (`GARDEN_R`); a concrete ring walk from 16.6 to 18.4 m (`"ringwalk"`). |
| POST OFFICE / SHERIFF'S | 28.1, -19.8 / 19.8, -28.1 | A pair on the south-east diagonal, 5.9 m either side of it. |
| GARDEN SUPPLIES (Zollod) | 27.5, 34.5 | On the north-east diagonal. |
| The LIBRARY (Sparkakus) | -24.75, -24.75 | On the south-west diagonal; open to the sky. |
| GOOWARD'S GALLERY | 31, 14.5 | East, with its own walk. |
| The church (the Ancient; the Cave inside) | 0, 30.4 | On the north axis, its back 1.2 m from the north fence. |
| JUICE BAR (Fortizmo) | -34, -9.45 to 9.45 | Along the west fence; King Dino's drums at -36.35, 19.2. |
| The dance floor | -33.1 to -21.1, -9.6 to 28.8 | Beside the bar. |
| The pond | 29.6, -2.6 | East of the Garden; Backpacka drinks here. |
| Gemtoe's Gazebo | 5, -31 | South. |
| The Portal | near -9.4, -29.6 | The first clear spot within 8 m of that point, facing the centre. |
| The TELEPHONE | -7.2, 23.9 | Beside the church walk. |
| The player's spawn | -36.3, -20 | At the west fence. |

- **Rings and axes.** The Garden is the centre; the ring walk circles it; the Post Office pair, Garden Supplies and the
  Library sit on three of the four diagonals (the kiosks marked 18.2 m out on their diagonal, then set 18.17 or 19.3 m
  back from the park's corner along the line to it); the church sits on the north axis, the Gallery off to the east.
  Walks 2.6 m wide (concrete `#a8a296`) radiate from the ring walk to the Post Office pair (with a 14.4 m cross-walk
  along its fronts), to Garden Supplies, to the Library, to the Gallery and to the church steps. The Garden's four
  stepping-stone paths point the same diagonal ways.
- **The lawn.** The park's lawn is mown in 26 stripes 2.92 m wide, alternating `#4a7a2c` and `#3f6c26` (the grass
  texture tiled every 4 m), over the town's ground plane.
- **What fills the gaps.** 1,750 grass tufts (nine blades each, in four greens: `#5f9a32`, `#6faa3a`, `#4f8a2a`,
  `#7ab842`), every sixth with a tiny white or yellow five-petal flower, scattered by the seeded generator anywhere in
  the park except the Garden (15.8 m), the walks, the dance floor, inside buildings and within 3.4 m of the key
  spots; two big park trees beside the church: (-16, 37), where the robin perches, and (-24.5, 34.5), to its right
  from the Garden, where the cardinal perches (4.0.4, A37, A38); the robin's old tree at -17, -34 went in 4.0.3, A30,
  and the one behind the Sheriff's and the Post Office at 31, -33.5 in 4.0.4, A31.
- **The fence.** Black iron railings 1.04 m high round the whole park, with no gate: square pickets 7 cm wide every
  0.32 m on two rails (0.18 and 0.9 m up), a post every 3.2 m with a pyramid cap, and brick pillars (`#9a4a36`, 1.3 m,
  stone caps, iron balls) at the four corners and the middle of the north side. Beyond 18-28 m the modelled pickets
  fade out and a flat strip draws the same bars and rails as a pattern, averaged over each pixel
  (`GB_FENCE_FAR`) *(inference: so that far railings do not shimmer)*.

Outside the fence:

- **Streets.** Asphalt (`#252528`) roads 8 m wide and 640 m long at z -45 and 57 and at x ±45, with yellow centre
  dashes (3 m every 9 m), concrete sidewalks 3 m wide on both sides, sandy verges, zebra crossings at the four corners,
  STOP signs at three of them, and iron lamp posts (4 m poles, cream globe lamps 4.7 m up) every 15 m along the
  sidewalks round the park, with pink flower baskets on the east side and a second row at x ±50.6 (small marquee
  boards hang from the east ones). A red fire hydrant and a blue mailbox stand on the north sidewalk by the church, six
  paw prints cross the south-west sidewalk, and four goo puddles (cyan, pink, purple, lime) lie at the south-east
  corner.
- **The shop rows** stand at x ±52.6, each filling z -37 to 49 (the park's length) with seven buildings facing the
  park across the street; **eight houses** face it from the north (z 72); **the civic row** stands to the south
  (z -58 to -64); **landmarks** stand further out (a water tower, a burger on a pole, a billboard, glasshouses).
  66 trees are scattered by the seeded generator within 100 m, off the streets and the buildings' footprints.
- **The ground.** One plane 640 m square, finer near the town (5 m cells out to 160 m, 40 m beyond), its vertex colours
  mottled between `#4a7a2c` and `#3e6a26` out to 140 m and olive (`#7a8a4c`) beyond, under the KIT grass texture
  tiled every 5.8 m. The fog and the sky's horizon share one colour, so the land fades into the sky without a line.
- **The painting's town** *(inference)*. The miniature town on the horizon of Gooward's painting ("The gallery
  painting" above: a bank, a barber's, a tower, a greenhouse, a lightning bolt, the courthouse, a marquee, televisions,
  a milkshake, an ice-cream cone, "avarice", a family tree, a weather vane, the church) is this outer town, building
  for building (below).

### Architecture

#### The park's kiosks and stands

- **The kiosk** (`kioskFrame` in 3.15.44): a plank deck 6.4 x 5 m and 0.2 m thick; a back wall 3.3 m high (with 11
  battens) and two half walls 1 m high, all of the `wood` surface in the kiosk's colours; white corner posts 3.4 m
  tall; wooden gable triangles at the sides; a two-slope roof of corrugated tin (a sine-striped painted texture) under
  a white ridge cap 4.7 m up; the sign board (4.3 x 1.05 m) on two posts above the ridge, 5.55 m up; a counter 3.8 m
  wide and 1.12 m high with a crate top, and crates either side.
- **Their colours and dressing:**

| Kiosk | Walls / ink | Tin roof | Dressing |
| --- | --- | --- | --- |
| POST OFFICE | blue `#33508f` / navy `#22325a` | pink `#e276a0` | A mound of 2,300 letters behind the counter (seven paper tints, some stamped red or blue) on which Somlet sleeps; a 6 x 4 pigeonhole wall full of letters; parcels in kraft paper. |
| SHERIFF'S | brown `#8a5a3a` / `#6a3a1a` | red `#b82822` with nine white spots per slope: a mushroom cap | Taller by 1 m; the desk 1.545 m up with Mushroom's wooden ramp at its left end (1.77 m wide, A13; F-B39); a gold six-point star on the back wall; WANTED posters; clusters of toadstools on the corners and the counter, two big red ones in front, a giant one at the side, twelve more on the roof (A14); an orange flag with a red mushroom emblem 10.5 m up. |
| GARDEN SUPPLIES | green `#6f8f5a` / `#2f5a2a` | rust `#a85c3a` | Potted plants, seed trays, two glass jars each holding a strange rooted specimen; one hanging basket at the player's left of the front (the right one went in 4.0.22-4.0.23, A46 and A49: Zollod clipped into it leaving). |
| GOOWARD'S GALLERY | cream `#e8e0cc` / plum `#3a2a5a` | purple `#584284` | Wider (8.4 m) and taller by 1 m, no counter; the painting in its gold frame; paint cans in five colours, some tipped over; 58 paint splats on the floor; brushes; two easels with small landscapes. |

- **The Library** (`buildLibrary`): open to the sky, no walls or roof: eight bookcases on a large Persian rug
  (11 x 7.8 m; paisleys in red `#8a1822`, navy, gold and teal, with a fringe), and a LIBRARY board on two white posts
  4.3 m high.
  - *The bookcases*: each 2.24 m wide, 2.13 m tall and about 0.6 m deep, in brown wood (`#6a4424`, a darker
    `#4a2e18` base and back), with four shelves (0.12, 0.62, 1.12 and 1.62 m up) filled from both faces. Four stand
    in two pairs in the middle of the rug, two more at each end turned crosswise.
  - *The books*: drawn by a seeded stream, 6-14 cm thick and 32-44 cm tall, in ten cloth colours (wine, blue, green,
    gold, purple, rust, navy, cream, brown, tan); about one in fourteen leans over, and four in ten carry a gilt band.
    The eight face-out covers ("The Library's books" above) are painted cloth boards with a double ruled border, the
    title in bold Georgia and a simple line emblem in the ink colour: WORKS OF PATCHOOLEE green with lime ink (a
    screen on a stand), ADVENTURES OF APPTERIX red with gold (a domed saucer over a wavy line), SONGS OF ORSON navy
    with gold (two notes over a small box), STAPLERS grey with dark ink and no emblem ("by Walter Bigsby"), RANGER
    BOBERT green with cream (a pine tree under a ranger's hat), Zortoe's Home Cooking orange (a bowl), Traveler's
    Truth navy (an outlined triangle with a line down its middle), and OVERCOMING SHYNESS pink (`#e8b8c8`) with plum
    ink, "OVERCOMING" on a cream band, a little larger than the rest. *(The emblems' readings are descriptions of the
    drawn shapes, not stated by the game.)*
  - *The three curios on the shelves*: the wish Blossom, a terracotta pot with a green stem and leaf and a glowing
    teal crystal that spins inside a pale teal ring bobbing round it; the electric Blossom, six yellow petals round a
    pale cyan core on a silver stand, spinning, with a yellow ring bobbing round it; and an acorn, brown with a dark
    cap, a stalk and a small glint, tipped on its side.
  - *The Speech's props*: the giant light bulb over Sparkakus ("Light, time of day and atmosphere" below), and the Eye
    being made: a white glue bottle with a red "GLUE" label and an orange nozzle rises and turns over while the three
    teal gem pieces circle beneath it, glue drips fall, the pieces close into one, and the finished Eye spins and
    flies to the player (`ARTS.assemble`).
- **The juice bar** (`buildJuiceBar`): an 18 m counter along the west fence, with a gap 2.2 m wide to walk in (A17);
  shelves of bottles behind it; fruit everywhere (oranges, apples, lemons, limes, pineapples, bananas, watermelons) in
  crates and bowls; juice cups; and a JUICE BAR sign 8.1 x 1.4 m (white letters outlined red on a yellow-to-orange
  board with orange and lime slices) on two posts, with a giant orange, lemon and strawberry on top. In more detail:
  a plank floor under the whole bar; two counter runs (the gap between them) 0.98 m high with a pale wood top, a
  chrome edge and a chrome foot rail, round ends, and a front of vertical slats in orange, yellow, lime, pink and
  purple, the colour changing every 1.12 m; chrome stools with seats in the same colours every 1.6 m along the front
  (none in the gap); juice glasses with striped straws and a fruit slice; white and blue fruit bowls; a pineapple and
  a bunch of five bananas on the counter; behind it a back counter with cream panels, two blender-like jars with
  chrome lids and a pink jar on a blue base, and a back wall 2.1 m high with posts every 3 m and two shelves (1.65 and
  2.4 m) of bottles in seven colours.
- **King Dino's drum kit** (at -34.8, 19.2, at the bar's north end, facing east, built at 1.35 times size): a bass
  drum 1 m across with a red shell (`#c23b3b`), cream heads and silver hoops, its front head lettered "KING DINO" in
  red-orange on cream; two rack toms, a snare and a floor tom in the same red; a gold hi-hat and a gold ride cymbal
  (`#d8a93a`) on silver stands; all on a round rug of two dark red discs (`#5e2222` under `#7e3628`). It plays itself
  in time with King Dino's jazz (104 beats a minute; 88 in the Event): each drum hit swells and squashes the drum it
  falls on, the hi-hat dips and the cymbal rocks (`JGP.jazz`).
- **The dance floor**: 10 x 32 tiles of 1.2 m (12 x 38.4 m), dark purple (`#24103c` on `#12081f` grout, a lighter
  top-left edge), slightly glossy: a night-club floor set into the daylight park.
- **Gemtoe's Gazebo**: an octagon 7.6 m across, white posts and rails (open on one side: its doorway, open to anyone; the railed sides solid walls since 3.15.67), a plank floor, a green
  shingle roof with a cupola and a gold ball 7.4 m up, the "Gemtoe's Gazebo" board (gold letters on plum, a teal edge)
  and seven stacks of gold coins on the floor.
- **The TELEPHONE**: an aluminium booth 1 m square and 2.2 m tall with glass on three sides, a payphone (keypad,
  handset on a coiled cord), "TELEPHONE" in white on blue (`#1c3c8c`) on all four sides of its crown, and a beacon on
  top. It stands on a pale concrete pad 1.2 m square; the fourth side is a two-leaf folding glass door; the glass is a
  faint blue, barely there (22%); a shelf under the payphone holds a yellow phone book. The crown's letters glow a
  little by day and more at dusk. When the player calls, the handset lifts off its hook and settles back over 2.4 s.
- **The Portal**: two grey stone piers (0.85 m square, 3.7 m) under a 5.2 m lintel, with cyan indicator tiles
  (`#35e0f0`). When it opens, a swirling disc grows in the arch (pale cyan to deep blue, white spiral arms, rings rising
  outward) with a blue light (`#3aa8ff`, 11 m). It opens in 0.75 s, overshooting a little before it settles, and
  closes in 0.5 s, each with a short run of notes.

#### The outer town's kit

The town outside is made from a handful of builders that share proportions, so the shop rows read as one main street:

- **Placing.** Each building is placed at a point and turned to face the park centre or the street (`place`,
  `faceIn` in 3.15.44).
- **The storefront** (`storefront`): a dark plinth; display windows split by mullions about every 1.7 m; a central door
  1.3 x 2.4 m of planks with a glass panel and a brass knob; a transom; a sign band 1 m high, 4.08 m up (a painted
  pictogram, tiles or plain); and, on some, a striped awning (16 stripes with a shadow at the foot; red `#c8282e`,
  green, blue, yellow, pink or brown, each with cream).
- **The store block** (`STORE`): a box 14 m deep (brick, or clapboard, or stone), 7-12.5 m tall, with a dark parapet
  cap, corner piers, the storefront, upper windows from 5.3 m up (one per 2.3 m of width; a second row 3.2 m higher on
  blocks 11.5 m or taller), a cornice, and on some a raised crest in the middle of the parapet.
- **The false front** (`FRONTIER`): a full-height clapboard facade before a lower body (2.6 m lower) under a shingle
  gable roof; white corner boards, a small raised centre, shuttered windows 5.2 m up.
- **Windows** (`win`): a glass pane in a frame of sill, head and jambs in the trim colour, with a stone lintel or
  shutters on some. Each is either "lit" (glows warm at dusk) or "dark" (glossy, never lit); the seeded generator makes
  30-50% of them dark, depending on the builder.
- **Gables** are triangular prisms (`"prismgable"`): two shingle slopes and two ends in the wall's material. Since
  3.15.57 every gable is as wide as its roof, reaches 4 cm down over its wall and stands 1 cm proud of it, on every
  builder that has one and the church (F-B47: the author saw "a slight flicker" where "the wall meets the triangle of
  the roof" on the outer-ring houses).
- **The houses** (`HOUSE`): a concrete base 0.7 m; a clapboard body 10 m (or 9 m) wide and 9 m deep with 5.7 m of
  wall, under a shingle gable 3.2 m high (the ridge 9.6 m up); white corner boards (`#f6f4ee`); a door in a white
  surround; two shuttered windows below and three above, more on the sides; a porch 2.6 m deep on four posts with
  railings and three steps; a brick chimney (`#9a4a3a`); a white picket fence 7 m in front with a gap for the gate, a
  front walk, a mailbox on a post and two shrubs.

#### The outer-ring houses

The eight houses on the north side differ in their colours, roofs, porches and yards, and each pair of colours is a
townsperson's (the signature colours in CREATURES.md section 1) *(inference: whose house is whose is not stated)*:

| x | Walls / roof / door / shutters | Porch and yard | Whose *(inference)* |
| --- | --- | --- | --- |
| -82 | yellow `#f2d84a` / teal / teal `#38b8b0` / teal | A teal crown on the roof; a red drum and a gold cymbal; three stacks of gold coins; a mug of carrot juice | King Dino |
| -64 | blue `#2c4cc0` / navy / yellow `#f2c21a` / pink | A band of painted vines; daffodils; a reading chair with an open book; a bone; a pile of books | Sparkakus |
| -16 | green `#8ab86a` / green / orange `#e8742a` / green | A little pond; a carrot bed; a brass horn; a board of tally marks; a ramp up to the porch; a jar | Fortizmo (her orange, her horn, carrots for carrot juice; the tallies a bar tab and the ramp for her wheels), or, for the garden, Zollod |
| 0 | cream `#f2e4b4` / plum / navy `#22325a` / plum | A hammock on the porch; cream puffs instead of shrubs; letters scattered on the lawn | Somlet |
| 16 | peach `#ffb486` / brown / pink `#e8409e` / cyan `#36d0e8` | Goo dripping from the porch roof in cyan, pink, purple and lime; goo puddles; two porthole windows | Mama Gorbo and Gooward |
| 32 | cream `#f6eed4` / an orange, white-spotted mushroom cap / orange `#e8862a` / orange | Toadstools in the yard; a telescope; a sheriff's star over the door | Mushroom |
| 66 | grey `#c8ccd2` / grey / magenta `#c010c0` / cyan `#2fd4e6` | An aerial; a magenta screen in the gable; a coil of cable | Anomalee |
| 84 | teal `#55b8c6` / dark grey / orange `#e2521f` / green-black `#1d2a23` | Porch columns of stacked flowerpots; a stack of VHS tapes; an aerial | Montgummery |

#### The rest of the town

| Where (x, z) | 3.15.44 name | What it is and how it looks |
| --- | --- | --- |
| 65, -27 | `MISTERGUMMERYS` | A drive-in diner: a red and cream building 13 x 9 m under a red mansard roof with a teal band, two "Mistergummery's" signs, teal double arches 12 m high, a parking lot with teal bollards, a MENU board, a drive-through speaker, two umbrella tables and a little playground. *(inference: named after Montgummery)* |
| 52.6, -10.8 | `STORE` | Crimson (`#8a2a2a`) with gold lintels and iron bars over its windows, gold balance scales on its band, purple crystals on the parapet and a bracket sign with a purple gem. *(inference: Gemtoe's; the painting's "avarice")* |
| 52.6, -0.5 | `FRONTIER` | A barber's: pale blue, navy, a barber's pole. |
| 52.6, 9.8 | `STORE` | A theatre: a marquee with 28 bulbs whose bill shows a purple-to-orange plume, a teal crown, crossed drumsticks and a yellow dinosaur head; a tall sign with four stars; a searchlight on the roof. *(inference: billing King Dino)* |
| 52.6, 21.2 | `STORE` | A giant goo milkshake on the roof (cream cup, pink whip, a cyan cherry, a straw, four coloured drips). |
| 52.6, 32 | `STORE` | Blue, navy and gold: gold scrolls set with teal and pink gems, a purple glyph tile, plates along the front, three-clawed prints on the pavement. *(inference: Glyph's)* |
| 52.6, 43.3 | `STORE` | Terracotta with a blue door (`#2c4cc0`): a family tree in a gold ring, daffodil planters. *(inference: Sparkakus's genealogical society; the painting's "lineage")* |
| -52.6, 42 | `BANK` | FIRST BANK OF GREEBLIS (kept by Gemtoe): pale stone, steps, four columns 6.6 m tall, an entablature with its name, a pediment. |
| -52.6, 28.1 | `STORE` | A greengrocer: crates of produce with Blossom labels, a giant carrot on the roof, a teal watering can. |
| -52.6, 15.9 | `FRONTIER` | Ice cream: butter yellow, pink awning and shutters, a winged cone on its band, a three-scoop cone on the roof. |
| -52.6, 3.7 | `STORE` | Grey-blue stone, mint trim (`#9ee09a`), blue lintels: etched tiles, a green gem, purple tentacle sculptures on the parapet, etched tablets and a chisel at the door. *(inference: Etcher's)* |
| -52.6, -8.5 | `STORE` | Brown: a stone sphinx lying at the door, its two eyes unlike (one dark, one plain stone), and an urn. *(inference: a curio shop, and the Great Sphinx with its missing Eye)* |
| -52.6, -20.1 | `FRONTIER` | A florist: green with red shutters, a giant Blossom on the roof, Blossom beds. |
| -52.6, -31.8 | `STORE` | TV repair: a television and a wrench on its band, an aerial, three stacked televisions with magenta screens, a workbench. |
| 0, -62 | `COURTHOUSE` | Brick (`#a8503a`), 28 x 20 x 12.5 m, stone bands, a portico of four 9 m columns under a pediment, hedges, flower beds and a topiary dinosaur; a clock tower with four faces (Roman numerals, hands at about six past ten) and a green dome (`#5aa890`) with a gold ball 29.9 m up, the tallest point in town. |
| 29, -58 | `FIRE_STATION` | Brick (`#b04a32`): one closed bay door, one open bay with a red fire engine, a 14 m hose tower with a siren and a weather vane (a compass cross and a teal, long-necked, winged figure). |
| 43, -62 | `HOTEL` | Buff brick, two iron balconies, a wooden water tank on the roof, a brass luggage trolley. |
| -22, -64.5 | `SCHOOL` | Red clapboard (`#a8382e`), a cupola with a bell, a swing set, and the town mural on its side (below). |
| 72, -62 | `GAS_STATION` | White with a teal band (`#55b8c6`), two pumps with cyan lamps, a lightning-bolt sign. *(inference: an electric charging station)* |
| 56, -60 | `STORE` | VHS tapes on its band (the last one bitten), a VHS tape and a screen with Montgummery's face on the roof, a return box. *(inference: a video shop)* |
| -70, -38 / -70, -55 | `STORE` | A pink ice-cream parlour (a cone and sundae glasses on its front, a giant three-scoop cone on the roof); a maroon block with five iron balconies, a roof tank and a luggage trolley *(inference: an inn)*. |
| 84, -4 | `WATER_TOWER` | 20 m steel legs; a peach tank (`#ff9f5c`, Mama Gorbo's colour) with a lime band, a lime goo ring and goo drips in cyan, magenta, purple and green. |
| 78, -38 | `GOOBURGER` | A giant burger on a 10 m pole. *(inference: Mama Gorbo's Gooburger, as a roadside sign)* |
| -55, -55 | `BILLBOARD` | King Dino's billboard (below). |
| -33.5, 73.5 | `FIELD_OFFICE` | A grey trailer with a sheriff's star and a flying saucer on its front, and a satellite dish on a 12 m mast. (Hennrick's office in the far past, the author.) |
| -29, 85 | (none) | A dark ring 7.4 m across, roped off by orange stakes and yellow tape, with two floodlights. *(inference: a UFO landing site)* |
| 15, 94 / 40, 96 | `NURSERY` / (none) | Two glasshouses, each with a giant flower (about 9 m and 18 m tall) growing up through its roof; the nursery's roof has broken panes round the stem, potted plants at its door and a potting bench. |
| -33, 96 | (none) | Six purple crystals 2.2-5.2 m tall inside a ring of posts and wire, a sign with a gold padlock. |

### Materials, palette and surfaces

- **The outer town's materials** (`BIN`): each a grey canvas tiled in world space every so many metres; "shaded" ones
  darken toward the ground:

| Material | What is painted | Tile | Shaded |
| --- | --- | --- | --- |
| lawn | the KIT grass texture | 4 m | no |
| concrete | speckle, a joint line on two edges | 1.6 m | no |
| asphalt | speckle and a few cracks | 6 m | no |
| brick | eight rows of offset bricks | 1.3 m | yes |
| siding | eight clapboards, each a gradient with a shadow line | 1.8 m | yes |
| shingle | eight rows of offset shingles | 1.6 m | no |
| stone | four rows of offset blocks | 2 m | yes |
| boards | eight planks with grain | 2.2 m | yes |
| metal | sine stripes (corrugated) | 1.4 m | yes |

  Untextured parts are `plain` (and `trim`, `mark` for road paint), `glass` and `lit` (glossy Phong, shininess 90),
  `lamp` (globes that glow at dusk), and the sign materials, which all read one 2048 x 2048 sign atlas.
- **The sign atlas** ("sign atlas overflow" if it ever fills): 38 pictures painted once at load: the shop
  bands, the awnings, the clock face, the marquee bill, the billboard and its banner, the school mural, the STOP sign,
  the MENU board, the gazebo's board and more. Lettering is bold Georgia (serif) or bold Trebuchet (sans); kiosk boards
  are cream (`#f6f0dc`) with a border and a drop-shadowed name in the kiosk's ink. Three pictures in it are painted but
  not placed anywhere (a seal, a gold star and a weather vane).
- **Inside the park**, surfaces are the creatures' own: `KIT.surf` wood for the kiosks (deck `#a8865c`, crates
  `#c8a070`), soil, stone and moss for the Garden, grass and soil for the pond's banks, clay for the rest.
- **Painted pictures elsewhere**: the church's stained glass, the Garden's ground, the Library's rug, the juice bar's
  sign, the WANTED posters, the Portal's swirl, the mist, Gooward's painting, the Cave floor.
- **The palette.** Greens for the land (`#4a7a2c`, `#3e6a26`, `#3f6c26`), warm clay and brick reds for buildings
  (`#a8503a`, `#b04a32`, `#8a2a2a`), pastels for houses and shops, dark iron, cream trims and pale stone as the frame,
  and the cast's signature colours as accents. The sky runs from `#d6e6ef` at the horizon to `#3f86d6` overhead.

### Nature and set dressing

- **Trees** (`tree`, `crownGeo`): a tapered trunk (`#5a4632`) under a crown of noise-displaced icosahedra in one of four
  pairs of greens (`#3f7a2a`/`#4a862e`, `#36692a`/`#427630`, `#4a8232`/`#548c36`, `#557a2a`/`#5f862e`), with three
  smaller crowns round the main one on near trees. Three shapes: round (trunk 3.8 m, about 9 m tall at size 1), broad
  and spreading (3.2 m, about 7.4 m), tall and narrow (5.2 m, about 13 m); sizes 0.9-1.5. Trees beyond 80 m are built
  coarser.
- **Grass and flowers**: the park's tufts and tiny flowers (above); beds of five-petal flowers in pink, yellow, purple,
  cyan and red in front of the courthouse; daffodil planters (the family-tree shop, the blue house); beds of red and
  orange Blossoms at the florist's.
- **Rocks and pebbles**: 20 stones round the pond, painted flat on its bank in three greys (A23; dodecahedra until 3.15.67); the Garden's painted stones and rocks;
  about 1,360 small stones in the Cave; the 40 flint pickups (dark faceted stones with a glint).
- **Mushrooms**: on and round the Sheriff's kiosk, round Mushroom's house and as its roof.
- **The pond** (`buildPond`): a grass rim 4.9 m round, a soil bank 4.1 m, and still water 3.7 m round: a plain water
  texture, deep teal in the middle and lighter at the rim, with short wave streaks and a few glints, low shine; nothing
  on it moves (A33, 4.0.4; its bobbing, colour pulse, drifting rings and ripples, A21, were removed at the author's
  word).
- **Blossoms**: the 32 pickups, each a stem with leaves and a flower of seven red, five orange and three gold petals
  with a soft orange halo. A taken Blossom or flint fades out where it lies, keeping its place and size, and a
  regrowing one fades in the same way (A56, 4.0.36: "I want the Blossoms and Flint to fade out in place, not move
  towards the player in any way"); taking one makes no sound (A59).
- **Clouds** (`gcRnd("clouds")`): twenty-four (seven until 3.15.68, A24; fourteen until 4.0.35, A55), each three to five white spheres (white with a
  light grey underside, a soft glow against the ground light's green, dimmed at night: A25) (3-5.5 m, flattened to 0.62) circling the
  town 40-95 m out and 50-72 m up, a full circle every 12-26 minutes.
- **The sky**: a dome 263 m in radius that follows the camera, coloured from the horizon (`#d6e6ef`) to the zenith
  (`#3f86d6`); below the horizon it stays horizon-coloured. A sun disc (`#fff6c8`) with a soft glow sits 58 degrees up
  in the north-east, exactly where the sunlight comes from.
- **Stars** (`gcRnd("stars")`): 700 points at least 4.6 degrees above the horizon, white, 1.6 px; they show only as
  the world dims.
- **The UFO** (`JGP.ufoNow`): a chrome saucer about 8 m across with 18 rim bulbs cycling red, yellow and cyan, a glass
  dome and Ollaag inside (until 4.0.43 a green alien); every 600 s it crosses the sky 35-48 m up, hovers and leaves. None starts during the
  Event (A6).
- **What is seeded** (the same on every launch): textures, windows, trees, tufts, pond stones, the Garden's ground, the
  Cave's stones, the kiosks' dressing, clouds, stars, the mist. **What is random** by the author's word: where Blossoms
  and Flint appear and which way flint lies, the townsfolk's wandering (RULES.md 5).

### Light, time of day and atmosphere

- **The lights**: a sky light (hemisphere, `#eaf6ff` from above, `#6e8b4a` from the ground, 0.85), a warm sun
  (`#fff1d6`, 0.95, from up and north-east) and a cool fill (`#bfe2ef`, 0.22, from the opposite side). No shadows.
- **Fog**: the horizon colour, from 70 m to 300 m (a smooth ramp, not linear); the view ends at 310 m.
- **Dusk** (`I.setNight`): the game can blend everything toward night: the sky to `#070b24` overhead and `#1c2350` at
  the horizon (the fog with it), the lights to blue moonlight (`#9fb4ff`, 0.28) and a dim sky light, the sun hidden,
  the stars shown. As it dims, the lit windows glow warm, the lamp globes glow, the church's stained glass brightens
  (from 0.32 to 1.07 of its own light) and the TELEPHONE sign lights up. Only the Speech uses it: a giant light bulb
  appears over Sparkakus with a cone of light and a warm lamp (`#fff0c8`), and the world dims to 70% of night
  (`Bulb.start`), then brightens again.
- **The Event's mist bank** (3.15.54 on; `gcRnd("mist")`, `"gcMist"`): four bands of mist 1.5, 5, 10 and 16 m outside
  the fence, 22-34 m tall, drifting sideways at different speeds, dense at the ground and thinning upward, painted
  from 260 soft blobs. It rolls in over 30 s from 1.6 times the fence's size (A16; it was 6 s, then 15 s), stays for
  the 190 s of planting (A9) and rolls out over 30 s. Its colour is 90% of the fog colour, a soft grey (A12; 80% in A9
  was "too dark to the eye"). Everything standing beyond the fence is misted by where it stands, not by how far away the
  player is (A9), fully from 1.5 m past the fence, where the first band stands and fades in over its bottom 0.45 m
  (A19), and less with height above 18-30 m. Inside the fence nothing changes: "trees inside the fence and the church
  inside the fence should not be hidden by fog" (the author, A4); that is the fog only: the fade groups below
  fade every tree on purpose.
- **What else the Event changes**: the clouds and every Blossom and Flint fade out over 2.5 s and back in at the end
  (A5); small objects more than 26 m from the centre are hidden the same way; a UFO in flight leaves by its exit path
  (A6). Nothing pops in or out (the author, A5: "Nothing should ever appear to pop out or pop in"). The pond is never
  among them (F-B64).
- **The fade groups** (P33, RULES.md 26): once the mist is up, each kiosk, the gazebo ("count the Gazebo as a kiosk
  as well. In all regards", the author), the phone booth and the Portal (A27), the park's trees with the robin and the
  cardinal, and the town's trees fade out over 10 s and stay out until the Event ends, then fade back over 10 s; never
  the church and Cave, the Ancient, Somlet, the pond or the Garden. In an Event without the Seeds only the town's
  trees fade (F-B72: "If the user starts the Event without having completed 'Seeds', kiosks should NOT fade out").
  The kiosk groups are the buildings of the game's registry other than the church: the Post Office, the Sheriff's,
  Garden Supplies, the Gallery, the Library (the registry's `shop`) and the juice bar (the drum kit and the dance
  floor stay). A kiosk waits
  for its keeper to leave home before it fades; once out it stays out until the Event ends, even if
  the player walks up to it (A26: "Just keep everything faded out until things fade back in. I don't care if there is
  invisible collision"). The Portal's swirl and light fade with the Portal; while Nextessa's trip through it is under
  way the Portal does not start to fade, and a fade under way returns to full if she comes through (the author,
  4.0.38: "If Nextessa has passed through the Portal, do not fade it early, until she has passed back out of the
  Portal").

### Special places

#### The Garden and the Summoning Pillar

- **The ground** (`JGP.buildGarden`): a soil disc 15 m round (`#5a3e26`) at 0.02 m and, over it, one painted overlay
  15.9 m round (2048 px, `gcRnd("gardenGround")`): six furrow rings every 2 m from 2.6 to 12.6 m out (dark grooves
  and a brown ridge flecked with crumbs), four stepping-stone paths of 12 stones each on the diagonals, and a ring of 72
  rocks at 15.15 m, every fourth one mossy green. It is flat for everyone: until 3.15.62 the rings, stones and rocks
  were objects the townsfolk climbed over and jittered on (F-B57; the author: "Flatten the ground of the Garden and
  lower the ring of rocks into the ground", "make the superfluous Garden rocks and inner rings into ground textures",
  then "regardless of anything else we will be keeping the flat version").
- **The Summoning Pillar** (`summoningStone` in 3.15.44): a six-sided stone pillar 2.3 m tall in purple-grey
  (`#6f6a78`) with a pointed cap, on a ten-sided stone plinth and a moss step. Three of its faces are carved with five
  lines of rune strokes in cyan (`#7ff0ff`): dim (12%) until the Summoning Stone wakes them, then pulsing; full and
  whitened while the Event runs.

#### The Event's staging

- The townsfolk take places on three rings round the pillar (3.5 m for four of them, 7.5 m for six, 11.5 m for the
  rest), off the stepping-stone paths. Each plants a flower at 0.015 m: five kinds of wild plant built leaf by leaf
  (their parts are named after thistle, mallow, chicory and others), scaled up 3.2 times and 3.68 upward (15%
  taller, A20), each with more open blooms of its own kind (A28: the thistle 5 more heads, the mayweed 8 more daisies,
  the chicory 4 more flowers, the milkweed two more umbels, the mallow three more flowers). Every plant's flowers take a
  random colour of its own, drawn anew each Event (A29); the stems, leaves, buds and the mayweed's yellow centres keep
  theirs. In a later Event the old flowers fade away (A58), take their new colour and grow back when watered (F-B43).
- With the Snacks, pizza boxes stand in eight stacks round the Garden, fading in as the Event starts (A51) and out at
  its end (A42); Anomalee eats from her own open box instead of planting (F-B49). Without the Snacks there is no box
  and she plants.
- With the Seeds, all but King Dino and Somlet take places (Sparkakus too); Fortizmo stands at the Garden's west edge
  and plays rather than planting. Without them nobody gathers.
- Fortizmo plays her horn; King Dino's drums slow to 88 beats a minute; Backpacka drinks at the pond, sprays the
  Garden and leaves low over the north-west fence into the mist (A7); the mist bank closes round the town.
- **Backpacka's water** (the environment's side of his show): while he drinks, three pale rings (`#e8f6ff`) spread
  across the pond from his mouth, growing from 0.2 to 1.8 m and fading as they go, and splashes leap where his head
  meets the water; flying off, water drips from his mouth. Over the Garden four jets arc from his feet: pale blue
  (`#d8f2ff`), half see-through and glossy, their texture running along them, with drops (up to 420 at once, falling
  under gravity) thrown from the jets and splashing where they land. With the Seeds, a plant within about 1.6 m of a
  jet's landing is watered and blooms. **The rainbow** (only with the Seeds): a half ring 12.2-14.2 m in radius in
  seven bands from red (`#e8302a`) to violet (`#a04ad8`), arching east to west across the Garden 7 m south of its
  centre, its foot 2.5 m below the ground so its top is about 11.7 m up; it fades in to 42% strength 3-7 s after he spreads his wings
  and out as he leaves. The jets, drops and rainbow are drawn over the mist, so they show against it (F-B74).

#### The church and the Cave

- **The church** (`CHURCH` in 3.15.44; at 0, 30.4, facing the Garden): grey stone walls (`#8a8880`) 12 m wide, 18 m deep
  and 9.3 m high, with cream stone trim (`#cdc5b4`) and a dark base; a slate shingle roof (`#3a3c44`) to 14.3 m with an
  iron crest of spikes along the ridge; stepped buttresses along the sides; pinnacles with gold balls at the nave's
  front corners; on each side, near the ends, a window of wine-red glass and one of blue, each under a diamond light.
  In front, a tower 4.4 m square: a dark red door (`#8a1e24`) in three receding stone arches up four steps, the arches
  on a stone backing pier to pier and up through the window sill (since 4.0.22, A47: a notch beside the arches showed
  the tower wall); a tall pointed window above it; a belfry with louvred openings at 13.6-17.5 m; battlements and four
  pinnacles; a stone cap at 18.1 m (the gold cross that stood 20.5 m up went in 4.0.22, A48).
- **The stained glass** (painted at load, leaded panes with a slight glow of their own): the front window (3.4 m wide,
  4.2 to 13.2 m up; `paintTravelerWindow` in 3.15.44) shows a winged figure in a white robe with gold curls and a
  halo of gold rays, holding a glowing screen, a cable from it plugged into the ground, descending in a beam of light
  from a starry indigo sky over a dark town with lit windows and burning cracks. Each side window (2.6 m wide, from
  1.7 m up; `paintGardenWindow`, mirrored on the other side) shows a robed figure standing in a flower garden under the
  sun beside a peach goo-shape with two octagonal purple lenses, a lime tube and pins marked "AP" and "IP". *(inference:
  Mama Gorbo; and the front window is likely the Window Anomalee stares up at, "The WINDOW REMEMBERS the TRAVELER": she
  gazes up at the church when idle. What the Window remembers stays open, the author.)*
- **The way in**: two red strokes crossed into an X (`#b3261e`) on the west wall, just under its stained-glass window,
  mark a 2.6 m stretch of wall the player can walk through; everyone else meets the whole wall (the author: the church
  is an intended secret room).
- **The Cave** (the room inside): 11.3 m wide, 16.3 m deep and 9.2 m high. Floor, walls and ceiling share one painted
  canvas (grey-brown, with blotches, grit and coloured pebbles; seeded), tinted `#a8a68a` on the floor and ceiling and
  paler (`#b0b298`) on the walls. The floor is strewn with about 1,360 modelled stones: grey and sandy pebbles, dark
  slate slabs, rusty and mossy stones, pale curved fragments, straw and twigs, a scatter of fine grit, all kept clear of
  the Ancient's body; they are drawn only while the player is within 4 m of the church. The Ancient lies in the room's
  middle, a little toward the back. Since 3.15.62 the room is 4.5 cm lower, its floor 5 mm above the town ground so the
  entrance is level, and no raised stone lies within 1.45 m of the visitors' walkway (F-B60; the author: "flatten the
  ground in the area that NPCs stand and move in in the Cave. The rest of the Cave should remain as is", "Can we not
  lower the floor of the Cave instead?").

#### Pictures in the town

- **Gooward's painting** hangs on the Gallery's back wall: 6.9 x 2.6 m, centred 2.55 m up, in a gold frame (`#b8902e`),
  painted at 4096 x 1544 in three strips by a background worker, or loaded pre-painted from `tex/` (F-B34); its canvas
  sits 1 cm behind the frame (F-B47). What it shows: "The gallery painting" above.
- **The school mural** (`"mural"` in the sign atlas; 11 x 4.3 m on the school's side in a gold frame): a painterly
  scene of brush strokes and dabs under a soft vignette: a blue sky with the sun and clouds, a rainbow, two ranges of
  hills, a pond with a duck, flowers along the bottom, and Backpacka standing over the meadow, tan and mottled with
  coloured patches, green leaf wings raised, water dripping from his mouth and arcing from his four feet *(inference:
  the Event's set piece)*. The author kept it as it was when a sharper version was tried: "it was fine as it was"
  (NOTES 48).
- **King Dino's billboard** (-55, -55): the painted panel (10 x 5 m, 10 m up, "A Prehistoric Era in Jazz!") on two
  poles with a catwalk and two lamps, the cloth banner ("Let King Dino take you / to the Jurassic / Greeblis Park!")
  draped below it on ropes, a ladder against it, and three paint cans (cyan, pink, lime) with spills and a brush at its
  foot *(inference: Gooward's tools; King Dino: "Gooward, that wild cat painted my billboard!")*.

### Every environmental element (inventory)

Every piece of the world, grouped by area, checked against the 4.0.40 game script. Positions are (x, z) in metres;
the full descriptions are in the subsections above. Characters, the player's hands, the watch and the menus are not
environment and are left out (the robin and the cardinal are listed only as perches). "Fades in the Event" means the
fade groups (10 s, once the mist is up, only with the Seeds unless stated); "hidden in the Event" means the 2.5 s fade
of A5.

**The park (inside the fence)**

| Element | Where | What it is / looks like | Behaviour | Source |
| --- | --- | --- | --- | --- |
| The lawn | the whole park | 26 mown stripes 2.92 m wide, `#4a7a2c` and `#3f6c26`, grass texture | still | |
| Grass tufts and tiny flowers | scattered, off the walks and the Garden | 1,750 nine-blade tufts in four greens; every sixth with a white or yellow five-petal flower | still; seeded | R1, R5 |
| The ring walk | 16.6-18.4 m round the Garden | a concrete ring (`#a8a296`) | still | |
| The radial walks and the cross-walk | to the Post Office pair, Garden Supplies, the Library, the Gallery, the church | concrete 2.6 m wide; a 14.4 m cross-walk along the Post Office pair's fronts | still | |
| POST OFFICE kiosk | 28.1, -19.8 | the kiosk frame in blue and navy, pink tin roof; 2,300 letters, pigeonholes, parcels | fades in the Event | A43 |
| SHERIFF'S kiosk | 19.8, -28.1 | brown, a red spotted mushroom-cap roof, the raised desk and ramp, the star, WANTED posters, toadstools, the flag | fades in the Event | A13, A14, F-B39 |
| GARDEN SUPPLIES kiosk | 27.5, 34.5 | green, rust roof; pots, seed trays, two specimen jars, one hanging basket | fades in the Event; shut while Zollod is shy and during the Event | A46, A49 |
| GOOWARD'S GALLERY | 31, 14.5 | cream and plum, purple roof; the painting in its gold frame, paint cans, 58 splats, brushes, two easels | fades in the Event | F-B34, F-B47 |
| Gemtoe's Gazebo | 5, -31 | a white octagon 7.6 m across, green shingle roof, cupola, gold ball, gold-on-plum board, seven stacks of gold coins | fades in the Event; its seven railed sides are walls; no pickup within 4.1 m of its centre | P33, F-B65, B95 |
| The TELEPHONE booth | -7.2, 23.9 | aluminium, glass on three sides and a folding door, payphone, yellow phone book, lit TELEPHONE crown, beacon | fades in the Event; the handset lifts when calling; the crown glows at dusk | A27 |
| The Portal | first clear spot near -9.4, -29.6 | two stone piers and a lintel, cyan tiles; the blue swirl and its light when open | opens in 0.75 s, closes in 0.5 s; fades in the Event with its swirl, not during Nextessa's trip | A27, 4.0.38 |
| The pond | 29.6, -2.6 | grass rim 4.9 m, soil bank 4.1 m, still water 3.7 m round (deep teal, wave streaks, glints) | nothing moves on it; never fades | A21, A33, F-B64 |
| The pond's stones | its bank | 20 stones in three greys painted flat on the bank | still; seeded | A23 |
| The two park trees | -16, 37 and -24.5, 34.5 | big trees of the town kit; the robin's and the cardinal's perches | fade in the Event, birds and all | A30, A31, A37, A38, A40 |
| Blossoms | anywhere clear in the park | 32: a stem, leaves, a red, orange and gold flower, an orange halo | taken: fade out in place; regrow after 12 s; hidden in the Event | A5, A56, A59 |
| Flint | anywhere clear in the park | 40 dark faceted stones with a glint, lying any way | as the Blossoms | A5, A56, A59 |
| The JUICE BAR | along the west fence, x -34, z -9.45 to 9.45 | an 18 m counter with a 2.2 m gap, coloured slats, chrome stools, fruit, juice glasses, blenders, bottle shelves, the JUICE BAR sign with giant fruit | fades in the Event | A17 |
| King Dino's drum kit | -34.8, 19.2 | a red kit with gold cymbals on a round red rug, "KING DINO" on the bass drum | each hit swells its drum, dips the hi-hat, rocks the cymbal; stays in the Event | |
| The dance floor | -33.1 to -21.1, -9.6 to 28.8 | 10 x 32 dark purple tiles of 1.2 m, slightly glossy | still; stays in the Event | |
| The hydrant and the mailbox | north sidewalk by the church (3.2, 52.2 / -3.2, 52.3) | a red hydrant; a blue mailbox on four iron legs | still | |

**The Garden**

| Element | Where | What it is / looks like | Behaviour | Source |
| --- | --- | --- | --- | --- |
| The soil disc | 0, 0, 15 m round | soil `#5a3e26` | still | |
| The painted ground | over the disc, 15.9 m round | six furrow rings, four stepping-stone paths of 12 stones, a ring of 72 rocks (every fourth mossy) | flat for everyone; never fades | F-B57 |
| The Summoning Pillar | the centre | a six-sided purple-grey stone pillar 2.3 m tall with a pointed cap, on a ten-sided plinth and a moss step | three faces of cyan runes: dim, then pulsing once the Stone wakes them, full and whitened in the Event | |
| The Event's flowers | three rings at 3.5, 7.5 and 11.5 m | five kinds of wild plant, 3.2 times size, 15% taller | grow when watered; a new random colour each Event; in a later Event the old ones fade out (1.2 s) and grow back | A20, A28, A29, A58, F-B43 |
| The pizza boxes | eight stacks of one to three at 15.95 m round the Garden | flat boxes 0.44 m square | with the Snacks only: fade in at the Event's start and out at its end | A42, A51, F-B49 |
| Backpacka's ripples | the pond | three pale rings spreading from his mouth | only while he drinks | |
| Backpacka's jets and drops | his feet, over the Garden | four pale blue glossy arcs and up to 420 falling drops, splashes where they land | only while he sprays; water the plants they land near | F-B74 |
| The rainbow | across the Garden, 7 m south of its centre | a half ring 12.2-14.2 m in radius, seven bands red to violet | with the Seeds only: fades in to 42% as he sprays, out as he leaves | F-B74 |

**The Library** (-24.75, -24.75; open to the sky; a kiosk like the others: the registry's building `shop`, so it fades out in the Event once Sparkakus has left and back in after it, Sparkakus himself excepted)

| Element | Where | What it is / looks like | Behaviour | Source |
| --- | --- | --- | --- | --- |
| The rug | the Library's floor | a Persian rug 11 x 7.8 m: navy border, green band, red field of paisleys, a central medallion, cream fringes at both ends | still | |
| The bookcases | on the rug, four in the middle and two crosswise at each end | brown wood, 2.24 x 2.13 m, four shelves, filled on both faces | still | A57 (Sparkakus's romp clears them) |
| The books | the shelves | seeded rows in ten cloth colours, some leaning, some gilt-banded; eight painted face-out covers | still | |
| The curios | the shelves | the wish Blossom (a pot with a spinning teal crystal), the electric Blossom (yellow petals on a silver stand), an acorn | the two Blossoms spin and their rings bob | |
| OVERCOMING SHYNESS | a shelf | a pink book with plum ink | taken by pointing or by walking up to it; plays its own sound | A61 |
| The LIBRARY board | the back, on two white posts 4.3 m high | blue serif name on cream | still | |
| The Speech's bulb | over Sparkakus | a giant glowing bulb, a cone of light, a warm lamp | only in the Speech; the world dims to 70% of night | |
| The Eye's making | before Sparkakus, in the Speech | a GLUE bottle, three teal gem pieces, glue drips | assembles over about 15 s, spins, flies to the player | |

**The church and the Cave** (0, 30.4)

| Element | Where | What it is / looks like | Behaviour | Source |
| --- | --- | --- | --- | --- |
| The church's body | 12 x 18 m, 9.3 m high | grey stone, cream trim, slate roof to 14.3 m with an iron crest, stepped buttresses, gold-balled pinnacles | never fades; misting does not reach it | A4 |
| The tower | the front, 4.4 m square | a red door in three stone arches up four steps, a pointed window, a louvred belfry, battlements, four pinnacles, a stone cap at 18.1 m | still | A47, A48 |
| The side windows | each side, near the ends | wine-red and blue glass under diamond lights | glow more at dusk | |
| The Traveler window | the front, 4.2 to 13.2 m up | the winged figure with a glowing screen in a beam of light over a dark town | glows of its own, more at dusk | |
| The garden windows | each side | a robed figure in a flower garden beside a peach goo-shape | as above | |
| The red X | the west wall, under its window | two crossed red strokes marking a 2.6 m stretch the player walks through | the way in (only the player) | |
| The Cave | inside, 11.3 x 16.3 x 9.2 m | one painted grey-brown canvas on floor, walls and ceiling | its floor 5 mm above the town ground | F-B60 |
| The Cave's stones | its floor | about 1,360 pebbles, slabs, fragments, straw and twigs, grit | drawn only within 4 m of the church; none raised by the walkway | F-B60 |

**The outer town** (scenery, never entered: A4)

| Element | Where | What it is / looks like | Behaviour | Source |
| --- | --- | --- | --- | --- |
| The streets | z -45 and 57, x ±45 | asphalt 8 m wide, yellow centre dashes, sandy verges, concrete sidewalks, zebra crossings | still | |
| STOP signs | three park corners | red octagons on grey poles | still | |
| Lamp posts | every 15 m round the park, and rows at x ±50.6 | iron posts, cream globes 4.7 m up; pink flower baskets on the east; small marquee boards | globes glow at dusk | |
| Paw prints and goo puddles | the south-west sidewalk; the south-east corner | six prints; four puddles in cyan, pink, purple and lime | still | |
| The shop rows | x ±52.6, z -37 to 49 | seven buildings each side: store blocks and false fronts with pictogram bands, awnings and roof objects | lit windows glow at dusk | F-B47 |
| The eight houses | z 72 | each in one townsperson's colours, with its own porch and yard | lit windows glow at dusk | F-B47 |
| The civic row | z -58 to -64 | courthouse with clock tower, fire station, hotel, school with the mural, gas station, video shop | still | NOTES 48 |
| Mistergummery's | 65, -27 | the red and cream drive-in with teal arches, lot, MENU board, tables, playground | still | A36 |
| The landmarks | further out | the water tower, the Gooburger, King Dino's billboard, the Field Office, the roped landing ring, two glasshouses, the crystal patch, a pink ice-cream parlour, an inn | still | |
| Town trees | 66, within 100 m, off the streets and buildings | the same three tree shapes, coarser beyond 80 m | fade in the Event (with or without the Seeds) | F-B72 |
| The ground | 640 m square | mottled greens to 140 m, olive beyond | fades into the fog without a line | |

**The edge**

| Element | Where | What it is / looks like | Behaviour | Source |
| --- | --- | --- | --- | --- |
| The iron fence | round the whole park, no gate | black pickets on two rails, capped posts every 3.2 m, 1.04 m high | beyond 18-28 m drawn as a flat pattern; drawn over the mist | F-B73 |
| The brick pillars | the four corners and the middle of the north side | `#9a4a36`, 1.3 m, stone caps, iron balls | still | |
| The mist bank | four bands 1.5-16 m outside the fence | soft grey walls 22-34 m tall, dense at the foot | only in the Event: rolls in over 30 s, stays 190 s, rolls out over 30 s; drifts sideways | A4, A9, A12, A16, A19 |
| The misting beyond the fence | everything standing outside | the fog's grey, by where a thing stands, not how far the player is | only in the Event; nothing inside the fence | A4, A9, A19 |

**The sky**

| Element | Where | What it is / looks like | Behaviour | Source |
| --- | --- | --- | --- | --- |
| The sky dome | round the camera | a gradient from `#d6e6ef` at the horizon to `#3f86d6` overhead | turns to night blues at dusk | |
| The sun | 58 degrees up in the north-east | a pale disc (`#fff6c8`) with a soft glow | hidden at dusk | |
| The lights | | a sky light, a warm sun, a cool fill; no shadows | moonlight at dusk | |
| The fog | 70-300 m | the horizon colour | darkens with the sky at dusk; the mist's colour follows it | A12 |
| The clouds | 40-95 m out, 50-72 m up | 24, each three to five flattened white spheres with a grey underside | circle the town every 12-26 minutes; dimmed at night; hidden in the Event | A5, A24, A25, A55 |
| The stars | above 4.6 degrees | 700 white points | show only as the world dims | R5 |
| The UFO | crosses the sky 35-48 m up | a chrome saucer, rim bulbs cycling red, yellow and cyan, a glass dome, Ollaag at the controls (A63) | every 600 s; none starts in the Event, one in flight leaves by its path | A6 |
| Dusk | everywhere | the Speech's dimming to 70% of night | windows, lamps, the church glass and the TELEPHONE sign glow | |

### The author's decisions about the environment

- **The church is a secret room**, entered through the X-marked wall (the author; LORE "The Ancient").
- **The mist** (the Event): "an actual effect that appears like fog moving in and not just a filter applied", only
  beyond the fence, fading in while hidden objects fade out (A4); slower and with a longer Event (A9: "The fog moves in
  and moves out too quickly"); not too bright (A9) and not too dark ("The color of the fog now looks too dark to the
  eye", A12); slower again ("Fog still moves in too fast and moves out too fast", A16); never thinning as the player
  comes close ("This should never happen when the user moves closer to the fog, for any object", A9; "The issue with
  the fog disappearing from the top of the fence as I approach is still occurring", A19).
- **Nothing pops** in or out at the Event's start and end (A5); the UFO leaves by its normal path (A6); Backpacka
  leaves into the mist, not the open sky (A7).
- **Always daylight in the Event** (the author: it is never night during the Event).
- **The Garden stays flat** (F-B57; RULES.md "Decisions that close an option").
- **The Cave floor is lowered, not reshaped**, except where townsfolk walk (F-B60).
- **No flicker anywhere**: the gables, the parapets, the church's plinth and arches, the painting's frame, the bar's
  counter and the ramp's landing were overlapped (F-B47: "one more full pass looking for any flickering"; B21).
- **Mushroom's ramp**: "add a small ramp for him on the side of his desk. Instead of jumping, it'll be funny for him to
  move up a small ramp to climb it" (F-B39), later as wide as that side of the kiosk (A13); more mushrooms on the
  Sheriff's roof (A14).
- **The bar's opening** is wider: 2.2 m (A17). **Mama Gorbo's goo** lies on its own layer over the pond's banks
  ("This things should be on different layers", F-B58).
- **Seeded, not random**: the stars and clouds ("1 to 7: seed", R5) and every painted texture (R1: "we should cut as
  much randomness as possible").

### Where it is built

Landmarks to search for in the game script (line 7 of the game file), with the 3.15.44 names where they help:

| What | Landmark |
| --- | --- |
| Park size, fog, sky colours | `clearingR:36.5,parkHalf:37.6,parkSouth:49.6` (the tuning object `t`) |
| Lights, sky dome, sun, stars, dusk | `I.setNight=`, `gcRnd("stars")`, `"#070b24"` |
| Clouds, mist bank | `gcRnd("clouds")`, `gcRnd("mist")`, `"gcMist"`; the beyond-the-fence misting is in three.js's patched fog chunk (line 3, `fogColor * 0.9`) |
| The Garden, the pillar | `GARDEN_R:15`, `gcRnd("gardenGround")`, `"#7ff0ff"` |
| Kiosks | `sign:"POST OFFICE"`, `"SHERIFF'S"`, `"GARDEN SUPPLIES"`, `"GOOWARD'S GALLERY"` (`kioskFrame`, `buildPostOffice`, `buildSheriff`, `buildGardenSupplies`, `buildGallery`) |
| Library, bar, phone, Portal | `sign:"LIBRARY"` (`buildLibrary`), `"JUICE BAR"` (`buildJuiceBar`), `"TELEPHONE"`, `"#35e0f0"` |
| Pond, dance floor | `JGP.buildPond`, `"#24103c"` |
| The town builder | "jgp-world" (`swapWorld`), seed `20250101`, "sign atlas overflow", `"prismgable"`, `"ringwalk"`, `GB_FENCE_FAR` (`fenceMaterial`), `"Mistergummery's"`, `"FIRST BANK OF GREEBLIS"` |
| The church, its glass, the Cave | `"church"` (`CHURCH`, `lancet`, `paintTravelerWindow`, `paintGardenWindow`, `stainedKit`), `id:"slug"` |
| Night glow, the UFO, the Speech's bulb | `.emissive.setRGB(.95*` (the lit windows; `BIN.lit` in 3.15.44), `JGP.ufoNow`, `Bulb.start` |

## The author's answers (2026-10-28; 9 to 12 added 2026-11-04)

1. **Mama W** is a name for Mama Gorbo.
2. **Flint** and the code's acorns are the same thing; flint is the game's word.
3. **The Field Office** is Hennrick's office in the far past.
4. **The names on posters and book covers** (GLOOPERNAUGHT, PATCHOOLEE, APPTERIX, ORSON, Walter Bigsby,
   Ranger Bobert, Zortoe, *Traveler's Truth*) all have backstories, but this game does not tell them.
5. **Eras:** Hennrick is from the far past; Nextessa is from the far future. **The Consortium** is run by
   Maltoe and Mushroom.
6. **The Ancient** is not the Originator.
7. **Backpacka:** where he comes from, and why Fortizmo composes for him, is not known.
8. **The mayor** under the Sheriff's cap in the painting is Montgummery in the near future.
9. **Ollaag** (2026-11-04) is the leader of the Alien Alliance, a group of all the other alien factions; he is the one
   who flies around in the UFO; the Alien Alliance is in conflict with the Consortium.
10. **The girl** on the WANTED poster (the code's `visitor`) is the player's avatar (2026-11-04).
11. **The WANTED posters** show several aliens, two of them humans (2026-11-04). The grey alien face is not the
    Sheriff's picture of the Human.
12. **The grey aliens** on the WANTED posters are members of the Alien Alliance; at least four alien races belong to
    the Alliance (2026-11-04). Which races they are is not told.

## Left open on purpose

- Which page is missing from Sparkakus's texts, and what the Window remembers: intentionally left open
  here (the author).

## Two names the author uses (keep them apart)

- **The Event** is the planting event: the "GARDEN EVENT" the campfire panel
  starts (Summoning Stone, Seeds, Snacks), the gardening at the garden with the
  pillar, in daylight (the author: it is never night during the Event). Since 3.15.54 a mist bank rolls in beyond
  the town fence while it runs. In the code it is `me`, whose own label is "finale".
  The performance notes, `event_probe.js` and `perf_report.js` all mean this.
- **The Speech** is Sparkakus's finale in the library: with the three Artifacts
  he assembles the Eye and awards the Gem. In the code it is `speech`.
