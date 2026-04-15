# Design System Specification: The Digital Curator

## Status

This file is an exploratory visual proposal.
For Cerulia AppView's product-specific source of truth, use [design-system.md](./design-system.md) and [character-detail-wireframes.md](./character-detail-wireframes.md).
 
## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Digital Curator**. This philosophy treats social networking not as a chaotic stream, but as a high-end editorial experience. We aim to move beyond the "standard template" look of modern SNS platforms by using intentional asymmetry, breathable negative space, and tonal depth.
 
Rather than a flat UI composed of boxes within boxes, this system utilizes **Tonal Layering**. We avoid rigid structural lines in favor of shifting values that guide the eye naturally. The goal is to provide a "quiet" interface where the user’s content is the primary focus, framed by a sophisticated, deep-midnight environment.
 
## 2. Colors & Surface Philosophy
 
### Color Logic
The palette is built on a foundation of "Deep Midnight" neutrals, with high-frequency accents in "Electric Azure."
 
- **Primary Background**: `surface` (#0f1419) serves as the canvas.
- **Brand Accents**: `primary` (#99cbff) for high-emphasis states and `primary_container` (#1d9bf0) for core action branding.
- **Tonal Shifts**: `surface_container` levels provide the necessary depth without cluttering the screen with lines.
 
### The "No-Line" Rule
Standard 1px borders are largely prohibited for sectioning. Boundaries between the sidebar, feed, and utility panels must be defined by background color shifts. For instance, the main feed rests on `surface`, while the sidebar and utility panel cards sit on `surface_container_low` (#171c21). This creates a seamless, "molded" look rather than a fragmented one.
 
### The "Glass & Gradient" Rule
To elevate the experience from "Standard Dark Mode" to "Premium Editorial," use Glassmorphism for floating elements (like top navigation bars or pop-over menus). 
- Use `surface` at 70% opacity with a `20px` backdrop-blur.
- **Signature Texture**: For primary CTAs (e.g., "Post" buttons), apply a subtle linear gradient from `primary` (#99cbff) to `primary_container` (#1d9bf0) at a 135-degree angle. This adds a "lithic" soul to the interface.
 
## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with readability.
 
- **Display & Headlines (Manrope)**: Used for profile names, section headers, and large impact statements. Manrope's geometric yet friendly curves convey modern authority.
- **Body & Labels (Inter)**: Used for all post content, metadata, and interface labels. Inter is chosen for its exceptional legibility at small sizes and high-density information environments.
 
### Typographic Hierarchy
- **Headline-LG (Manrope, 2rem)**: Profile names in header views.
- **Title-MD (Inter, 1.125rem)**: Post content body for high readability.
- **Label-SM (Inter, 0.6875rem)**: Timestamps and secondary metadata, using `on_surface_variant` (#bfc7d3).
 
## 4. Elevation & Depth
 
### The Layering Principle
Depth is achieved through the "stacking" of surface tokens.
1.  **Level 0 (Base)**: `surface_container_lowest` (#0a0f14) – used for the backdrop of the entire viewport.
2.  **Level 1 (Sections)**: `surface` (#0f1419) – used for the main feed column.
3.  **Level 2 (In-Feed Elements)**: `surface_container` (#1b2025) – used for quoted posts or highlighted content.
4.  **Level 3 (Interactive Floating)**: `surface_container_highest` (#30353b) – used for tooltips and hover-state menus.
 
### Ambient Shadows & Ghost Borders
- **Shadows**: Avoid black shadows. Use `on_surface` (#dee3ea) at 4% opacity with a `32px` blur and `8px` Y-offset. This creates an "ambient glow" effect that feels natural in a dark theme.
- **Ghost Borders**: If a boundary is strictly required for accessibility, use `outline_variant` (#3f4851) at 15% opacity. Never use 100% opaque borders for containers.
 
## 5. Components
 
### Buttons
- **Primary**: `roundedness.full`, background `primary_container`, text `on_primary_container`. High-contrast, floating appearance.
- **Secondary**: `roundedness.full`, ghost border (15% opacity `outline`), text `primary`.
- **Tertiary**: No background, text `on_surface_variant`. Used for low-priority actions like "Cancel."
 
### Cards & Feed Items
Forbid the use of divider lines between posts. Instead:
- Use `1.5rem` (`md`) vertical spacing between post units.
- On hover, the entire card background should transition smoothly to `surface_container_low` (#171c21) with a `200ms` ease-in-out.
 
### Input Fields & Search
- **Search Bar**: Use `surface_container_high` (#252a30) with `roundedness.full`.
- **Active State**: The border should glow with a `2px` outer spread of `primary` at 20% opacity.
 
### Profile Avatars
- **Sizing**: Use `xl` (3rem) for feed avatars and custom `5rem` for profile headers.
- **Styling**: Apply a subtle `outline` (#89919d) at 10% opacity to ensure the avatar separates from the background, especially for dark-colored images.
 
## 6. Do’s and Don'ts
 
### Do
- **Do** use asymmetrical margins in the utility panel to create a more "editorial" feel.
- **Do** utilize `on_surface_variant` (#bfc7d3) for secondary text to reduce visual noise.
- **Do** use large `roundedness` values (`lg` to `full`) for all interactive elements to maintain the "Sleek" vibe.
 
### Don't
- **Don't** use pure white (#ffffff) for text; always use `on_surface` (#dee3ea) to prevent eye strain.
- **Don't** use standard 1px solid dividers. Use vertical white space or tonal shifts.
- **Don't** use hard shadows. If the element doesn't feel elevated enough with tonal shifting, use the Ambient Shadow specification.
- **Don't** cram content. If the layout feels tight, increase the container padding using the `md` (1.5rem) scale.