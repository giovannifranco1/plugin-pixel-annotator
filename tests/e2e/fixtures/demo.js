// Página demo para os prints do README (npm run screenshots). Componentes React sem JSX.
import React from 'react'
import { createRoot } from 'react-dom/client'

const h = React.createElement
const CLIENTES = [
  { nome: 'Ana Souza', plano: 'Pro · desde 2023' },
  { nome: 'Bruno Lima', plano: 'Starter · desde 2024' },
  { nome: 'Carla Dias', plano: 'Pro · desde 2022' },
]

function TopBar() {
  return h('header', { className: 'topbar' },
    h('div', { className: 'logo' }, 'acme', h('span', null, '.crm')),
    h('nav', { className: 'nav' }, h('span', null, 'Início'), h('span', null, 'Clientes'), h('span', null, 'Relatórios')),
    h('div', { className: 'avatar' }))
}
function StatCard({ valor, label }) {
  return h('div', { className: 'stat' }, h('b', null, valor), h('small', null, label))
}
function ClienteCard({ nome, plano }) {
  return h('article', { className: 'cliente-card', 'data-testid': 'cliente-card' },
    h('h3', null, nome),
    h('p', null, plano),
    h('div', { className: 'card-footer' }, h('button', null, 'Editar'), h('button', null, 'Ver histórico')))
}
function ClientesPage() {
  return h('main', null,
    h('div', { className: 'page-header' }, h('h1', null, 'Clientes'), h('button', { className: 'btn' }, '+ Novo cliente')),
    h('section', { className: 'stats' },
      h(StatCard, { valor: '128', label: 'clientes ativos' }),
      h(StatCard, { valor: 'R$ 42 mil', label: 'receita no mês' }),
      h(StatCard, { valor: '96%', label: 'retenção' })),
    h('section', { className: 'cards' }, CLIENTES.map((c) => h(ClienteCard, { key: c.nome, ...c }))))
}
function App() {
  return h(React.Fragment, null, h(TopBar), h(ClientesPage))
}

createRoot(document.getElementById('root')).render(h(App))
