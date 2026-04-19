/**
 * Named z-index tiers.
 *
 * Consolidates stacking so fixed elements (sidebar, bottom nav, FAB, drawer,
 * modal) can't collide as new mobile chrome is added. Consumers read a
 * single number and spread it via Tailwind arbitrary values, e.g.
 *   className={`fixed bottom-0 z-[${Z_INDEX.bottomNav}]`}
 */
export const Z_INDEX = {
  sidebar: 30,
  bottomNav: 40,
  topBar: 45,
  fab: 50,
  drawer: 55,
  modalBackdrop: 60,
  modal: 61,
  toast: 70,
} as const;

export type ZIndexTier = keyof typeof Z_INDEX;
