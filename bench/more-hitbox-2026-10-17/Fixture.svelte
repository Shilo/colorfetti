<script>
  import '../../src/foundation.css';
  import CaptionMetadata from '../../src/CaptionMetadata.svelte';
  import PixelIcon from '../../src/PixelIcon.svelte';
  import 'virtual:more-touch-branches.css';
  let label = $state('2 colors');
  let pending = $state(false);
  let width = $state(140);
  let events = $state([]);
  let serial = 0;
  function activate(variant, action) {
    events = [...events.slice(-7), `${++serial}: ${variant} — ${action}`];
  }
</script>

<main class="more-hitbox-fixture">
  <h1>More hitbox: before / after</h1>
  <p>Codex Browser mouse test of production touch-layout CSS. This fixture activates actual hover:none branches within labeled samples. It does not emulate touch or test a phone.</p>
  <nav aria-label="Fixture controls">
    <button onclick={() => width = 140}>140px tiles</button>
    <button onclick={() => width = 180}>180px tiles</button>
    <button onclick={() => width = 300}>300px tiles</button>
    <button onclick={() => label = ''}>No count</button>
    <button onclick={() => label = '2 colors'}>Two colors</button>
    <button onclick={() => label = '256 colors'}>Many colors</button>
    <button onclick={() => pending = !pending}>Toggle pending</button>
    <button onclick={() => { events = []; serial = 0; }}>Clear actions</button>
  </nav>
  <output aria-live="polite" aria-label="Last action">{events.at(-1) || 'No action yet'}</output>
  <div class="comparisons">
    {#each ['Before', 'After'] as variant}
      <section class="touch-layout" class:baseline={variant === 'Before'} aria-label={variant + ' touch CSS'} data-variant={variant}>
        <h2>{variant}: {variant === 'Before' ? '64px reserved' : 'production layout'}</h2>
        {#each [false, true] as stacked}
          <div class:stack-captions={stacked} data-context={stacked ? 'stacked' : 'ordinary'}>
            <p>{stacked ? 'Stacked' : 'Ordinary'} · {width}px</p>
            <figure class="tile" style:width={width + 'px'}>
              <figcaption class="cap has-image-actions">
                <button type="button" class="caption-preview" onclick={() => activate(variant, 'Preview ' + (stacked ? 'stacked' : 'ordinary'))} aria-label={variant + ' Preview ' + (stacked ? 'stacked' : 'ordinary')} aria-haspopup="dialog">
                  <span class="caption-details">
                    <span class="name">pwa-192-important-sprite.png</span>
                    <CaptionMetadata width={stacked ? 2048 : 192} height={stacked ? 2048 : 192} {label} {pending} description="Colors used by the visible output." />
                  </span>
                </button>
                <button class="ib glass-btn tile-share" onclick={() => activate(variant, 'Image actions ' + (stacked ? 'stacked' : 'ordinary'))} aria-label={variant + ' Image actions ' + (stacked ? 'stacked' : 'ordinary')} aria-haspopup="dialog"><PixelIcon name="more" /></button>
              </figcaption>
            </figure>
          </div>
        {/each}
        <p>Empty-wall example</p>
        <figure class="tile" style:width={width + 'px'}>
          <figcaption class="example-caption">
            <button class="cap btn glass-btn glass-btn--primary example-add" onclick={() => activate(variant, 'Add images')} aria-label={variant + ' Add images'}>
              <span class="caption-details"><span class="name">Colorfetti</span><CaptionMetadata width={60} height={60} {label} {pending} leftAligned /></span>
              <span class="example-add-label"><span class="example-label-desktop">Add, drop or paste images</span><span class="example-label-touch">Add images</span></span><PixelIcon name="import" />
            </button>
          </figcaption>
        </figure>
      </section>
    {/each}
  </div>
  <section aria-label="Unmodified desktop CSS" class="desktop-sample">
    <h2>Unmodified desktop CSS</h2>
    <figure class="tile" style="width:min(100%,600px)">
      <figcaption class="cap has-image-actions">
        <button type="button" class="caption-preview" onclick={() => activate('Desktop', 'Preview')} aria-label="Desktop Preview" aria-haspopup="dialog"><span class="caption-details"><span class="name">pwa-192-important-sprite.png</span><CaptionMetadata width={192} height={192} {label} {pending} /></span></button>
        <button class="ib glass-btn tile-share" aria-label="Desktop Image actions"><PixelIcon name="more" /></button>
      </figcaption>
    </figure>
  </section>
  <ol aria-label="Action history">{#each events as event}<li>{event}</li>{/each}</ol>
</main>

<style>
  :global(html), :global(body) { overflow: auto; height: auto; min-height: 100%; }
  .more-hitbox-fixture { padding: 16px; max-width: 1000px; margin: auto; }
  h1 { font-size: 23px; } h2 { font-size: 16px; }
  p { max-width: 75ch; font-size: 13px; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  nav button { min-height: 36px; border: 1px solid currentColor; border-radius: 6px; padding: 4px 8px; }
  output { display: block; min-height: 28px; font-weight: bold; }
  .comparisons { display: flex; gap: 24px; flex-wrap: wrap; }
  .comparisons section { min-width: 140px; }
  :global(.more-hitbox-fixture .tile) { display: block; margin: 0 0 24px; }
  :global(:root .more-hitbox-fixture .touch-layout.baseline .tile .cap.has-image-actions) { grid-template-columns: minmax(0,1fr) 64px; }
</style>
