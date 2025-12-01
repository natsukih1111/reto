'use client';

import { useEffect, useState } from 'react';

export default function QuizPage() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch('/api/questions');
        const data = await res.json();

        // options は文字列で来るので配列に戻す
        const fixed = data.map((q) => ({
          ...q,
          options: JSON.parse(q.options),
        }));

        setQuestions(fixed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>読み込み中...</div>;
  }

  if (questions.length === 0) {
    return <div style={{ padding: 20 }}>問題がありません。</div>;
  }

  const q = questions[currentIndex];

  function handleAnswer(option) {
    setSelected(option);
    if (option === q.answer) {
      setResult('⭕ 正解！');
    } else {
      setResult(`❌ 不正解… 正解は「${q.answer}」`);
    }
  }

  function handleNext() {
    setSelected(null);
    setResult('');
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>クイズ（練習モード）</h1>

      <p>
        {currentIndex + 1}問目 / 全{questions.length}問
      </p>

      <h2 style={{ marginTop: 20 }}>{q.question}</h2>

      <div style={{ marginTop: 10 }}>
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            disabled={selected !== null}
            style={{
              display: 'block',
              marginTop: 8,
              padding: '8px 16px',
              fontSize: 16,
              cursor: selected ? 'default' : 'pointer',
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {result && (
        <div style={{ marginTop: 20 }}>
          <p>{result}</p>
          <button onClick={handleNext} style={{ marginTop: 10, padding: '6px 14px' }}>
            次の問題へ
          </button>
        </div>
      )}
    </div>
  );
}
