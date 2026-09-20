// Web: the browser implements the full SVG filter set, so the prototype's
// turbulence-based ink wobble and paper grain are used as-is.

/** Filter for land outlines; native bakes the wobble into geometry instead. */
export const LAND_FILTER: string | undefined = 'url(#blot)';
export const BAKE_WOBBLE = false;

export function EffectDefs() {
  return (
    <>
      <filter id="parch" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={4} seed={7} result="n" />
        <feColorMatrix in="n" type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.35" />
        </feComponentTransfer>
      </filter>
      <filter id="blot" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves={3} seed={3} result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale={2.4} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </>
  );
}

/** Paper grain drawn inside the SVG, multiplied over everything below. */
export function PaperGrainSvg({ W, H }: { W: number; H: number }) {
  return (
    <rect
      width={W}
      height={H}
      fill="#8a6a35"
      opacity={0.5}
      filter="url(#parch)"
      style={{ mixBlendMode: 'multiply', pointerEvents: 'none' }}
    />
  );
}

export function PaperGrainOverlay() {
  return null;
}
