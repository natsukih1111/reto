// file: lib/title.js

// レートから称号を決める（/api/me と完全に同じ基準）
export function getTitleFromRating(ratingRaw) {
  const rating = Math.round(Number(ratingRaw ?? 1500));

  if (rating >= 1800) return '海賊王';
  if (rating >= 1750) return '四皇';
  if (rating >= 1700) return '七武海';
  if (rating >= 1650) return '超新星';
  if (rating >= 1600) return 'Level新世界';
  if (rating >= 1550) return 'Level偉大なる航路';
  if (rating >= 1500) return 'Level東の海';
  return '海賊見習い';
}

export default getTitleFromRating;
