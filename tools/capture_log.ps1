# Live headset log for one play session (Windows PowerShell), saved as UTF-8 for tools/perf_log.js (HEADSET_DIAG.md
# section 1): the headset runtime's VrApi lines (the frame rate, CPU and GPU use and free memory every second), from
# before the launch to the end, so nothing is lost to the headset's ring buffer. The shipped game writes no lines of
# its own (RULES.md 34).
#   powershell -ExecutionPolicy Bypass -File tools\capture_log.ps1            (Ctrl+C when done)
param([string]$Out = ("greeblis-run-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt"))
adb logcat -c
Write-Host "Capturing to $Out. Launch the game and play. Ctrl+C to stop."
adb logcat -v threadtime -s VrApi:I | ForEach-Object { $_ } | Out-File -FilePath $Out -Encoding utf8
