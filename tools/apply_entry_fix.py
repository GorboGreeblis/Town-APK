#!/usr/bin/env python3
"""Produce the APK copy of the game from the untouched original.

Usage:  python3 tools/apply_entry_fix.py [src] [dst]
        python3 tools/apply_entry_fix.py --experiment nobatch|noeffects|nogovernor [src] dst   (diagnostic variant)
        python3 tools/apply_entry_fix.py --entry-only [src] dst   (VR-entry edits only, no gameplay fixes)
        python3 tools/apply_entry_fix.py --verify [src] [dst]
Default src: tools/uncompressed.html   Default dst: tools/android/app/src/main/assets/index.html

--verify does not write anything: it re-derives the patched file from src and
checks that dst is byte-identical to it, i.e. the APK copy differs from the
original by exactly these edits and nothing else.

The game is copied byte-for-byte except for the VR-entry fix below. The fix only
changes how the game enters VR when Meta Quest launches it in immersive mode
(the browser fires a `sessiongranted` event instead of waiting for a button press).
No gameplay, art, audio or world code is touched.

Every replacement must match exactly once; the script fails loudly otherwise.
"""
import sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
# --experiment NAME: additionally apply one diagnostic variant (headset A/B tests for B12 etc.).
# Variants are never used for the release asset; build_experiment.sh writes them elsewhere.
EXPERIMENTS = {
    # Draw every mesh individually: no gcEB batches, no custom vertex shader.
    "nobatch": [("const gcEB={list:[],mats:new WeakMap,geos:new WeakMap,root:null,N:32,f:0,tmp:[]};",
                 "const gcEB={list:[],mats:new WeakMap,geos:new WeakMap,root:null,N:32,f:0,tmp:[],off:!0};")],
    # No pickup effects: no sparkle particles, no floating labels, no HUD/label texture churn from pickups.
    "noeffects": [("gcEB.ready=!0;", "gcEB.ready=!0;Nt.sparkle=()=>{};Ut.at=()=>{};Ut.above=()=>{};")],
    # Quality governor frozen: foveation stays 0 and the layer is never rebuilt.
    "nogovernor": [("quality:[1,1,1,1,1],foveation:[0,.25,.5,.75,1],sosScale:.82,sosFrac:1.6,sosFrames:216,maxLayerRebuilds:30,",
                    "quality:[1,1,1,1,1],foveation:[0,0,0,0,0],sosScale:1,sosFrac:1.6,sosFrames:216,maxLayerRebuilds:0,")],
}
experiment = None
_argv = sys.argv[1:]
if "--experiment" in _argv:
    experiment = _argv[_argv.index("--experiment") + 1]
    if experiment not in EXPERIMENTS:
        sys.exit("unknown experiment %r; known: %s" % (experiment, ", ".join(EXPERIMENTS)))
    _argv = [a for i, a in enumerate(_argv) if a != "--experiment" and (i == 0 or _argv[i - 1] != "--experiment")]
args = [a for a in _argv if a not in ("--verify", "--entry-only")]
verify = "--verify" in sys.argv[1:]
# --entry-only: write src + the 4 VR-entry edits only (no gameplay fixes), for before/after comparisons in the harness.
entry_only = "--entry-only" in sys.argv[1:]
src = pathlib.Path(args[0]) if len(args) > 0 else root / "tools" / "uncompressed.html"
dst = pathlib.Path(args[1]) if len(args) > 1 else root / "tools" / "android" / "app" / "src" / "main" / "assets" / "index.html"

html = src.read_text(encoding="utf-8")

EDITS = [
    # 1. Head script: catch the Quest Browser's WebXR grant before the 1 MB of game
    #    scripts parse, and request the session *inside* the grant handler (the only
    #    moment the browser allows a session without a controller press). The session
    #    is parked in window.__gtXR.pending until the game has finished building.
    (
        '<title>Greeblis Town</title>',
        '<title>Greeblis Town</title>'
        '<script>/* APK immersive launch: capture the WebXR grant early (see tools/apply_entry_fix.py) */'
        '(function(){var X=window.__gtXR={granted:!1,pending:null,enter:null};'
        'try{navigator.xr&&navigator.xr.addEventListener("sessiongranted",function(){X.granted=!0;'
        'if(X.enter){X.enter();return}'
        'try{var p=navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]});'
        'X.pending=p;p.then(function(s){try{s.addEventListener("end",function(){X.pending===p&&(X.pending=null)})}catch(e){}},'
        'function(){X.pending===p&&(X.pending=null)})}catch(e){X.pending=null}})}catch(e){}})();</script>'
    ),
    # 2. Gate: expose the game's own "enter VR" routine to the head script, and enter
    #    at once if the grant already arrived and the world is ready.
    (
        'const t=()=>{o.presenting||(gcEB.ready&&je())};try{navigator.xr.addEventListener("sessiongranted",t)}catch(e){}',
        'const t=()=>{o.presenting||(gcEB.ready&&je())};try{navigator.xr.addEventListener("sessiongranted",t)}catch(e){}'
        'try{window.__gtXR&&(window.__gtXR.enter=t,window.__gtXR.granted&&gcEB.ready&&t())}catch(e){}',
    ),
    # 3. World ready: if the grant arrived while the world was still building, enter now.
    (
        'gcEB.ready=!0}()',
        'gcEB.ready=!0;try{window.__gtXR&&window.__gtXR.granted&&window.__gtXR.enter&&window.__gtXR.enter()}catch(e){}}()',
    ),
    # 4. Session request: reuse the session parked by the head script when there is one.
    (
        'a=await navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]})',
        'a=await(window.__gtXR&&window.__gtXR.pending||navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]}))',
    ),
]

# ---------------------------------------------------------------------------
# Gameplay fixes (approved bug fixes; see tools/NOTES.md for the investigation).
# ---------------------------------------------------------------------------
GAME_FIXES = [
    # Mushroom stuck beside/behind his kiosk. The navigator's segment test
    # ignored a building entirely whenever BOTH ends of the segment lay inside
    # the building's clearance margin, so a route from a spot beside the kiosk
    # to the front waypoint (both within ~1 m of the walls) was reported clear
    # and he walked into the wall for good. The fix: when either end is within
    # the margin, test the segment against the real hull instead (and still
    # ignore the building when both ends are inside it, i.e. walking indoors).
    (
        'segBlocked(x0,z0,x1,z1,n){for(const B of this.buildings){if(this.inHull(B,x0,z0,n)&&this.inHull(B,x1,z1,n))continue;'
        'const[ax,az]=this.local(B,x0,z0),[bx,bz]=this.local(B,x1,z1),h=B.hull,dx=bx-ax,dz=bz-az;let t0=0,t1=1;'
        'const clip=(p,q)=>{if(Math.abs(p)<1e-9)return q>=0;const r=q/p;return p<0?r>t1?!1:(r>t0&&(t0=r),!0):r<t0?!1:(r<t1&&(t1=r),!0)};'
        'if(clip(-dx,ax-(h[0]-n))&&clip(dx,h[2]+n-ax)&&clip(-dz,az-(h[1]-n))&&clip(dz,h[3]+n-az)&&t0<=t1)return!0}return!1}',
        'segBlocked(x0,z0,x1,z1,n){for(const B of this.buildings){let m=n;if(this.inHull(B,x0,z0,n)||this.inHull(B,x1,z1,n)){if(this.inHull(B,x0,z0)&&this.inHull(B,x1,z1))continue;m=0}'
        'const[ax,az]=this.local(B,x0,z0),[bx,bz]=this.local(B,x1,z1),h=B.hull,dx=bx-ax,dz=bz-az;let t0=0,t1=1;'
        'const clip=(p,q)=>{if(Math.abs(p)<1e-9)return q>=0;const r=q/p;return p<0?r>t1?!1:(r>t0&&(t0=r),!0):r<t0?!1:(r<t1&&(t1=r),!0)};'
        'if(clip(-dx,ax-(h[0]-m))&&clip(dx,h[2]+m-ax)&&clip(-dz,az-(h[1]-m))&&clip(dz,h[3]+m-az)&&t0<=t1)return!0}return!1}',
    ),
    # Hennrick's campfire line was missing its subject.
    (
        'campfire:"Sometimes worry that doing these things will alter the timeline…"',
        'campfire:"Sometimes I worry that doing these things will alter the timeline…"',
    ),
    # B8: only the shopkeeper should pause while the Shop menu is open. holdsAll()
    # froze every NPC for any panel but the battle; now the shop panel is excluded
    # and Zollod (cutebex) is paused through the targeted branch instead.
    (
        'function holdsAll(){return jt.has("panel")&&!(_t.state&&"battle"===_t.state.kind)}',
        'function holdsAll(){return jt.has("panel")&&!(_t.state&&("battle"===_t.state.kind||"shop"===_t.state.kind))}',
    ),
    (
        'jt.has("panel")&&xe.lastTarget===e&&"campfire"!==(_t.state&&_t.state.kind)){e.moving=!1,e.gcWant=0,',
        'jt.has("panel")&&xe.lastTarget===e&&"campfire"!==(_t.state&&_t.state.kind)||jt.has("panel")&&_t.state&&"shop"===_t.state.kind&&e.def&&"ZOLLOD"===e.def.name){e.moving=!1,e.gcWant=0,',
    ),
    # B7: a failed VR request showed leftover wording for one frame and was then
    # overwritten by "Press A". Show a real message and hold it for 8 seconds.
    (
        'e&&/Security|NotSupported/.test(e.name)&&(mo("gateText").textContent="VR can\'t start in this preview.\\nOpen the inscription\'s own page.")',
        'e&&(mo("gateText").textContent="VR could not start ("+(e.name||"error")+").\\nClick or press A to try again.",mo("gateText").holdUntil=performance.now()+8e3)',
    ),
    (
        'if(gcEB.ready&&Ke.textContent!=="Press A to Continue.")Ke.textContent="Press A to Continue."',
        'if(gcEB.ready&&Ke.textContent!=="Press A to Continue."&&!(Ke.holdUntil>performance.now()))Ke.textContent="Press A to Continue."',
    ),
    # B1: when a posted NPC's straight walk to a waypoint outside any building would
    # cross a real wall, re-route at once instead of pinning against the wall for
    # a second until the stuck detector notices.
    (
        'if(t.vbk>=0&&dh>.3){const w=via[t.vbk],dx=w[0]-n.x,dz=w[1]-n.z,d=Math.hypot(dx,dz)||1,st=Math.min(d,1.4*wk*o);',
        'if(t.vbk>=0&&dh>.3){const w=via[t.vbk],dx=w[0]-n.x,dz=w[1]-n.z,d=Math.hypot(dx,dz)||1,st=Math.min(d,1.4*wk*o);'
        'if(!F.buildings.some((B=>F.inHull(B,n.x,n.z)||F.inHull(B,w[0],w[1])))&&F.segBlocked(n.x,n.z,w[0],w[1],0))t.gcWant=1,t.gcBlk=1.3;',
    ),
    # B4: the route smoother only checked grid cells, so a long straightened leg
    # could clip a building corner; also reject legs that cross a real hull.
    (
        'clear=(ax,az,bx,bz)=>{const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.3));',
        'clear=(ax,az,bx,bz)=>{if(F.segBlocked(ax,az,bx,bz,.3))return!1;const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.3));',
    ),
    # B11: Nextessa (the pizza courier) pinned against the Ancient. Inside the
    # church she walked straight at the player; when the player stood on the far
    # side of the Ancient, the Ancient's solid part blocked the line and nothing
    # re-routed her (and the same straight line pinned her on the way out).
    # Add a detour helper: if the church-local segment crosses the Ancient's box
    # (plus her radius), walk around its front corners first. Used for the
    # approach and for the exit path. The corners sit 1 m outside the margin so
    # follow()'s 1 m arrival radius cannot swallow them; a courier already at her
    # own-side corner walks straight (no detour loop).
    (
        'mark=()=>{kx=i.x,kz=i.z,kt=u},planIn',
        'mark=()=>{kx=i.x,kz=i.z,kt=u},segRect=(ax,az,bx,bz,R)=>{let t0=0,t1=1;const dx=bx-ax,dz=bz-az,cl=(p,q)=>{if(0===p)return q>=0;const r=q/p;if(p<0){if(r>t1)return!1;r>t0&&(t0=r)}else{if(r<t0)return!1;r<t1&&(t1=r)}return!0};return cl(-dx,ax-R[0])&&cl(dx,R[2]-ax)&&cl(-dz,az-R[1])&&cl(dz,R[3]-az)},detour=(ax,az,bx,bz)=>{if(!cb||!JGP.slug||!JGP.slug.ent)return[];const mg=.8*rr+.25,[sx,sz]=F.local(cb,JGP.slug.ent.home.x,JGP.slug.ent.home.z),AB=cb.parts.find((R=>sx>R[0]&&sx<R[2]&&sz>R[1]&&sz<R[3]));if(!AB)return[];const[ax2,az2]=F.local(cb,ax,az),[bx2,bz2]=F.local(cb,bx,bz),X=[AB[0]-mg,AB[1]-mg,AB[2]+mg,AB[3]+mg],same=Math.sign(ax2||1)===Math.sign(bx2||1),endIn=bx2>X[0]&&bx2<X[2]&&bz2>X[1]&&bz2<X[3];if(same&&endIn||!segRect(ax2,az2,bx2,bz2,X))return[];const fz=X[3]+.6,cx=s2=>s2>0?X[2]+1:X[0]-1,c1=[cx(Math.sign(ax2||1)),fz],c2=[cx(Math.sign(bx2||1)),fz];if(same&&Math.hypot(ax2-c1[0],az2-c1[1])<1.2)return[];return(same?[c1]:[c1,c2]).map((([x,z])=>F.world(cb,x,z)))},planIn',
    ),
    (
        'planOut=()=>{const v=sv();wp=v.way.slice().reverse().concat([v.out]),wi=0,we=!0,kn=0,n.inside="church",n.wallNear=!1,mark()}',
        'planOut=()=>{const v=sv(),lw=v.way[v.way.length-1];wp=detour(i.x,i.z,lw[0],lw[1]).concat(v.way.slice().reverse(),[v.out]),wi=0,we=!0,kn=0,n.inside="church",n.wallNear=!1,mark()}',
    ),
    (
        'else{const t=l.x-i.x,c=l.z-i.z,h=Math.hypot(t,c);if(h>o.stopDist+.001&&!n.wallNear&&"playing"===jt.top){const t=Math.min(h-o.stopDist,o.speed*e),a=it(i,l,!1);',
        'else{const t=l.x-i.x,c=l.z-i.z,h=Math.hypot(t,c),dv=me0&&plr&&h>o.stopDist+.001&&"playing"===jt.top?detour(i.x,i.z,l.x,l.z):[];if(dv.length)wp=dv,wi=0,we=!1,kn=0,mark(),n.moving=!0,r="arriving";else if(h>o.stopDist+.001&&!n.wallNear&&"playing"===jt.top){const t=Math.min(h-o.stopDist,o.speed*e),a=it(i,l,!1);',
    ),
]

for old, new in EDITS + ([] if entry_only else GAME_FIXES) + (EXPERIMENTS[experiment] if experiment else []):
    n = html.count(old)
    if n != 1:
        sys.exit(f"ERROR: anchor found {n} times (expected 1): {old[:80]!r}")
    html = html.replace(old, new)

if verify:
    current = dst.read_bytes() if dst.exists() else b""
    if current == html.encode("utf-8"):
        print(f"VERIFY OK: {dst} == {src} + {len(EDITS)} entry-fix edits + {len(GAME_FIXES)} gameplay fixes, nothing else")
        sys.exit(0)
    sys.exit(f"VERIFY FAILED: {dst} is not the original plus the {len(EDITS)} entry-fix edits and {len(GAME_FIXES)} gameplay fixes")

dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(html, encoding="utf-8")
print(f"wrote {dst} ({len(html.encode('utf-8'))} bytes, {len(EDITS)} entry edits + {len(GAME_FIXES)} gameplay fixes)")
