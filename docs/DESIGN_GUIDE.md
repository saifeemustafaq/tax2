# Design Guide

This document defines design and UI standards for the application.

## Product context

This is a **tax filing software**. The interface should feel trustworthy, clear, and focused on accuracy and compliance. Avoid playful or casual tone in copy and visuals.

## UI framework: shadcn/ui

- **Use shadcn/ui as the primary UI layer** for all interface components.
- Prefer shadcn components (Button, Card, Form, Input, Select, Table, Dialog, etc.) over custom or third-party component libraries.
- Add new components via the CLI when needed: `npx shadcn@latest add <component>`.
- Customize by editing the generated files under `components/ui/`; do not wrap shadcn components in extra abstraction layers unless necessary.

## Minimalism

- **Keep the app minimalist.** Prefer less over more: fewer screens, fewer options on a page, fewer decorative elements.
- Use clear hierarchy (one primary action per view when possible), ample whitespace, and restrained color.
- Avoid heavy illustrations, gradients, or decorative patterns. Prefer solid backgrounds and simple borders.
- Typography and spacing should support readability and scanning; avoid dense or noisy layouts.

## Icons: React Icons or Lucide, no emoji

- **Use React Icons or Lucide** for all iconography. Both are acceptable: import from `react-icons` (e.g. `react-icons/hi`, `react-icons/fi`) or `lucide-react`. They are different libraries (different icon sets and APIs) but either is fine; pick one style per area and stay consistent.
- **Do not use emoji** anywhere in the app: no UI labels, empty states, success messages, or documentation intended for the in-app experience.
- Keep icon style consistent (e.g. stick to one family or library in a given context) and use a single size/weight pattern for similar actions.

## Theming and accessibility

- Rely on the design tokens and CSS variables defined in `app/globals.css` (e.g. `--background`, `--foreground`, `--primary`, `--muted`).
- Ensure sufficient contrast for text and interactive elements; use the existing semantic colors (e.g. `destructive` for dangerous actions).
- Support both light and dark themes via the existing `.dark` variables where applicable.

## Summary

| Area            | Rule                                                |
|-----------------|-----------------------------------------------------|
| Component library | shadcn/ui only; add via CLI, customize in `components/ui/` |
| Visual style    | Minimalist; clear hierarchy, restrained color, no decoration |
| Icons           | React Icons or Lucide; no emoji anywhere in the app |
| Product         | Tax filing software; trustworthy, clear, compliance-oriented |
