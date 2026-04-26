import Cocoa
import WebKit

// ─── Trova il file HTML ───
func findManagerHTML() -> URL? {
    let name = "Manager Portfolio.html"
    let fm = FileManager.default
    let home = fm.homeDirectoryForCurrentUser.path

    // 1. Accanto all'app (quando l'app è dentro Portfolio AEI)
    let execURL = URL(fileURLWithPath: CommandLine.arguments[0])
    let appDir = execURL
        .deletingLastPathComponent()  // MacOS
        .deletingLastPathComponent()  // Contents
        .deletingLastPathComponent()  // .app
    let beside = appDir.appendingPathComponent(name)
    if fm.fileExists(atPath: beside.path) { return beside }

    // 2. Desktop
    let desktop = URL(fileURLWithPath: home + "/Desktop/Portfolio AEI/" + name)
    if fm.fileExists(atPath: desktop.path) { return desktop }

    // 3. Documenti
    let docs = URL(fileURLWithPath: home + "/Documents/Portfolio AEI/" + name)
    if fm.fileExists(atPath: docs.path) { return docs }

    // 4. Home
    let homeDir = URL(fileURLWithPath: home + "/Portfolio AEI/" + name)
    if fm.fileExists(atPath: homeDir.path) { return homeDir }

    // 5. Spotlight
    let task = Process()
    let pipe = Pipe()
    task.executableURL = URL(fileURLWithPath: "/usr/bin/mdfind")
    task.arguments = ["-name", name]
    task.standardOutput = pipe
    try? task.run()
    task.waitUntilExit()
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    if let output = String(data: data, encoding: .utf8) {
        let first = output.components(separatedBy: "\n").first(where: { !$0.isEmpty })
        if let path = first, fm.fileExists(atPath: path) {
            return URL(fileURLWithPath: path)
        }
    }

    return nil
}

// ─── App Delegate ───
class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let htmlURL = findManagerHTML() else {
            let alert = NSAlert()
            alert.messageText = "Manager non trovato"
            alert.informativeText = "Il file \"Manager Portfolio.html\" non è stato trovato.\nAssicurati che la cartella Portfolio AEI sia sul Desktop o in Documenti."
            alert.alertStyle = .critical
            alert.runModal()
            NSApp.terminate(nil)
            return
        }

        // Configurazione WebView
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        // Permetti accesso a file locali
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsMagnification = true

        // Carica l'HTML
        webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())

        // Crea finestra
        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1280, height: 800)
        let width = min(screenRect.width * 0.85, 1440.0)
        let height = min(screenRect.height * 0.85, 900.0)
        let x = screenRect.origin.x + (screenRect.width - width) / 2
        let y = screenRect.origin.y + (screenRect.height - height) / 2

        window = NSWindow(
            contentRect: NSRect(x: x, y: y, width: width, height: height),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Manager Portfolio"
        window.contentView = webView
        window.minSize = NSSize(width: 800, height: 500)
        window.isReleasedWhenClosed = false
        window.makeKeyAndOrderFront(nil)

        // Titolo della finestra segue la pagina
        webView.addObserver(self, forKeyPath: "title", options: .new, context: nil)
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?,
                                change: [NSKeyValueChangeKey: Any]?,
                                context: UnsafeMutableRawPointer?) {
        if keyPath == "title", let title = webView.title, !title.isEmpty {
            window.title = title
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

// ─── Main ───
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.activate(ignoringOtherApps: true)
app.run()
