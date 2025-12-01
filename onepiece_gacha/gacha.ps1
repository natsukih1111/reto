<script>
  const scene   = document.getElementById('scene');
  const glow    = document.getElementById('glow');
  const card    = document.getElementById('card');
  const chest   = document.querySelector('.chest');
  const starsEl = document.getElementById('cardStars');
  const nameEl  = document.getElementById('cardName');

  const rarityClasses = [];
  for (let i = 1; i <= 11; i++) {
    rarityClasses.push('card-r' + i);
  }

  let playing = false;

  function resetAnimation() {
    scene.classList.remove('playing', 'glow-white-mode', 'glow-gold-mode');
    glow.className = 'glow';
    card.classList.remove('show');
    chest.classList.remove('chest-diamond');
    rarityClasses.forEach(c => card.classList.remove(c));
  }

  function applyCardRarity(rarity) {
    let r = Math.max(1, Math.min(11, rarity | 0));
    rarityClasses.forEach(c => card.classList.remove(c));
    card.classList.add('card-r' + r);
  }

  // ★の数によってフォントサイズを調整（はみ出し防止）
  function setupStarsStyle(stars) {
    if (stars <= 5) {
      starsEl.style.fontSize = "20px";
      starsEl.style.letterSpacing = "2px";
    } else if (stars <= 8) {
      starsEl.style.fontSize = "18px";
      starsEl.style.letterSpacing = "1.6px";
    } else {
      starsEl.style.fontSize = "16px";
      starsEl.style.letterSpacing = "1.2px";
    }
  }

  // 本体から呼ぶ通常ガチャ演出
  // 例) playGacha(5, "ブロギー")
  function playGacha(rarity, charName) {
    let mode = "white";
    if (rarity >= 3 && rarity <= 5) mode = "gold";
    if (rarity >= 6) mode = "rainbow";
    playAnimation(mode, rarity, charName, { starUp: false });
  }
  window.playGacha = playGacha;

  // ★が上がる時用の演出
  // 例) ★1キャラが7体目 → playGachaStarUp(1, 7, "キャラ名")
  function playGachaStarUp(beforeStars, afterStars, charName) {
    let from = Math.max(1, Math.min(11, beforeStars | 0));
    let to   = Math.max(1, Math.min(11, afterStars  | 0));
    if (to < from) { to = from; }   // 安全のため

    let mode = "white";
    if (to >= 3 && to <= 5) mode = "gold";
    if (to >= 6) mode = "rainbow";

    playAnimation(mode, to, charName, {
      starUp: true,
      fromStars: from
    });
  }
  window.playGachaStarUp = playGachaStarUp;

  // デバッグ用：下のボタンから呼ぶもの（今まで通り使える）
  function playByStar(stars, name) {
    let mode = "white";
    if (stars >= 3 && stars <= 5) mode = "gold";
    if (stars >= 6) mode = "rainbow";
    playAnimation(mode, stars, name, { starUp: false });
  }
  window.playByStar = playByStar;

  // 実際のアニメーション本体
  // options.starUp: true なら星アップ演出
  // options.fromStars: 星アップ前の星の数
  function playAnimation(mode, stars, name, options) {
    options = options || {};
    const starUp    = options.starUp === true;
    let   fromStars = options.fromStars != null ? options.fromStars : stars;

    // 1〜11に丸め
    stars = Math.max(1, Math.min(11, stars | 0));
    fromStars = Math.max(1, Math.min(11, fromStars | 0));

    if (playing) return;
    playing = true;

    resetAnimation();
    applyCardRarity(stars);

    // 最初に表示する★数（星アップ演出なら beforeStars）
    const initialStars = starUp ? fromStars : stars;

    setupStarsStyle(initialStars);
    starsEl.textContent = "★".repeat(initialStars);
    nameEl.textContent  = name || ("★" + stars + "キャラ");

    let cardDelay = 450;
    let totalTime = 1600;

    if (mode === 'white') {
      glow.classList.add('glow-white');
      scene.classList.add('playing', 'glow-white-mode');
    } else if (mode === 'gold') {
      glow.classList.add('glow-gold');
      scene.classList.add('playing', 'glow-gold-mode');
    } else {
      glow.classList.add('glow-rainbow');
      scene.classList.add('playing');
      chest.classList.add('chest-diamond');
      cardDelay = 900;
      totalTime = 2100;
    }

    // 星アップ演出がある場合は、そのぶん時間を少し長めに
    const starStepDelay = 220; // ★が1つ増える間隔
    if (starUp && fromStars < stars) {
      const steps = stars - fromStars;
      totalTime += steps * starStepDelay + 400;
    }

    // カード出現
    setTimeout(() => {
      card.classList.add('show');

      // 星アップ演出：★を1つずつ増やす
      if (starUp && fromStars < stars) {
        for (let s = fromStars + 1; s <= stars; s++) {
          const value = s;
          setTimeout(() => {
            setupStarsStyle(value);
            starsEl.textContent = "★".repeat(value);
          }, (value - fromStars) * starStepDelay);
        }
      }

    }, cardDelay);

    // 演出終了でリセット
    setTimeout(() => {
      playing = false;
      resetAnimation();
    }, totalTime);
  }
</script>
