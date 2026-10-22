<script>
  import { parseColorCode } from './lib/color-code.js';
  import { paintPaletteSwatch } from './lib/palette-preview.js';

  let { label, value, code = $bindable(), disabled = false, oncommit } = $props();
  const id = $props.id();
  let error = $state('');

  function commit() {
    if (disabled) return;
    const color = parseColorCode(code);
    if (!color) { error = 'Use a color code like #aabbcc or #abc.'; return; }
    error = oncommit(color) || '';
    if (!error) code = color;
  }
  function pick(event) {
    if (disabled) return;
    const color = event.currentTarget.value;
    error = oncommit(color) || '';
    if (error) event.currentTarget.value = value;
    else code = color;
  }
</script>

<div class="palette-color-field">
  <div class="palette-color-controls">
    <label class="palette-color-label">{label}<span class="palette-color-input" class:is-disabled={disabled}>
      <input type="color" {value} {disabled} onchange={pick} />
      <canvas aria-hidden="true" use:paintPaletteSwatch={value}></canvas>
    </span></label>
    <input class="glass-input palette-color-code" aria-label={label + ' code'} aria-invalid={!!error}
      aria-describedby={error ? id + '-error' : undefined} type="text" bind:value={code} {disabled}
      placeholder="#aabbcc" autocomplete="off" autocapitalize="off" spellcheck="false"
      oninput={() => error = ''} onblur={commit}
      onkeydown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />
  </div>
  {#if error}<p id={id + '-error'} class="palette-editor-error" role="alert">{error}</p>{/if}
</div>
