/**
 * Post-export step for the web build (amplify.yml frontend): gives the public pages a real file so they load
 * without the hosting SPA rewrite rule. Amplify Hosting serves `/privacy` as a 301 to `/privacy/`, which then needs
 * `privacy/index.html`; each copy is the same single-page shell (scripts are referenced by absolute paths), with the
 * page's own <title> and description for link previews and reviewers.
 *
 *   node scripts/web-static-routes.mjs [distDir]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const PAGES = [
  { route: 'privacy', title: 'Privacy Policy · سياسة الخصوصية · OneQ', description: 'How OneQ collects, uses, shares and protects personal data.' },
  { route: 'terms', title: 'Terms of Service · شروط الاستخدام · OneQ', description: 'The terms that govern the use of the OneQ app and website.' },
];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const shell = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!shell.includes('<title>')) throw new Error('index.html has no <title> — unexpected export output');

for (const page of PAGES) {
  let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>`);
  html = /<meta name="description"[^>]*>/.test(html)
    ? html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(page.description)}">`)
    : html.replace('</title>', `</title><meta name="description" content="${escape(page.description)}">`);
  await mkdir(path.join(dist, page.route), { recursive: true });
  await writeFile(path.join(dist, page.route, 'index.html'), html);
  console.log(`wrote ${page.route}/index.html`);
}
