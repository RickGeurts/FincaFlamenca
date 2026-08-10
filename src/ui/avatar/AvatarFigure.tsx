import {
  HAIR_COLORS,
  SKINS,
  COLOR_BY_ID,
  hidesFringe,
  hidesLegs,
  type AvatarConfig,
  type ColorId,
} from "../../game/avatar";

/**
 * The character, drawn as layered SVG.
 *
 * AVATAR_CLOTHING.md asked for a choice of pipeline and this is it: option A,
 * layered 2D on a shared skeleton — except the layers are drawn in code rather
 * than painted, so the wardrobe is real today instead of waiting on an
 * illustrator. Every garment is a function of one skeleton and one colour, so
 * one shape serves all ten colours, and any layer can later be swapped for a
 * real drawing without the system around it changing at all.
 *
 * The register follows the quest scenes: chunky, rounded, warm, a big readable
 * face and no thin lines.
 */

/** Everything is positioned against this. Change it and every layer moves. */
const BODY = {
  headX: 100,
  headY: 72,
  headR: 39,
  neckY: 104,
  torsoTop: 112,
  torsoBottom: 194,
  torsoLeft: 63,
  torsoRight: 137,
  hipY: 192,
  legTop: 190,
  legBottom: 258,
  footY: 258,
  shoulderY: 124,
  handY: 186,
};

const OUTLINE = "#2a1c10";

function tint(colorId: ColorId | undefined, fallback: string): string {
  return colorId ? (COLOR_BY_ID.get(colorId)?.hex ?? fallback) : fallback;
}

/** A colour dark enough to draw a fold or a seam on top of the garment. */
function shade(hex: string): string {
  return `color-mix(in srgb, ${hex} 78%, ${OUTLINE})`;
}

export function AvatarFigure({
  config,
  size = 200,
  className = "",
}: {
  config: AvatarConfig;
  size?: number;
  className?: string;
}) {
  const skin = SKINS[config.skin] ?? SKINS[2];
  const hairHex = HAIR_COLORS[config.hair.colorId] ?? HAIR_COLORS[0];
  const legs = !hidesLegs(config);

  return (
    <svg
      viewBox="0 0 200 300"
      width={size}
      height={size * 1.5}
      className={className}
      role="img"
      aria-hidden
    >
      {/* 1 · behind everything: hair at the back, and anything slung over a shoulder */}
      <HairBack style={config.hair.itemId} hex={hairHex} />
      {config.carry && <CarryBehind item={config.carry.itemId} hex={tint(config.carry.colorId, "#6b4423")} />}

      {/* 2 · body */}
      <Body skin={skin} />

      {/* 3 · clothes, legs first so the top overlaps the waistband */}
      {legs && config.bottom && (
        <Bottom item={config.bottom.itemId} hex={tint(config.bottom.colorId, "#3d6ea8")} />
      )}
      {config.shoes && (
        <Shoes item={config.shoes.itemId} hex={tint(config.shoes.colorId, "#6b4423")} />
      )}
      {config.top && <Top item={config.top.itemId} hex={tint(config.top.colorId, "#fefaf3")} skin={skin} />}

      {/* 4 · face, then everything worn on top of it */}
      <Face variant={config.face} />
      {!hidesFringe(config) && <HairFront style={config.hair.itemId} hex={hairHex} />}
      {config.hat && <Hat item={config.hat.itemId} hex={tint(config.hat.colorId, "#d4a017")} />}
      {config.accessory && (
        <Accessory item={config.accessory.itemId} hex={tint(config.accessory.colorId, "#b91c1c")} />
      )}
      {config.carry && <CarryFront item={config.carry.itemId} hex={tint(config.carry.colorId, "#6b4423")} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Body

function Body({ skin }: { skin: string }) {
  return (
    <g>
      {/* legs */}
      <rect x="80" y={BODY.legTop} width="17" height="72" rx="8" fill={skin} />
      <rect x="103" y={BODY.legTop} width="17" height="72" rx="8" fill={skin} />
      {/* arms */}
      <rect x="48" y={BODY.shoulderY} width="16" height="66" rx="8" fill={skin} />
      <rect x="136" y={BODY.shoulderY} width="16" height="66" rx="8" fill={skin} />
      {/* torso */}
      <rect
        x={BODY.torsoLeft}
        y={BODY.torsoTop}
        width={BODY.torsoRight - BODY.torsoLeft}
        height={BODY.torsoBottom - BODY.torsoTop}
        rx="26"
        fill={skin}
      />
      {/* neck */}
      <rect x="88" y="96" width="24" height="24" rx="10" fill={skin} />
      {/* head */}
      <circle cx={BODY.headX} cy={BODY.headY} r={BODY.headR} fill={skin} />
      {/* ears */}
      <circle cx="60" cy="76" r="9" fill={skin} />
      <circle cx="140" cy="76" r="9" fill={skin} />
    </g>
  );
}

function Face({ variant }: { variant: number }) {
  const eyeY = 74;
  return (
    <g>
      {variant === 2 ? (
        // Eyes closed, happy.
        <>
          <path d="M78 74 q7 -7 14 0" stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M108 74 q7 -7 14 0" stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="85" cy={eyeY} r="5.5" fill={OUTLINE} />
          <circle cx="115" cy={eyeY} r="5.5" fill={OUTLINE} />
          <circle cx="86.8" cy={eyeY - 2} r="1.8" fill="#fefaf3" />
          <circle cx="116.8" cy={eyeY - 2} r="1.8" fill="#fefaf3" />
        </>
      )}
      {/* cheeks */}
      <circle cx="74" cy="88" r="7" fill="#e58f8f" opacity="0.45" />
      <circle cx="126" cy="88" r="7" fill="#e58f8f" opacity="0.45" />
      {/* mouth */}
      {variant === 1 ? (
        <path d="M90 92 q10 12 20 0" stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M92 92 q8 9 16 0" stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Hair

function HairBack({ style, hex }: { style: string; hex: string }) {
  const cap = <circle cx={BODY.headX} cy={BODY.headY - 4} r={BODY.headR + 5} fill={hex} />;
  switch (style) {
    case "hair_tail":
      return (
        <g>
          {cap}
          <rect x="128" y="70" width="22" height="62" rx="11" fill={hex} />
        </g>
      );
    case "hair_curls":
      return (
        <g>
          {cap}
          {[54, 66, 134, 146].map((x, i) => (
            <circle key={x} cx={x} cy={60 + (i % 2) * 26} r="15" fill={hex} />
          ))}
        </g>
      );
    case "hair_braid":
      return (
        <g>
          {cap}
          {[92, 112, 132].map((y, i) => (
            <circle key={y} cx={142 - i} cy={y} r="10" fill={hex} />
          ))}
        </g>
      );
    case "hair_bun":
      return (
        <g>
          {cap}
          <circle cx={BODY.headX} cy="24" r="17" fill={hex} />
        </g>
      );
    default:
      return cap;
  }
}

function HairFront({ style, hex }: { style: string; hex: string }) {
  if (style === "hair_short") {
    return <path d="M62 62 q38 -34 76 0 q-16 -14 -38 -14 q-22 0 -38 14z" fill={hex} />;
  }
  return <path d="M62 60 q26 -30 76 -6 q-20 -20 -46 -16 q-22 4 -30 22z" fill={hex} />;
}

// ---------------------------------------------------------------------------
// Clothes

function Top({ item, hex, skin }: { item: string; hex: string; skin: string }) {
  const body = (
    <rect
      x={BODY.torsoLeft - 3}
      y={BODY.torsoTop + 2}
      width={BODY.torsoRight - BODY.torsoLeft + 6}
      height={BODY.torsoBottom - BODY.torsoTop - 4}
      rx="24"
      fill={hex}
    />
  );
  const shortSleeves = (
    <>
      <rect x="46" y={BODY.shoulderY - 4} width="20" height="30" rx="10" fill={hex} />
      <rect x="134" y={BODY.shoulderY - 4} width="20" height="30" rx="10" fill={hex} />
    </>
  );
  const longSleeves = (
    <>
      <rect x="46" y={BODY.shoulderY - 4} width="20" height="60" rx="10" fill={hex} />
      <rect x="134" y={BODY.shoulderY - 4} width="20" height="60" rx="10" fill={hex} />
    </>
  );

  switch (item) {
    case "top_trui":
      return (
        <g>
          {body}
          {longSleeves}
          <path d="M84 118 q16 14 32 0" stroke={shade(hex)} strokeWidth="4" fill="none" />
        </g>
      );
    case "top_jas":
    case "top_regenjas":
      return (
        <g>
          {body}
          {longSleeves}
          <rect x="96" y={BODY.torsoTop + 6} width="8" height="76" fill={shade(hex)} />
          {item === "top_regenjas" && (
            <path
              d={`M66 ${BODY.torsoTop + 4} q34 -26 68 0 q-34 22 -68 0z`}
              fill={shade(hex)}
            />
          )}
        </g>
      );
    case "top_jurk":
      return (
        <g>
          {shortSleeves}
          <path
            d={`M${BODY.torsoLeft - 3} ${BODY.torsoTop + 2} h80 v70 l22 62 h-124 l22 -62z`}
            fill={hex}
          />
        </g>
      );
    case "top_pollera":
      return (
        <g>
          {shortSleeves}
          <rect x={BODY.torsoLeft - 3} y={BODY.torsoTop + 2} width="80" height="64" rx="20" fill={hex} />
          <path d={`M60 176 h80 l26 76 h-132z`} fill={hex} />
          <path d="M40 214 h120" stroke={shade(hex)} strokeWidth="6" fill="none" />
          <path d="M34 236 h132" stroke={shade(hex)} strokeWidth="6" fill="none" />
        </g>
      );
    default:
      // het hemd
      return (
        <g>
          {body}
          {shortSleeves}
          <path d={`M88 ${BODY.torsoTop} l12 16 l12 -16z`} fill={skin} />
        </g>
      );
  }
}

function Bottom({ item, hex }: { item: string; hex: string }) {
  switch (item) {
    case "bottom_rok":
      return <path d={`M70 ${BODY.hipY - 8} h60 l16 52 h-92z`} fill={hex} />;
    case "bottom_short":
      return (
        <g>
          <rect x="76" y={BODY.hipY - 10} width="48" height="34" rx="10" fill={hex} />
          <rect x="78" y={BODY.hipY - 10} width="19" height="40" rx="8" fill={hex} />
          <rect x="103" y={BODY.hipY - 10} width="19" height="40" rx="8" fill={hex} />
        </g>
      );
    case "bottom_overall":
      return (
        <g>
          <rect x="78" y={BODY.hipY - 10} width="19" height="70" rx="8" fill={hex} />
          <rect x="103" y={BODY.hipY - 10} width="19" height="70" rx="8" fill={hex} />
          <rect x="76" y="150" width="48" height="46" rx="10" fill={hex} />
          <rect x="70" y="126" width="9" height="34" rx="4" fill={hex} />
          <rect x="121" y="126" width="9" height="34" rx="4" fill={hex} />
        </g>
      );
    default:
      // de broek
      return (
        <g>
          <rect x="76" y={BODY.hipY - 10} width="48" height="26" rx="8" fill={hex} />
          <rect x="78" y={BODY.hipY - 10} width="19" height="70" rx="8" fill={hex} />
          <rect x="103" y={BODY.hipY - 10} width="19" height="70" rx="8" fill={hex} />
        </g>
      );
  }
}

function Shoes({ item, hex }: { item: string; hex: string }) {
  const left = 74;
  const right = 101;
  switch (item) {
    case "shoes_laars":
      return (
        <g>
          <rect x={left} y="226" width="25" height="42" rx="8" fill={hex} />
          <rect x={right} y="226" width="25" height="42" rx="8" fill={hex} />
        </g>
      );
    case "shoes_sandaal":
      return (
        <g>
          <rect x={left} y="258" width="25" height="10" rx="5" fill={hex} />
          <rect x={right} y="258" width="25" height="10" rx="5" fill={hex} />
          <path d={`M${left + 3} 254 h19`} stroke={hex} strokeWidth="5" strokeLinecap="round" />
          <path d={`M${right + 3} 254 h19`} stroke={hex} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case "shoes_klomp":
      return (
        <g>
          <path d={`M${left} 268 v-14 q12 -6 25 0 v10 q0 4 -6 4z`} fill="#d4a017" />
          <path d={`M${right} 268 v-14 q12 -6 25 0 v10 q0 4 -6 4z`} fill="#d4a017" />
        </g>
      );
    default:
      // de schoen
      return (
        <g>
          <rect x={left} y="250" width="25" height="18" rx="7" fill={hex} />
          <rect x={right} y="250" width="25" height="18" rx="7" fill={hex} />
        </g>
      );
  }
}

// ---------------------------------------------------------------------------
// Worn on top

function Hat({ item, hex }: { item: string; hex: string }) {
  switch (item) {
    case "hat_pet":
      return (
        <g>
          <path d={`M62 46 q38 -32 76 0 v10 h-76z`} fill={hex} />
          <rect x="130" y="48" width="34" height="10" rx="5" fill={hex} />
        </g>
      );
    case "hat_strohoed":
      return (
        <g>
          <ellipse cx="100" cy="50" rx="66" ry="13" fill="#e0b96a" />
          <path d="M70 50 q30 -40 60 0z" fill="#d4a017" />
        </g>
      );
    case "hat_muts":
      return (
        <g>
          <path d={`M60 56 q40 -46 80 0 z`} fill={hex} />
          <rect x="58" y="50" width="84" height="16" rx="8" fill={shade(hex)} />
          <circle cx="100" cy="14" r="11" fill={hex} />
        </g>
      );
    case "hat_bloem":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={140 + 11 * Math.cos((a * Math.PI) / 180)}
              cy={46 + 11 * Math.sin((a * Math.PI) / 180)}
              r="8"
              fill={hex}
            />
          ))}
          <circle cx="140" cy="46" r="7" fill="#d4a017" />
        </g>
      );
    case "hat_kroon":
      return (
        <g>
          <path d="M64 44 l10 -30 l14 18 l12 -26 l12 26 l14 -18 l10 30z" fill="#d4a017" />
          <rect x="64" y="42" width="72" height="12" rx="5" fill="#d4a017" />
          <circle cx="100" cy="30" r="5" fill="#b91c1c" />
        </g>
      );
    default:
      // el sombrero vueltiao: wide brim, woven black and cream
      return (
        <g>
          <ellipse cx="100" cy="50" rx="70" ry="14" fill="#f2e3c4" />
          <ellipse cx="100" cy="50" rx="70" ry="14" fill="none" stroke={OUTLINE} strokeWidth="3" strokeDasharray="7 7" />
          <path d="M70 50 q30 -42 60 0z" fill="#f2e3c4" />
          <path d="M72 40 q28 -14 56 0" stroke={OUTLINE} strokeWidth="5" fill="none" strokeDasharray="8 8" />
        </g>
      );
  }
}

function Accessory({ item, hex }: { item: string; hex: string }) {
  switch (item) {
    case "acc_bril":
    case "acc_zonnebril": {
      const dark = item === "acc_zonnebril";
      return (
        <g>
          <circle cx="85" cy="74" r="13" fill={dark ? OUTLINE : "none"} stroke={OUTLINE} strokeWidth="4" opacity={dark ? 0.85 : 1} />
          <circle cx="115" cy="74" r="13" fill={dark ? OUTLINE : "none"} stroke={OUTLINE} strokeWidth="4" opacity={dark ? 0.85 : 1} />
          <path d="M98 74 h4" stroke={OUTLINE} strokeWidth="4" />
        </g>
      );
    }
    case "acc_ketting":
      return (
        <g>
          <path d="M84 112 q16 22 32 0" stroke="#d4a017" strokeWidth="5" fill="none" />
          <circle cx="100" cy="126" r="6" fill="#d4a017" />
        </g>
      );
    case "acc_handschoen":
      return (
        <g>
          <rect x="46" y="176" width="20" height="22" rx="9" fill={hex} />
          <rect x="134" y="176" width="20" height="22" rx="9" fill={hex} />
        </g>
      );
    default:
      // de sjaal
      return (
        <g>
          <rect x="72" y="104" width="56" height="18" rx="9" fill={hex} />
          <rect x="112" y="112" width="16" height="44" rx="8" fill={hex} />
        </g>
      );
  }
}

function CarryBehind({ item, hex }: { item: string; hex: string }) {
  if (item !== "carry_rugzak") return null;
  return <rect x="52" y="126" width="96" height="70" rx="20" fill={shade(hex)} />;
}

function CarryFront({ item, hex }: { item: string; hex: string }) {
  switch (item) {
    case "carry_rugzak":
      return (
        <g>
          <rect x="70" y="118" width="10" height="60" rx="5" fill={hex} />
          <rect x="120" y="118" width="10" height="60" rx="5" fill={hex} />
        </g>
      );
    case "carry_mochila":
      return (
        <g>
          <path d="M78 118 l44 68" stroke={hex} strokeWidth="8" strokeLinecap="round" />
          <rect x="118" y="176" width="34" height="30" rx="10" fill={hex} />
          <path d="M120 186 h30 M120 196 h30" stroke="#fefaf3" strokeWidth="3" opacity="0.6" />
        </g>
      );
    case "carry_paraplu":
      return (
        <g>
          <rect x="150" y="120" width="6" height="76" rx="3" fill="#6b4423" />
          <path d="M118 122 q35 -44 70 0z" fill={hex} />
        </g>
      );
    default:
      // de mand
      return (
        <g>
          <path d="M132 182 h40 l-6 30 h-28z" fill="#c8a06a" />
          <path d="M136 182 q16 -22 32 0" stroke="#c8a06a" strokeWidth="5" fill="none" />
        </g>
      );
  }
}
