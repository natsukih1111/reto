// file: app/rete-battle/page.js
import { redirect } from 'next/navigation';

// 旧URL /rete-battle は /battle?mode=rate に飛ばすだけ
export default function RateBattleLegacyRedirect() {
  redirect('/battle?mode=rate');
}
