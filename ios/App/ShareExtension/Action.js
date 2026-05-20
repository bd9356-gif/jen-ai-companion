// Action.js
// Runs on the Safari page before the Share Extension fires.
// Extracts the page URL and full HTML and passes them to
// ShareViewController via the NSExtensionJavaScriptPreprocessingFile
// mechanism. The results land in the extensionContext as a dictionary
// under the key "results" on the NSItemProvider.

var Action = function() {};

Action.prototype = {

    run: function(arguments) {
        // Pass the current page URL and full HTML back to the extension.
        // document.documentElement.outerHTML gives us the full rendered
        // HTML including any content injected by JavaScript — better than
        // a raw fetch which only gets the server-side HTML.
        arguments.completionFunction({
            "url": document.location.href,
            "html": document.documentElement.outerHTML
        });
    },

    finalize: function(arguments) {
        // Called after the extension completes — nothing to do here.
    }

};

var ExtensionPreprocessingJS = new Action();
