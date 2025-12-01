import db from '../lib/db.js';

// 初期のワンピース問題
const questions = [
  {
    question: 'ルフィの懸賞金が初めて1億になったとき倒した敵は？',
    options: ['アーロン', 'クロコダイル', 'ルッチ', 'エネル'],
    answer: 'クロコダイル',
  },
  {
    question: '悪魔の実の能力者でないのは誰？',
    options: ['チョッパー', 'ロビン', 'フランキー', 'ブルック'],
    answer: 'フランキー',
  },
  {
    question: '麦わらの一味の船長の名前は？',
    options: ['ゾロ', 'サンジ', 'ルフィ', 'ウソップ'],
    answer: 'ルフィ',
  },
  {
    question: 'ワンピースの作者は？',
    options: ['尾田栄一郎', '岸本斉史', '鳥山明', '久保帯人'],
    answer: '尾田栄一郎',
  },
];

function insertQuestions() {
  const insert = db.prepare(
    'INSERT INTO questions (question, options, answer) VALUES (?, ?, ?)'
  );

  for (const q of questions) {
    insert.run(q.question, JSON.stringify(q.options), q.answer);
    console.log(`Inserted question: ${q.question}`);
  }
}

insertQuestions();
