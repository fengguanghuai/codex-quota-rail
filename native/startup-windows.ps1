param([string]$Action,[string]$App,[string]$Key,[double]$Stamp=0)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class QuotaInput {
 [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
 [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 public static double Idle(){var i=new LASTINPUTINFO();i.cbSize=(uint)Marshal.SizeOf(i);if(!GetLastInputInfo(ref i))return -1;return unchecked((uint)Environment.TickCount-i.dwTime);}
 public static uint Foreground(){uint pid;GetWindowThreadProcessId(GetForegroundWindow(),out pid);return pid;}
}
'@
function Now { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
function InputStamp { $idle=[QuotaInput]::Idle(); if($idle -lt 0){return [double]::PositiveInfinity}; (Now)-$idle }
function Apps {
 @(Get-CimInstance Win32_Process -Filter "Name='$([IO.Path]::GetFileName($App).Replace("'","''"))'" | Where-Object { $_.ExecutablePath -eq $App -and $_.CommandLine -notmatch '--type=' } | ForEach-Object {
  $p=Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
  @{id="$($_.ProcessId):$($_.CreationDate.ToString('o'))";pid=[int]$_.ProcessId;age=((Get-Date)-$_.CreationDate).TotalSeconds;debug=($_.CommandLine -match '--remote-debugging-port');argumentsKnown=!!$_.CommandLine;finished=($p -and $p.MainWindowHandle -ne 0);frontmost=([QuotaInput]::Foreground() -eq $_.ProcessId)}
 })
}
function Emit($value){ConvertTo-Json -InputObject $value -Compress -Depth 5;[Console]::Out.Flush()}
if($Action -eq 'watch'){
 $name=[IO.Path]::GetFileName($App).Replace("'","''")
 Register-CimIndicationEvent -Query "SELECT * FROM Win32_ProcessStartTrace WHERE ProcessName='$name'" -SourceIdentifier QuotaStart | Out-Null
 Register-CimIndicationEvent -Query "SELECT * FROM Win32_ProcessStopTrace WHERE ProcessName='$name'" -SourceIdentifier QuotaStop | Out-Null
 try{
  Emit @{event='ready'}
  while($true){$event=Wait-Event;Remove-Event -EventIdentifier $event.EventIdentifier;Emit @{event='changed'}}
 }finally{Unregister-Event -SourceIdentifier QuotaStart -ErrorAction SilentlyContinue;Unregister-Event -SourceIdentifier QuotaStop -ErrorAction SilentlyContinue}
}elseif($Action -eq 'snapshot'){
 Emit @{apps=@(Apps);inputStamp=(InputStamp);now=(Now)}
}elseif($Action -eq 'quit'){
 $all=@(Apps);$target=$all | Where-Object {$_.id -eq $Key}
 if($all.Count -ne 1 -or !$target -or !$target.frontmost -or !$target.finished -or $target.debug -or $target.age -gt 8 -or (InputStamp) -gt $Stamp+100){Emit @{accepted=$false};exit}
 Emit @{accepted=(Get-Process -Id $target.pid).CloseMainWindow()}
}elseif($Action -eq 'launch'){
 if(@(Apps).Count){throw 'Another client already started'}
 # Do not request foreground activation after the handoff.
 Start-Process -FilePath $App -ArgumentList '--remote-debugging-address=127.0.0.1','--remote-debugging-port=39333'
 Emit @{launched=$true}
}else{throw 'Unknown action'}
