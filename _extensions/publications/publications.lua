-- {{< publications file="data/publications.bib" highlight="Frazer,Dias" >}}
-- Renders a BibTeX file as a publication list: preprints first, then by year (newest first).
-- Uses pandoc's own BibTeX reader, so there are no extra dependencies.

local str = pandoc.utils.stringify

local function esc(s)
  s = s or ""
  return (s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;"))
end

local function split(s, sep)
  local out = {}
  for part in string.gmatch(s or "", "([^" .. sep .. "]+)") do
    part = part:gsub("^%s+", ""):gsub("%s+$", "")
    if part ~= "" then table.insert(out, part) end
  end
  return out
end

local function read_file(path)
  local f = io.open(path, "r")
  if not f then return nil end
  local c = f:read("*a")
  f:close()
  return c
end

local function initials(given)
  local out = {}
  for w in string.gmatch(given or "", "[^%s%.]+") do
    for part in string.gmatch(w, "[^%-]+") do
      table.insert(out, part:sub(1, 1) .. ".")
    end
  end
  return table.concat(out, "")
end

local function format_authors(authors, highlight)
  local names = {}
  for _, a in ipairs(authors or {}) do
    local family = str(a.family or a.literal or "")
    local given = str(a.given or "")
    local particle = str(a["non-dropping-particle"] or a["dropping-particle"] or "")
    local key = family
    if particle ~= "" then family = particle .. " " .. family end
    local nm = family
    if given ~= "" then nm = initials(given) .. " " .. family end
    nm = esc(nm):gsub(" ", "&nbsp;")
    if highlight[key] or highlight[family] then nm = '<span class="pub-me">' .. nm .. "</span>" end
    table.insert(names, nm)
  end
  if #names > 12 then
    local shown = {}
    for i = 1, 10 do shown[i] = names[i] end
    -- keep highlighted authors visible even when truncated
    local tail = {}
    for i = 11, #names do
      if names[i]:find("pub%-me") then table.insert(tail, names[i]) end
    end
    local s = table.concat(shown, ", ") .. ", &hellip;"
    if #tail > 0 then s = s .. ", " .. table.concat(tail, ", ") end
    return s .. " <span class=\"pub-etal\">(" .. #names .. " authors)</span>"
  end
  return table.concat(names, ", ")
end

local function year_of(ref)
  local y = str(ref.issued or "")
  return y:match("(%d%d%d%d)") or "n.d."
end

local function render_item(ref, highlight)
  local title = esc(str(ref.title or "Untitled"))
  local link = nil
  if ref.doi then link = "https://doi.org/" .. str(ref.doi)
  elseif ref.URL then link = str(ref.URL)
  elseif ref.url then link = str(ref.url) end

  local kw = split(str(ref.keyword or ""), ",")
  local post = nil
  for _, k in ipairs(kw) do
    local p = k:match("^post:(.+)$")
    if p then post = p end
  end

  local venue = str(ref["container-title"] or ref.publisher or ref.genre or "")
  local h = {}
  table.insert(h, '<li class="pub">')
  if link then
    table.insert(h, '<div class="pub-title"><a href="' .. esc(link) .. '">' .. title .. "</a></div>")
  else
    table.insert(h, '<div class="pub-title">' .. title .. "</div>")
  end
  table.insert(h, '<div class="pub-authors">' .. format_authors(ref.author, highlight) .. "</div>")
  table.insert(h, '<div class="pub-venue">')
  if venue ~= "" then table.insert(h, "<em>" .. esc(venue) .. "</em> &middot; ") end
  table.insert(h, year_of(ref))
  if post then
    table.insert(h, ' &middot; <a class="pub-post" href="' .. esc(post) .. '/index.html">Plain-language summary &rarr;</a>')
  end
  table.insert(h, "</div></li>")
  return table.concat(h, "")
end

return {
  ["publications"] = function(args, kwargs, meta)
    local file = str(kwargs["file"] or "")
    if file == "" then file = "data/publications.bib" end
    local root = (quarto.project and quarto.project.directory) or "."
    local content = read_file(root .. "/" .. file) or read_file(file)
    if not content then
      return pandoc.RawBlock("html", '<p class="callout-warning">Could not read ' .. esc(file) .. "</p>")
    end

    local highlight = {}
    for _, n in ipairs(split(str(kwargs["highlight"] or "Frazer,Dias"), ",")) do highlight[n] = true end

    local refs = pandoc.read(content, "bibtex").meta.references or {}
    local preprints, by_year, years = {}, {}, {}
    for _, ref in ipairs(refs) do
      local kw = str(ref.keyword or ""):lower()
      if kw:find("preprint") then
        table.insert(preprints, ref)
      else
        local y = year_of(ref)
        if not by_year[y] then by_year[y] = {}; table.insert(years, y) end
        table.insert(by_year[y], ref)
      end
    end
    table.sort(years, function(a, b) return a > b end)
    table.sort(preprints, function(a, b) return year_of(a) > year_of(b) end)

    local out = { '<div class="publications">' }
    local function section(label, list, cls)
      table.insert(out, '<section class="pub-group ' .. cls .. '"><h3 class="pub-group-label">' .. label .. '</h3><ol class="pub-list">')
      for _, r in ipairs(list) do table.insert(out, render_item(r, highlight)) end
      table.insert(out, "</ol></section>")
    end
    if #preprints > 0 then section("Preprints", preprints, "pub-preprints") end
    for _, y in ipairs(years) do section(y, by_year[y], "pub-year") end
    table.insert(out, "</div>")
    return pandoc.RawBlock("html", table.concat(out, "\n"))
  end
}
