export type ParsedRect = {
  id: string; // "mesa_3677"
  x: number; // local rect x
  y: number; // local rect y
  w: number; // width
  h: number; // height
};

export type ParsedSvg = {
  viewBox: { x: number; y: number; w: number; h: number };
  borderD: string | null;
  rects: ParsedRect[];
};

export function parseSvg(svgText: string): ParsedSvg {
  // 1. viewBox
  const vbMatch = svgText.match(/viewBox="([^"]+)"/);
  if (!vbMatch) throw new Error("SVG missing viewBox");
  const [x, y, w, h] = vbMatch[1].split(/[\s,]+/).map(Number);

  // 2. border — find full <path id="limite" .../> tag, then extract d=""
  const tagMatch =
    svgText.match(/<path[^>]*id="limite"[^>]*\/>/s) ||
    svgText.match(/<path[^>]*id="limite"[^>]*>/s);
  const dMatch = tagMatch?.[0]?.match(/d="([\s\S]*?)"/);

  const rects: ParsedRect[] = [];
  const groupRegex = /<g\s+id="g\d+"[^>]*>([\s\S]*?)<\/g>/g;
  let groupMatch;

  while ((groupMatch = groupRegex.exec(svgText)) !== null) {
    const groupOpening = groupMatch[0].match(/^<g[^>]*>/)?.[0] ?? "";
    const inner = groupMatch[1];

    const gTxMatch = groupOpening.match(
      /translate\(\s*([^,\s)]+)(?:\s*,\s*([^)\s]+))?\s*\)/,
    );
    const gTx = gTxMatch ? parseFloat(gTxMatch[1]) : 0;
    const gTy = gTxMatch?.[2] ? parseFloat(gTxMatch[2]) : 0;

    const rectRegex = /<rect[^>]*id="(mesa_\d+)"[^>]*\/>/g;
    let rectMatch;

    while ((rectMatch = rectRegex.exec(inner)) !== null) {
      const rectTag = rectMatch[0];
      const id = rectMatch[1];

      // Extract each attribute independently (order doesn't matter)
      const x = parseFloat(rectTag.match(/\bx="([^"]+)"/)?.[1] ?? "0");
      const y = parseFloat(rectTag.match(/\by="([^"]+)"/)?.[1] ?? "0");
      const w = parseFloat(rectTag.match(/\bwidth="([^"]+)"/)?.[1] ?? "0");
      const h = parseFloat(rectTag.match(/\bheight="([^"]+)"/)?.[1] ?? "0");

      // Rect transform
      const rTxMatch = rectTag.match(
        /translate\(\s*([^,\s)]+)(?:\s*,\s*([^)\s]+))?\s*\)/,
      );
      const rTx = rTxMatch ? parseFloat(rTxMatch[1]) : 0;
      const rTy = rTxMatch?.[2] ? parseFloat(rTxMatch[2]) : 0;

      rects.push({
        id,
        x: x + gTx + rTx,
        y: y + gTy + rTy,
        w,
        h,
      });
    }
  }

  return {
    viewBox: { x, y, w, h },
    borderD: dMatch?.[1] ?? null,
    rects,
  };
}
