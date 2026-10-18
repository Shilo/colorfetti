<script>
  // Draws an ImageData at its own pixel size. CSS scales the canvas up with hard edges.
  let { pixels, class: cls = '', clearOnDestroy = false } = $props();
  let canvas;
  $effect(() => {
    const clear = clearOnDestroy;
    return () => { if (clear && canvas) { canvas.width = 0; canvas.height = 0; } };
  });

  $effect(() => {
    // Setting a canvas's size clears it and makes its memory anew, even to the size it has.
    if (canvas.width !== pixels.width) canvas.width = pixels.width;
    if (canvas.height !== pixels.height) canvas.height = pixels.height;
    canvas.getContext('2d').putImageData(pixels, 0, 0);
  });
</script>

<canvas bind:this={canvas} class={cls}></canvas>
