import { holdArtworkItems } from './artwork-admission.js';
import { analysisMatches } from './image-reanalysis.js';
import { holdArtworkAnalyses } from './artwork-analysis-capture.js';

// Input analyses remain captured even when matching. Nonmatching preparation
// also allocates its own generation; both can outlive live-wall replacements.
export function holdArtworkExport(items, settings, { budget } = {}) {
  const releases = [holdArtworkItems(items)];
  try {
    if (settings) for (const item of items) {
      if (!item.admission) continue;
      releases.push(holdArtworkAnalyses(item.frames ?? [item], { extraGenerations: analysisMatches(item, settings) ? 0 : 1, budget }));
    }
  } catch (error) { for (const release of releases) release(); throw error; }
  return () => { for (const release of releases) release(); };
}
