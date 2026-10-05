# Pins the React Native dev-server host of the installed debug app to 127.0.0.1:8081 (reached through
# `adb reverse`) instead of the emulator NAT alias 10.0.2.2, which RN picks by default on a stock emulator.
# The NAT path silently corrupts large bundle downloads on some Windows hosts (single bytes dropped at TCP
# segment boundaries once the dev bundle passes ~15 MB), which surfaces in the dev client as
# "ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd". See docs/RUNBOOK.md §2.
#
# Usage (emulator running, debug build installed):  powershell -File scripts/emulator-metro-host.ps1
param(
  [string]$Package = 'com.mastajazz.oneQapp',
  [string]$HostPort = '127.0.0.1:8081'
)

$ErrorActionPreference = 'Stop'
$port = $HostPort.Split(':')[-1]
$xml = "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>`n<map>`n    <string name=`"debug_http_host`">$HostPort</string>`n</map>`n"
$tmp = Join-Path $env:TEMP 'oneq-debug-host.xml'
[IO.File]::WriteAllText($tmp, $xml)

adb reverse "tcp:$port" "tcp:$port" | Out-Null
adb push $tmp /data/local/tmp/oneq-debug-host.xml | Out-Null
adb shell "run-as $Package sh -c 'mkdir -p shared_prefs && cp /data/local/tmp/oneq-debug-host.xml shared_prefs/${Package}_preferences.xml && chmod 660 shared_prefs/${Package}_preferences.xml'"
adb shell am force-stop $Package
Write-Host "debug_http_host=$HostPort written for $Package; open the dev client again (adb reverse tcp:$port is active)."
