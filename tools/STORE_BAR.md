# The Meta Horizon Store's submission bar in 2026

Researched 2026-11-07 for the submission of the final build, 4.0.63 (the author: "research the actual bar for
submission in 2026. I see they've opened the Store to a lot of lower quality games. What has changed in recent
years?"). Meta's own pages are the primary source; press and developer reports are marked as such. Quotes are short
and exact; the sources and their dates are at the end.

## In short

- **The quality and taste gate is gone (since 2024).** Meta announced on 2024-04-22 that the Store would publish every
  title that meets its "basic technical, content, and privacy requirements", as App Lab did; App Lab was folded into
  the Store from 2024-08-05 (an "Early Access" label replaced it). Before that, the main Store was curated: titles
  could be turned away on taste or quality, and App Lab was the unlisted back door. The author is right: the Store is
  much less strict than it used to be **on quality**.
- **The technical bar is not gone.** The review still checks every title against the Virtual Reality Checks (VRCs)
  and the content, data-use and app policies. A failed VRC sends the submission back ("Changes Requested") until it
  is fixed. Outright rejection is rare and kept for serious violations (security, adult content and the like).
- **The VRCs themselves have been trimmed, not raised.** Three were retired: Performance.2 (the 45-minute thermal
  run, 2024-10-16), Functional.8 (downloads with the headset off, 2024-07-31) and Input.6 (hiding untracked hands,
  2021). The list has been stable since (the VRC page last updated 2026-08-19; the list read on 2026-10-27 and again
  on 2026-11-07 is the same).
- **One new strictness:** "For apps in heavily saturated categories or genres, review may be concluded upon the first
  identified guideline violation" (Submitting your app, updated 2026-05-08): a crowded genre gets less benefit of the
  doubt. And titles "may be re-reviewed as they scale to more people" (2024): a title that grows can be looked at
  again.
- **What fails titles in practice** is a short list Meta publishes ("Common VRC failures", updated 2026-05-01):
  pausing (Functional.2), focus awareness (Input.4), frame rate (Performance.1), grip vs trigger (Input.2), input
  switching and the system gesture (Input.7, Input.8), entitlement (Security.1), permissions (Security.2), play mode
  (Tracking.1), cover art and screenshots (Asset.2, Asset.5), and the internet notice (Functional.7).

So the bar in 2026 is a checklist, not a judgement: a title that meets the VRCs and the policies is published, however
small or unpolished; the effect of the 2024 opening shows in the store itself (below).

## What changed, in order

| When | Change | Source |
| --- | --- | --- |
| 2021-11-23 | Input.6 retired (hands need not be hidden when tracking is lost or uncertain) | VRC.Quest.Input.6 page |
| 2024-04-22 | Meta: the Store will publish every title meeting "basic technical, content, and privacy requirements"; "Titles are reviewed at submission and may be re-reviewed as they scale to more people"; App Lab to be folded in, in stages | Meta blog, "A More Open Ecosystem For Developers" |
| 2024-04 | The Quest Store renamed the Meta Horizon Store | Wikipedia (Meta Horizon Store) |
| 2024-07-31 | Functional.8 retired (continuing downloads with the headset off is the OS's job) | VRC.Quest.Functional.8 page |
| 2024-08-05 | App Lab gone: its apps listed and searchable in the Store; an optional "Early Access" label instead ("not finalized ... expect changes"; turning it off cannot be undone); VRCs for the Store and App Lab merged into one guide | UploadVR (2024-07-06); Meta, "Get Your App Ready for the Meta Horizon Store" |
| 2024-08 | Discoverable Quest apps more than tripled with App Lab's titles in the Store | Road to VR |
| 2024-10-16 | Performance.2 retired: no more 45-minute thermal-throttling run; "other performance tests are more reliable indicators of quality" | VRC.Quest.Performance.2 page |
| 2024-2025 | Developers report harder discovery: Horizon Worlds clones and low-effort apps crowding search and shelves; a deliberately bad test app ("The Unity Cube") listed in the main Store after the merge | UploadVR; Road to VR; Yahoo Tech; The Ghost Howls (press and opinion) |
| 2026-03-12 | GDC 2026: Horizon Worlds' individual worlds removed from the Store shelves ("universally unpopular with our developer community"); store revenue in 2025 "up very slightly"; most customers "come with a specific title in mind"; Horizon+ (the subscription) stays curated | Meta blog, "The State of VR at GDC 2026" |
| 2026-05-01 | "Common VRC failures and best practices" updated (the list above) | Meta |
| 2026-05-08 | "Submitting your app" updated: the saturated-categories rule; submit two weeks before the target launch | Meta |
| 2026-06-09 | Meta Credits no longer sold on the Store | Meta (Meta credits page) |
| 2026-08-19 | The VRC list page last updated; no VRC added or retired since 2024 | Meta (VRC guidelines) |
| 2026-09-24 | Developer Dashboard release: developer ID verification through a third party | Meta (dashboard release notes) |

## The 60 fps bar (Performance.1), exactly

Researched 2026-11-07 (the author: "how strict is the current 60 fps bar? Would we possibly fail it, in reality. Or
just technically?"). From Meta's VRC.Quest.Performance.1 page (updated 2025-10-22):

- **Criterion:** "Apps must maintain a rendering rate of at least 60 fps"; interactive apps run at 72, 80, 90, 96, 100
  or 120 Hz. Required for immersive apps.
- **The reviewer's test:** "Use the app for the length of the content or 45 minutes, whichever is shorter"; open the
  OVR Metrics Tool's log; "Observe the FPS graph to determine if extended periods of rendering rate below 60 fps are
  present."
- **The pass:** "The application should not experience extended periods of rendering rate below 60 fps." Loading
  screens, full-screen fades and system menu overlays are excluded. "Extended" is not defined: no number of seconds,
  no average, no tolerance figure.
- **It was lowered in 2024:** the revision of 2024-08-07, "Lowered rendering rate requirements. Minimum 60 fps"
  (before, the rendering rate had to meet the refresh rate, 72 fps); 2024-03-11 allowed half rate with Application
  SpaceWarp (not available to a WebXR game); 2025-09-02 excluded loading screens and fades.
- Meta's "Common VRC failures" page (2026-05-01) still lists Performance.1 among the most failed, describing it as
  "display at 72 fps": older wording than the VRC page, which governs.

**What it means for this game.** The test is a person watching a graph for stretches below 60, not a count of single
seconds. In the author's 4.0.62 run (Quest 3S) the headset's per-second count was under 60 in about 15 single seconds
of play (56-59; the longest run three seconds at 58), and every 10-second reading was 61.2 or more; the author's OVR Metrics
check of the final build: no extended drop. The longest weak stretch was about 15 seconds at the heaviest Event view
(17:28:10-25: 59, 60, 65, 58, 58, 58, 66, 59, 62 ... 56): the graph there dips to the high 50s and back, a jagged
line around 60, not a stretch below it. The final build is a few percent lighter in the Event.

- **Quest 3S:** a fail would need a reviewer to read a few seconds at 56-59 as an "extended period". Possible in
  principle, unlikely in practice: the page's own wording and the graph-reading test are aimed at sustained drops.
  This is the "technically" case, not the "in reality" one.
- **Quest 3 (not tried):** the same CPU and about 30% more pixels; estimated from the author's run with the final build's
  saving (`fps_estimate.js --device q3s`): 5 of 295 Event seconds under 60, the longest run under 60 one second, no run
  of 3 s or more (the 4.0.62 run itself on the 3S: 10 seconds, the longest run 3 s, the 58-58-58 at the heaviest view).
  Isolated dips, not a sustained drop; one session's path, and the headset's clock on the day, bound how sure this is. The fallback is in VRC.md.
- No public data was found on how reviewers judge "extended" in practice (no Meta figure, no developer reports with
  numbers).

## How a submission goes now

- Review checks the build against the VRCs, and the store listing (assets, copy) against the design guidelines
  ("During the review, Meta will verify that your assets and copy meet our design guidelines, and approve your
  release").
- A problem gives **Changes Requested** with an explanation; fix and resubmit. "Outright rejections are rare", kept
  for security, adult content "or another serious violation". While under review the build, copy and assets are
  locked.
- Plan two weeks before launch. No current, reliable figure for review time was found (Meta's pages say "several
  business days"; older App Lab notes say volume made reviews longer).
- After release: a new binary needs **no** review ("you can update your app binary without any additional review");
  listing (metadata) changes are reviewed, "usually ... 1-2 business days".
- Saturated genres may be stopped at the first violation found; a title may be re-reviewed as it grows.

## What this means for GREEBLIS TOWN (4.0.63)

- **No quality judgement to fear.** Taste and polish are not review criteria any more. The game is reviewed against
  the same checklist as every title, and VRC.md shows every required check passing on the final build or not
  applying.
- **The common failures are the ones already settled:** pausing with the system menu and the headset off
  (Functional.2; B115-B125, confirmed by the author on the final build), focus awareness (Input.4, tested), frame rate
  (Performance.1: the author's OVR Metrics check on the Quest 3S; the Quest 3 estimated, not tried), play mode
  (Tracking.1: seated and standing, confirmed), cover art and screenshots (Asset.2, Asset.5: real screenshots, no
  added text). Grip vs trigger (Input.2) is recommended only; Input.7/Input.8 and the internet notice do not apply
  (no hand tracking, no network); Security.1 is recommended and the game uses no platform features.
- **Not a saturated genre** in the sense of the rule as far as can be told (a small hand-made town to explore, not a
  Gorilla Tag-like or a shooter), so review is unlikely to stop at a first finding without a full read.
- **Updates are cheap:** if review or players find a bug after launch, a fixed binary ships without another review.
- **The estimate.** Before this research the chance of a first-try pass was put at about 70-80% (after any requested
  changes, above 90%). With no quality gate, review is the VRC checklist, which the build has been tested against
  item by item: the first-try estimate rises to about **80-90%**. The open risks are the same: the Quest 3's frame
  rate (Performance.1, not tried on a Quest 3; fallback in VRC.md), something a reviewer finds in their own play, and
  the listing's copy. These are estimates, not guarantees.
- **Visibility is the hard part now, not approval.** With the gate gone, the Store is crowded; developers report that
  discovery, not review, is what decides how many people find a title (UploadVR, 2024-2025; Meta at GDC 2026: most
  customers arrive with a specific title in mind). That is outside the build, in the listing and in telling people
  about the game.

## Uncertain or not found

- No independent 2025-2026 data on review times or on how strictly each VRC is enforced; the reports of lenient
  approval are from 2024-2025, mostly press and opinion.
- "Re-reviewed as they scale" has no stated trigger or process.
- Whether a quiet quality filter affects **visibility** (shelves, search) is not documented; developers' complaints
  suggest discovery favours popularity.
- Meta's quick start guide lists the Data Use Checkup among the steps before submission, while the Data Use page
  says "Apps that don't use these Platform SDK features do not need a DUC" (this game uses none). If the dashboard
  asks for one at submission, it is a short form declaring no data use.
- Meta's downloadable VRC test plan is "slightly out of date" by Meta's own note and was not used.

## Sources

Meta (primary):
- [A More Open Ecosystem For Developers](https://developers.meta.com/vr/blog/a-more-open-ecosystem-for-developers/) (2024-04-22)
- [Get Your App Ready for the Meta Horizon Store](https://developers.meta.com/vr/blog/get-apps-ready-app-lab-meta-horizon-store-meta-quest-developers/) (2024)
- [Submitting your app](https://developers.meta.com/vr/resources/publish-submit/) (updated 2026-05-08)
- [After submission](https://developers.meta.com/vr/resources/publish-after-sub/) (updated 2024-09-23)
- [Common VRC failures and best practices](https://developers.meta.com/horizon/resources/publish-common-vrc-failures/) (updated 2026-05-01)
- [Meta Quest VRC guidelines](https://developers.meta.com/horizon/resources/publish-quest-req/) (updated 2026-08-19)
- [VRC.Quest.Performance.2](https://developers.meta.com/vr/resources/vrc-quest-performance-2/), [VRC.Quest.Functional.8](https://developers.meta.com/horizon/resources/vrc-quest-functional-8/), [VRC.Quest.Input.6](https://developers.meta.com/vr/resources/vrc-quest-input-6/) (retirement dates)
- [VRC.Quest.Privacy.5](https://developers.meta.com/horizon/resources/vrc-quest-privacy-5/) (VRC.md)
- [The State of VR at GDC 2026](https://developers.meta.com/horizon/blog/gdc-2026-state-of-vr/) (2026-03-12)
- [GDC 2026 Highlights: What's Next on Meta Horizon OS](https://developers.meta.com/horizon/blog/gdc-2026-highlights-whats-next-meta-horizon-os/)
- [Meta credits](https://developers.meta.com/vr/resources/monetization-meta-credits-open-beta/)
- [Horizon Developer Dashboard 09.24.2026](https://developers.meta.com/vr/downloads/package/horizon-developer-dashboard/09.24.2026/)
- [Frequently asked questions](https://developers.meta.com/vr/faqs/)

Press and developer reports (secondary; some opinion):
- [UploadVR: Meta Is Getting Rid Of App Lab And Opening Up The Store](https://www.uploadvr.com/meta-getting-rid-of-quest-app-lab/)
- [UploadVR: Early Access Tag Replaces App Lab On Meta Horizon Store From August 5](https://www.uploadvr.com/meta-horizon-store-app-lab-replaced-by-early-access/) (2024-07-06)
- [UploadVR: From Quest To Horizon: How Meta's Shifting Priorities Are Affecting Developers](https://www.uploadvr.com/from-quest-to-horizon-how-metas-shifting-priorities-are-affecting-developers/)
- [Road to VR: The Number of Discoverable Quest Apps Has More Than Tripled With the Merging of App Lab](https://www.roadtovr.com/meta-quest-app-lab-merge-app-count/)
- [Road to VR: The Worst Game on the Horizon Store Now Runs Better Than Any Other on Quest 3](https://roadtovr.com/unity-cube-worst-meta-quest-game-on-purpose-app-lab/)
- [Yahoo Tech: The Meta Quest 3 Store Is a Cesspool, Here's How to Avoid the Shovelware](https://tech.yahoo.com/gaming/articles/meta-quest-3-store-cesspool-163011410.html)
- [The Ghost Howls: Meta should improve its Store to support more its developers](https://skarredghost.com/2024/11/11/meta-quest-store-developers-problems/) (2024-11-11)
- [The Ghost Howls: How to prepare your App Lab app for the Meta Quest Horizon Store](https://skarredghost.com/2024/08/02/prepare-app-lab-meta-horizon-store/) (2024-08-02)
- [Wikipedia: Meta Horizon Store](https://en.wikipedia.org/wiki/Meta_Horizon_Store)
- [Meta community forums: Can not pass VRC.Quest.Functional.6](https://communityforums.atmeta.com/discussions/dev-general/can-not-pass-vrc-quest-functional-6-app-must-only-include-quest-hmds-and-control/940817) (one developer's experience)
