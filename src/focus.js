/**
 * Focus management for the modal dialogs.
 *
 * The dialogs are marked `role="dialog" aria-modal="true"`, which tells
 * assistive technology to treat the rest of the page as inert — but browsers do
 * not manage the keyboard for you. Two things were missing:
 *
 * - Tab walked straight out of an open dialog into the page behind it. Verified
 *   by pressing Tab six times from the close button: focus landed on a button
 *   outside the dialog while the dialog was still open.
 * - Closing a dialog left focus on the now-hidden close button rather than
 *   returning it to the control that opened it, so a keyboard user lost their
 *   place and the next Tab jumped somewhere arbitrary.
 *
 * `nextFocusTarget` is kept pure so the wrap-around rules can be tested without
 * a DOM.
 */

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");

/**
 * Chooses where Tab should land next, wrapping at either end.
 *
 * @param {Array} elements focusable elements inside the dialog, in tab order
 * @param {*} current the currently focused element
 * @param {boolean} backwards true for Shift+Tab
 * @returns the element to focus, or null when there is nothing to focus
 */
export function nextFocusTarget(elements, current, backwards = false) {
  if (!Array.isArray(elements) || elements.length === 0) return null;

  const index = elements.indexOf(current);
  if (index === -1) {
    // Focus was outside the dialog (or on the dialog container itself): pull it
    // back to the nearest end rather than guessing a middle position.
    return backwards ? elements[elements.length - 1] : elements[0];
  }

  const step = backwards ? -1 : 1;
  const next = (index + step + elements.length) % elements.length;
  return elements[next];
}

/** Focusable elements inside `container`, skipping anything not rendered. */
export function focusableWithin(container) {
  if (!container) return [];
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter((el) => {
    if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return false;
    // offsetParent is null for display:none subtrees; position:fixed elements
    // report null too, so fall back to measuring a box.
    return el.offsetParent !== null || el.getClientRects().length > 0;
  });
}
