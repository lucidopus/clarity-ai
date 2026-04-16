# Document renderer subcomponents

The "Learn" tab uses these files when the source is a PDF. They turn a
Supabase-hosted file into a study surface — not a text dump, not a
Preview-style reader. The goal is to pair the PDF with a closed
metacognitive loop: rate each page → see weak spots roll up → focus-review
only what you flagged.

- **`DocumentStage.tsx`** — the PDF canvas at the center (react-pdf +
  pdfjs). Renders **one page at a time** (paged mode) so the reader can
  focus on the current page instead of scrolling through a weaved stack.
  Navigation is keyboard-first: ↑/PageUp, ↓/PageDown/Space, Home, End —
  vertical arrows map to vertical page flow so the mental model matches
  "reading down the document", and ← → stay free for horizontal scroll
  when the user zooms past the viewport. The window-level handler skips
  when focus is in an input, contenteditable, or anything with
  `role="dialog"`, so modals don't get hijacked. Also
  handles zoom, fullscreen, and text-selection capture. The scroll
  container resets to the top on page swap, and zoomed pages use a
  `mx-auto w-fit` shell so they center when they fit and start-align with
  natural horizontal scroll when they overflow. Pages tagged with a
  confidence rating get a thin coloured stripe on their left edge. The
  top chrome also owns in-document **search** (inline popover with
  page-jump results) and the **summary** button — they live next to the
  PDF controls because the document title already reads from the outline,
  so a separate page-level header would be noise.
- **`DocumentOutline.tsx`** — the collapsible left sidebar. Shows
  LLM-generated chapters mapped to pages and a "Your notes" list that
  doubles as a confidence map (a coloured dot alongside each noted page
  mirrors the rating stored on the segment).
- **`DocumentRightRail.tsx`** — the right-hand study panel. Ordered
  primary-task-first: **This Page** (Red/Shaky/Got it buttons with a
  discoverable "Clear rating" affordance) → **Your note** (preview is the
  hero, edit/delete are quiet hover icons) → **Document readiness**
  (doc-level scoreboard at the footer). Readiness is computed across the
  whole document — `(green + yellow·0.5) / numPages` — so the score only
  hits 100% when every page is marked "Got it", and it's stable as the
  user scrolls/pages (denominator is `numPages`, not pages rated). The
  card's primary CTA is "Focus on N weak pages", which opens the Focus
  Review sheet described below.
- **`DocumentFocusReview.tsx`** — a modal sheet that closes the
  metacognitive loop. Lists every Red and Yellow page grouped by severity,
  with a per-row set of controls: inline re-rate (Red / Shaky / Got it),
  "Read page" jump, "Edit note" / "Add note", and an optional "Ask Clara"
  nudge for Red pages. Ask Clara dispatches a `chatbot:open` window event
  with a prefilled question; the global `ChatBot` component already
  listens for that event. The readiness mini-bar at the top gives the
  user a live score as they re-rate inside the sheet.
- **`DocumentSelectionHud.tsx`** — the floating action menu that appears
  when the user highlights text. Buttons: "Add Note" and "Copy".
- **`DocumentNoteComposer.tsx`** — the modal for creating / editing a note
  anchored to a page. Uses the same tiptap+markdown stack as
  `components/learn/SegmentNotePopup.tsx` so notes round-trip with existing
  storage. Notes are stored via the existing `notes.segmentNotes` API with
  `segmentId = page-{n}`; the same segment now also carries an optional
  `confidence` field so confidence ratings can exist independently of any
  written note content.

`DocumentContentViewer.tsx` in the parent folder wires these together and
falls back to the legacy text reader when the file is a PPTX (react-pdf
can't render it) or when extracted text exists without a PDF URL.

## The page-level signal model

Each page shares one `segmentNotes` record keyed by `segmentId = page-{n}`.
That record can hold a confidence rating alone, a written note alone, or
both. `DocumentContentViewer.handleSetPageConfidence` / `handleDeletePageNote`
maintain this invariant — clearing confidence when there's no note drops
the record entirely; deleting a note when confidence exists keeps the
record and only blanks the content. That's why confidence dots can appear
next to unwritten-note pages in the outline.

## The Focus Review loop

The right-rail Readiness card is read-only feedback, not a task. The
paired Focus Review sheet is where that feedback becomes an action: one
button collapses the whole document down to just the user's self-declared
weak spots, with quick jumps and re-rate controls so the loop closes
without leaving the Learn tab. Empty-state copy celebrates reaching zero
weak pages; the readiness bar inside the sheet updates live as the user
re-rates, so the progress is immediate and visible.

## PDF.js worker

`react-pdf` needs a worker script. The `postinstall` hook in `package.json`
copies it from `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` into
`public/pdf.worker.min.mjs` on every `yarn install`, so the worker version
always matches the installed API version. The file itself is gitignored —
don't commit it. `pdfjs.GlobalWorkerOptions.workerSrc` points at
`/pdf.worker.min.mjs` at runtime.
