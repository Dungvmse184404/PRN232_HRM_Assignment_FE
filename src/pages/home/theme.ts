import type { CSSProperties } from 'react';

/**
 * Cinematic Equestrian Editorial palette - same values as the approved Hero's
 * THEME_VARS in HomePage.tsx, redeclared here so below-hero sections never need
 * to import from or modify the Hero file.
 */
export const OBSIDIAN = '#14100C';
export const OBSIDIAN_2 = '#1F1811';
export const CRIMSON = '#7A1F1F';
export const GOLD = '#B8863B';
export const PARCHMENT = '#F3E9D8';
export const DUST = '#B9AC97';
export const IVORY = '#FAF4E8';

export const DISPLAY_FONT = "'Playfair Display', Georgia, 'Times New Roman', serif";

/** Spread onto a section's own root element's `style` to expose the palette as CSS vars. */
export const SECTION_THEME_VARS: CSSProperties = {
  ['--obsidian' as string]: OBSIDIAN,
  ['--obsidian-2' as string]: OBSIDIAN_2,
  ['--crimson' as string]: CRIMSON,
  ['--gold' as string]: GOLD,
  ['--parchment' as string]: PARCHMENT,
  ['--dust' as string]: DUST,
  ['--ivory' as string]: IVORY,
};
