//
//  PrintPlugin.swift
//  App
//
import Foundation
import Capacitor
import UIKit

@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintPlugin"
    public let jsName = "Print"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printText", returnType: CAPPluginReturnPromise),
    ]

    @objc func shareText(_ call: CAPPluginCall) {
        guard let text = call.getString("text") else {
            call.reject("Missing text parameter")
            return
        }
        DispatchQueue.main.async {
            let activityVC = UIActivityViewController(activityItems: [text], applicationActivities: nil)
            if let popover = activityVC.popoverPresentationController {
                popover.sourceView = self.bridge?.viewController?.view
                popover.sourceRect = CGRect(x: UIScreen.main.bounds.midX, y: UIScreen.main.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            self.bridge?.viewController?.present(activityVC, animated: true)
            call.resolve()
        }
    }

    @objc func printText(_ call: CAPPluginCall) {
        guard let text = call.getString("text") else {
            call.reject("Missing text parameter")
            return
        }
        let title = call.getString("title") ?? "Print"
        DispatchQueue.main.async {
            let printController = UIPrintInteractionController.shared
            let printInfo = UIPrintInfo.printInfo()
            printInfo.outputType = .general
            printInfo.jobName = title
            printInfo.orientation = .portrait
            printController.printInfo = printInfo
            let formatter = UISimpleTextPrintFormatter(text: text)
            formatter.startPage = 0
            formatter.contentInsets = UIEdgeInsets(top: 72, left: 72, bottom: 72, right: 72)
            printController.printFormatter = formatter
            printController.present(animated: true) { _, _, _ in
                call.resolve()
            }
        }
    }
}
