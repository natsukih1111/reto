// file: app/manifest.js
export default function manifest() {
  return {
    name: 'ナレバト',
    short_name: 'ナレバト',
    description: 'ナレバト（PWA）',
    start_url: '/',
    display: 'standalone',
    background_color: '#BFE9FF',
    theme_color: '#3BA9FF',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
