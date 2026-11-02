# Contributing

Use Node.js 22+, run `npm ci` and `npm test`. Runtime code must remain dependency-free.

Please include English and Simplified Chinese for user-visible changes. Prefer small patches with tests for changed behavior. Never restart an active client automatically, persist raw account responses, or silently replace missing quota with zero.

Compatibility reports should include macOS, Node and client versions, plus a redacted status summary. Do not upload credentials, chat screenshots or account metadata.
