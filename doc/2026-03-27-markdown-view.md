# Markdown View Work Log

Date: 2026-03-27

## Goal

Add a `markdown-view` option to the language chooser in `editorjs-codeflask` so a code block can be displayed as readable Markdown instead of raw source text.

## Decisions

### 1. Markdown rendering library

- Chosen library: `markdown-it`
- Reason:
  - Lightweight and mature
  - Easy to embed into the existing plugin
  - Supports safe configuration with `html: false`
  - Works well with the existing Prism-based code highlighting path

### 2. Non-Markdown content handling

- Added a lightweight Markdown feature detector
- If content does not look like Markdown:
  - show a short notice in preview mode
  - fall back to escaped plain-text rendering
- This avoids forcing arbitrary code/text into misleading Markdown layout

### 3. Code area compatibility

- Kept the original CodeFlask editor as the source editor
- Added a separate Markdown preview container in the same wrapper
- When `language === "markdown-view"`:
  - hide the CodeFlask editor area
  - show the preview container
- Save behavior still persists the original `code` text and selected `language`

## Files Changed

- `src/codeflask.js`
- `src/codeflask.css`
- `package.json`
- `package-lock.json`
- `dist/editorjs-codeflask.bundle.js`

## Implementation Summary

- Added `markdown-it` dependency
- Added `MARKDOWN_VIEW_LANGUAGE = "markdown-view"`
- Inserted `markdown-view` into the language chooser list
- Added Markdown preview rendering with safe HTML escaping
- Reused Prism to highlight fenced code blocks inside Markdown preview
- Added fallback preview for non-Markdown content
- Added preview styles for headings, lists, blockquotes, inline code, and fenced code blocks
- Updated block height logic so preview mode follows rendered content height

## Validation

- Ran `npm install`
- Ran `npm run build`
- Ran `build_dist_copy.bat`
- Build and copy both completed successfully

## Git

- Commit: `a61a6eef53b5e63073484f3ce68acf7715c43f4d`
- Commit message: `Add markdown view mode to codeflask block`

