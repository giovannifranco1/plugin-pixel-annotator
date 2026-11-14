// PLAT-01: os builds de produção declaram só activeTab + scripting + storage (Q-01, só para o Perfil), em MV3, sem host permissions nem content scripts estáticos.
import { readFileSync, existsSync } from 'node:fs'

const targets = ['.output/chrome-mv3/manifest.json', '.output/firefox-mv3/manifest.json']
const errors = []
for (const file of targets) {
  if (!existsSync(file)) { errors.push(`${file}: não encontrado (rode npm run build && npm run build:firefox)`); continue }
  const m = JSON.parse(readFileSync(file, 'utf8'))
  if (m.manifest_version !== 3) errors.push(`${file}: manifest_version ${m.manifest_version} (esperado 3)`)
  const perms = JSON.stringify([...(m.permissions ?? [])].sort())
  if (perms !== JSON.stringify(['activeTab', 'scripting', 'storage'])) errors.push(`${file}: permissions ${perms}`)
  if (m.host_permissions?.length) errors.push(`${file}: host_permissions ${JSON.stringify(m.host_permissions)}`)
  if (m.content_scripts?.length) errors.push(`${file}: content_scripts estáticos presentes`)
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('manifests ok: MV3, permissions [activeTab, scripting, storage], sem host_permissions/content_scripts')
