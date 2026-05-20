//
//  WebFetchPlugin.swift
//  App
//
//  Custom Capacitor plugin that loads a URL in a hidden WKWebView,
//  waits for the page to fully render (including JavaScript), then
//  returns the full HTML to the JS caller.
//
//  Why this exists:
//    Many recipe sites block server-side scrapers but allow real
//    browser requests. A hidden WKWebView looks identical to Safari
//    to the server — same headers, same user agent, same cookies.
//    The page loads fully, JavaScript runs, and we grab the rendered
//    HTML via document.documentElement.outerHTML.
//
//  JS-side usage (in app/secret/page.js):
//    const { html } = await window.Capacitor.Plugins.WebFetch.fetchPage({
//      url: 'https://www.example.com/recipe',
//      timeoutSeconds: 15,   // optional, default 15
//    })
//    // html is the full rendered HTML — pass to /api/import-recipe
//

import Foundation
import Capacitor
import WebKit

@objc(WebFetchPlugin)
public class WebFetchPlugin: CAPPlugin, CAPBridgedPlugin, WKNavigationDelegate {
    public let identifier = "WebFetchPlugin"
    public let jsName = "WebFetch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "fetchPage", returnType: CAPPluginReturnPromise)
    ]

    private var webView: WKWebView?
    private var pendingCall: CAPPluginCall?
    private var timeoutTimer: Timer?

    override public func load() {
        NSLog("[WebFetchPlugin] Plugin loaded — accessible as window.Capacitor.Plugins.WebFetch")
    }

    @objc func fetchPage(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Missing or invalid 'url' parameter")
            return
        }

        let timeoutSeconds = call.getDouble("timeoutSeconds") ?? 15.0

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // Clean up any previous fetch
            self.cleanup()
            self.pendingCall = call

            // Create a hidden WKWebView — zero size, not added to any visible view
            let config = WKWebViewConfiguration()
            config.websiteDataStore = WKWebsiteDataStore.nonPersistent()
            let wv = WKWebView(frame: .zero, configuration: config)
            wv.navigationDelegate = self
            self.webView = wv

            // Add to window hierarchy (required for WKWebView to load)
            if let window = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first?.windows.first {
                window.addSubview(wv)
                wv.isHidden = true
            }

            // Timeout safety — reject if page takes too long
            self.timeoutTimer = Timer.scheduledTimer(withTimeInterval: timeoutSeconds, repeats: false) { [weak self] _ in
                NSLog("[WebFetchPlugin] Timeout fetching: %@", urlString)
                self?.pendingCall?.reject("TIMEOUT")
                self?.cleanup()
            }

            NSLog("[WebFetchPlugin] Loading URL: %@", urlString)
            wv.load(URLRequest(url: url))
        }
    }

    // Called when page finishes loading
    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Give JS a moment to render dynamic content
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            webView.evaluateJavaScript("document.documentElement.outerHTML") { result, error in
                if let html = result as? String {
                    NSLog("[WebFetchPlugin] Got HTML — %d chars", html.count)
                    self?.pendingCall?.resolve(["html": html])
                } else {
                    NSLog("[WebFetchPlugin] JS eval failed: %@", error?.localizedDescription ?? "unknown")
                    self?.pendingCall?.reject("Failed to extract HTML")
                }
                self?.cleanup()
            }
        }
    }

    // Called on navigation error
    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        NSLog("[WebFetchPlugin] Navigation failed: %@", error.localizedDescription)
        pendingCall?.reject(error.localizedDescription)
        cleanup()
    }

    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        NSLog("[WebFetchPlugin] Provisional navigation failed: %@", error.localizedDescription)
        pendingCall?.reject(error.localizedDescription)
        cleanup()
    }

    private func cleanup() {
        timeoutTimer?.invalidate()
        timeoutTimer = nil
        webView?.removeFromSuperview()
        webView = nil
        pendingCall = nil
    }
}
