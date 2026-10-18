import omggif from 'omggif';

export function imageFixture(emptyFirst = false) {
  const w = 64, h = 48;
  const box = (x,y,width,height,color) => {
    const indices = new Uint16Array(w*h).fill(256);
    for(let dy=0;dy<height;dy++) for(let dx=0;dx<width;dx++) indices[(y+dy)*w+x+dx]=color;
    return indices;
  };
  return { w,h,colors:['#000000','#ffffff'],loop:2,frames:[
    {indices:emptyFirst?box(0,0,0,0,0):box(8,6,40,32,0),delay:100},
    {indices:box(20,18,10,8,1),delay:200},
    {indices:box(0,0,0,0,0),delay:70},
    {indices:box(63,47,1,1,1),delay:150},
    {indices:box(0,0,w,h,0),delay:110},
    {indices:box(0,0,1,1,1),delay:190},
  ]};
}
export function sourceGif(image = imageFixture()) {
  const storage = new Uint8Array(100000), writer = new omggif.GifWriter(storage,image.w,image.h,
    {palette:[0,...image.colors.map(c=>parseInt(c.slice(1),16)),0],loop:image.loop});
  for(const frame of image.frames) writer.addFrame(0,0,image.w,image.h,
    Uint8Array.from(frame.indices,i=>i===256?0:i+1),{transparent:0,disposal:2,delay:frame.delay/10});
  return storage.slice(0,writer.end());
}
export function legacyFixture(first = '#000000', second = '#ffffff') {
  const source = imageFixture();
  return { ...source,colors:undefined,first,second,
    frames:source.frames.map(f=>({mask:Uint8Array.from(f.indices,i=>i===256?0:i+1),delay:f.delay})) };
}
