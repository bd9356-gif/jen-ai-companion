//
//  WebFetchPlugin.swift
//  App
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

    private var fetchWebView: WKWebView?
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

            self.cleanup()
            self.pendingCall = call

            let config = WKWebViewConfiguration()
            config.websiteDataStore = WKWebsiteDataStore.nonPersistent()
            let wv = WKWebView(frame: .zero, configuration: config)
            wv.navigationDelegate = self
            self.fetchWebView = wv

            if let window = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first?.windows.first {
                window.addSubview(wv)
                wv.isHidden = true
            }

            self.timeoutTimer = Timer.scheduledTimer(withTimeInterval: timeoutSeconds, repeats: false) { [weak self] _ in
                NSLog("[WebFetchPlugin] Timeout fetching: %@", urlString)
                self?.pendingCall?.reject("TIMEOUT")
                self?.cleanup()
            }

            NSLog("[WebFetchPlugin] Loading URL: %@", urlString)
            wv.load(URLRequest(url: url))
        }
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
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
        fetchWebView?.removeFromSuperview()
        fetchWebView = nil
        pendingCall = nil
    }
}
