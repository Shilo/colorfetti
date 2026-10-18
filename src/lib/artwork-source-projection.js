// Cache identities must remain stable without retaining a frame wrapper and its
// legacy analysis. Tokens are idempotent so nested projections preserve sharing.
const identities = new WeakMap(), tokens = new WeakSet();
export function artworkIdentity(value) {
  if (!value || typeof value !== 'object' && typeof value !== 'function') return value;
  if (tokens.has(value)) return value;
  let token = identities.get(value);
  if (!token) { token = {}; identities.set(value, token); tokens.add(token); }
  return token;
}

export function originalArtworkItem(item) {
  const original = item.original ?? item.frames?.[0]?.original;
  if (!original) throw new Error('Invalid artwork source image.');
  return {
    id: item.id, name: item.name, admission: item.admission,
    identity: artworkIdentity(item.identity ?? item),
    original, img: { w: original.width, h: original.height },
    ...(item.frames ? {
      framesIdentity: artworkIdentity(item.framesIdentity ?? item.frames),
      frames: item.frames.map(frame => ({ identity: artworkIdentity(frame.identity ?? frame), original: frame.original, delay: frame.delay })),
      loop: item.loop,
    } : {}),
  };
}
