<script>
  import { tooltip } from './lib/tooltip.js';
  import './caption-metadata.css';

  // Order follows the caption's alignment rather than a device-width guess.
  // A touch caption and the example both anchor their resolution at the left.
  let { width, height, label = '', pending = false, description = '', failure = '', leftAligned = false } = $props();
</script>

<span class="dim caption-metadata" class:caption-metadata-left={leftAligned}>
  <span class="caption-resolution">{width}<span class="by">×</span>{height}</span>
  {#if label}
    <span class="caption-separator" aria-hidden="true">{' · '}</span>
    <span class="caption-color-count" aria-busy={pending} use:tooltip={description}>{label}</span>
  {/if}
  {#if failure}
    <span class="palette-failure-mark caption-failure" use:tooltip={failure}>{' · Retry needed'}</span>
  {/if}
</span>
