'use client';

import { useState } from 'react';

export default function AdminSubmitPage() {
  const [question, setQuestion] = useState('');
  const [createdBy, setCreatedBy] = useState('admin');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [message, setMessage] = useState('');

  const handleOptionChange = (index, value) => {
    const copy = [...options];
    copy[index] = value;
    setOptions(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      setMessage('問題文を入力してください');
      return;
    }

    const usedOptions = options.map((o) => o.trim());
    if (usedOptions.some((o) => !o)) {
      setMessage('4つの選択肢をすべて入力してください');
      return;
    }

    const answer = usedOptions[correctIndex];

    const res = await fetch('/api/admin/add-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        options: usedOptions,
        answer,
        createdBy,
      }),
    });

    if (!res.ok) {
      setMessage('送信に失敗しました');
      return;
    }

    setMessage('追加しました！クイズにすぐ反映されます。');
    setQuestion('');
    setOptions(['', '', '', '']);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>管理者用：即時追加フォーム</h1>
      <p>ここから追加した問題は承認なしでクイズに反映されます（単一選択問題のみ）。</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <label>投稿者名（任意）：</label>
          <br />
          <input
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            style={{ padding: 6, width: '80%', color: 'black' }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>問題文：</label>
          <br />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ width: '100%', height: 80, padding: 6, color: 'black' }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>選択肢（4つ）：</label>
          {options.map((opt, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              <input
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                style={{ padding: 6, width: '60%', color: 'black' }}
              />
              <label style={{ marginLeft: 8 }}>
                <input
                  type="radio"
                  name="admin-correct"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                />
                正解
              </label>
            </div>
          ))}
        </div>

        <button
          type="submit"
          style={{
            marginTop: 10,
            padding: '8px 16px',
            backgroundColor: 'aqua',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          追加
        </button>
      </form>

      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  );
}
