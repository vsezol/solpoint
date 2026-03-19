/**
 * Shared focus for text fields: keep the default 1px border weight, only the color changes.
 * Avoid focus rings — they read as a second, thicker outline on dark UI.
 */
export const formControlFocusClasses =
  "transition-[border-color] duration-200 ease-out focus:outline-none focus:border-white";
