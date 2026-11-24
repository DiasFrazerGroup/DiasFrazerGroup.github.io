-- Shortcodes for paper posts. Both read the page's own front matter, so links live in one place.
--
--   {{< paper-links >}}  row of buttons: Paper, Preprint, Code, Data, then every thread in `outreach`
--   {{< outreach >}}     "Threads & press" lists built from `outreach`
--
-- Front matter:
--   paper: https://doi.org/...      preprint: https://doi.org/...   (optional, shown when the paper is published)
--   code: ...   data: ...
--   outreach:
--     - url: https://bsky.app/profile/.../post/...     # kind and label are worked out from the URL...
--     - url: https://www.eurekalert.org/news-releases/1106854
--       kind: press                                    # ...or set them: thread | press | talk
--       label: "CRG press release"

local str = pandoc.utils.stringify

local function esc(s)
  s = s or ""
  return (s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;"))
end

local platforms = {
  { "bsky%.app", "Bluesky" }, { "x%.com", "X" }, { "twitter%.com", "X" },
  { "linkedin%.com", "LinkedIn" }, { "mastodon", "Mastodon" }, { "threads%.net", "Threads" },
  { "youtube%.com", "Video" }, { "youtu%.be", "Video" },
}

local function platform(url)
  for _, p in ipairs(platforms) do
    if url:find(p[1]) then return p[2] end
  end
  return nil
end

local function domain(url)
  local d = url:match("^%a+://([^/]+)") or url
  return (d:gsub("^www%.", ""))
end

-- Normalise one coverage entry to {url, kind, label}
local function entry(item)
  local url = str(item.url or "")
  if url == "" then return nil end
  local kind = str(item.kind or "")
  local p = platform(url)
  if kind == "" then
    if p == "Video" then kind = "talk" elseif p then kind = "thread" else kind = "press" end
  end
  local label = str(item.label or "")
  if label == "" then
    if kind == "thread" then label = (p or "Social") .. " thread"
    elseif kind == "talk" then label = "Talk"
    else label = domain(url) end
  end
  return { url = url, kind = kind, label = label }
end

local function entries(meta)
  local out = {}
  local cov = meta.outreach
  if cov and type(cov) == "table" then
    for _, item in ipairs(cov) do
      local e = entry(item)
      if e then table.insert(out, e) end
    end
  end
  return out
end

local function button(url, label, cls)
  if url and url ~= "" then
    return '<a class="' .. (cls or "") .. '" href="' .. esc(url) .. '">' .. esc(label) .. "</a>"
  end
  return '<span class="na">' .. esc(label) .. "</span>"
end

return {
  ["paper-links"] = function(args, kwargs, meta)
    local h = { '<div class="link-row paper-header-links">' }
    local status = str(meta.status or "")
    table.insert(h, button(str(meta.paper or ""), status == "preprint" and "Preprint" or "Paper"))
    local pre = str(meta.preprint or "")
    if pre ~= "" then table.insert(h, button(pre, "Preprint")) end
    local code, data = str(meta.code or ""), str(meta.data or "")
    if code ~= "" then table.insert(h, button(code, "Code")) end
    if data ~= "" then table.insert(h, button(data, "Data")) end
    local any_thread = false
    for _, e in ipairs(entries(meta)) do
      if e.kind == "thread" then
        table.insert(h, button(e.url, e.label, "thread")); any_thread = true
      end
    end
    if not any_thread then table.insert(h, button("", "Thread")) end
    table.insert(h, "</div>")
    return pandoc.RawBlock("html", table.concat(h, ""))
  end,

  ["outreach"] = function(args, kwargs, meta)
    local groups = { thread = {}, press = {}, talk = {} }
    for _, e in ipairs(entries(meta)) do
      table.insert(groups[e.kind] or groups.press, e)
    end
    local names = { { "thread", "Threads" }, { "press", "Press & coverage" }, { "talk", "Talks" } }
    local h = {}
    for _, g in ipairs(names) do
      local list = groups[g[1]]
      if #list > 0 then
        table.insert(h, '<div class="coverage-group"><div class="coverage-label">' .. g[2] .. '</div><ul class="coverage-list">')
        for _, e in ipairs(list) do
          table.insert(h, '<li><a href="' .. esc(e.url) .. '">' .. esc(e.label) .. '</a></li>')
        end
        table.insert(h, "</ul></div>")
      end
    end
    if #h == 0 then
      return pandoc.RawBlock("html", '<p class="muted">No threads or coverage yet. Add links under <code>outreach:</code> in this page\'s front matter.</p>')
    end
    return pandoc.RawBlock("html", '<div class="coverage">' .. table.concat(h, "") .. "</div>")
  end,
}
