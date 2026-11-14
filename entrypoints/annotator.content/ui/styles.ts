// CSS da UI do PxA. Vive só dentro do shadow root: o CSS da página não entra e o nosso não vaza.
export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.pxa-layer {
  position: fixed; inset: 0; pointer-events: none;
  font: 12px/1.4 ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: #1a1226; -webkit-font-smoothing: none; image-rendering: pixelated;
}
button {
  font: inherit; cursor: pointer; color: #1a1226; background: #fff;
  border: 2px solid #1a1226; padding: 3px 8px; box-shadow: 2px 2px 0 #1a1226;
}
button:hover:not(:disabled) { background: #ffe1ec; }
button:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: none; }
button:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible, .pxa-item-main:focus-visible { outline: 2px dashed #ff3e7f; outline-offset: 2px; }

.pxa-outline {
  position: fixed; border: 2px dashed #ff3e7f; background: rgba(255, 62, 127, .08);
  pointer-events: none;
}
.pxa-label {
  position: fixed; pointer-events: none; padding: 1px 6px;
  background: #1a1226; color: #fff; white-space: nowrap;
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
  background: #fffaf0; border: 2px solid #1a1226; box-shadow: 4px 4px 0 #1a1226;
}
.pxa-editor textarea {
  grid-column: 1 / -1; resize: vertical; min-height: 56px; padding: 6px;
  font: inherit; color: #1a1226; background: #fff; border: 2px solid #1a1226; outline: none;
}
.pxa-editor textarea:focus { border-color: #ff3e7f; }
.pxa-editor .pxa-hint { align-self: center; color: #5b5266; }
.pxa-editor button[type="submit"] { background: #ff3e7f; color: #fff; }

.pxa-panel {
  position: fixed; top: 12px; right: 12px; bottom: 12px; width: 320px; pointer-events: auto;
  display: flex; flex-direction: column;
  background: #fffaf0; border: 2px solid #1a1226; box-shadow: 4px 4px 0 #1a1226;
}
.pxa-panel header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 6px 6px 10px; background: #1a1226; color: #fff; font-weight: 700; letter-spacing: .5px;
}
.pxa-panel .pxa-title { flex: 1; }
.pxa-panel header .pxa-head-btn { display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 4px; background: #fff; box-shadow: none; }
.pxa-panel header .pxa-head-btn:hover:not(:disabled) { background: #ffe1ec; }
.pxa-panel.pxa-collapsed { top: auto; width: auto; max-width: calc(100vw - 24px); }
.pxa-panel.pxa-collapsed ol, .pxa-panel.pxa-collapsed footer { display: none; }
.pxa-panel ol { list-style: none; margin: 0; padding: 6px; overflow-y: auto; flex: 1; }
.pxa-item { display: flex; gap: 4px; align-items: flex-start; padding: 6px; border-bottom: 2px dotted #d8cfc0; }
.pxa-item-main {
  flex: 1; min-width: 0; text-align: left; background: none; border: 0; box-shadow: none; padding: 0;
}
.pxa-item-main:hover { background: #ffe1ec; }
.pxa-item-meta { display: block; font-weight: 700; }
.pxa-item-path { display: block; color: #5b5266; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pxa-item-note { display: block; overflow-wrap: anywhere; }
.pxa-item button.pxa-icon {
  display: grid; place-items: center; padding: 3px;
  background: transparent; border: 0; box-shadow: none;
}
.pxa-item button.pxa-icon:hover:not(:disabled) { background: #ffe1ec; }
.pxa-item button.pxa-danger:hover:not(:disabled) { background: #ffd0d8; }
.pxa-item button.pxa-icon:active:not(:disabled) { transform: none; }
svg[shape-rendering="crispEdges"] { display: block; image-rendering: pixelated; }
.pxa-cat { display: inline-block; vertical-align: -1px; }
.pxa-cat svg { display: inline-block; }
.pxa-empty { margin: 0; padding: 16px 12px; color: #5b5266; }
.pxa-panel footer { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; padding: 8px; border-top: 2px solid #1a1226; }
.pxa-panel footer .pxa-primary { background: #ff3e7f; color: #fff; }
.pxa-confirm { width: 100%; font-weight: 700; }

.pxa-toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); pointer-events: none;
  padding: 6px 12px; background: #1a1226; color: #fff; border: 2px solid #ff3e7f;
}

/* ── Equipe e Claude: erros, Desenho, importadas, Apresentação ── */
.pxa-errors { grid-column: 1 / -1; display: grid; gap: 4px; }
.pxa-errors-title { font-weight: 700; }
.pxa-errors ul { list-style: none; margin: 0; padding: 0; max-height: 96px; overflow-y: auto; border: 2px dotted #d8cfc0; }
.pxa-errors li { display: flex; align-items: center; gap: 4px; padding: 2px 4px; }
.pxa-errors li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pxa-errors button.pxa-icon { padding: 0 4px; border: 0; box-shadow: none; background: transparent; }
.pxa-errors button.pxa-icon:hover { background: #ffd0d8; }
.pxa-err { padding: 0 3px; background: #ff3e7f; color: #fff; font-weight: 700; }
.pxa-imported { font-weight: 400; color: #5b5266; }
.pxa-missing { font-weight: 400; color: #ff3e7f; }
.pxa-thumb { display: block; max-width: 100%; max-height: 64px; margin-top: 4px; border: 2px solid #1a1226; image-rendering: pixelated; }

.pxa-presenting .pxa-panel { display: none !important; }
.pxa-spot {
  position: fixed; z-index: 1; pointer-events: none; display: none;
  border: 2px dashed #ff3e7f; box-shadow: 0 0 0 100vmax rgba(26, 18, 38, .65);
}
.pxa-present {
  position: fixed; z-index: 2; left: 50%; bottom: 24px; transform: translateX(-50%); pointer-events: auto;
  width: min(560px, calc(100vw - 32px)); max-height: 70vh; overflow-y: auto; padding: 12px;
  display: grid; gap: 8px; font-size: 14px;
  background: #fffaf0; border: 2px solid #1a1226; box-shadow: 4px 4px 0 #1a1226;
}
.pxa-present header { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 16px; font-weight: 700; }
.pxa-present-count { color: #5b5266; }
.pxa-present-note { margin: 0; font-size: 18px; white-space: pre-wrap; overflow-wrap: anywhere; }
.pxa-present-warn { margin: 0; padding: 4px 8px; background: #ffe1ec; border: 2px solid #ff3e7f; }
.pxa-present-where { margin: 0; color: #5b5266; }
.pxa-present-shot { display: block; max-width: 100%; max-height: 40vh; border: 2px solid #1a1226; image-rendering: pixelated; }
.pxa-present footer { display: flex; justify-content: flex-end; gap: 6px; }

.pxa-draw {
  position: fixed; inset: 0; z-index: 4; pointer-events: auto;
  display: flex; align-items: center; justify-content: center; background: rgba(26, 18, 38, .6);
}
.pxa-draw-box {
  display: flex; flex-direction: column; gap: 8px; padding: 8px;
  max-width: calc(100vw - 32px); max-height: calc(100vh - 32px);
  background: #fffaf0; border: 2px solid #1a1226; box-shadow: 4px 4px 0 #1a1226;
}
.pxa-draw-bar, .pxa-draw-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.pxa-draw-actions { justify-content: flex-end; }
.pxa-draw-group { display: flex; gap: 2px; }
.pxa-draw-group button[aria-pressed="true"]:not(.pxa-swatch) { background: #ff3e7f; color: #fff; }
.pxa-swatch { width: 24px; height: 24px; padding: 0; }
.pxa-swatch[aria-pressed="true"] { outline: 2px solid #1a1226; outline-offset: 2px; }
.pxa-draw-canvas { overflow: auto; min-height: 0; }
.pxa-draw canvas {
  display: block; border: 2px solid #1a1226;
  image-rendering: pixelated; cursor: crosshair; touch-action: none;
}
.pxa-draw .pxa-primary { background: #ff3e7f; color: #fff; }
`
