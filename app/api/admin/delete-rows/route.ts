import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Admin-only API route that deletes rows from pricing/master tables.
 * Uses the service-role key to bypass RLS.
 *
 * POST /api/admin/delete-rows
 * Body: { table: string, ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, ids } = body as { table: string; ids: string[] };

    if (!table || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing table or ids' }, { status: 400 });
    }

    // Whitelist of tables allowed for deletion
    const ALLOWED_TABLES = [
      'materials', 'series', 'body_weights', 'bonnet_weights',
      'plug_weights', 'seat_weights', 'cage_weights', 'stem_weights',
      'seal_ring_prices', 'stem_fixed_prices', 'pilot_plug_weights',
      'actuator_models', 'handwheel_prices', 'machining_prices',
      'testing_presets', 'tubing_presets',
    ];

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: `Table "${table}" is not allowed` }, { status: 403 });
    }

    const supabase = createServiceClient();

    // Delete in batches of 50 to avoid issues with large IN clauses
    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const { error, count } = await supabase
        .from(table)
        .delete()
        .in('id', batch);

      if (error) {
        // Try one-by-one for this batch
        for (const id of batch) {
          const { error: singleErr } = await supabase.from(table).delete().eq('id', id);
          if (singleErr) {
            failed++;
            if (errors.length < 5) errors.push(`${id}: ${singleErr.message}`);
          } else {
            deleted++;
          }
        }
      } else {
        deleted += batch.length;
      }
    }

    return NextResponse.json({
      success: failed === 0,
      deleted,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
