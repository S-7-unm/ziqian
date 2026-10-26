/**
 * 蜗牛 I 4K (wn4k.com) 自动签到 — Loon 脚本
 *
 * 功能：
 *  1. 优先用已保存的 Cookie 直接签到
 *  2. Cookie 失效（过期/未登录）时，自动用账号密码重新登录并刷新 Cookie
 *  3. 结果通过 Loon 通知推送
 *
 * 账号信息可用三种方式配置（优先级从高到低）：
 *  A. Loon 持久化存储：键 wn4k_account，值格式  账号:密码
 *  B. 直接改下面的 ACCOUNT / PASSWORD 常量
 *  C. 手动写入 Cookie：持久化键 wn4k_cookie，值为完整 Cookie 字符串
 */

const SITE = "https://wn4k.com";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// ==== 默认凭据（已内置，可留空改用持久化存储配置）====
let ACCOUNT = "321995875";
let PASSWORD = "yS1229..";
// ====================================================

const store = typeof $persistentStore !== "undefined" ? $persistentStore : null;

function read(key) {
  try { return store ? (store.read(key) || "") : ""; } catch (e) { return ""; }
}
function write(key, val) {
  try { if (store) store.write(val, key); } catch (e) {}
}

// 持久化配置覆盖内置凭据
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

// 从响应头里提取 Set-Cookie，合并成一行
function extractCookie(headers, fallback) {
  const jar = {};
  if (fallback) {
    fallback.split(";").forEach((p) => {
      const i = p.indexOf("=");
      if (i > 0) jar[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    });
  }
  const c