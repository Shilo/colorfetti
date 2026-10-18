import { holdArtworkData } from './artwork-admission.js';

// Jobs snapshot original data before yielding. Keep their admission charged until
// actual settlement, independently of wall removal or subscriber cancellation.
export function holdArtworkSources(sources) {
  const seen = new Set(), releases = [];
  try {
    for (const source of sources) {
      const data = source.data ?? source.original?.data;
      if (!data || seen.has(data)) continue;
      seen.add(data); releases.push(holdArtworkData(data));
    }
  } catch (error) {
    for (const release of releases) release();
    throw error;
  }
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const release of releases) release();
  };
}
