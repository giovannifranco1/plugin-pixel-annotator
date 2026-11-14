// Porta do servidor de fixtures. Configurável para rodar E2E em vários worktrees ao mesmo tempo sem um reaproveitar o servidor do outro.
export const PORT = Number(process.env.PXA_E2E_PORT ?? 5174)
