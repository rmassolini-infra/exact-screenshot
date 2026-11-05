# AGENTS.md

- DueDD Ambiental logic lives in `src/lib/ambiental/` as pure, Node-testable modules (extraction over pdf.js text, decimal rule engine, minuta builders); UI only composes them — so the real-PDF tests in `ambiental.test.ts` cover the same code the browser runs.
- Ambiental rule arithmetic uses the BigInt `Dec` type, never JS floats — tolerances are absolute and must be exact.
- Ambiental source values come only from the parsed PDF; reference JSON is test calibration, never a data source; case identity (BR01) is granted only by SHA-256 match.
- Ambiental work persists in browser IndexedDB only (auth is disabled app-wide), so user PDFs never leave the browser.
