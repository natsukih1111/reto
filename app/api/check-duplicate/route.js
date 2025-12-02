// file: app/api/check-duplicate/route.js
import { NextResponse } from 'next/server';
import db from '@/lib/db.js';

/**
 * 類似問題チェック API
 *
 * body: { type, question, options, answer, correctAnswer, submissionId }
 * 戻り値: { ok: true, duplicates: [ ... ] }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      type,
      question,
      options = [],
      answer,
      correctAnswer: rawCorrectAnswer,
      submissionId,
    } = body || {};

    const correctAnswer = rawCorrectAnswer || answer || '';

    // 文字列正規化（空白と句読点を削るだけの簡易版）
    const normalizeText = (s) =>
      (s || '')
        .replace(/\s+/g, '')
        .replace(/[。、．，,.、]/g, '');

    // 「順番無視で7割一致」をざっくり見るための類似度
    const textSimilarity = (a, b) => {
      const s1 = normalizeText(a);
      const s2 = normalizeText(b);
      if (!s1 || !s2) return 0;

      const arr1 = [...s1];
      const arr2 = [...s2];

      const counts = {};
      for (const ch of arr1) {
        counts[ch] = (counts[ch] || 0) + 1;
      }
      let common = 0;
      for (const ch of arr2) {
        if (counts[ch]) {
          counts[ch] -= 1;
          common += 1;
        }
      }
      const longer = Math.max(arr1.length, arr2.length);
      if (longer === 0) return 0;
      return common / longer;
    };

    // 選択肢の正規化（順番無視で比較）
    const normalizeOptions = (opts) =>
      (opts || [])
        .map((o) => (o || '').trim())
        .filter((o) => o)
        .sort();

    const thisOptionsKey = normalizeOptions(options).join('|');
    const questionText = question || '';

    // DB から questions + question_submissions をまとめて取得（Supabase / Postgres）
    const rows = await db.query(
      `
        SELECT
          id,
          question_text,
          question,
          correct_answer,
          NULL AS answer,                 -- questions 側には answer カラムが無いので NULL
          options_json::text AS options_json,  -- ★ 型を text にそろえる
          status,
          'questions' AS source
        FROM questions
        WHERE status = 'approved'
        UNION ALL
        SELECT
          id,
          question_text,
          question,
          correct_answer,
          answer,
          options_json::text AS options_json,  -- ★ こちらも text にキャスト
          status,
          'question_submissions' AS source
        FROM question_submissions
        WHERE status = 'pending'
      `,
      []
    );

    const duplicates = [];

    for (const row of rows) {
      const qText = row.question_text || row.question || '';
      const candAnswer = row.correct_answer || row.answer || '';

      let candOptions = [];

      // options_json は text になっているので、必要なら JSON.parse する
      if (row.options_json) {
        if (Array.isArray(row.options_json)) {
          candOptions = row.options_json;
        } else if (typeof row.options_json === 'string') {
          try {
            const parsed = JSON.parse(row.options_json);
            if (Array.isArray(parsed)) candOptions = parsed;
          } catch (e) {
            candOptions = [];
          }
        }
      }

      // 投稿中の自分自身は除外
      if (
        submissionId &&
        row.source === 'question_submissions' &&
        row.id === submissionId
      ) {
        continue;
      }

      // 条件①: 問題文7割以上一致 ＋ 答え完全一致
      const sim = textSimilarity(questionText, qText);
      const cond1 =
        sim >= 0.7 &&
        !!correctAnswer &&
        !!candAnswer &&
        correctAnswer === candAnswer;

      // 条件②: 選択肢セット完全一致 ＋ 答え完全一致
      let cond2 = false;
      if (thisOptionsKey && candOptions && candOptions.length > 0) {
        const candKey = candOptions
          .slice()
          .map((o) => (o || '').trim())
          .filter((o) => o)
          .sort()
          .join('|');
        cond2 =
          !!candKey &&
          !!thisOptionsKey &&
          candKey === thisOptionsKey &&
          !!correctAnswer &&
          !!candAnswer &&
          correctAnswer === candAnswer;
      }

      // どちらかに当てはまるなら類似問題として追加
      if (cond1 || cond2) {
        duplicates.push({
          id: row.id,
          question_text: qText,
          correct_answer: candAnswer,
          options: candOptions,
          status: row.status,
          source: row.source, // 'questions' or 'question_submissions'
          similarity: sim,
        });
      }
    }

    // ★ここで「完全に同じ問題」は1件にまとめる
    const uniqMap = new Map();

    for (const d of duplicates) {
      const key =
        normalizeText(d.question_text) +
        '||' +
        (d.correct_answer || '') +
        '||' +
        d.source;
      if (!uniqMap.has(key)) {
        uniqMap.set(key, d); // 最初の1件だけ残す
      }
    }

    const uniqueDuplicates = Array.from(uniqMap.values());

    return NextResponse.json({ ok: true, duplicates: uniqueDuplicates });
  } catch (err) {
    console.error('check-duplicate error', err);
    return NextResponse.json(
      { ok: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
