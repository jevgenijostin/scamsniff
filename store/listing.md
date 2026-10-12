# ScamSniff store submission

Privacy policy: https://jevgenijostin.github.io/scamsniff/store/privacy-policy.html

Support/contact: https://github.com/jevgenijostin/scamsniff/issues

## Short description / Summary

Spot English and German scam red flags in selected text or a page. Private, on-device checks with no account or network calls.

## Detailed description

Give suspicious messages a second look. ScamSniff highlights English and German scam red flags, including pressure tactics, lookalike domains, risky payment requests, generic requests for sensitive information, and urgent shortened links. Findings are grouped by severity with explanations and highlighted excerpts so you can see what triggered each warning.

Select text on a website, open ScamSniff, and click “Check this page.” Your selection takes priority; with nothing selected, it checks the current page's rendered top-frame text. You can also right-click selected text and choose “Check selection for ScamSniff” to get a local notification. Checks run only when you request them.

Detection runs entirely on your device using rules bundled with the extension. No data collection, accounts, telemetry, remote models, or network calls. Page text and findings are never saved to extension storage. The only stored value is an optional local demo license key. Notifications may remain in your system notification center until dismissed.

ScamSniff is free. The popup includes an optional “Pro license · local demo” for three extra rule combinations: romance with money requests, job offers with upfront fees, and crypto with guaranteed returns. Use the free demo key SS-PRO-DEMO2026-C165 to try these in the popup; no payment or online activation is involved. Context-menu summaries already include all rule tiers.

These are heuristic signals, not a determination that a message is fraudulent. False positives and missed scams are possible; no findings does not mean a page is safe. ScamSniff does not block websites or check a reputation database. It does not inspect link destinations, images, form field values, or cross-origin frames during page checks. Popup input is limited to the first 200,000 UTF-16 code units and reports truncation. Browser settings pages, extension stores, and built-in PDF viewers restrict page access.

Category suggestion: Chrome — Productivity (Tools subcategory if offered); Firefox — Privacy & Security; Edge — Productivity (or the closest tools category offered).

## Ready-to-upload files

| Store field | File/value |
| --- | --- |
| Chrome / Edge package | `dist/scamsniff-extension.zip` |
| Firefox AMO package | `dist/scamsniff-firefox.zip` (desktop Firefox 140+) |
| Screenshot, all stores | `demo/screenshot.png` — 1280×800 PNG |
| Chrome small promotional tile | `store/promo-440x280.png` — 440×280 PNG |
| Store icon | `extension/icons/icon-128.png` — 128×128 PNG |
| Name / version | ScamSniff / 0.1.0 |
| Primary listing language | English (rules also recognize German) |
| Price | Free; no purchases are implemented |

The packages are generated locally and ready to upload. `dist/` is intentionally gitignored. To reproduce them for a future version, run `npm run package` from the repository root on Windows with Node and Windows PowerShell. This invokes `scripts/package.ps1`; no `npm install`, bundling, or compilation is required. Both ZIPs contain every file in `extension/`, with `manifest.json` at the ZIP root. There are no tests, node_modules, or Git metadata in that directory.

The Chrome/Edge ZIP preserves every source file byte-for-byte. The Firefox ZIP changes only its packaged manifest: it replaces the service worker declaration with the same background module as an event-page script, assigns the stable add-on ID `scamsniff@jevgenijostin.github.io` (an identifier, not a contact email), sets desktop Firefox 140 as the minimum, and declares `data_collection_permissions.required: ["none"]`. An Android minimum of 142 also ensures that declaration is supported if mobile distribution is considered later; this submission targets desktop only. Keep this ID for future updates. Extension source and behavior are unchanged. See Mozilla's [background manifest reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background) and [data consent requirements](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).

The screenshot uses `demo/generate.mjs`'s static render of the actual popup and detection engine. Optional regeneration: `node demo/generate.mjs`, then `python scripts/capture-store.py` (Python Playwright and installed Google Chrome required). Upload the committed PNGs directly; regeneration is unnecessary for submission. Chrome's [image requirements](https://developer.chrome.com/docs/webstore/images) specify a screenshot and small promotional image.

## Form answers and review notes

**Single purpose:** Help users identify English and German scam red flags in text they explicitly choose to check, entirely on their device.

**Data / remote code:** No user data is collected or transmitted; no remote code is used. Local processing of website text is the extension's core purpose. Only the optional demo license key persists in local extension storage. Use the privacy policy URL above for all stores.

| Permission | Justification to paste into the form |
| --- | --- |
| activeTab | Temporary access to the current tab after a user invokes a text check; no permanent host permissions or background scanning. |
| scripting | Inject the bundled content script on demand to read selected text or rendered page text, in the top frame for popup checks or clicked frame for context-menu checks. |
| storage | Persist only the optional demo license key locally; page text and scan results are never stored. |
| contextMenus | Provide “Check selection for ScamSniff” on selected text so users can request a local selection check. |
| notifications | Display a local summary of the requested selection check, including all rule tiers. |

**Reviewer instructions:** Open a regular website and select “Act now, pay via gift card at paypaI.com”. Open the popup and click “Check this page”: expect high/medium findings. Right-click the selection and choose “Check selection for ScamSniff”: expect a notification with three red flags. No account or credentials are needed. To inspect optional demo rules, enter SS-PRO-DEMO2026-C165 under “Pro license · local demo”. The code is readable JavaScript with no minification, third-party runtime dependencies, or compilation; the uploaded package includes the extension source.

## Store differences

- **Chrome Web Store:** The owner completes developer registration and pays the one-time US$5 registration fee in Google's dashboard. Upload the Chrome/Edge ZIP, icon, screenshot, and promotional tile; complete the listing and privacy fields. [Registration guidance](https://developer.chrome.com/docs/webstore/register/).
- **Firefox Add-ons (AMO):** No listing fee. Upload the dedicated Firefox ZIP, choose desktop Firefox distribution on AMO, and use the MIT license. The package includes the required no-data declaration for new submissions. AMO review can be quick, but review time varies; do not assume it will be faster than Chrome. [Submission guidance](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).
- **Edge Add-ons:** Use the exact same ZIP as Chrome; this extension requires no Edge-specific package changes. The owner needs a Partner Center developer account; extension registration has no fee. [Account guidance](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/create-dev-account), [publishing guidance](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

Store approval and any account identity/contact requirements remain with the owner and the stores. This preparation does not submit or publish the extension itself.
