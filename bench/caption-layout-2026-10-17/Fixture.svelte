<script>
  import '../../src/foundation.css';
  import CaptionMetadata from '../../src/CaptionMetadata.svelte';
  let label = $state('2 colors');
  let pending = $state(false);
</script>

<main style="padding:16px;box-sizing:border-box;width:100%;">
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
    <button onclick={() => label = ''}>No count</button>
    <button onclick={() => label = '2 colors'}>Two colors</button>
    <button onclick={() => label = '256 colors'}>Many colors</button>
    <button onclick={() => pending = !pending}>Toggle pending</button>
  </div>
  {#each [false, true] as stacked}
    <section class:stack-captions={stacked} data-case={stacked ? 'stacked' : 'ordinary'}>
      <figure class="tile" style="margin:0 0 20px;width:100%;">
        <figcaption class="cap has-image-actions">
          <button type="button" class="caption-preview" aria-label="Preview long filename">
            <span class="caption-details">
              <span class="name">An exceptionally long filename with important sprite animation details.png</span>
              <CaptionMetadata width={192} height={192} {label} {pending} description="Colors used by the visible output." />
            </span>
          </button>
          <button class="ib glass-btn tile-share" aria-label="Image actions">…</button>
        </figcaption>
      </figure>
    </section>
  {/each}
  <section class="empty" data-case="example" style="display:block;padding:0;">
    <figure class="tile" style="margin:0;width:100%;max-width:none;">
      <figcaption class="example-caption">
        <button class="cap btn glass-btn glass-btn--primary example-add" aria-label="Add images">
          <span class="caption-details">
            <span class="name">Colorfetti</span>
            <CaptionMetadata width={60} height={60} {label} {pending} leftAligned />
          </span>
          <span class="example-add-label">Add images</span>
        </button>
      </figcaption>
    </figure>
  </section>
</main>
