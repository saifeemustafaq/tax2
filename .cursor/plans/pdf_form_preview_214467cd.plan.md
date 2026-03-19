---
name: PDF Form Preview
overview: Wire the existing PDF fill API into the FormViewerModal so clicking "View Form XXXX" fetches the filled PDF and renders it inline using the browser's native PDF viewer via an iframe.
todos:
  - id: pass-fill-api-id
    content: Add fillApiId to FormViewerProps and pass it from the forms page
    status: completed
  - id: implement-pdf-viewer
    content: Replace placeholder in FormViewerModal with PDF fetch + iframe rendering (loading/error/success states)
    status: completed
  - id: resize-modal
    content: Enlarge DialogContent for comfortable PDF viewing
    status: completed
isProject: false
---

# PDF Form Preview

## Problem

Clicking "View Form XXXX" opens `FormViewerModal` which shows a placeholder: *"{form.title} viewer will be implemented here."* No PDF is displayed.

## Approach

Use the existing `POST /api/forms/[formId]/fill` endpoint (which already returns filled PDF bytes) and display the result in an `<iframe>` inside the modal. This uses the browser's native PDF renderer -- no extra dependencies needed.

## Changes

### 1. Pass `fillApiId` to the modal

Currently `[FormViewerProps](components/form-viewer-modal.tsx)` only has `formId`, `title`, `subtitle`. The fill API uses a different id (e.g., `"f8843"` vs `"8843"`).

- Add `fillApiId: string` to `FormViewerProps`
- Update `[openViewer](app/(app)`/forms/page.tsx) (line 103) to include `fillApiId: form.fillApiId`

### 2. Implement PDF fetching and rendering in `FormContent`

Replace the placeholder in `[components/form-viewer-modal.tsx](components/form-viewer-modal.tsx)` with:

- A `useEffect` that calls `POST /api/forms/{fillApiId}/fill` when the modal opens
- Loading, error, and success states
- On success, create a blob URL from the response and render it in an `<iframe>` sized to fill the modal
- Clean up the blob URL on unmount via `URL.revokeObjectURL`

### 3. Enlarge the modal for comfortable PDF viewing

- Widen `DialogContent` from `max-w-3xl` to `max-w-5xl` and add a tall fixed height so the PDF is readable

## Key files

- `[components/form-viewer-modal.tsx](components/form-viewer-modal.tsx)` -- main changes (fetch + iframe)
- `[app/(app)/forms/page.tsx](app/(app)`/forms/page.tsx) -- pass `fillApiId` through

