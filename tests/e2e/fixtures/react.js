import React from 'react'
import { createRoot } from 'react-dom/client'

const h = React.createElement

function ClienteCard({ nome }) {
  return h('div', { className: 'cliente-card', 'data-testid': `card-${nome}` },
    h('span', null, nome),
    h('div', { className: 'card-footer' }, h('button', { type: 'button' }, 'Editar')))
}
function ClienteList() {
  return h('section', null, ['Ana', 'Bia'].map((nome) => h(ClienteCard, { key: nome, nome })))
}
function Dashboard() {
  return h('main', null, h('h1', null, 'Dashboard'), h(ClienteList))
}
function App() {
  return h(Dashboard)
}

createRoot(document.getElementById('root')).render(h(App))
