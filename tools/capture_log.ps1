# Live headset log for one play session (Windows PowerShell), saved as UTF-8 for tools/perf_log.js (HEADSET_DIAG.md).
# The game's lines (GreeblisServer: frame rate every 10 s, long frames, flash marks, uploads, compiles) and the headset
# runtime's (VrApi: frame rate, stale frames, CPU and GPU load every second), from before the launch to the end, so
# nothing is lost to the headset's ring buffer. Press B on the right controller whenever you see a flash.
#   powershell -ExecutionPolicy Bypass -File tools\capture_log.ps1            (Ctrl+C when done)
param([string]$Out = ("greeblis-run-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt"))
adb logcat -c
Write-Host "Capturing to $Out. Launch the game and play; press B on the right controller when you see a flash. Ctrl+C to stop."
adb logcat -v threadtime -s GreeblisServer:I VrApi:I | ForEach-Object { $_ } | Out-File -FilePath $Out -Encoding utf8
