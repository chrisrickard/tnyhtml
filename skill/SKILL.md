---
name: tnyhtml
description: Author Tailwind-styled UI pages in tnyhtml, a token-minimal markup language that compiles to HTML in the browser via Pug. Use this skill whenever the user wants to create, edit or scaffold UI prototypes, dashboards, landing pages, forms, or other HTML interfaces in tnyhtml format, or when working in a `.tnyhtml` / `id="tnyhtml"` source block.
---

Compact markup for Tailwind-styled UIs. Compiles to HTML via Pug, so any Pug syntax (mixins, conditionals, `each`, `#{var}`, `(attr="val")`) is a valid fallback for cases the shorthands don't cover.

**Goal: produce the fewest possible tokens.** Use macros aggressively, put repeated data in data blocks, and use loops for any repeated structure. All styling comes from Tailwind utility classes.

## File structure

```html
<script src="https://cdn.jsdelivr.net/gh/chrisrickard/tnyhtml/code/tnyhtml.js"></script>
<script type="text/plain" id="tnyhtml">
...
</script>
<body></body>
```

That single script tag is the **only** dependency — it auto-injects Tailwind and Pug. Do not add separate `<script>` or `<link>` tags for Tailwind, Pug, or any other framework. Leave `<body>` empty; tnyhtml renders into it.

Source order inside the block: macros → data blocks → tree. Indentation = nesting. No closing tags.

## Tag aliases

- div = d
- span = s
- p = p
- a = a
- button = b
- input = i
- form = f
- label = l
- section = q
- main = m
- nav = n
- header = hd
- footer = ft
- aside = as
- article = ar
- h1 = h1
- h2 = h2
- h3 = h3
- h4 = h4
- ul = u
- li = li
- dl = dl
- dt = dt
- dd = dd
- table = t
- tr = tr
- td = td
- th = th
- thead = tk
- tbody = tb
- tfoot = tf
- select = e
- option = o
- textarea = tx
- img = img
- br = br
- hr = hr
- strong = st
- em = em
- small = sm
- code = cd
- pre = pr
- blockquote = bd
- figure = fg
- figcaption = fc
- svg = sv
- path = pt

For any unlisted tag prefix with `@`: `@dialog`, `@canvas`.

## Macros

**Before writing the tree, scan for every class group that repeats and define a macro for it.** Macros can be chained and mixed with raw classes.

```
$card=rounded-2xl border border-white/10 bg-white/5 p-6
$muted=text-sm text-slate-500

d.$card.mt-4
  p.$muted.$card Combined macros + extra class
```

## Attributes

| Syntax | Example |
|---|---|
| `#value` | `d#app` → id |
| `=value` | `i=email` → type |
| `[k:v]` | `d[data-open:true]` |
| `[k]` | `b[disabled]` (boolean) |
| ` @value` | `a.underline @/home Visit` → href |
| ` ?text` | `i.border ?Search...` → placeholder |

`#`, `=`, `[` attach directly to the tag zone. `@` and `?` come after the first space.

```
i=email.border ?Email address
b[aria-label:Close][disabled] ×
```

## Data & loops

```
D name=f0|f1|f2;f0|f1|f2

*name
  child using $0 $1 $2
```

Rows separated by `;`, fields by `|`. `$N` substitutes the Nth field of the current row in text or attribute values.

```
D people=Alice|/alice;Bob|/bob

*people
  a.$nav @$1 $0
```

## Example

```
$card=rounded-2xl border border-white/10 bg-white/5 p-6
$muted=text-sm text-slate-500
$btn=rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white

D stats=Revenue|$84.2k|+12%;Pipeline|$312k|+8%

m.p-8
  hd.flex.items-center.justify-between
    h1.text-3xl.font-bold Sales dashboard
    b.$btn Add deal
  q.mt-8.grid.gap-4.sm:grid-cols-2
    *stats
      d.$card
        p.$muted $0
        d.text-3xl.font-bold $1
        s.text-emerald-400 $2
```

## Rules

- **Macros first** — every class group used 2+ times becomes a macro, including inside loop bodies.
- **Data + loops** — never write the same node shape twice; use a data block and loop.
- `@` prefix only for tags not in the alias list.
