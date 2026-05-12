# tnyhtml

A token-minimal markup language for LLM-generated Tailwind UI prototypes. Compiles to HTML in the browser via Pug.

The goal is to let an AI produce rich, styled HTML interfaces using the smallest practical number of tokens — useful for prompts, streaming, agent workflows and any context where token cost matters.

## Quick start

A page using tnyhtml needs nothing more than one script tag and a `text/plain` source block:

```html
<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/gh/chrisrickard/tnyhtml/code/tnyhtml.js"></script>
</head>
<body></body>
<script type="text/plain" id="tnyhtml">
$card=rounded-2xl border border-white/10 bg-white/5 p-6
$muted=text-sm text-slate-500

m.p-8
  h1.text-3xl.font-bold Dashboard
  d.$card.mt-6
    p.$muted Hello world
</script>
</html>
```

Open the HTML file in a browser — `tnyhtml.js` injects Tailwind, loads Pug, compiles the source and renders the result into `<body>`.

The runtime is hosted on jsDelivr at:

```
https://cdn.jsdelivr.net/gh/chrisrickard/tnyhtml/code/tnyhtml.js
```

A complete demo lives in [`code/tnyhtml_demo.html`](code/tnyhtml_demo.html).

## Repository layout

```
tnyhtml/
├── README.md              ← this file
├── code/
│   ├── tnyhtml.js         ← the runtime (compiler + Tailwind/Pug loader)
│   └── tnyhtml_demo.html  ← worked example: CRM dashboard
└── skill/
    └── SKILL.md           ← AI authoring guide / agent skill definition
```

## Language overview

tnyhtml adds a small set of compact shorthands on top of Pug:

- **Tag aliases** — `d` = div, `s` = span, `b` = button, `q` = section, `hd` = header, etc.
- **Class macros** — define once at the top (`$card=rounded-2xl border ...`), use everywhere (`d.$card`)
- **Data blocks** — `D stats=Revenue|$84.2k;Pipeline|$312k`
- **Loops** — `*stats` iterates rows; `$0`, `$1` substitute fields
- **Compact attributes** — `#id`, `=type`, `[k:v]`, ` @href`, ` ?placeholder`

Anything that isn't a tnyhtml shorthand passes through to Pug unchanged, so mixins, conditionals, `each`, `#{var}` and `(attr="val")` all work as a fallback.

See [`skill/SKILL.md`](skill/SKILL.md) for the full LLM-targeted reference.

## How it works

`tnyhtml.js` does four things on load:

1. Injects the Tailwind CSS CDN.
2. Stubs `fs` so the in-browser Pug build doesn't crash during init.
3. Loads `pug.min.js` (the 170 KB plotdb browser build).
4. Reads `<script id="tnyhtml">`, runs the tnyhtml → Pug preprocessor, calls `pug.render()`, writes the result into `<body>`.

There is no build step. Edit the source, reload the page.

## Using as an AI skill

`skill/SKILL.md` is structured as an agent skill (with front matter) so it can be dropped into systems that load skills automatically. Point your agent at this file when you want it to author tnyhtml.

## License

MIT.
