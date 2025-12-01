// file: app/admin/reports/page.js
'use client';

import { useEffect, useState } from 'react';

export default function AdminReportsPage() {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState([]);

  // 編集用の state 群
  const [editingReportId, setEditingReportId] = useState(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('');
  const [editOptionsText, setEditOptionsText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchReports = () => {
    fetch(`/api/admin/reports?status=${status}`)
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []))
      .catch(() => setReports([]));
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const updateReportStatus = async (id, newStatus) => {
    const adminNote =
      newStatus !== 'open' ? window.prompt('メモ（任意）') || '' : '';
    const res = await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, adminNote }),
    });
    if (res.ok) fetchReports();
    else alert('更新に失敗しました');
  };

  const startEditQuestion = (report) => {
    setEditingReportId(report.id);
    setEditQuestionText(report.question || '');
    setEditCorrectAnswer(report.correct_answer || '');

    let optionsText = '';
    if (report.options_json) {
      try {
        const arr = JSON.parse(report.options_json);
        if (Array.isArray(arr)) {
          optionsText = arr.join('\n');
        }
      } catch {
        optionsText = '';
      }
    }
    setEditOptionsText(optionsText);
  };

  const cancelEditQuestion = () => {
    setEditingReportId(null);
    setEditQuestionText('');
    setEditCorrectAnswer('');
    setEditOptionsText('');
  };

  const saveEditQuestion = async (report) => {
    if (!report.question_id) {
      alert('question_id が取得できないため、編集できません。');
      return;
    }
    if (!editQuestionText.trim()) {
      alert('問題文が空です。');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await fetch('/api/admin/reports/update-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: report.question_id,
          question_text: editQuestionText.trim(),
          correct_answer: editCorrectAnswer.trim(),
          options_text: editOptionsText,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || '問題の更新に失敗しました');
        return;
      }

      // ローカルの一覧も更新
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                question: data.question?.question_text ?? editQuestionText,
                correct_answer:
                  data.question?.correct_answer ?? editCorrectAnswer,
                options_json: data.question?.options_json ?? r.options_json,
              }
            : r
        )
      );

      cancelEditQuestion();
    } catch (e) {
      console.error(e);
      alert('問題の更新中にエラーが発生しました');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">問題不備報告</h1>

      <section className="bg-slate-900 border border-slate-700 rounded-xl p-3">
        {/* タブ切り替え */}
        <div className="flex gap-2 text-xs mb-2">
          <button
            className={`px-3 py-1 rounded-full border ${
              status === 'open'
                ? 'bg-amber-500 text-black border-amber-400'
                : 'border-slate-600 text-slate-200'
            }`}
            onClick={() => setStatus('open')}
          >
            未対応
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              status === 'fixed'
                ? 'bg-emerald-500 text-black border-emerald-400'
                : 'border-slate-600 text-slate-200'
            }`}
            onClick={() => setStatus('fixed')}
          >
            修正済み
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              status === 'dismissed'
                ? 'bg-slate-600 text-white border-slate-500'
                : 'border-slate-600 text-slate-200'
            }`}
            onClick={() => setStatus('dismissed')}
          >
            却下
          </button>
        </div>

        {/* 一覧 */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto text-xs">
          {reports.map((r) => {
            const isEditing = editingReportId === r.id;

            // options_json を人間が見やすい形に
            let optionsDisplay = '';
            if (r.options_json) {
              try {
                const arr = JSON.parse(r.options_json);
                if (Array.isArray(arr)) {
                  optionsDisplay = arr.join('\n');
                }
              } catch {
                optionsDisplay = '';
              }
            }

            return (
              <div
                key={r.id}
                className="border border-slate-700 rounded-lg p-2 space-y-1 bg-slate-900"
              >
                <div className="flex justify-between">
                  <div className="font-bold text-slate-50">
                    #{r.id} / Question #{r.question_id}
                  </div>
                  <div className="text-slate-400">
                    報告者ID: {r.reporter_user_id ?? '匿名'}
                  </div>
                </div>

                {/* 対象問題表示 or 編集フォーム */}
                {!isEditing && (
                  <>
                    <div className="text-slate-300">
                      対象問題:{' '}
                      {r.question
                        ? r.question
                        : '（問題文が取得できませんでした）'}
                    </div>
                    <div className="text-slate-300">
                      正解: {r.correct_answer || '（未設定）'}
                    </div>
                    {optionsDisplay && (
                      <div className="text-slate-300">
                        選択肢:
                        <pre className="whitespace-pre-wrap mt-0.5 text-[11px] text-slate-200">
                          {optionsDisplay}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {isEditing && (
                  <div className="space-y-2 mt-1">
                    {/* 問題文 */}
                    <div>
                      <div className="text-slate-300 mb-1">
                        対象問題（編集中）:
                      </div>
                      <textarea
                        className="w-full text-xs rounded-md border border-slate-600 bg-slate-800 text-slate-50 px-2 py-1 resize-vertical"
                        rows={3}
                        value={editQuestionText}
                        onChange={(e) =>
                          setEditQuestionText(e.target.value)
                        }
                      />
                    </div>

                    {/* 正解 */}
                    <div>
                      <div className="text-slate-300 mb-1 text-[11px]">
                        正解（複数ある場合は今までのルール通りでOK /
                        JSON文字列や区切り文字など）
                      </div>
                      <input
                        type="text"
                        className="w-full text-xs rounded-md border border-slate-600 bg-slate-800 text-slate-50 px-2 py-1"
                        value={editCorrectAnswer}
                        onChange={(e) =>
                          setEditCorrectAnswer(e.target.value)
                        }
                      />
                    </div>

                    {/* 選択肢 */}
                    <div>
                      <div className="text-slate-300 mb-1 text-[11px]">
                        選択肢（1行に1つ。並び順もここで編集）
                      </div>
                      <textarea
                        className="w-full text-xs rounded-md border border-slate-600 bg-slate-800 text-slate-50 px-2 py-1 resize-vertical"
                        rows={4}
                        value={editOptionsText}
                        onChange={(e) =>
                          setEditOptionsText(e.target.value)
                        }
                      />
                    </div>

                    <p className="text-[10px] text-slate-400">
                      ※ このフォームでは「問題文・正解・選択肢」を直接 DB に保存します。
                    </p>
                  </div>
                )}

                <div className="text-amber-200 whitespace-pre-wrap mt-1">
                  報告内容: {r.content}
                </div>

                {r.admin_note && (
                  <div className="text-sky-300 whitespace-pre-wrap">
                    管理メモ: {r.admin_note}
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 gap-2">
                  {/* 左側：問題編集系ボタン */}
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        className="px-2 py-1 rounded bg-sky-500 text-black font-semibold hover:bg-sky-400"
                        onClick={() => startEditQuestion(r)}
                      >
                        この問題を編集
                      </button>
                    )}
                    {isEditing && (
                      <>
                        <button
                          className="px-2 py-1 rounded bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-60"
                          disabled={savingEdit}
                          onClick={() => saveEditQuestion(r)}
                        >
                          {savingEdit ? '保存中…' : '問題を保存'}
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-slate-700 text-slate-100 hover:bg-slate-600"
                          onClick={cancelEditQuestion}
                          disabled={savingEdit}
                        >
                          キャンセル
                        </button>
                      </>
                    )}
                  </div>

                  {/* 右側：ステータス操作ボタン群 */}
                  <div className="flex gap-2">
                    {status !== 'fixed' && (
                      <button
                        className="px-2 py-1 rounded bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
                        onClick={() => updateReportStatus(r.id, 'fixed')}
                      >
                        修正済みにする
                      </button>
                    )}
                    {status !== 'dismissed' && (
                      <button
                        className="px-2 py-1 rounded bg-slate-700 text-slate-100 hover:bg-slate-600"
                        onClick={() => updateReportStatus(r.id, 'dismissed')}
                      >
                        却下する
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {reports.length === 0 && (
            <div className="text-slate-400">該当する報告はありません。</div>
          )}
        </div>
      </section>
    </div>
  );
}
