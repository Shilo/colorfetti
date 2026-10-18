import { holdArtworkItems } from './artwork-admission.js';
import { analysisMatches } from './image-reanalysis.js';

// Live-wall reanalysis has one reserved generation. Captured export analyses
// may outlive that generation through encoding, so charge their own scratch.
export function holdArtworkExport(items, settings) {
  const releases = [holdArtworkItems(items)];
  try {
    if (settings) for (const item of items) {
      if (!item.admission || analysisMatches(item, settings)) continue;
      const bytes = (item.frames ?? [item]).reduce((sum, frame) => sum + frame.original.width * frame.original.height * 3 + 2048, 0);
      releases.push(item.admission.scratch(bytes));
    }
  } catch (error) { for (const release of releases) release(); throw error; }
  return () => { for (const release of releases) release(); };
}
