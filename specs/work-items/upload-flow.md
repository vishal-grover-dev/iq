# Upload Flow (v1)

## Scope
- Single-screen upload form.
- Only Academic category fields are defined now.
- Competitive Exam and Video (Subtitles) categories are placeholders (TBD).
- No technical jargon or embeddings UI.

## Audience
- Non-technical users. Keep simple and reassuring.

## Form (Academic category)
- Field: Content category
  - Type: select
  - Options: Academic, Competitive Exam, Video (Subtitles)
  - Required: true
- Field: Board (India)
  - Type: select
  - Options: examples include CBSE, ICSE, State Boards (full list TBD)
  - Required: true (only when Content category = Academic)
- Field: Class (Grade)
  - Type: select/input
  - Examples: Class 1–12 (exact range per Board)
  - Required: true (only when Content category = Academic)
- Field: Subject
  - Type: select/input
  - Examples: Mathematics, Science, English, etc.
  - Required: true (only when Content category = Academic)
- Field: Resource type
  - Type: select
  - Options: Textbook (Learning Material), Previous Year Question Paper
  - Required: true (only when Content category = Academic)
- Field: Files
  - Type: drag-and-drop + “Browse files”
  - Accepted: PDF (primary; others TBD)
  - Multiple files allowed: yes (plural “files”)
  - Required: at least one file
- Action: Submit
  - Label: Submit

## Processing (after Submit)
- Loader: bulb slowly igniting animation.
- Message: We are on our way to enlighten, this process takes time, once it’s done we would inform you on your email (This can be enhanced for better clarity)
- Behavior:
  - Email notification sent on completion.
  - No technical details displayed.

## Non-goals
- Do not show embeddings, vectorization, or any technical pipeline steps.
- Do not add extra steps or wizards.

## Validation
- Add field level validations
- Required when Content category = Academic:
  - Board, Class (Grade), Subject, Resource type, Files (>=1)
- Content category is always required.

## Categories (TBD fields)
- Competitive Exam: fields TBD later.
- Video (Subtitles): fields TBD later.

## Simple state model
- idle → submitting → processing (show bulb + message) → completed | failed
- On completed: user informed via email.
- On failed: show generic error message with retry.
