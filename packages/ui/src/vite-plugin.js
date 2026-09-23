// A Vite plugin for every Blockout game's page: before anything paints, apply the
// saved light/dark theme (so it doesn't flash light first), and put the shared
// icon sprite at the top of <body> (icons are <svg class="icon"><use href="#i-name">).
//   // vite.config.js
//   import { blockoutPage } from '@blockout/ui/vite';
//   export default { plugins: [blockoutPage()] };
import fs from 'node:fs';

const THEME = `<script>
      try {
        var saved = JSON.parse(localStorage.getItem('blockout.settings')) || {};
        if (saved.theme === 'light' || saved.theme === 'dark') document.documentElement.dataset.theme = saved.theme;
      } catch (e) {}
    </script>`;

export function blockoutPage() {
  const sprite = fs.readFileSync(new URL('./icons.svg', import.meta.url), 'utf8').trim();
  return {
    name: 'blockout-page',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace('</head>', `  ${THEME}\n  </head>`).replace(/<body([^>]*)>/, `<body$1>\n${sprite}`),
    },
  };
}
