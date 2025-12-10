// file: app/submit/page.js
'use client';

import { useState } from 'react';
import Link from 'next/link';

const TAGS_STORY = [
  '東の海',
  '偉大なる航路突入',
  'アラバスタ',
  '空島',
  'DBF',
  'W7、エニエス・ロビー',
  'スリラーバーク',
  'シャボンディ諸島',
  '女ヶ島',
  'インペルダウン',
  '頂上戦争',
  '3D2Y',
  '魚人島',
  'パンクハザード',
  'ドレスローザ',
  'ゾウ',
  'WCI',
  '世界会議',
  'ワノ国',
  'エッグヘッド',
  'エルバフ',
];

const TAGS_OTHER = [
  'SBS',
  'ビブルカード',
  '扉絵',
  '技',
  '巻跨ぎ',
  'セリフ',
  '表紙',
  'サブタイトル',
  'その他',
];

function cleanArray(arr) {
  return (arr || []).map((s) => s.trim()).filter((s) => s.length > 0);
}

export default function SubmitPage() {
  const [questionType, setQuestionType] = useState('single'); // single | multi | text | order
  const [question, setQuestion] = useState('');

  // 記述用
  const [textAnswer, setTextAnswer] = useState('');
  const [altTextAnswers, setAltTextAnswers] = useState(['']);

  // 単一 / 複数選択用
  const [correctChoices, setCorrectChoices] = useState(['']);
  const [wrongChoices, setWrongChoices] = useState(['']);

  // 並び替え用（正解順）
  const [orderChoices, setOrderChoices] = useState(['']);

  const [selectedTags, setSelectedTags] = useState([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 類似チェック用
  const [duplicates, setDuplicates] = useState([]);
  const [confirmMode, setConfirmMode] = useState(false); // 類似あり→確認中
  const [checkingDup, setCheckingDup] = useState(false);

  // ★「前の条件を引き継ぐ」設定
  const [carryOpen, setCarryOpen] = useState(false);
  const [carryConfig, setCarryConfig] = useState({
    keepQuestion: false,       // 問題文
    keepQuestionType: false,   // 問題タイプ
    keepChoices: false,        // 選択肢（単一/複数/並び替え）
    keepAnswer: false,         // 解答欄（記述の答え・別解）
    keepTags: false,           // タグ
  });

  const toggleCarry = (key) => {
    setCarryConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleArrayChange = (index, value, setter) => {
    setter((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const addArrayRow = (setter) => {
    setter((prev) => [...prev, '']);
  };

  const removeArrayRow = (index, setter) => {
    setter((prev) => {
      if (prev.length <= 1) return prev;
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  // ★ 投稿完了後のリセット（引き継ぎ設定を反映）
  const resetForm = () => {
    setDuplicates([]);
    setConfirmMode(false);

    setQuestion((prev) => (carryConfig.keepQuestion ? prev : ''));
    setQuestionType((prev) => (carryConfig.keepQuestionType ? prev : 'single'));

    // 記述の解答
    setTextAnswer((prev) => (carryConfig.keepAnswer ? prev : ''));
    setAltTextAnswers((prev) =>
      carryConfig.keepAnswer
        ? (prev.length ? [...prev] : [''])
        : ['']
    );

    // 選択肢系（単一/複数/並び替え）
    setCorrectChoices((prev) =>
      carryConfig.keepChoices
        ? (prev.length ? [...prev] : [''])
        : ['']
    );
    setWrongChoices((prev) =>
      carryConfig.keepChoices
        ? (prev.length ? [...prev] : [''])
        : ['']
    );
    setOrderChoices((prev) =>
      carryConfig.keepChoices
        ? (prev.length ? [...prev] : [''])
        : ['']
    );

    // タグ
    setSelectedTags((prev) =>
      carryConfig.keepTags ? [...prev] : []
    );
  };

  // 類似問題チェックだけを行う
  const runDuplicateCheck = async (payload) => {
    try {
      setCheckingDup(true);
      setMessage('');

      const res = await fetch('/api/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: payload.type,
          question: payload.question,
          options: payload.options,
          answer: payload.answer,
        }),
      });

      setCheckingDup(false);

      if (!res.ok) {
        setMessage(
          '類似問題チェックに失敗しました。もう一度試すか、そのまま投稿してください。'
        );
        return null;
      }

      const data = await res.json();
      return data.duplicates || [];
    } catch (e) {
      console.error(e);
      setCheckingDup(false);
      setMessage(
        '類似問題チェックでエラーが出ました。もう一度試すか、そのまま投稿してください。'
      );
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || checkingDup) return;

    setMessage('');
    setDuplicates([]);

    const qText = question.trim();
    if (!qText) {
      setMessage('問題文を入力してください。');
      return;
    }
    if (selectedTags.length === 0) {
      setMessage('タグを最低1つ選んでください。');
      return;
    }

    let options = [];
    let answer = '';
    let altAnswers = [];

    if (questionType === 'text') {
      const mainAns = textAnswer.trim();
      if (!mainAns) {
        setMessage('正解を入力してください。');
        return;
      }
      const alts = cleanArray(altTextAnswers);
      options = [];
      answer = mainAns;
      altAnswers = alts;
    } else if (questionType === 'single') {
      const correct = cleanArray(correctChoices);
      const wrong = cleanArray(wrongChoices);

      if (correct.length !== 1) {
        setMessage('単一選択は「解答」をちょうど1つにしてください。');
        return;
      }
      if (wrong.length === 0) {
        setMessage('不正解の選択肢を1つ以上入力してください。');
        return;
      }

      options = [...correct, ...wrong];
      answer = correct[0];
      altAnswers = [];
    } else if (questionType === 'multi') {
      const correct = cleanArray(correctChoices);
      const wrong = cleanArray(wrongChoices);

      // ★ここを変更：正解は1つ以上 / 不正解0個でもOK
      if (correct.length < 1) {
        setMessage('複数選択は「解答」を1つ以上入力してください。');
        return;
      }
      // 不正解はチェックしない（0個でもOK）

      options = [...correct, ...wrong];
      answer = JSON.stringify(correct); // 正解配列を文字列で保存
      altAnswers = [];
    } else if (questionType === 'order') {
      const order = cleanArray(orderChoices);
      if (order.length < 2) {
        setMessage('並び替えは2つ以上の項目を入力してください。');
        return;
      }
      options = order;
      answer = JSON.stringify(order); // 正しい順番
      altAnswers = [];
    } else {
      setMessage('不明な問題タイプです。');
      return;
    }

    const payload = {
      type: questionType,
      question: qText,
      options,
      answer,
      altAnswers,
      tags: selectedTags,
    };

    // まだ確認モードでないときは、まず類似チェックだけ行う
    if (!confirmMode) {
      const dups = await runDuplicateCheck(payload);

      // null…エラー時 → そのまま投稿させる
      if (dups && dups.length > 0) {
        setDuplicates(dups);
        setConfirmMode(true);
        setMessage(
          '類似問題があります。下の一覧を確認して、それでも投稿する場合はもう一度「この内容で投稿する」を押してください。'
        );
        return;
      }
      // 類似なし → そのまま投稿に進む
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/submit-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('submit error', data);
        setMessage('送信に失敗しました。時間をおいて再度お試しください。');
        return;
      }

      setMessage('問題を送信しました。承認されると本番に反映されます。');
      resetForm(); // ★ここで引き継ぎ設定を反映したリセット
    } catch (err) {
      console.error(err);
      setMessage('送信中にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
        {/* ヘッダー：タイトル + ボタン群 */}
        <header className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">問題を投稿する</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCarryOpen((v) => !v)}
              className="border border-sky-400 px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-sky-100 shadow-sm"
            >
              前の条件を引き継ぐ
            </button>
            <Link
              href="/"
              className="border border-sky-400 px-3 py-1 rounded-full text-xs font-bold text-sky-200 bg-slate-900"
            >
              ホームへ
            </Link>
          </div>
        </header>

        {/* ★ 引き継ぎ設定パネル */}
        {carryOpen && (
          <div className="mb-2 text-xs bg-slate-900 border border-sky-500 rounded-2xl px-3 py-2 space-y-2">
            <div className="font-semibold text-sky-200">
              投稿後に引き継ぐ項目
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-sky-400"
                  checked={carryConfig.keepQuestion}
                  onChange={() => toggleCarry('keepQuestion')}
                />
                <span>問題文</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-sky-400"
                  checked={carryConfig.keepQuestionType}
                  onChange={() => toggleCarry('keepQuestionType')}
                />
                <span>問題タイプ</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-sky-400"
                  checked={carryConfig.keepChoices}
                  onChange={() => toggleCarry('keepChoices')}
                />
                <span>選択肢</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-sky-400"
                  checked={carryConfig.keepAnswer}
                  onChange={() => toggleCarry('keepAnswer')}
                />
                <span>解答欄</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-sky-400"
                  checked={carryConfig.keepTags}
                  onChange={() => toggleCarry('keepTags')}
                />
                <span>タグ</span>
              </label>
            </div>
            <p className="text-[10px] text-slate-400">
              ※チェックされた項目だけ次の問題に残ります。それ以外は投稿後に空になります。
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種別 */}
          <div className="space-y-1 text-sm">
            <label className="block font-semibold">問題タイプ</label>
            <select
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
            >
              <option value="single">単一選択</option>
              <option value="multi">複数選択</option>
              <option value="text">記述</option>
              <option value="order">並び替え</option>
            </select>
          </div>

          {/* 問題文 */}
          <div className="space-y-1 text-sm">
            <label className="block font-semibold">
              問題 <span className="text-rose-400">必須</span>
            </label>
            <textarea
              className="w-full h-24 px-2 py-1 rounded bg-slate-900 border border-slate-600"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          {/* 記述 */}
          {questionType === 'text' && (
            <>
              <div className="space-y-1 text-sm">
                <label className="block font-semibold">
                  正解 <span className="text-rose-400">必須</span>
                </label>
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                />
              </div>

              <div className="space-y-1 text-sm">
                <label className="block font-semibold">
                  別解（完全一致のみ）※任意
                </label>
                {altTextAnswers.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <input
                      className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-600"
                      value={v}
                      onChange={(e) =>
                        handleArrayChange(i, e.target.value, setAltTextAnswers)
                      }
                    />
                    <button
                      type="button"
                      className="px-2 text-xs bg-slate-700 rounded"
                      onClick={() => removeArrayRow(i, setAltTextAnswers)}
                    >
                      －
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 px-2 py-1 text-xs bg-slate-700 rounded"
                  onClick={() => addArrayRow(setAltTextAnswers)}
                >
                  ＋ 追加
                </button>
              </div>
            </>
          )}

          {/* 単一 / 複数選択 */}
          {(questionType === 'single' || questionType === 'multi') && (
            <>
              <div className="space-y-1 text-sm">
                <label className="block font-semibold">
                  解答 <span className="text-rose-400">必須</span>
                </label>
                {correctChoices.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <input
                      className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-600"
                      value={v}
                      onChange={(e) =>
                        handleArrayChange(i, e.target.value, setCorrectChoices)
                      }
                    />
                    <button
                      type="button"
                      className="px-2 text-xs bg-slate-700 rounded"
                      onClick={() => removeArrayRow(i, setCorrectChoices)}
                    >
                      －
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 px-2 py-1 text-xs bg-slate-700 rounded"
                  onClick={() => addArrayRow(setCorrectChoices)}
                >
                  ＋ 追加
                </button>
              </div>

              <div className="space-y-1 text-sm">
                <label className="block font-semibold">
                  不正解の選択肢{' '}
                  {questionType === 'single' ? (
                    <span className="text-rose-400">必須</span>
                  ) : (
                    <span className="text-slate-400 text-xs">
                      （任意・0個でもOK）
                    </span>
                  )}
                </label>
                {wrongChoices.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <input
                      className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-600"
                      value={v}
                      onChange={(e) =>
                        handleArrayChange(i, e.target.value, setWrongChoices)
                      }
                    />
                    <button
                      type="button"
                      className="px-2 text-xs bg-slate-700 rounded"
                      onClick={() => removeArrayRow(i, setWrongChoices)}
                    >
                      －
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 px-2 py-1 text-xs bg-slate-700 rounded"
                  onClick={() => addArrayRow(setWrongChoices)}
                >
                  ＋ 追加
                </button>
              </div>
            </>
          )}

          {/* 並び替え */}
          {questionType === 'order' && (
            <div className="space-y-1 text-sm">
              <label className="block font-semibold">
                正しい順番 <span className="text-rose-400">必須</span>
              </label>
              <p className="text-xs text-slate-400 mb-1">
                上から順に 1番目 → 2番目 → … の順番で入力してください。
              </p>
              {orderChoices.map((v, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input
                    className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-600"
                    value={v}
                    onChange={(e) =>
                      handleArrayChange(i, e.target.value, setOrderChoices)
                    }
                  />
                  <button
                    type="button"
                    className="px-2 text-xs bg-slate-700 rounded"
                    onClick={() => removeArrayRow(i, setOrderChoices)}
                  >
                    －
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 px-2 py-1 text-xs bg-slate-700 rounded"
                onClick={() => addArrayRow(setOrderChoices)}
              >
                ＋ 追加
              </button>
            </div>
          )}

          {/* タグ */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <label className="font-semibold">
                タグ <span className="text-rose-400">最低1つ以上</span>
              </label>
              <span className="text-xs text-slate-400">
                ストーリー → その他の順で並んでいます
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {TAGS_STORY.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`px-2 py-1 rounded-full border text-xs ${
                    selectedTags.includes(tag)
                      ? 'bg-sky-600 border-sky-400 text-slate-50'
                      : 'bg-slate-900 border-slate-600 text-slate-100'
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {TAGS_OTHER.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`px-2 py-1 rounded-full border text-xs ${
                    selectedTags.includes(tag)
                      ? 'bg-sky-600 border-sky-400 text-slate-50'
                      : 'bg-slate-900 border-slate-600 text-slate-100'
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 類似問題一覧 */}
          {duplicates.length > 0 && (
            <div className="mt-2 text-xs bg-slate-900 border border-amber-500 rounded px-3 py-2 space-y-2">
              <div className="font-bold text-amber-400">類似問題があります</div>
              <p className="text-slate-200">
                下の類似問題を確認して、それでも投稿する場合はもう一度「この内容で投稿する」を押してください。
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {duplicates.map((q) => (
                  <div
                    key={`${q.source}-${q.id}`}
                    className="border border-slate-700 rounded-md p-2"
                  >
                    <div className="text-slate-400 mb-1">
                      ID: {q.id}（
                      {q.source === 'questions' ? '本番' : '投稿中'} / {q.status}
                      ）
                    </div>
                    <div className="text-slate-100 whitespace-pre-wrap">
                      {q.question}
                    </div>
                    {q.options && q.options.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {q.options.map((o, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-amber-200">
                      正解: {q.correct_answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* メッセージ */}
          {message && (
            <div className="mt-2 text-xs bg-slate-900 border border-slate-600 rounded px-3 py-2">
              {message}
            </div>
          )}

          {/* 送信ボタン */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || checkingDup}
              className="w-full py-3 rounded bg-orange-500 text-black font-bold disabled:opacity-60"
            >
              {submitting || checkingDup
                ? '処理中…'
                : confirmMode
                ? '類似を確認した上で投稿する'
                : 'この内容で投稿する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
