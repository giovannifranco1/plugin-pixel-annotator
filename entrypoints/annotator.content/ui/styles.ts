// CSS da UI do PxA. Vive só dentro do shadow root: o CSS da página não entra e o nosso não vaza.
export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.pxa-layer {
  /* Tema Padrão (TEMA-03). ui/themes.ts troca estes valores no layer. */
  --pxa-ink: #1a1226; --pxa-paper: #fffaf0; --pxa-surface: #ffffff; --pxa-hover: #ffe1ec; --pxa-danger-hover: #ffd0d8;
  --pxa-accent: #ff3e7f; --pxa-on-accent: #1a1226; --pxa-tint: rgba(255, 62, 127, .08); --pxa-muted: #5b5266; --pxa-rule: #d8cfc0;
  --pxa-head-bg: #1a1226; --pxa-head-fg: #ffffff; --pxa-scanlines: none; --pxa-silhouette: brightness(0) opacity(.35);
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
.pxa-editor button[type="submit"] { background: var(--pxa-accent); color: var(--pxa-on-accent); }

.pxa-panel {
  position: fixed; top: 12px; right: 12px; bottom: 12px; width: 320px; pointer-events: auto;
  display: flex; flex-direction: column;
  background: var(--pxa-scanlines), var(--pxa-paper); border: 2px solid var(--pxa-ink); box-shadow: 4px 4px 0 var(--pxa-ink);
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
.pxa-panel footer .pxa-primary { background: var(--pxa-accent); color: var(--pxa-on-accent); }
.pxa-confirm { width: 100%; font-weight: 700; }

.pxa-toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); pointer-events: none;
  padding: 6px 12px; background: var(--pxa-head-bg); color: var(--pxa-head-fg); border: 2px solid var(--pxa-accent);
}

/* Diversão: mascote, nível, tema/som e conquistas (feature 2026-11-14-diversao) */
.pxa-head-slot { display: contents; }
/* Cabeçalho com mascote e nível: o título quebra linha em vez de esconder o contador. */
.pxa-panel header { gap: 6px; }
.pxa-panel .pxa-title { min-width: 0; line-height: 1.2; }
.pxa-mascot { display: block; flex: none; width: 32px; height: 32px; margin: -4px -4px -4px -6px; }
.pxa-mood-feliz svg { animation: pxa-hop .5s steps(2) infinite; }
.pxa-mood-susto svg { animation: pxa-shake .2s steps(2) infinite; }
.pxa-mood-festa svg { animation: pxa-dance .4s steps(2) infinite; }
.pxa-mood-dormindo svg { animation: pxa-breathe 2s steps(2) infinite; }
@keyframes pxa-hop { 50% { transform: translateY(-3px); } }
@keyframes pxa-shake { 50% { transform: translateX(2px); } }
@keyframes pxa-dance { 0% { transform: rotate(-8deg); } 50% { transform: rotate(8deg) translateY(-2px); } }
@keyframes pxa-breathe { 50% { transform: translateY(1px); } }
@media (prefers-reduced-motion: reduce) { .pxa-mascot svg { animation: none; } }
.pxa-level { display: flex; flex: none; align-items: center; gap: 4px; font-size: 11px; }
.pxa-xp { display: block; width: 28px; height: 6px; border: 1px solid var(--pxa-head-fg); }
.pxa-xp-fill { display: block; height: 100%; background: var(--pxa-accent); }
.pxa-fun-bar { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 8px; border-bottom: 2px solid var(--pxa-ink); }
.pxa-fun-bar select { font: inherit; color: var(--pxa-ink); background: var(--pxa-surface); border: 2px solid var(--pxa-ink); padding: 1px 2px; }
.pxa-fun-bar .pxa-sound { padding: 1px 6px; box-shadow: none; }
.pxa-achievements { display: none; flex: 1; overflow-y: auto; padding: 6px 10px; }
.pxa-panel.pxa-show-achievements .pxa-achievements { display: block; }
.pxa-panel.pxa-show-achievements ol, .pxa-panel.pxa-show-achievements footer,
.pxa-panel.pxa-collapsed .pxa-fun-bar, .pxa-panel.pxa-collapsed .pxa-achievements { display: none; }
.pxa-achievements-count { margin: 0 0 6px; font-weight: 700; }
.pxa-achievements ul { list-style: none; margin: 0; padding: 0; }
.pxa-achievement { display: flex; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 2px dotted var(--pxa-rule); }
.pxa-achievement strong, .pxa-achievement span span { display: block; }
.pxa-achievement.pxa-locked .pxa-achievement-icon { filter: var(--pxa-silhouette); }
.pxa-trophy-toast {
  position: fixed; left: 50%; bottom: 64px; transform: translateX(-50%); pointer-events: none; font-weight: 700;
  padding: 6px 12px; background: var(--pxa-head-bg); color: var(--pxa-head-fg); border: 2px solid var(--pxa-accent);
}
`
