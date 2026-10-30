# Greeblis Town, Lore Bible (second pass)

Compiled strictly from the game's own text, data and pictures in the game file, `tools/uncompressed.html`
(3.15.45; the root `index.html` is a byte copy of it, and none of the fixes in FIXES.md changes a line of
story text). Lines are quoted as written. Anything not stated by the game is marked *(inference)*. Gaps are listed at the end so the author can fill them.

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

**Changes in this pass:** the Ancient (who speaks, and where it lives), the gallery painting, Backpacka,
the Library's books, the WANTED posters, the billboard, the parcels, every character's gift and
gardening lines, the quests (shyness, the Gem trade, the bribe). Three corrections to the first pass:
it is **Zollod** who is shy (the book cures him), the **Gem trade is Gemtoe's**, and "OF ORSON",
"OF APPTERIX", PATCHOOLEE, STAPLERS and RANGER are **Library book covers**, not gallery pieces or signs.

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
- **WANTED posters:** two kinds. One shows an alien face; the other shows a goo
  creature and the name **GLOOPERNAUGHT**. *(inference: the alien is how the
  Sheriff pictures the Human he is hunting.)*
- **The robin:** a robin perches in the park; pick it and it flies off.
- **Parcels at the Post Office:** addressed "To Montreal", "To Cobourg" and
  "To Bangkok" (and one without a label).
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
- **The Originator.** Anomalee's obsession: "ORIGINATOR… WAS there WITHIN."
  "The Ancient texts speak of an ORIGINATOR" (Sparkakus). "BEINGS of CODE."
  "ETCH this: the ORIGINATOR was HERE." "Your RHYTHM... the ORIGINATOR had it TOO."
- **The Consortium.** The authority the Sheriff answers to: "This town is
  under the protection of the Consortium." It locked the Portal, inspects
  Fortizmo's bar and watches Sparkakus's books. Faced with the Ancient, the
  Sheriff can only stammer: "Th-the Consortium will be informed." The Consortium is run by Maltoe and
  Mushroom (the author, 2026-10-28).
- **Gree-mail.** "When you see creatures exchanging symbols, that's
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
- **What it says:** "I am the one reborn." During the planting Event, when the
  Seeds have been brought: "Hello". A Blossom given to it: "…".
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
  all (the code calls her the `visitor`). *(inference: the Human, the player, who can buy a Sun Dress.)*
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
"!", Anomalee glitches "?", King Dino puffs "★", Gooward wobbles "~", Zollod sways "✿", Somlet dozes "z",
Fortizmo grooves "♪", Gemtoe twirls "✦", Glyph giggles "?", Mama Gorbo bows "♥", the Ancient dozes "…").

## Currency, items and rewards

| Thing | Facts from the game |
| --- | --- |
| Blossoms | The town currency ("We only accept Blossoms at this establishment"; "the house currency is Blossoms"). 32 grow in the park and regrow in 12 s. Given as gifts; given to the Sheriff, a bribe. |
| Flint | The pickups on the ground and the shop's currency (author confirmed: the game says flint; the code calls the same counter acorns). Gemtoe values gems in flint ("worth countless flint"). 40 in the park, regrow in 12 s. |
| Gems / Ancient Gem | Gemtoe hoards gems. "Ancient Gem collected!" is the finale reward (the Eye of the Sphinx). |
| Artifacts | Three Ancient Artifacts exist in the region; one is awarded for each first dance-battle win. Sparkakus glues them together into the Gem. |
| Summoning Stone | Gemtoe trades it for the Gem: "That Gem you have… It's worthless… trust me. I'll trade this rock I found for it. You're better off!" Wakes the Summoning Pillar's runes ("The runes stay dark. Only the Summoning Stone can wake them and start the gardening event."). |
| Seeds | "bagel seasoning packet", 25 flint at Garden Supplies, completes the SEEDS quest. |
| Snacks | +20 Snacks per pizza delivery. Needed for the garden event. |
| OVERCOMING SHYNESS | A book on the Library's shelves ("Take OVERCOMING SHYNESS"); it frees Zollod from his shyness. |
| King Dino's coins | "not legal tender"; "He stamps those coins himself." |
| Goo burger coupons | Mama Gorbo hands them out. |
| Carrot juice | Fortizmo's house special, "on the rocks… just carrots and ice". |
| Outfits | Flower Hat, Sun Dress, Frog Shoes, 3 flint each, worn by the player ("Take a look in the mirror!"). |

## The Library's books

Covers on the shelves: **WORKS OF PATCHOOLEE**, **ADVENTURES OF APPTERIX**, **SONGS OF ORSON**,
**STAPLERS** by Walter Bigsby, **RANGER BOBERT**, **Zortoe's Home Cooking**, **Traveler's Truth**,
and **OVERCOMING SHYNESS** (the one the player can take). The shelves also hold a wish Blossom, an
electric Blossom and an acorn. Sparkakus guards the "first editions" ("Please, no goo near the first
editions.") and the Ancient texts.

## Quests and their lines

- **Zollod's shyness.** Before: "…|…|I'm shy…". Mama Gorbo's hint: "I hear there is a book that can
  help anyone overcome shyness." With the book: "…|That book…|Let me see..|Wow I'm free from
  shyness!" Only then does Garden Supplies open; Zollod then says "Bringing plants to life is MY
  life's work."
- **The bribe.** A Blossom to the Sheriff opens the Portal: "A bribe? …Portal is now open to your
  use." Then the TELEPHONE reaches Nextessa: "*Ring Ring* This is Nextessa's inter-temporal pizza
  shop!|One pie on your way." The courier: "One hot and ready pie!|* +20 Snacks *|I love my job!"
- **The Artifacts and the Speech.** Sparkakus: "For my research: I seek Artifacts left by the
  Ancients.|Three exist in this region." With all three: "You've found all three Artifacts!|Amazing!
  |Let me see those…|Ah…", then the Speech about the Eye of the Great Sphinx, the Gem, and "Well
  done, Human!"
- **The Gem trade** (Gemtoe): the Gem for the Summoning Stone, above.
- **The planting Event**: Summoning Stone, Seeds and Snacks at the SUMMONING PILLAR.

## Events

- **Dance battles** (vs Etcher, Glyph, Montgummery; "KING DINO on drums."):
  rock / scissors / paper as "Rock out!", "Do the splits like scissors!",
  "Go horizontal like paper!"; stamina 10; "BOW OUT" / "TAKE A BOW" ("You take a bow."; BOW OUT works 80% of the time, otherwise "The beat
  won't let you go!"); first win: "<name> awards you an Ancient Artifact!". Each dancer's stamina bar
  counts their signature move: "Robot steps left" (Montgummery), "Tentacle twists left" (Etcher),
  "Macarena moves left" (Glyph). A Blossom given to a dancer is an invitation: "Let's dance!", and the
  battle starts when the line closes.
- **Gardening event**: at the Summoning Pillar with Stone, Seeds and Snacks; townsfolk gather in a ring,
  plant, then go home. Each says their gardening line (below).
- **Backpacka**: Fortizmo practises "a song for the coming of the legendary Backpacka". During the
  planting Event, once the planting has begun and the townsfolk have taken their places, they form a
  ring round the garden and, when the Seeds were brought, Fortizmo plays her horn; then Backpacka comes: a long-necked creature with green wings arrives, lands, drinks at the
  pond, rises, flies over the garden, spreads its wings and sprays water over it, then leaves (the
  animation's own stages: arrive, down, drink, up, to the garden, splay, spray, gone; about 70 s).
- **Pizza**: the TELEPHONE calls Nextessa's inter-temporal pizza shop; a courier delivers, even into the
  church where the Ancient lives.
- **The Speech**: with all three Artifacts, Sparkakus assembles the Eye of the Great Sphinx; "Well done,
  Human!"

## Cast

| Name | Code id | Role / home | Nature and notes |
| --- | --- | --- | --- |
| Mama Gorbo | `p_mamagorbo` | Runs "the local fast food joint" (Gooburger); gardener | Round, bouncy, made of "noble goo" that "can heal many inflictions". Married to Gooward ("met over a spilled goo shake. Love at first splat!"). The Ancient calls her "Mother of goo". The lime tube draped around her front is a goo tube (author). |
| Gooward | `gorbo` | Mama's "hubby"; "runs the Art Gallery now"; "quite the artist" | Speaks only in "Gomp"; crystal wings; goo bubbles; painted King Dino's billboard and the gallery painting (signed). Given a Blossom ("GOOMP") he flings goo at the player. Has a second set of eyes (the two octagonal discs on his head) and forehead wrinkles (author). |
| Gemtoe | `p_gemtoe` | Keeper of the First Bank of Greeblis; at Gemtoe's Gazebo | Invented "Avarice"; tails curl around crystals; trades the Summoning Stone for the Gem; envies Sparkakus ("Spark collects books and calls it a job. Why am I so different?"). Sells "digital plots out here in the Greeblis-verse!" (talk line, author, 3.15.53). |
| Etcher | `p_etcher` | Data preservation; dance floor | Tentacles etch data into everything; scales hold "a backup of a backup"; "My skin is a ledger." The three yellow marks on his back (a stroked "B", three stacked parallelograms, two diamonds) are symbols of the ledgers he can etch on (author). |
| Glyph | `p_glyph` | "Master of symbols"; dance floor | Plates "fit together like a sentence"; ends lines with "don't you think?" |
| Montgummery (Mont) | `w_mont` | Dance floor; hides the Human from the Sheriff | Robot with a screen face; eats VHS tapes ("Knowledge in the reels. Dinner in the cassette."); "We are all digital monsters." Speaks in third person. Ate the Library's tapes. |
| Hennrick | `gratelet` | Researcher from the far past (the author), stuck by the Portal | "Casing" and "joints… built for fieldwork"; collects samples in jars; "unwilling guest of the Sheriff"; observes Somlet ("Subject remains asleep. Observation day 41."). |
| Mushroom (the Sheriff) | `drifter` | Sheriff's kiosk desk, reached by a little ramp at its left end (since 3.15.53) | Cap with gills; investigates UFOs; enforces the Consortium; takes bribes ("A bribe? ...Make it a double."). |
| Fortizmo | `frog` | Juice Bar | She (Etcher: "her dancefloor"). Brass valves ("My valves turn a breath into a brass note"); "sugar"/"honey"; Blossoms only; practising a song for Backpacka. The four small dots beside his eyes are beauty marks (author). |
| King Dino | `m_kingdino` | Drums at the Juice Bar | "King of Jazz, baby!"; drums "since the Cretaceous"; works off his bar tab; stamps his own coins; wears a crown ("The crown is extra"). The lit buttons on his sides and the sockets on his back are synthetic parts of his own body (author). |
| Somlet | `m_somlet` | Asleep on a pile of mail at the Post Office | She says "Zzz"; "a letter peeks out from under her cap"; "a tiny paw curls beneath her cap"; "a patron of the Library". |
| Anomalee | `blinker` | Gazes up at the Window | Speaks in CAPITALS about CODE and the ORIGINATOR; "chewing cables" into the Computer Core; "My SIGNAL flickers. My FRAME remembers how to STAND." (a sad melody plays under "ORIGINATOR…"). |
| Zollod | `cutebex` | Garden Supplies | Gardener; seedlings, mint, carrots; "A little goo is good for the soil."; shy until the book cures him. |
| Sparkakus | (library, `st`) | Librarian | Seeks the three Artifacts; member of a "genealogical society"; a Blossom sets him romping about the Library ("…sorry I don't know what got into me."); elsewhere he holds back ("I must resist the urge to run. Not out here, in front of everyone."). |
| Nextessa | (pizza shop) | Inter-temporal pizza shop in the far future (the author), reached by phone | "I love my job!"; courier delivers. |
| The Ancient | `slug` | Inside the church | "I am the one reborn." See its own section. |
| Mama W | map node `MAMA_W` | On the gallery painting only | A name for Mama Gorbo (the author); in her colour, tied to her. |

### Gifts and gardening lines

What each says when given a Blossom, and at the planting Event (the campfire lines).

| Name | Given a Blossom | At the planting Event |
| --- | --- | --- |
| Mama Gorbo | "Thank you, dear." | "Pretty flowers come to life!" |
| Gooward | "GOOMP" | "* Happy planting sounds *" |
| Gemtoe | "This is mine now." | "Enjoying the SHARED garden… what is this feeling?" |
| Etcher | "Let's dance!" | "Etching what was is important but living this is what IS." |
| Glyph | "Let's dance!" | "Growing flowers, it's a symbol of life." |
| Montgummery | "Let's dance!" | "Joyful to bring life to our Town." |
| Hennrick | "Adding to a collection jar." | "Sometimes I worry that doing these things will alter the timeline…" |
| Mushroom | "A bribe? …Portal is now open to your use." | "…" |
| Fortizmo | "Add it to the tip jar." | (none) |
| King Dino | "Yes! I can finally afford another mug of carrot juice!" | "Can't stop the beat!" |
| Somlet | "Thank you" | "Zzz" |
| Anomalee | "* Munch *" | "PLANT" |
| Zollod | | "Bringing plants to life is MY life's work." |
| Sparkakus | At the Library he romps about, then: "…sorry I don't know what got into me." Away from it: "A Blossom! …I must resist the urge to run.|Not out here, in front of everyone." | "Digging in the dirt like an animal? …don't tell the others at the genealogical society." |
| The Ancient | "…" | "Hello" |

### Vignettes

90 two-line exchanges between pairs (the `PAIRS` table) play out around town, plus the Ancient's twelve
(above), which only play while the player is inside the church (and there only they do). Each plays
either as two speech bubbles over the speakers or as an exchange of their Gree-mail tokens (above);
Zollod joins in only once he is cured of his shyness. `tools/spellcheck_dialogue.py --who X` prints every line per character. Recurring threads:
Hennrick wanting to go home, everyone refusing King Dino's coins, Blossoms-only at the bar, Etcher
etching everything (including citations and snores), Mont having eaten the Library's VHS tapes, Mama
offering everyone a goo burger, Gemtoe claiming whatever is worth something.

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
  wagging harder while he talks. No walk cycle.

#### Sparkakus
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
  eases in when the player gives him a gift. A small "o" mouth that breathes and talks.
- **Motion**: hovering, breathing, three "Z" sprites rising from him; when he is at home and idle he slowly rolls
  onto his side to lie down. Each frame his tentacles curl themselves out of the ground.

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
- **Face**: side-set amber eyes with slit pupils and feathered lids, scaly brows, a beak that opens while he talks.
- **Motion**: hovers, the head looks about, the wings flap faster when he moves, the sparkles twinkle.
- **Tie** (3.15.57, the author: "a neck tie. no shirt, just a tie"): a knot under the bill and a pointed blade down
  the bib, his gems' purple with gold diagonal stripes.

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
  with three-fingered hands; he rolls on two unicycle wheels with springs.
- **Palette and surface**: orange brush-stroke fur (`#e8742a`), a cream belly patch with seams and black studs, brass
  valves, chrome and black tyres. Every vertex jittered for a hand-made look.
- **Face**: two glossy black eyes and four smaller matte black beauty marks beside them (the author).
- **Motion**: the wheels roll with the distance travelled; when he plays, his muzzle morphs into a 3.7 m trumpet,
  the valves pump at the Event's 88 beats a minute and his arms reach for the horn.

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
  head with a box snout, the pizza box carried on her head; no limbs.
- **Palette**: oranges (`#f47a3a`, `#f09460`), yellow eyes with white highlights.
- **Motion**: she hops with squash and stretch; her segments wave; she nods once when she speaks.

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
  its height: a long, low, dark slug.
- **Palette and surface**: near-black (`#171310`) with a painted mottled skin and a separate bump map, shininess 90:
  wet and glossy. No eyes: dark knobs on the upper stalks.
- **Motion**: slow, irregular life: periodic settles, tilts, tail curls, mantle ruffles and deep sighs on different
  periods (17-37 s), the head looking about, the stalks retracting every 11 s; when it talks the head and stalks lift.

#### The robin
- A plump songbird (about .45 m) on a bark branch: rusty breast, dark back and head, white throat with streaks, a
  yellow bill, white eye-rings and brows, three tail feathers. All matte clay, no textures. It breathes, looks about,
  flicks its tail every 9 s, and when picked flies up, hides for 10-18 s and returns.

#### Backpacka
- **Body**: a horizontal lathe body with seven colour patches, a ten-segment neck, a head with a jaw and tongue, a
  curled tail, four legs ending in open pipe feet, ten leaf-like wing blades; she flies the whole time.
- **Palette**: tan skin (`#d48e64`) with orange, yellow, ochre and pink patches, green wings, a rainbow.
- **Motion**: the planting Event's set piece: she flies in, drinks from the pond and swells, flies to the garden,
  spins while her four feet spray water on the plants, a rainbow fades in, and she flies away low over the north-west
  fence into the Event's mist bank, where she is switched off (88 s in all; 84 s until 3.15.54, FIXES A7).
- **Performance and collision** (3.15.50): batched when built (P25: 94 of 96 parts in 11 batches); while she is down at
  the pond the player cannot walk into her (F-B37: player-only circles round her feet, body, neck and head).

#### The player
- In VR the player sees only their hands: cartoon three-fingered hands (skin `#f4dcc6`) with a white cuff and a
  sleeve in the dress colour. The full body (a yellow flowered dress, a navy belt, red-orange hair in two pigtails
  with a navy bow, freckles and blush) is built at boot and hidden in VR.
- Outfits from the shop are built hidden and switched on: the Flower Hat (in place of the bow), Frog Shoes (green
  frog-faced shoes) and the Sun Dress (the dress map swapped for suns on sky blue, with an orange hem).

### The author's answers about the models

What the models show that the code does not explain, as the author answered it (also in LORE.md's cast table):

- **Gooward**: the two octagonal lens discs on his head are a second set of eyes; the wavy lines are forehead
  wrinkles.
- **King Dino**: the lit buttons on his sides and the sockets on his back are synthetic parts of his own body.
- **Mama Gorbo**: the lime tube draped around her front is a goo tube.
- **Fortizmo**: the four small dots beside her eyes are beauty marks.
- **Gemtoe**: floats a little above the ground on purpose (author, 2026-10-30).
- **Backpacka** is a he; **Fortizmo** is a she (author, 2026-10-30).
- **Etcher**: the three marks on his back (a stroked "B", three stacked parallelograms, two diamonds) are symbols of
  the ledgers he can etch on.
- **The technology on every character** is a deliberate theme: this is a digital world and they are digital
  monsters.

Checked in the code instead: Mushroom's reported height (2 m) is below his hat (about 2.3 m), but everything it
places clears the hat (emotes at 2.4 m, speech bubbles at 3.1 m). No questions are open.
## The author's answers (2026-10-28)

1. **Mama W** is a name for Mama Gorbo.
2. **Flint** and the code's acorns are the same thing; flint is the game's word.
3. **The Field Office** is Hennrick's office in the far past.
4. **The names on posters and book covers** (GLOOPERNAUGHT, PATCHOOLEE, APPTERIX, ORSON, Walter Bigsby,
   Ranger Bobert, Zortoe, *Traveler's Truth*) all have backstories, but this game does not tell them.
5. **Eras:** Hennrick is from the far past; Nextessa is from the far future. **The Consortium** is run by
   Maltoe and Mushroom.
6. **The Ancient** is not the Originator.
7. **Backpacka:** where it comes from, and why Fortizmo composes for it, is not known.
8. **The mayor** under the Sheriff's cap in the painting is Montgummery in the near future.

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
