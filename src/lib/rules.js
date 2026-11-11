// Pure rule matching. No chrome APIs. Testable in node.
export function patternToRegExp(pattern) {
  const p = pattern.trim().toLowerCase();
  // Escape regex chars except *
  const escaped = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$");
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// pattern forms supported:
//  - "youtube.com"            -> hostname contains
//  - "*.youtube.com"          -> hostname suffix
//  - "*://*.youtube.com/*"   -> full-url glob
//  - "https://example.com/a*"-> full-url glob
export function ruleMatches(rule, url) {
  const pattern = (rule.pattern || "").trim().toLowerCase();
  if (!pattern) return false;
  const u = url.toLowerCase();
  if (pattern.includes("://") || pattern.includes("*")) {
    if (pattern.includes("://")) {
      try {
        return patternToRegExp(pattern).test(u);
      } catch {
        return false;
      }
    }
    // hostname glob like *.youtube.com
    const host = hostnameOf(url);
    try {
      return patternToRegExp(pattern).test(host) || patternToRegExp(pattern).test(u);
    } catch {
      return false;
    }
  }
  return hostnameOf(url).includes(pattern);
}

// Disabled rules win over enabled ones. Default: not guarded.
export function isEnabledForUrl(url, rules, globalEnabled = true) {
  if (!globalEnabled) return false;
  if (!Array.isArray(rules) || rules.length === 0) return false;
  let enabledHit = false;
  for (const r of rules) {
    if (!ruleMatches(r, url)) continue;
    if (r.enabled === false) return false;
    if (r.enabled !== false) enabledHit = true;
  }
  return enabledHit;
}
