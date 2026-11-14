import { THEMES, themeVarsCss } from './themes'

// CSS da UI do PxA. Vive só dentro do shadow root: o CSS da página não entra e o nosso não vaza.
export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.pxa-layer {
  /* Tema Padrão (TEMA-03). ui/themes.ts troca estes valores no layer. */
  ${themeVarsCss(THEMES[0]!)}
  position: fixed; inset: 0; pointer-events: none;
  font: 12px/1.4 ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: var(--pxa-ink); -webkit-font-smoothing: none; image-rendering: pixelated;
}
button {
  font: inherit; cursor: pointer; color: var(--pxa-ink); background: var(--pxa-surface);
  border: 2px solid var(--pxa-ink); padding: 3px 8px; box-shadow: 2px 2px 0 var(--pxa-ink);
}
button:hover:not(:disabled) { background: var(--pxa-hover); }
button:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: none; }
button:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible, .pxa-item-main:focus-visible { outline: 2px dashed var(--pxa-accent); outline-offset: 2px; }

.pxa-outline {
  position: fixed; border: 2px dashed var(--pxa-accent); background: var(--pxa-tint);
  pointer-events: none;
}
.pxa-label {
  position: fixed; pointer-events: none; padding: 1px 6px;
  background: var(--pxa-head-bg); color: var(--pxa-head-fg); white-space: nowrap;
}

.pxa-marker {
  position: fixed; pointer-events: none; min-width: 20px; height: 20px; padding: 0 4px;
  transform: translate(-6px, -10px);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; color: #1a1226; background: #ff3e7f;
  border: 2px solid #1a1226; box-shadow: 2px 2px 0 #1a1226;
}

.pxa-editor {
  position: fixed; pointer-events: auto; width: 320px; padding: 8px;
  display: grid; grid-template-columns: 1fr auto auto; gap: 6px;
  background: var(--pxa-paper); border: 2px solid var(--pxa-ink); box-shadow: 4px 4px 0 var(--pxa-ink);
}
.pxa-editor textarea {
  grid-column: 1 / -1; resize: vertical; min-height: 56px; padding: 6px;
  font: inherit; color: var(--pxa-ink); background: var(--pxa-surface); border: 2px solid var(--pxa-ink); outline: none;
}
.pxa-editor textarea:focus { border-color: var(--pxa-accent); }
.pxa-editor .pxa-hint { align-self: center; color: var(--pxa-muted); }
.pxa-editor button[type="submit"] { background: var(--pxa-primary); color: var(--pxa-on-accent); }

.pxa-panel {
  position: fixed; top: 12px; right: 12px; bottom: 12px; width: 320px; pointer-events: auto;
  display: flex; flex-direction: column;
  background: var(--pxa-paper); border: 2px solid var(--pxa-ink); box-shadow: 4px 4px 0 var(--pxa-ink);
}
.pxa-panel header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 6px 6px 10px; background: var(--pxa-head-bg); color: var(--pxa-head-fg); font-weight: 700; letter-spacing: .5px;
}
.pxa-panel .pxa-title { flex: 1; }
.pxa-panel header .pxa-head-btn { display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 4px; background: var(--pxa-surface); box-shadow: none; }
.pxa-panel header .pxa-head-btn:hover:not(:disabled) { background: var(--pxa-hover); }
.pxa-panel.pxa-collapsed { top: auto; width: auto; max-width: calc(100vw - 24px); }
.pxa-panel.pxa-collapsed ol, .pxa-panel.pxa-collapsed footer { display: none; }
.pxa-panel ol { list-style: none; margin: 0; padding: 6px; overflow-y: auto; flex: 1; }
.pxa-item { display: flex; gap: 4px; align-items: flex-start; padding: 6px; border-bottom: 2px dotted var(--pxa-rule); }
.pxa-item-main {
  flex: 1; min-width: 0; text-align: left; background: none; border: 0; box-shadow: none; padding: 0;
}
.pxa-item-main:hover { background: var(--pxa-hover); }
.pxa-item-meta { display: block; font-weight: 700; }
.pxa-item-path { display: block; color: var(--pxa-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pxa-item-note { display: block; overflow-wrap: anywhere; }
.pxa-item button.pxa-icon {
  display: grid; place-items: center; padding: 3px;
  background: transparent; border: 0; box-shadow: none;
}
.pxa-item button.pxa-icon:hover:not(:disabled) { background: var(--pxa-hover); }
.pxa-item button.pxa-danger:hover:not(:disabled) { background: var(--pxa-danger-hover); }
.pxa-item button.pxa-icon:active:not(:disabled) { transform: none; }
svg[shape-rendering="crispEdges"] { display: block; image-rendering: pixelated; }
.pxa-cat { display: inline-block; vertical-align: -1px; }
.pxa-cat svg { display: inline-block; }
.pxa-empty { margin: 0; padding: 16px 12px; color: var(--pxa-muted); }
.pxa-panel footer { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; padding: 8px; border-top: 2px solid var(--pxa-ink); }
.pxa-panel footer .pxa-primary { background: var(--pxa-primary); color: var(--pxa-on-accent); }
.pxa-confirm { width: 100%; font-weight: 700; }

.pxa-toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); pointer-events: none;
  padding: 6px 12px; background: var(--pxa-head-bg); color: var(--pxa-head-fg); border: 2px solid var(--pxa-accent);
}

/* Diversão: mascote, tema e som (feature 2026-11-14-diversao) */
.pxa-head-slot { display: contents; }
/* Cabeçalho com mascote: o título quebra linha em vez de esconder o contador. */
.pxa-panel header { gap: 6px; }
.pxa-panel .pxa-title { min-width: 0; line-height: 1.2; }
.pxa-mascot { display: block; flex: none; width: 32px; height: 32px; margin: -4px -4px -4px -6px; }
.pxa-mascot[data-mood="feliz"] svg { animation: pxa-hop .5s steps(2) infinite; }
.pxa-mascot[data-mood="susto"] svg { animation: pxa-shake .2s steps(2) infinite; }
.pxa-mascot[data-mood="festa"] svg { animation: pxa-dance .4s steps(2) infinite; }
.pxa-mascot[data-mood="dormindo"] svg { animation: pxa-breathe 2s steps(2) infinite; }
@keyframes pxa-hop { 50% { transform: translateY(-3px); } }
@keyframes pxa-shake { 50% { transform: translateX(2px); } }
@keyframes pxa-dance { 0% { transform: rotate(-8deg); } 50% { transform: rotate(8deg) translateY(-2px); } }
@keyframes pxa-breathe { 50% { transform: translateY(1px); } }
@media (prefers-reduced-motion: reduce) { .pxa-mascot svg { animation: none; } }
.pxa-fun-bar { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 8px; border-bottom: 2px solid var(--pxa-ink); }
.pxa-fun-bar select { font: inherit; color: var(--pxa-ink); background: var(--pxa-surface); border: 2px solid var(--pxa-ink); padding: 1px 2px; }
.pxa-fun-bar .pxa-sound { display: grid; place-items: center; padding: 2px 6px; box-shadow: none; }
.pxa-panel.pxa-collapsed .pxa-fun-bar { display: none; }
/* Noite: botões do cabeçalho viram só o ícone, numa cor só (pedido do dev). */
.pxa-layer[data-pxa-theme="noite"] .pxa-panel header .pxa-head-btn { background: transparent; border-color: transparent; color: var(--pxa-head-fg); }
.pxa-layer[data-pxa-theme="noite"] .pxa-panel header .pxa-head-btn:hover:not(:disabled) { background: var(--pxa-hover); }
.pxa-layer[data-pxa-theme="noite"] .pxa-panel header .pxa-head-btn svg rect { fill: currentColor; }

/* Raio-X */
.pxa-rx-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 6px;
  background: var(--pxa-paper); border-bottom: 2px solid var(--pxa-ink);
}
.pxa-rx-title { font-weight: 700; margin-right: 2px; }
.pxa-rx-bar button { padding: 1px 6px; box-shadow: 1px 1px 0 var(--pxa-ink); }
.pxa-rx-bar button[aria-pressed="true"] { background: var(--pxa-primary); color: var(--pxa-on-accent); }
.pxa-panel.pxa-collapsed .pxa-rx-bar { display: none; }

.pxa-box { position: fixed; display: none; pointer-events: none; }
.pxa-audit-hl .pxa-box { border: 2px dashed var(--pxa-accent); background: var(--pxa-tint); }

.pxa-audit {
  position: fixed; top: 12px; left: 12px; width: 340px; max-width: calc(100vw - 24px); max-height: calc(100vh - 80px);
  pointer-events: auto; display: flex; flex-direction: column;
  background: var(--pxa-paper); border: 2px solid var(--pxa-ink); box-shadow: 4px 4px 0 var(--pxa-ink);
}
.pxa-audit header {
  display: flex; align-items: flex-start; gap: 8px; padding: 6px 6px 6px 10px;
  background: var(--pxa-head-bg); color: var(--pxa-head-fg); font-weight: 700;
}
.pxa-audit-head { flex: 1; }
.pxa-audit header { cursor: move; user-select: none; touch-action: none; }
.pxa-audit header:focus-visible { outline: 2px dashed var(--pxa-accent); outline-offset: -4px; }
.pxa-audit header button { padding: 0 6px; box-shadow: none; }
.pxa-audit-tools { display: flex; gap: 6px; padding: 6px 8px; }
.pxa-audit-notices p { margin: 0; padding: 4px 8px; background: var(--pxa-hover); font-weight: 700; }
.pxa-audit-body { flex: 1; overflow-y: auto; padding: 0 8px; }
.pxa-audit h3 { margin: 8px 0 4px; font-size: 12px; }
.pxa-audit ul { list-style: none; margin: 0; padding: 0; }
.pxa-audit-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 3px 0; border-bottom: 2px dotted var(--pxa-rule); }
.pxa-audit-row:hover { background: var(--pxa-hover); }
.pxa-audit-value {
  max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700;
  padding: 0; background: none; border: 0; box-shadow: none; text-decoration: underline dotted;
}
.pxa-audit-value:hover:not(:disabled) { background: none; color: var(--pxa-accent); }
.pxa-audit-count, .pxa-audit-props { color: var(--pxa-muted); }
.pxa-audit-fix { width: 100%; padding-left: 4px; font-weight: 700; }
.pxa-audit-ok { display: flex; align-items: center; gap: 4px; margin: 0; padding: 3px 0; color: var(--pxa-ok); font-weight: 700; }
.pxa-audit-ok svg { flex: none; }
.pxa-audit details { margin: 2px 0 4px; }
.pxa-audit summary { cursor: pointer; color: var(--pxa-muted); padding: 2px 0; }
.pxa-audit .pxa-swatch { width: 12px; height: 12px; border: 2px solid var(--pxa-ink); }
.pxa-tag { padding: 0 4px; background: var(--pxa-head-bg); color: var(--pxa-head-fg); }
.pxa-audit-annotate { margin-left: auto; padding: 0 6px; box-shadow: 1px 1px 0 var(--pxa-ink); }
.pxa-audit-foot { padding: 6px 8px; color: var(--pxa-muted); border-top: 2px solid var(--pxa-ink); }

.pxa-loupe { position: fixed; pointer-events: none; background: var(--pxa-paper); border: 2px solid var(--pxa-ink); box-shadow: 4px 4px 0 var(--pxa-ink); }
.pxa-loupe canvas { display: block; width: 120px; height: 120px; image-rendering: pixelated; }
.pxa-loupe-hex { padding: 2px 6px; text-align: center; font-weight: 700; background: var(--pxa-head-bg); color: var(--pxa-head-fg); }

/* ── Equipe e Claude: erros, Desenho, importadas, Apresentação ── */
.pxa-errors { grid-column: 1 / -1; display: grid; gap: 4px; }
.pxa-errors-title { font-weight: 700; }
.pxa-errors ul { list-style: none; margin: 0; padding: 0; max-height: 96px; overflow-y: auto; border: 2px dotted var(--pxa-rule); }
.pxa-errors li { display: flex; align-items: center; gap: 4px; padding: 2px 4px; }
.pxa-errors li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pxa-errors button.pxa-icon { padding: 0 4px; border: 0; box-shadow: none; background: transparent; }
.pxa-errors button.pxa-icon:hover { background: var(--pxa-danger-hover); }
.pxa-err { padding: 0 3px; background: var(--pxa-primary); color: var(--pxa-on-accent); font-weight: 700; }
.pxa-imported { font-weight: 400; color: var(--pxa-muted); }
.pxa-missing { font-weight: 400; color: var(--pxa-primary); }
.pxa-thumb { display: block; max-width: 100%; max-height: 64px; margin-top: 4px; border: 2px solid var(--pxa-ink); image-rendering: pixelated; }

.pxa-presenting .pxa-panel { display: none !important; }
.pxa-spot {
  position: fixed; z-index: 1; pointer-events: none; display: none;
  border: 2px dashed var(--pxa-accent); box-shadow: 0 0 0 100vmax var(--pxa-scrim);
}
.pxa-present {
  position: fixed; z-index: 2; left: 50%; bottom: 24px; transform: translateX(-50%); pointer-events: auto;
  width: min(560px, calc(100vw - 32px)); max-height: 70vh; overflow-y: auto; padding: 12px;
  display: grid; gap: 8px; font-size: 14px;
  background: var(--pxa-paper); border: 2px solid var(--pxa-ink); box-shadow: 4px 4px 0 var(--pxa-ink);
}
.pxa-present header { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 16px; font-weight: 700; }
.pxa-present-count { color: var(--pxa-muted); }
.pxa-present-note { margin: 0; font-size: 18px; white-space: pre-wrap; overflow-wrap: anywhere; }
.pxa-present-warn { margin: 0; padding: 4px 8px; background: var(--pxa-hover); border: 2px solid var(--pxa-accent); }
.pxa-present-where { margin: 0; color: var(--pxa-muted); }
.pxa-present-shot { display: block; max-width: 100%; max-height: 40vh; border: 2px solid var(--pxa-ink); image-rendering: pixelated; }
.pxa-present footer { display: flex; justify-content: flex-end; gap: 6px; }

.pxa-draw {
  position: fixed; inset: 0; z-index: 4; pointer-events: auto;
  display: flex; align-items: center; justify-content: center; background: var(--pxa-scrim);
}
.pxa-draw-box {
  display: flex; flex-direction: column; gap: 8px; padding: 8px;
  max-width: calc(100vw - 32px); max-height: calc(100vh - 32px);
  background: var(--pxa-paper); border: 2px solid var(--pxa-ink); box-shadow: 4px 4px 0 var(--pxa-ink);
}
.pxa-draw-bar, .pxa-draw-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.pxa-draw-actions { justify-content: flex-end; }
.pxa-draw-group { display: flex; gap: 2px; }
.pxa-draw-group button[aria-pressed="true"]:not(.pxa-swatch) { background: var(--pxa-primary); color: var(--pxa-on-accent); }
.pxa-draw .pxa-swatch { width: 24px; height: 24px; padding: 0; }
.pxa-draw .pxa-swatch[aria-pressed="true"] { outline: 2px solid var(--pxa-ink); outline-offset: 2px; }
.pxa-draw-canvas { overflow: auto; min-height: 0; }
.pxa-draw canvas {
  display: block; border: 2px solid var(--pxa-ink);
  image-rendering: pixelated; cursor: crosshair; touch-action: none;
}
.pxa-draw .pxa-primary { background: var(--pxa-primary); color: var(--pxa-on-accent); }
`
