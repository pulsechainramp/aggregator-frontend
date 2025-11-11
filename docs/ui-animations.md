# UI animation guardrails

Components that gate navigation (header, nav, shell, toasts, drawers, banners) must never remain hidden because an entrance animation failed. This document captures the safeguards we added and how to extend them.

## Layout-critical motion components

- Prefer `initial={false}` on `motion.header`, `motion.footer`, `motion.nav`, route shells, and any always-on layout block. This skips the hidden `opacity: 0` / translated start state that previously stuck around.
- If you need to keep an entrance animation, ensure the `animate` target is visibly interactive (`opacity: 1`, `transform: none`) and add `pointer-events: none` while hidden if the element stays mounted.
- For content sections (cards, tables) you can keep fancy transitions, but avoid chaining them to global state changes. If a section must animate, gate it behind data loading so it never mounts in a hidden state without a matching `animate`.

## Popovers, drawers, toasts

- Wrap portal/root overlays with `AnimatePresence` so they fully unmount when closed. Partially hidden overlays should set `pointer-events: none` while `opacity < 1` so they cannot intercept clicks.
- Avoid manual `element.style.opacity = 0` mutations; use CSS classes or Motion variants controlled via React state instead.

## Reduced motion baseline

`src/index.tsx` now wraps the app with `MotionConfig reducedMotion="user"`, so users who prefer reduced motion will skip non-essential transitions. Layout-critical components still render via `initial={false}` regardless of this setting.

## Tooling

1. **ESLint rule** – see `package.json#eslintConfig`. The `no-restricted-syntax` rule now warns when:
   - A `motion.header|footer|nav|main` declares `initial={{ … }}` instead of `initial={false}`.
   - Code mutates `element.style.opacity` or `element.style.transform`.
2. **Playwright checks** – run `npm run test:e2e`.  
   - `tests/e2e/header-visibility.spec.ts` asserts the header/nav have `opacity > 0.5`, `pointer-events` enabled, and no stuck translations on `/swap` and after navigating to `/bridge`.
3. **Codemod helper** – run  
   ```bash
   npm run codemod:layout-motion -- --dry-run
   ```  
   Use `--components header,footer,nav,main` (default) to force `initial={false}` on matching `<motion.*>` tags across `src/`.

## Debug checklist for “invisible but clickable”

1. Search for `initial={{`, `motion.` wrappers, `Transition`, `.style.opacity`, or `IntersectionObserver` setups.
2. Confirm the element either unmounts when hidden or uses `initial={false}`.
3. Run `npm run test:e2e` locally. If Playwright complains about opacity/transform, inspect computed styles via DevTools (`Elements → Computed`).
4. If a service worker was previously registered, clear it in DevTools → Application → Service Workers (the project does **not** ship an SW by default).
5. As a last resort, add the temporary CSS escape hatch (commented inside this doc) to force stuck headers/navs visible while debugging:
   ```css
   /* DEV ONLY – remove before committing */
   header[style*="opacity: 0"],
   header[style*="translateY("] {
     opacity: 1 !important;
     transform: none !important;
   }
   ```

By following these steps we can keep layout-critical UI visible immediately while still allowing tasteful animations for content sections.
