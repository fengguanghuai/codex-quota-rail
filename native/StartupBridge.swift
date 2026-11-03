import AppKit
import CoreGraphics
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else { exit(2) }
let action = args[1], appPath = args[2]
func emit(_ value: Any) { if let data = try? JSONSerialization.data(withJSONObject: value), let text = String(data:data,encoding:.utf8) { print(text); fflush(stdout) } }
func apps() -> [NSRunningApplication] { NSWorkspace.shared.runningApplications.filter { $0.bundleURL?.standardizedFileURL.path == URL(fileURLWithPath:appPath).standardizedFileURL.path } }
// Pointer motion and release of the click that launched the app are not new actions.
// Keep key presses, new clicks, scrolling and dragging as restart blockers.
func stamp() -> Double {
 let types: [CGEventType] = [.keyDown, .flagsChanged, .leftMouseDown, .rightMouseDown, .otherMouseDown, .scrollWheel, .leftMouseDragged, .rightMouseDragged, .otherMouseDragged]
 let idle = types.map { CGEventSource.secondsSinceLastEventType(.combinedSessionState,eventType:$0) }.min() ?? 0
 return Date().timeIntervalSince1970 * 1000 - idle * 1000
}
func identity(_ app:NSRunningApplication)->String { "\(app.processIdentifier):\(app.launchDate?.timeIntervalSince1970 ?? 0)" }
func details(_ app:NSRunningApplication)->[String:Any] {
 let p=Process(), pipe=Pipe();p.executableURL=URL(fileURLWithPath:"/bin/ps");p.arguments=["-p",String(app.processIdentifier),"-o","args="];p.standardOutput=pipe;p.standardError=FileHandle.nullDevice
 var command:String? = nil
 do {try p.run();let data=pipe.fileHandleForReading.readDataToEndOfFile();p.waitUntilExit();if p.terminationStatus==0 {command=String(data:data,encoding:.utf8)}}catch{}
 let age = -(app.launchDate?.timeIntervalSinceNow ?? -999)
 return ["id":identity(app),"pid":app.processIdentifier,"age":age,"debug":command?.contains("--remote-debugging-port") ?? true,"argumentsKnown":command != nil,"finished":app.isFinishedLaunching,"frontmost":NSWorkspace.shared.frontmostApplication?.processIdentifier == app.processIdentifier]
}
func snapshot()->[String:Any] { ["apps":apps().map(details),"inputStamp":stamp(),"now":Date().timeIntervalSince1970*1000] }
if action == "watch" {
 let center=NSWorkspace.shared.notificationCenter
 var observers:[NSObjectProtocol]=[]
 for name in [NSWorkspace.didLaunchApplicationNotification,NSWorkspace.didTerminateApplicationNotification,NSWorkspace.didActivateApplicationNotification] {
  observers.append(center.addObserver(forName:name,object:nil,queue:.main){note in
   if let app=note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,app.bundleURL?.path==appPath {emit(["event":"changed"])}
  })
 }
 emit(["event":"ready"]);RunLoop.main.run()
} else if action == "snapshot" {emit(snapshot())
} else if action == "quit" {
 guard args.count==5,let expectedStamp=Double(args[4]),let app=apps().first(where:{identity($0)==args[3]}) else {exit(3)}
 let d=details(app)
 guard apps().count==1,d["frontmost"] as? Bool==true,d["finished"] as? Bool==true,d["debug"] as? Bool==false,(d["age"] as? Double ?? 999)<=8,stamp()<=expectedStamp+100 else {emit(["accepted":false]);exit(0)}
 emit(["accepted":app.terminate()])
} else if action == "launch" {
 guard args.count==4,let expectedStamp=Double(args[3]),apps().isEmpty else {exit(3)}
 let prior=NSWorkspace.shared.frontmostApplication?.processIdentifier
 let config=NSWorkspace.OpenConfiguration();config.activates=false
 config.arguments=["--remote-debugging-address=127.0.0.1","--remote-debugging-port=39333"]
 NSWorkspace.shared.openApplication(at:URL(fileURLWithPath:appPath),configuration:config){app,error in
  if let app=app,stamp()<=expectedStamp+100,NSWorkspace.shared.frontmostApplication?.processIdentifier==prior {app.activate(options:[])}
  emit(["launched":app != nil]);exit(error == nil ? 0:1)
 }
 RunLoop.main.run()
} else {exit(2)}
