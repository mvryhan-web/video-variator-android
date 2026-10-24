export const OWNER_HOME_HERO_HEADINGS = Object.freeze({
  'owner-01-close-up-woman': {title: 'AI Canvas', label: 'CREATIVE WORKSPACE'},
  'owner-02-futuristic-portal': {title: 'Seedance 2.0', label: 'EXPLORE VIDEO MODELS'},
  'owner-03-underwater-woman': {title: 'Seedance 2.5', label: 'EXPLORE VIDEO MODELS'},
  'owner-04-neon-motorcycle': {title: 'Video Studio', label: 'CREATE WITH DEEPSYQ'},
  'owner-05-sky-whale': {title: 'AI Agent', label: 'CREATIVE CO-PILOT · COMING SOON'},
  'owner-06-golden-forest': {title: 'Image Studio', label: 'CREATE WITH DEEPSYQ'}
});
export function ownerHomeShowcase(item) {
  const pinned = OWNER_HOME_HERO_HEADINGS[item?.slug];
  return pinned ? {...item?.defaultSettings?.homeShowcase, ...pinned} : item?.defaultSettings?.homeShowcase;
}
