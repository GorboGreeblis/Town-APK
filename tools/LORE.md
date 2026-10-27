# Greeblis Town, Lore Bible (first pass)

Compiled strictly from the game's own text and data in `tools/uncompressed.html`
(v3.15). Lines are quoted as written. Anything not stated by the game is
marked *(inference)*. Gaps are listed at the end so the author can fill them.


> **Naming rule (author):** the names the game shows are the canon. The code's
> identifiers are leftovers from earlier games and prove nothing: `acorns` is
> flint, `drifter` is the Mushroom, `frog` is Fortizmo, `gratelet` is Hennrick,
> `blinker` is Anomalee, `cutebex` is Zollod, `m_somlet` is Somlet, `gorbo` is
> Gooward, `w_mont` is Montgummery, and so on. When a document needs an
> identifier for a test or a probe, it says so and gives the in-game name next
> to it.

## The world

- **Greeblis Town / Greeblis Park.** A cartoon town around a park. Mama Gorbo:
  "What a beautiful day in Greeblis Park!" Hennrick, a visitor from the
  future: "In my era, the towers of Greeblis City reach the clouds. I never
  imagined the far future would have… picket fences." *(inference: the town
  exists in an early era of a long timeline that later becomes Greeblis City.)*
- **Places with signs:** FIRST BANK OF GREEBLIS (kept by Gemtoe), GARDEN
  SUPPLIES (Zollod's shop), JUICE BAR (Fortizmo's), POST OFFICE (Somlet
  sleeps on the mail), GOOWARD'S GALLERY (Gooward's art gallery), LIBRARY
  (Sparkakus), the SHERIFF'S kiosk (Mushroom), a TELEPHONE (calls Nextessa),
  the SUMMONING PILLAR in the garden at the park centre, a WANTED poster, a
  RANGER sign, GLOOPERNAUGHT, PATCHOOLEE, STAPLERS, works "OF ORSON" and
  "OF APPTERIX" (gallery pieces), the book "OVERCOMING SHYNESS", and the
  world builders also place a Field Office, Fire Station, Gas Station,
  Hotel, School, Courthouse, Nursery, Water Tower, Gooburger, houses, a
  church, a pond and a billboard (King Dino's, painted by Gooward).
- **The Portal.** A gateway between eras, currently locked: "All travel
  through the Portal is locked down until further notice." (Mushroom).
  Hennrick came through it and cannot go back. Pizza is ordered through it
  ("inter-temporal pizza shop"; when blocked: "*connection to the Portal
  seems blocked*"). A bribe to the Sheriff opens it: "A bribe? …Portal is
  now open to your use."
- **The Computer Core.** Anomalee "is under investigation for chewing cables
  leading into the Computer Core." The Great Sphinx "guarded the Computer
  Core. Asking Synthetics riddles before allowing them in."
- **The Window.** Anomalee stares up at a window: "It is NOT for jars. It is
  for REMEMBERING." "The WINDOW REMEMBERS the TRAVELER."

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
- **The Consortium.** The authority the Sheriff answers to: "This town is
  under the protection of the Consortium." It locked the Portal, inspects
  Fortizmo's bar and watches Sparkakus's books.
- **Gree-mail.** "When you see creatures exchanging symbols, that's
  Gree-mail." (Glyph)
- **The player** is "Human", a visitor the Sheriff is hunting ("Mont will
  hide you from alien hunting Sheriff"; "Have you seen a human in this
  town?" "Mont has seen no human.").

## Currency, items and rewards

| Thing | Facts from the game |
| --- | --- |
| Blossoms | The town currency ("We only accept Blossoms at this establishment"; "the house currency is Blossoms"). 32 grow in the park and regrow in 12 s. Can be given as gifts. |
| Flint | The pickups on the ground and the shop's currency (author confirmed: the game says flint; the code calls the same counter acorns). Gemtoe values gems in flint ("worth countless flint"). |
| Flint pickups | 40 in the park, regrow in 12 s; spent in the shop (the code's `acorns`). |
| Gems / Ancient Gem | Gemtoe hoards gems. "Ancient Gem collected!" is the finale reward (the Eye of the Sphinx). |
| Artifacts | Three Ancient Artifacts exist in the region; one is awarded for each first dance-battle win. |
| Summoning Stone | Obtained by trading the Gem: "I'll trade this rock I found for it." Wakes the Summoning Pillar's runes to start the gardening event. |
| Seeds | "bagel seasoning packet", 25 flint at Garden Supplies, completes the SEEDS quest. |
| Snacks | +20 Snacks per pizza delivery. Needed for the garden event. |
| King Dino's coins | "not legal tender"; "He stamps those coins himself." |
| Goo burger coupons | Mama Gorbo hands them out. |
| Carrot juice | Fortizmo's house special, "on the rocks… just carrots and ice". |
| Outfits | Flower Hat, Sun Dress, Frog Shoes, 3 flint each, equipped on the player. |

## Events

- **Dance battles** (vs Etcher, Glyph, Montgummery; King Dino on drums):
  rock / scissors / paper as "Rock out!", "Do the splits like scissors!",
  "Go horizontal like paper!"; stamina 10; "BOW OUT"; first win: "<name>
  awards you an Ancient Artifact!"
- **Gardening event**: at the Summoning Pillar with Stone, Seeds and Snacks;
  townsfolk gather, plant, then go home. Campfire lines are what each says
  there.
- **Pizza**: the TELEPHONE calls Nextessa's inter-temporal pizza shop; a
  courier arrives with "One hot and ready pie! +20 Snacks".
- **The finale**: with all three Artifacts, Sparkakus assembles the Eye of
  the Great Sphinx; "Well done, Human!"
- **Backpacka**: "the coming of the legendary Backpacka" that Fortizmo
  practises a song for (sequence `BP` in the code).

## Cast

| Name | Code id | Role / home | Nature and notes |
| --- | --- | --- | --- |
| Mama Gorbo | `p_mamagorbo` | Runs "the local fast food joint" (Gooburger); gardener | Round, bouncy, made of "noble goo" that "can heal many inflictions". Married to Gooward ("met over a spilled goo shake. Love at first splat!"). |
| Gooward | `gorbo` | Mama's "hubby"; "runs the Art Gallery now"; "quite the artist" | Speaks only in "Gomp"; crystal wings; goo bubbles; painted King Dino's billboard. |
| Gemtoe | `p_gemtoe` | Keeper of the First Bank of Greeblis; at the gazebo | Invented "Avarice"; tails curl around crystals; "I seek the rarest gems"; "This is mine now." |
| Etcher | `p_etcher` | Data preservation; dance floor | Tentacles etch data into everything; scales hold "a backup of a backup"; "My skin is a ledger." |
| Glyph | `p_glyph` | "Master of symbols"; dance floor | Plates "fit together like a sentence"; ends lines with "don't you think?" |
| Montgummery (Mont) | `w_mont` | Dance floor; hides the Human from the Sheriff | Robot with a screen face; eats VHS tapes ("Knowledge in the reels. Dinner in the cassette."); "We are all digital monsters." Speaks in third person. |
| Hennrick | `gratelet` | Researcher from the far future, stuck by the Portal | "Casing" and "joints… built for fieldwork"; collects samples in jars; "unwilling guest of the Sheriff". |
| Mushroom (the Sheriff) | `drifter` | Sheriff's kiosk desk | Cap with gills; investigates UFOs; enforces the Consortium; takes bribes. |
| Fortizmo | `frog` | Juice Bar | Brass valves ("My valves turn a breath into a brass note"); "sugar"/"honey"; Blossoms only. |
| King Dino | `m_kingdino` | Drums at the Juice Bar | "King of Jazz, baby!"; drums "since the Cretaceous"; works off his bar tab; stamps his own coins; wears a crown ("The crown is extra"). |
| Somlet | `m_somlet` | Asleep on a pile of mail at the Post Office | Says "Zzz"; a letter under her cap; "a patron of the Library". |
| Anomalee | `blinker` | Gazes up at the Window | Speaks in CAPITALS about CODE and the ORIGINATOR; "chewing cables" into the Computer Core. |
| Zollod | `cutebex` | Garden Supplies | Gardener; seedlings, mint, carrots; "A little goo is good for the soil." |
| Sparkakus | (library, `st`) | Librarian | Seeks the three Artifacts; "genealogical society"; shy about running. |
| Nextessa | (pizza shop) | Inter-temporal pizza shop, reached by phone | "I love my job!"; courier delivers. |
| The Ancient / Mama W | map nodes `ANCIENT`, `MAMA_W` | Appear on the relationship map only | Not met in dialogue extracted so far. |

### Relationship map (the `TIES` network drawn on the gallery screen)

Mama–Gooward ("knot"), Mama–Mont, Gooward–Mont, Gooward–Zollod,
Glyph–Etcher ("groove"), Gemtoe–Glyph, King–Fortizmo, King–Mont,
Sparkakus–Hennrick, Sparkakus–Ancient, Somlet–Ancient, Anomalee–Mama,
Anomalee–Glyph, Etcher–Hennrick, Zollod–Fortizmo, Nextessa–Mushroom,
Hennrick–Mushroom, Sparkakus–Gemtoe, Mama–Mama W, Fortizmo–Somlet,
Mont–Mushroom.

### Vignettes

78 two-line exchanges between pairs (the `PAIRS` table) play out around
town; the full list is in the dump `tools/spellcheck_dialogue.py --who X`
prints per character. Recurring threads: Hennrick wanting to go home,
everyone refusing King Dino's coins, Blossoms-only at the bar, Etcher
etching everything (including citations and snores), Mont having eaten the
Library's VHS tapes.

## Open questions for the author

1. Who are "the Ancient" and "Mama W" on the map? Neither speaks.
2. (answered) Flint and the code's acorns are the same thing; flint is the game's word.
3. What is the Field Office for? The building exists but carries no text.
4. GLOOPERNAUGHT, PATCHOOLEE, STAPLERS, "works of Orson / Appterix": sign
   text only; any backstory?
5. Hennrick's era: how far in the future, and who is the Consortium there?

## Two names the author uses (keep them apart)

- **The Event** is the planting event: the "GARDEN EVENT" the campfire panel
  starts (Summoning Stone, Seeds, Snacks), the gardening at the garden with the
  pillar and the night. In the code it is `me`, whose own label is "finale".
  The performance notes, `event_probe.js` and `event_profile.js` all mean this.
- **The Speech** is Sparkakus's finale in the library: with the three Artifacts
  he assembles the Eye and awards the Gem. In the code it is `speech`.
