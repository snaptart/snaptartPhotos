import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { readBlockDefaults, writeBlockDefaults } from "@/lib/block-defaults-store";
import { DEFAULTS_TYPES, isDefaultable, nextPast, type BlockDefaults } from "@/lib/puck/block-defaults";

/** GET — the active preset's block defaults (admin; the editors read them to stamp new blocks). */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await readBlockDefaults());
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT { defaults } — replaces the block defaults. `defaults` holds, per block type, only the
 * settings that differ from the built-in ones (the client works that out from the Puck config).
 */
export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { defaults } = (await req.json()) as { defaults?: BlockDefaults };
    if (!defaults || typeof defaults !== "object") {
      return NextResponse.json({ error: "Missing defaults" }, { status: 400 });
    }
    const clean: BlockDefaults = {};
    for (const [type, props] of Object.entries(defaults)) {
      if (!DEFAULTS_TYPES.includes(type) || !props || typeof props !== "object") continue;
      const kept = Object.fromEntries(Object.entries(props).filter(([k, v]) => isDefaultable(type, k) && v !== undefined));
      if (Object.keys(kept).length) clean[type] = kept;
    }
    const current = await readBlockDefaults();
    const past = nextPast(current.defaults, clean, current.past);
    await writeBlockDefaults(clean, past);
    return NextResponse.json({ ...(await readBlockDefaults()), previous: current.defaults });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
