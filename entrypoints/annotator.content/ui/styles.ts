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
`
