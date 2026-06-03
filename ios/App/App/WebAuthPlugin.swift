//
//  WebAuthPlugin.swift
//  App
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

    private var currentSession: ASWebAuthenticationSession?

    override public func load() {
        NSLog("[WebAuthPlugin] Plugin loaded — accessible as window.Capacitor.Plugins.WebAuth")
    }

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

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error {
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
            session.prefersEphemeralWebBrowserSession = false
            session.start()
            self.currentSession = session
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first
        let window = scene?.windows.first { $0.isKeyWindow } ?? scene?.windows.first
        return window ?? ASPresentationAnchor()
    }
}
