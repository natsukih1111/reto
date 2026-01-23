// file: app/api/cpu/rival/route.js
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { Pool } from 'pg';


export const runtime = 'nodejs';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


const RIVAL_XLSX = path.join(process.cwd(), 'data', 'rival.xlsx');

function safeNum(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(n, lo, hi) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

function randInt(lo, hi) {
  const a = Math.floor(Number(lo));
  const b = Math.floor(Number(hi));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1500;
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  if (min === max) return min;
  return Math.floor(min + Math.random() * (max - min + 1));
}


function fallbackRivals() {
  // ここは既存のままでOK
  return [
    { name: 'CPUミドル', rateLow: 1400, rateHigh: 1600, accuracy: 0.4, avgTimeSec: 50, teamIds: [] },
  ];
}

function loadRivalsFromXlsx() {
  if (!fs.existsSync(RIVAL_XLSX)) {
    console.warn('[cpu/rival] file not found:', RIVAL_XLSX);
    return { rivals: fallbackRivals(), source: 'fallback:not_found' };
  }

  let wb;
  try {
    // ★ readFile じゃなく buffer 読み（OneDrive/権限で落ちにくい）
    const buf = fs.readFileSync(RIVAL_XLSX);
    wb = XLSX.read(buf, { type: 'buffer' });
  } catch (e) {
    console.warn('[cpu/rival] XLSX.read(buffer) failed:', RIVAL_XLSX, e);
    return { rivals: fallbackRivals(), source: 'fallback:read_failed' };
  }

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const rivals = rows
    .map((r) => {
      const name = String(r.player || r.name || '').trim();
      const rateLow = safeNum(r.ratelaw ?? r.rateLow ?? r.low, 0);
      const rateHigh = safeNum(r.ratehigh ?? r.rateHigh ?? r.high, 9999);
      const accuracy = safeNum(r.Accuracyrate ?? r.accuracy ?? r.acc, 0.4);
      const avgTimeSec = safeNum(r.time ?? r.avgTimeSec ?? r.sec, 50);

      const teamIds = [
        safeNum(r.team1, null),
        safeNum(r.team2, null),
        safeNum(r.team3, null),
        safeNum(r.team4, null),
        safeNum(r.team5, null),
      ].filter((x) => Number.isFinite(x));

      if (!name) return null;

      // CPUの表示レート（ランダム）
      const rating = Math.round((rateLow + rateHigh) / 2);

      return {
  name,
  rateLow,
  rateHigh,
  // ★ rating はここでは固定しない（マッチング時に毎回決める）
  accuracy,
  avgTimeSec,
  teamIds,
};
   })
    .filter(Boolean);

  if (rivals.length === 0) {
    console.warn('[cpu/rival] xlsx parsed but empty');
    return { rivals: fallbackRivals(), source: 'fallback:empty' };
  }

  return { rivals, source: 'xlsx' };
}

async function resolveCharactersByIds(ids) {
  const clean = (Array.isArray(ids) ? ids : [])
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  if (clean.length === 0) return [];

  // ★ characters テーブルに存在する列を調べる（存在しない列は SELECT しない）
  const colRes = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'characters'
    `
  );

  const cols = new Set((colRes.rows || []).map((r) => String(r.column_name)));

  const has = (c) => cols.has(c);

  // name列候補（nameが無いDBもあり得るので複数候補）
  const nameExpr = has('name')
    ? 'name'
    : has('character_name')
    ? 'character_name'
    : has('title')
    ? 'title'
    : 'id::text';

  // rarity候補（存在するやつだけ使う）
  const rarityExprParts = [];
  if (has('base_rarity')) rarityExprParts.push('base_rarity');
  if (has('rarity')) rarityExprParts.push('rarity'); // ← rarity列があるDBならここで拾える
  if (has('rarity_tier')) rarityExprParts.push('rarity_tier');
  if (has('rarity_level')) rarityExprParts.push('rarity_level');
  const rarityExpr =
    rarityExprParts.length > 0 ? `COALESCE(${rarityExprParts.join(', ')}, 1)` : '1';

  // star候補
  const starExprParts = [];
  if (has('current_star')) starExprParts.push('current_star');
  if (has('star')) starExprParts.push('star');
  if (has('stars')) starExprParts.push('stars');
  if (has('current_stars')) starExprParts.push('current_stars');
  const starExpr =
    starExprParts.length > 0 ? `COALESCE(${starExprParts.join(', ')}, 1)` : '1';

  const sql = `
    SELECT
      id,
      ${nameExpr} AS name,
      ${rarityExpr} AS rarity,
      ${starExpr} AS star
    FROM characters
    WHERE id = ANY($1::int[])
  `;

  const { rows } = await pool.query(sql, [clean]);

  const map = new Map(rows.map((r) => [Number(r.id), r]));
  return clean.map((id) => map.get(id)).filter(Boolean);
}



function pickCpuByRating(rivals, myRating) {
  const r = Number(myRating);
  const candidates = rivals.filter((x) => r >= x.rateLow && r <= x.rateHigh);
  const pool = candidates.length ? candidates : rivals;

  const picked = pool[Math.floor(Math.random() * pool.length)];

  // ★ この試合のCPUレートを範囲内でランダム生成
  const cpuRating = randInt(picked.rateLow, picked.rateHigh);

  return {
    ...picked,
    rating: cpuRating,
  };
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const myRating = safeNum(url.searchParams.get('my_rating'), 1500);

    const { rivals, source } = loadRivalsFromXlsx();
    const cpu = pickCpuByRating(rivals, myRating);

    // ★ CPUチーム解決
    const cpuTeam = await resolveCharactersByIds(cpu.teamIds || []);

    return NextResponse.json({
      ok: true,
      source,
      cpu: {
        name: cpu.name,
        rating: cpu.rating ?? 1500,
        accuracy: cpu.accuracy ?? 0.4,
        avgTimeSec: cpu.avgTimeSec ?? 50,
        team: cpuTeam, // ← battle 側でそのまま表示できる
      },
    });
  } catch (e) {
    console.error('[cpu/rival] fatal', e);
    return NextResponse.json({ ok: false, error: 'cpu rival failed' }, { status: 500 });
  }
}
