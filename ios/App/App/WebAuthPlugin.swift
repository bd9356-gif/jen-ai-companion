//
//  WebAuthPlugin.swift
//  App
//
//  Custom Capacitor plugin wrapping ASWebAuthenticationSession (May 2026).
//
//  Why this exists:
//    The Capacitor WKWebView has its own private cookie + localStorage
//    jar separate from mobile Safari. When the user taps "Sign in with
//    Google" inside the wrap, the default flow either:
//      (a) navigates the WKWebView itself to accounts.google.com —
//          Google detects the embedded WebView and REFUSES to render
//          the sign-in page (anti-phishing measure since 2021), OR
//      (b) opens the OAuth URL in the system browser — the user signs
//          in there, cookies land in Safari/Edge's jar, the WKWebView
//          never sees them, and the app keeps showing the login page.
//
//    ASWebAuthenticationSession is Apple's specific API for this case:
//    a system-managed browser surface that Google recognizes as a
//    legitimate browser, AND which auto-dismisses when the configured
//    callback URL scheme is reached, returning the callback URL directly
//    to the calling app. We catch the OAuth code in JS-land via the
//    plugin's promise resolve, then call supabase.auth.exchangeCodeForSession
//    so the resulting session lands in the WKWebView's localStorage —
//    which IS persisted across app launches.
//
//  Why a custom plugin instead of @capacitor-community/oauth2:
//    We tried @capacitor-community/apple-sign-in v7.1.0 earlier in
//    May 2026 and hit persistent SPM "Missing package product CapApp-SPM"
//    build errors with Capacitor 8. We rolled it back. Owning ~70 lines
//    of Swift is safer than betting another community-plugin run will
//    behave differently — the API surface here is small enough that
//    self-hosting is cheaper than dependency risk.
//
//  JS-side usage (in app/login/page.js):
//    const { url } = await window.Capacitor.Plugins.WebAuth.startSession({
//      url: oauthUrl,                       // The OAuth URL from Supabase
//      callbackScheme: 'myrecipe',          // Matches Info.plist URL scheme
//    })
//    // url is the full callback URL with ?code=... — extract and exchange.
//

import Foundation
import Capacitor
import AuthenticationServices
import UIKit

@objc(WebAuthPlugin)
public class WebAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "WebAuthPlugin"
    public let jsName = "WebAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startSession", returnType: CAPPluginReturnPromise)
    ]

    // Hold a reference to the active session so iOS doesn't deallocate
    // it mid-flight. ASWebAuthenticationSession requires the caller to
    // retain it until the completion handler fires.
    private var currentSession: ASWebAuthenticationSession?

    @objc func startSession(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Missing or invalid 'url' parameter")
            return
        }
        guard let callbackScheme = call.getString("callbackScheme") else {
            call.reject("Missing 'callbackScheme' parameter")
            return
        }

        // Must run on main thread — ASWebAuthenticationSession presents UI.
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error {
                    // Common cancel case: user dismisses the sheet without
                    // completing OAuth. ASWebAuthenticationSessionError.canceledLogin
                    // is the error code; we surface a clean string so JS
                    // can show a non-scary message ("Sign-in cancelled").
                    let nsError = error as NSError
                    if nsError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        call.reject("USER_CANCELLED")
                    } else {
                        call.reject(error.localizedDescription)
                    }
                    return
                }
                guard let callbackURL = callbackURL else {
                    call.reject("Auth session returned no callback URL")
                    return
                }
                call.resolve(["url": callbackURL.absoluteString])
            }

            session.presentationContextProvider = self
            // Share Safari's cookies — lets users skip re-typing their
            // Google password if they're already signed in to Google on
            // mobile Safari. Setting `true` would force a clean session
            // every time (more annoying, less private).
            session.prefersEphemeralWebBrowserSession = false
            session.start()
            self.currentSession = session
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Find the key window to anchor the auth sheet to. Falls back to
        // an empty anchor if no scene is connected (shouldn't happen in
        // practice, but appeases the compiler).
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first
        let window = scene?.windows.first { $0.isKeyWindow } ?? scene?.windows.first
        return window ?? ASPresentationAnchor()
    }
}
