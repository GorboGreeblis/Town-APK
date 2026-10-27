#!/usr/bin/env python3
"""Video check for headset recordings (the author's captures, e.g. a Quest recording with the OVR Metrics overlay).

Finds flash frames: one to three frames whose picture jumps in brightness or colour and then comes back (NOTES 67:
the washed-out frames from texture uploads during a multiview frame). Prints each with its time, and writes a
contact sheet of the worst ones (frame before, the flash, frame after) to tools/.runs/video/flashes.png.
With --ovr it also crops the OVR Metrics overlay every 10 s into tools/.runs/video/ovr.png, to read FPS, CPU and
GPU utilisation and the app's GPU time per frame (APP T, microseconds) at a glance.

    python3 -I tools/video_check.py recording.mp4 [--ovr] [--threshold 18]

Needs ffmpeg and ffprobe. The recording is only read (decoded by ffmpeg); nothing in it is executed.
"""
import json, os, subprocess, sys

def run(cmd, **kw):
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, **kw).stdout

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    video = os.path.abspath(args[0])
    thr = 18.0
    if '--threshold' in sys.argv:
        thr = float(sys.argv[sys.argv.index('--threshold') + 1])
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, '.runs', 'video')
    os.makedirs(out, exist_ok=True)
    info = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', video]))
    W0, H0 = info['streams'][0]['width'], info['streams'][0]['height']
    dur = float(info['format']['duration'])
    W, H = 64, 36
    raw = run(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'scale={W}:{H},format=rgb24', '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    fs = W * H * 3
    n = len(raw) // fs
    frames = [raw[i * fs:(i + 1) * fs] for i in range(n)]
    def diff(a, b):
        return sum(abs(x - y) for x, y in zip(a, b)) / len(a)
    mean = [sum(f) / len(f) for f in frames]
    ch = [0.0] + [diff(frames[i], frames[i - 1]) for i in range(1, n)]
    t = lambda i: i * dur / max(1, n)
    cands = []
    i = 1
    while i < n - 1:
        if ch[i] > thr:
            for k in (1, 2, 3):
                if i + k < n and diff(frames[i + k], frames[i - 1]) < ch[i] * 0.45:
                    cands.append({'frame': i, 'frames': k, 'time': round(t(i), 2), 'change': round(ch[i], 1), 'brightness_before': round(mean[i - 1], 1), 'brightness_during': round(mean[i], 1)})
                    i += k
                    break
        i += 1
    print(f'{os.path.basename(video)}: {W0}x{H0}, {dur:.1f} s, {n} frames')
    if not cands:
        print('no flash frames found (threshold %.0f)' % thr)
    else:
        brighter = sum(1 for c in cands if c['brightness_during'] > c['brightness_before'])
        print(f'{len(cands)} flash candidates ({brighter} brighter, {len(cands) - brighter} darker than the frame before):')
        for c in cands:
            print(f"  {c['time']:7.2f} s  frame {c['frame']:5d}  {c['frames']} frame(s)  change {c['change']:5.1f}  brightness {c['brightness_before']} -> {c['brightness_during']}")
        worst = sorted(cands, key=lambda c: -c['change'])[:4]
        sel = '+'.join(f"between(n\\,{c['frame'] - 1}\\,{c['frame'] + 1})" for c in sorted(worst, key=lambda c: c['frame']))
        run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vsync', '0', '-vf', f"select='{sel}',scale=480:-1,tile=3x{len(worst)}", '-frames:v', '1', os.path.join(out, 'flashes.png')])
        print('contact sheet (before | flash | after, worst first by time): ' + os.path.join(out, 'flashes.png'))
    if '--ovr' in sys.argv:
        # The overlay sits top centre in a Quest capture; crop proportionally to the video size.
        cw, chh, cx, cy = int(W0 * 0.365), int(H0 * 0.2), int(W0 * 0.365), int(H0 * 0.02)
        times = [x for x in range(2, int(dur), 10)]
        files = []
        for k, s in enumerate(times):
            f = os.path.join(out, f'ovr_{k}.png')
            run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s), '-i', video, '-frames:v', '1', '-vf', f'crop={cw}:{chh}:{cx}:{cy},drawtext=text=\'{s}s\':x=4:y=4:fontcolor=red:fontsize=24', f])
            files.append(f)
        if files:
            inputs = sum((['-i', f] for f in files), [])
            cols = 2
            layout = '|'.join(f'{"+".join(["w0"] * (k % cols)) or "0"}_{"+".join(["h0"] * (k // cols)) or "0"}' for k in range(len(files)))
            run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', f'xstack=inputs={len(files)}:layout={layout}' if len(files) > 1 else 'null', os.path.join(out, 'ovr.png')])
            for f in files:
                os.remove(f)
            print('OVR Metrics overlay every 10 s: ' + os.path.join(out, 'ovr.png'))
    sys.exit(1 if cands else 0)

if __name__ == '__main__':
    main()
