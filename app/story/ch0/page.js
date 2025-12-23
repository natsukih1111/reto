// file: app/story/ch0/page.js
import { redirect } from 'next/navigation';

export default function StoryCh0Page() {
  redirect('/story/play?chapter=ch0');
}
