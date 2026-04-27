# AppView Design Review Guidance

This file exists so UI review rules stay outside any one reviewer prompt and can change without rewriting the whole reviewer set.

## Primary Rule

AppView visual review should be screenshot-first.

Do not judge design quality mainly from CSS, component source, or token naming when a rendered surface can be inspected instead.

## What To Evaluate From Screenshots

- whether the primary action is obvious
- whether the page makes Cerulia's scope legible without internal jargon
- whether hierarchy, spacing, and emphasis guide the eye cleanly
- whether draft, public, and direct-link states are understandable when present
- whether mobile and desktop both preserve meaning instead of merely shrinking layout
- whether the surface feels trustworthy, calm, and usable for ordinary players

## What Not To Do

- do not reward ornamental density or generic dashboard chrome
- do not reduce the review to CSS selector or variable nitpicks
- do not infer interaction quality from source code alone when screenshots are missing
- do not approve copy that looks elegant but is likely to confuse non-technical users

## When Screenshots Are Missing

- explicitly report a coverage gap
- allow only limited structural observations from route markup or component structure
- avoid confident visual conclusions

## Source Documents

When needed, cross-check against:

- docs/appview/README.md
- docs/appview/ui-ux-requirements.md
- docs/appview/design-system.md
- docs/appview/top-page.md
- docs/appview/navigation.md

The current reset state matters. Reviewers must not infer features or screens that the docs no longer claim to exist.