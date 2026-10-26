/**
 * 蜗牛 I 4K (wn4k.com) 自动签到 — Loon 脚本（无明文凭据版）
 *
 * 逻辑：
 *  1. 优先用持久化里保存的 Cookie 签到
 *  2. Cookie 失效时，用持久化里保存的账号密码自动重新登录并刷新 Cookie
 *  3. 结果通过 Loon 通知推送
 *
 * 【必须在 Loon 里配置两条持久化存储，否则脚本无法登录】
 *  键 wn4k_account ，值  账号:密码      例如  321995875:yS1229..
 *  键 wn4k_cookie  ，值  可留空，首次运行后会自动写入
 *
 * 配置入口：Loon → 脚本 → 右上角「持久化存储」/ Persistent Store → 新增键值
 */

const SITE = "https://wn4k.com";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const store = typeof $persistentStore !== "undefined" ? $persistentStore : null;

function read(key) {
  try { return store ? (store.read(key) || "") : ""; } catch (e) { return ""; }
}
function write(key, val) {
  try { if (store) store.write(val, key); } catch (e) {}
}

let ACCOUNT = "";
let PASSWORD = "";
(function loadCredentials() {
  const saved = read("wn4k_account");
  if (saved && saved.indexOf(":") > 0) {
    const i = saved.indexOf(":");
    ACCOUNT = saved.slice(0, i).trim();
    PASSWORD = saved.slice(i + 1);
  }
})();

function notify(title, subtitle, body) {
  try {
    if (typeof $notification !== "undefined") $notification.post(title, subtitle, body);
  } catch (e) {}
}

function buildHeaders(cookie, referer) {
  const h = {
    "User-Agent": UA,
    "X-Requested-With": "XMLHttpRequest",
    "Referer": referer || SITE + "/user/checkin.html",
    Origin: SITE,
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  };
  if (cookie) h.Cookie = cookie;
  return h;
}

function form(obj) {
  return Object.keys(obj)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]))
    .join("&");
}

function parseJSON(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

function extractCookie(headers, fallback) {
  const jar = {};
  if (fallback) {
    fallback.split(";").forEach((p) => {
      const i = p.indexOf("=");
      if (i > 0) jar[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    });
  }
  const collect = (v) => {
    String(v).split(",").forEach((seg) => {
      const kv = seg