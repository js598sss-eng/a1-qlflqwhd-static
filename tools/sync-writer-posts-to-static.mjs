import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const siteDir = process.cwd();
const writerOrigin = "https://wp-a1.qlflqwhd.co.kr";
const publicOrigin = "https://a1.qlflqwhd.co.kr";
const siteName = "a1.qlflqwhd.co.kr";
const adsenseClient = "ca-pub-6459241739499317";
const gaId = "G-DXZ7HY9DF7";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripTags(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

function safeSlug(slug, id) {
  return String(slug || `writer-post-${id}`).replace(/^\/+|\/+$/g, "");
}

function siteHeader() {
  return `<header id="masthead" class="site-header">
    <div class="inside-header grid-container">
      <p class="main-title"><a href="/">${esc(siteName)}</a></p>
      <p class="site-description">생활 정보와 신청 안내</p>
    </div>
  </header>
  <nav class="main-navigation">
    <div class="inside-navigation grid-container">
      <a href="/">홈</a>
      <a href="/sitemap.xml">전체 글</a>
    </div>
  </nav>`;
}

function siteFooter() {
  return `<footer class="site-footer">
    <div class="site-info grid-container">
      <div class="copyright-bar">Copyright © ${new Date().getFullYear()} ${esc(siteName)}. All rights reserved.</div>
    </div>
  </footer>`;
}

function pageHtml(post) {
  const title = decodeEntities(post.title?.rendered || post.title?.raw || `Post ${post.id}`);
  const slug = safeSlug(post.slug, post.id);
  const canonical = `${publicOrigin}/${encodeURI(slug)}/`;
  const rawContent = post.content?.raw || post.content?.rendered || "";
  const description = stripTags(post.excerpt?.raw || post.excerpt?.rendered || rawContent).slice(0, 155);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} - ${esc(siteName)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="stylesheet" href="/assets/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}" crossorigin="anonymous"></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  </script>
</head>
<body class="post-template-default single single-post gp-static no-sidebar separate-containers header-aligned-left">
${siteHeader()}
  <main id="content" class="site-main grid-container">
    <article class="post single-post">
      <div class="inside-article">
        <header class="entry-header">
          <h1 class="entry-title">${esc(title)}</h1>
        </header>
        <div class="entry-content">
          <div class="ad-block ad-top">
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="${adsenseClient}"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
            <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
          </div>
${rawContent}
          <div class="ad-block ad-bottom">
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="${adsenseClient}"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
            <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
          </div>
        </div>
      </div>
    </article>
  </main>
${siteFooter()}
</body>
</html>
`;
}

async function fetchPublishedPosts() {
  const url = `${writerOrigin}/wp-json/wp/v2/posts/?status=publish&per_page=100`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const posts = await res.json();
  if (!Array.isArray(posts)) throw new Error("Writer posts response is not an array.");
  return posts;
}

async function writePost(post) {
  const slug = safeSlug(post.slug, post.id);
  const outputDir = path.join(siteDir, slug);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "index.html"), pageHtml(post), "utf8");
  return {
    id: post.id,
    title: decodeEntities(post.title?.rendered || post.title?.raw || ""),
    slug,
    url: `${publicOrigin}/${encodeURI(slug)}/`,
    modified: post.modified_gmt || post.modified || post.date_gmt || post.date || new Date().toISOString(),
  };
}

async function updateSitemap(entries) {
  const sitemapPath = path.join(siteDir, "sitemap.xml");
  let sitemap = existsSync(sitemapPath)
    ? await readFile(sitemapPath, "utf8")
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;

  for (const entry of entries) {
    const lastmod = new Date(entry.modified).toISOString();
    const block = `  <url><loc>${entry.url}</loc><lastmod>${lastmod}</lastmod></url>`;
    const pattern = new RegExp(`\\s*<url><loc>${entry.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>[\\s\\S]*?</url>`, "g");
    sitemap = sitemap.replace(pattern, "");
    sitemap = sitemap.replace("</urlset>", `${block}\n</urlset>`);
  }

  await writeFile(sitemapPath, sitemap, "utf8");
}

async function main() {
  const posts = await fetchPublishedPosts();
  const entries = [];
  for (const post of posts) entries.push(await writePost(post));
  await updateSitemap(entries);
  console.log(JSON.stringify({ synced: entries.length, entries }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
