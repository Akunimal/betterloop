/**
 * interceptor.js — Content script that intercepts <input type="file">
 * and resolves files via the magic_picker WebMCP tool.
 *
 * How it works:
 *   1. Detects all <input type="file"> on the page
 *   2. Intercepts click events to prevent the native picker
 *   3. Asks the background script to resolve the file via magic_picker
 *   4. Injects the resolved file back into the input
 */
(function () {
  "use strict";

  // Track which inputs we've already hooked
  const hooked = new WeakSet();

  /**
   * Hook a single file input element.
   */
  function hookInput(input) {
    if (hooked.has(input)) return;
    hooked.add(input);

    input.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      // Ask background to resolve via magic_picker
      chrome.runtime.sendMessage(
        {
          type: "resolve-file",
          accept: input.accept || "*",
          multiple: input.multiple
        },
        function (response) {
          if (!response || !response.success) {
            console.log("🪄 Magic Picker: No resolution available");
            // Fallback: open native picker
            const click = new MouseEvent("click", { bubbles: true });
            input.dispatchEvent(click);
            return;
          }

          // Convert base64 to File object
          const files = response.files || [];
          const fileObjects = files.map(function (f) {
            const bytes = atob(f.base64Data);
            const arr = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) {
              arr[i] = bytes.charCodeAt(i);
            }
            return new File([arr], f.fileName, { type: f.fileType });
          });

          // Create a DataTransfer to set the input's files
          const dt = new DataTransfer();
          fileObjects.forEach(function (file) {
            dt.items.add(file);
          });
          input.files = dt.files;

          // Dispatch change event so the page reacts
          input.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("🪄 Magic Picker: Resolved", fileObjects.length, "file(s)");
        }
      );
    }, true);
  }

  /**
   * Scan the page for file inputs and hook them.
   */
  function scanAndHook() {
    document.querySelectorAll('input[type="file"]').forEach(hookInput);
  }

  // Initial scan
  scanAndHook();

  // Watch for new file inputs added dynamically
  const observer = new MutationObserver(scanAndHook);
  observer.observe(document.body, { childList: true, subtree: true });
})();
