// file: components/QuestionReviewAndReport.js
'use client';

import { useState } from 'react';

/**
 * props:
 * - questions: [
 *     {
 *       question_id: number,
 *       text: string,
 *       userAnswerText?: string,
 *       correctAnswerText?: string,
 *     }
 *   ]
 * - sourceMode: 'rate' | 'free' | 'challenge'
 * - currentUserId?: number | null
 * - battleId?: number | null
 * - challengeRunId?: number | null
 */
export default function QuestionReviewAndReport({
  questions,
  sourceMode,
  currentUserId = null,
  battleId = null,
  challengeRunId = null,
}) {
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedQuestion = questions?.find(
    (q) => q.question_id === selectedQuestionId
  );

  const handleSubmit = async () => {
    if (!selectedQuestionId || !comment.trim()) {
      setErrorMsg('報告する問題とコメントを入力してください。');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        question_id: selectedQuestionId,
        source_mode: sourceMode,
        comment: comment.trim(),
      };

      if (currentUserId != null) {
        payload.reported_by_user_id = currentUserId;
      }
      if (battleId != null) {
        payload.battle_id = battleId;
      }
      if (challengeRunId != null) {
        payload.challenge_run_id = challengeRunId;
      }

      const res = await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '送信に失敗しました');
      }

      setSuccessMsg('不備報告を送信しました。ご協力ありがとうございます。');
      setComment('');
      setSelectedQuestionId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || '送信中にエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
      <header>
        <h2 className="text-sm font-bold text-slate-900">
          問題不備を報告しますか？
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          不備があると思った問題を選び、「どこが間違えているか」をコメントに書いて送信してください。
        </p>
      </header>

      {/* 問題一覧 */}
      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {questions.map((q, idx) => (
           <button
            key={`${q.question_id ?? 'noid'}-${idx}`}
             type="button"
             onClick={() => setSelectedQuestionId(q.question_id)}
             className={`w-full rounded-lg border px-2 py-2 text-left text-xs ${
               selectedQuestionId === q.question_id
                 ? 'border-sky-400 bg-sky-50'
                 : 'border-slate-200 bg-slate-50'
             }`}
           >
            <div className="mb-0.5 text-[10px] text-slate-500">
              問題ID: {q.question_id}
            </div>
            <div className="truncate text-xs text-slate-900">
              {q.text}
            </div>
          </button>
        ))}
      </div>

      {/* 選択中の問題詳細 */}
      {selectedQuestion && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] space-y-1">
          <p>
            <span className="font-semibold text-slate-800">問題文：</span>
            <span className="text-slate-900 whitespace-pre-wrap">
              {selectedQuestion.text}
            </span>
          </p>
          {selectedQuestion.userAnswerText && (
            <p>
              <span className="font-semibold text-slate-800">
                あなたの回答：
              </span>
              <span className="text-slate-900 whitespace-pre-wrap">
                {selectedQuestion.userAnswerText}
              </span>
            </p>
          )}
          {selectedQuestion.correctAnswerText && (
            <p>
              <span className="font-semibold text-slate-800">正解：</span>
              <span className="text-slate-900 whitespace-pre-wrap">
                {selectedQuestion.correctAnswerText}
              </span>
            </p>
          )}
        </div>
      )}

      {/* コメント欄 */}
      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="どこが間違えているのかを具体的に記入してください"
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-500">{errorMsg}</p>
      )}
      {successMsg && (
        <p className="text-[11px] text-emerald-600">{successMsg}</p>
      )}

      <div className="text-right">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`rounded-full px-4 py-1 text-xs font-semibold ${
            submitting
              ? 'cursor-default bg-slate-300 text-slate-600'
              : 'bg-sky-500 text-white hover:bg-sky-400'
          }`}
        >
          {submitting ? '送信中…' : '不備を報告する'}
        </button>
      </div>
    </section>
  );
}
