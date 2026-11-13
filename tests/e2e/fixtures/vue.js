import { createApp, h } from 'vue'

// `__file` é o que o plugin de SFC injeta em dev; aqui é declarado à mão.
const ClienteCard = {
  name: 'ClienteCard',
  __file: 'src/components/ClienteCard.vue',
  props: ['nome'],
  render() {
    return h('div', { class: 'cliente-card' }, [h('span', this.nome), h('button', { type: 'button' }, 'Editar')])
  },
}
const CardList = {
  name: 'CardList',
  __file: 'src/components/CardList.vue',
  render: () => h('section', ['Ana', 'Bia'].map((nome) => h(ClienteCard, { nome, key: nome }))),
}
const App = { name: 'App', __file: 'src/App.vue', render: () => h('main', [h('h1', 'Vue'), h(CardList)]) }

createApp(App).mount('#app')
