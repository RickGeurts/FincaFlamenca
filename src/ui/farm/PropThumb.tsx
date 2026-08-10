import { useEffect, useState } from "react";
import { thumbnailFor, thumbnailIfReady, type ThumbKind } from "./three/thumbnail";

interface Props {
  kind: ThumbKind;
  id: string;
  /** Stand-in while the model is being drawn, and if it never can be. */
  emoji: string;
  /** Rendered size in pixels. */
  size?: number;
}

/**
 * A little picture of the actual model, for the shops.
 *
 * The image is decorative: every row that uses it prints the Dutch and Spanish
 * words right beside it, so naming it again would only clutter a screen reader.
 */
export function PropThumb({ kind, id, emoji, size = 56 }: Props) {
  const key = `${kind}:${id}`;
  const [made, setMade] = useState(() => ({ key, url: thumbnailIfReady(kind, id) }));
  // Reading the cache when the item changes keeps a reused row from showing
  // the previous item's picture for a frame.
  const url = made.key === key ? made.url : thumbnailIfReady(kind, id);

  useEffect(() => {
    if (url) return;
    let alive = true;
    void thumbnailFor(kind, id).then((drawn) => {
      if (alive) setMade({ key, url: drawn });
    });
    return () => {
      alive = false;
    };
  }, [kind, id, key, url]);

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-farm-100"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-contain" />
      ) : (
        <span aria-hidden style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>
          {emoji}
        </span>
      )}
    </span>
  );
}
