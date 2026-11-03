import React from 'react';
import {
  Armchair, Ban, BookOpen, CalendarDays, ChefHat, CreditCard, Link2, ListChecks, Percent, Receipt,
  ShoppingBasket, Store, ToggleLeft, ToggleRight, Undo2, Users, UtensilsCrossed,
} from 'lucide-react';
import { apiRequest } from './api';
import { Badge, StatusBadge } from './components/ui';
import {
  enumLabel, formatCpf, formatCurrency, formatDate, formatDateTime, nowDateTimeInput, pluralize, toDateTimeInput,
} from './format';

/*
 * Cada recurso descreve como listar, cadastrar e editar uma entidade da API.
 *
 * columns  -> { key, label, value(item) => texto (também usado na busca), render?(item), align? }
 * fields   -> { name, label, type, required, mode?: 'create' | 'edit', ... } (ver ResourceForm)
 * actions  -> ações extras por linha: { id, label, icon | iconFor(item), when?, confirm?(item), run(item, input), success(item) }
 * canEdit / canDelete -> true | false | "motivo exibido no botão desabilitado"
 */

const byIdDesc = (a, b) => b.id - a.id;
const strong = (text) => <strong className="cell-strong">{text}</strong>;
const twoLines = (main, sub) => (
  <span className="cell-stack">
    <strong>{main}</strong>
    {sub && <small>{sub}</small>}
  </span>
);
const mesaName = (mesa) => (mesa ? `Mesa ${mesa.numero}` : '—');

const sources = {
  mesasLivres: {
    path: '/mesas',
    label: (mesa) => `Mesa ${mesa.numero} · ${pluralize(mesa.capacidade, 'lugar', 'lugares')}`,
    // Ao trocar a mesa de um pedido, a mesa atual continua na lista.
    filter: (mesa, item) => mesa.status === 'LIVRE' || mesa.id === item?.mesa?.id,
    sort: (a, b) => a.numero - b.numero,
  },
  mesas: {
    path: '/mesas',
    label: (mesa) => `Mesa ${mesa.numero} · ${pluralize(mesa.capacidade, 'lugar', 'lugares')}`,
    sort: (a, b) => a.numero - b.numero,
  },
  clientes: {
    path: '/clientes',
    label: (cliente) => `${cliente.nome} · CPF ${formatCpf(cliente.cpf)}`,
    sort: (a, b) => a.nome.localeCompare(b.nome),
  },
  produtosDisponiveis: {
    path: '/produtos',
    label: (produto) => `${produto.nome} · ${formatCurrency(produto.preco)}`,
    filter: (produto, item) => produto.disponivel || produto.id === item?.idProduto,
    sort: (a, b) => a.nome.localeCompare(b.nome),
  },
  pedidosAbertos: {
    path: '/pedidos?status=ABERTO',
    label: (pedido) => `Pedido #${pedido.id} · ${mesaName(pedido.mesa)} · ${formatCurrency(pedido.total)}`,
  },
  pedidosParaPagar: {
    path: '/pedidos?status=ABERTO',
    label: (pedido) => `Pedido #${pedido.id} · ${mesaName(pedido.mesa)} · ${formatCurrency(pedido.total)}`,
    filter: (pedido) => pedido.itens?.length > 0,
  },
};

const pessoaFields = [
  { name: 'nome', label: 'Nome', required: true, maxLength: 100, placeholder: 'Nome completo' },
  { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 100, placeholder: 'nome@exemplo.com' },
  { name: 'telefone', label: 'Telefone', type: 'tel', required: true, maxLength: 20, placeholder: '(11) 99999-9999' },
];

export const RESOURCES = [
  {
    key: 'pedidos',
    label: 'Pedidos',
    singular: 'pedido',
    icon: Receipt,
    group: 'Operação',
    description: 'Abra pedidos por mesa, lance itens e feche a conta.',
    describe: (pedido) => `o pedido #${pedido.id}`,
    sort: byIdDesc,
    statusFilter: { field: 'status', group: 'statusPedido' },
    columns: [
      { key: 'id', label: 'Pedido', value: (p) => `#${p.id}`, render: (p) => strong(`#${p.id}`) },
      { key: 'mesa', label: 'Mesa', value: (p) => mesaName(p.mesa) },
      { key: 'dataHora', label: 'Aberto em', value: (p) => formatDateTime(p.dataHora) },
      { key: 'itens', label: 'Itens', value: (p) => pluralize(p.itens?.length ?? 0, 'item', 'itens') },
      { key: 'total', label: 'Total', align: 'right', value: (p) => formatCurrency(p.total), render: (p) => strong(formatCurrency(p.total)) },
      { key: 'status', label: 'Status', value: (p) => enumLabel('statusPedido', p.status), render: (p) => <StatusBadge value={p.status} group="statusPedido" /> },
    ],
    fields: [
      { name: 'idMesa', label: 'Mesa', type: 'relation', source: sources.mesasLivres, required: true, emptyText: 'Nenhuma mesa livre no momento' },
    ],
    toForm: (pedido) => ({ idMesa: pedido.mesa?.id ?? '' }),
    createTitle: 'Abrir pedido',
    createLabel: 'Abrir pedido',
    editTitle: 'Trocar mesa do pedido',
    editLabel: 'Trocar mesa',
    messages: {
      created: (pedido) => `Pedido #${pedido.id} aberto na mesa ${pedido.mesa?.numero}.`,
      updated: (pedido) => `Pedido #${pedido.id} transferido para a mesa ${pedido.mesa?.numero}.`,
    },
    canEdit: (p) => p.status === 'ABERTO' || 'Só é possível trocar a mesa de pedidos abertos',
    canDelete: (p) => p.idPagamento == null || 'Pedidos pagos não podem ser excluídos',
    detail: 'pedido',
    detailLabel: 'Ver itens e fechar conta',
    actions: [
      {
        id: 'cancelar',
        label: 'Cancelar pedido',
        icon: Ban,
        tone: 'danger',
        when: (p) => p.status === 'ABERTO',
        confirm: (p) => ({
          title: `Cancelar o pedido #${p.id}?`,
          message: `A ${mesaName(p.mesa).toLowerCase()} será liberada e o pedido não poderá mais receber itens.`,
          confirmLabel: 'Cancelar pedido',
          tone: 'danger',
        }),
        run: (p) => apiRequest(`/pedidos/${p.id}/cancelar`, { method: 'PATCH' }),
        success: (p) => `Pedido #${p.id} cancelado.`,
      },
    ],
  },
  {
    key: 'itens-pedido',
    label: 'Itens do pedido',
    singular: 'item',
    icon: ShoppingBasket,
    group: 'Operação',
    description: 'Todos os itens lançados nos pedidos.',
    describe: (item) => `o item ${item.nomeProduto} do pedido #${item.idPedido}`,
    sort: byIdDesc,
    columns: [
      { key: 'idPedido', label: 'Pedido', value: (i) => `#${i.idPedido}`, render: (i) => strong(`#${i.idPedido}`) },
      { key: 'produto', label: 'Produto', value: (i) => i.nomeProduto ?? '—' },
      { key: 'quantidade', label: 'Qtd.', align: 'right', value: (i) => String(i.quantidade) },
      { key: 'precoUnitario', label: 'Preço unit.', align: 'right', value: (i) => formatCurrency(i.precoUnitario) },
      { key: 'subtotal', label: 'Subtotal', align: 'right', value: (i) => formatCurrency(i.subtotal), render: (i) => strong(formatCurrency(i.subtotal)) },
      { key: 'observacao', label: 'Observação', value: (i) => i.observacao || '—' },
    ],
    fields: [
      { name: 'idPedido', label: 'Pedido', type: 'relation', source: sources.pedidosAbertos, required: true, mode: 'create', full: true, emptyText: 'Nenhum pedido aberto' },
      { name: 'idProduto', label: 'Produto', type: 'relation', source: sources.produtosDisponiveis, required: true, full: true, emptyText: 'Nenhum produto disponível' },
      { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, min: 1, step: 1, defaultValue: 1 },
      { name: 'observacao', label: 'Observação', maxLength: 255, placeholder: 'Ex.: sem cebola' },
    ],
    createPath: (body) => `/pedidos/${body.idPedido}/itens`,
    createTitle: 'Lançar item',
    createLabel: 'Lançar item',
  },
  {
    key: 'pagamentos',
    label: 'Pagamentos',
    singular: 'pagamento',
    icon: CreditCard,
    group: 'Operação',
    description: 'Pagamentos registrados. Registrar um pagamento fecha o pedido e libera a mesa.',
    describe: (p) => `o pagamento #${p.id}`,
    sort: byIdDesc,
    columns: [
      { key: 'id', label: 'Pagamento', value: (p) => `#${p.id}`, render: (p) => strong(`#${p.id}`) },
      { key: 'idPedido', label: 'Pedido', value: (p) => `#${p.idPedido}` },
      { key: 'valor', label: 'Valor', align: 'right', value: (p) => formatCurrency(p.valor), render: (p) => strong(formatCurrency(p.valor)) },
      { key: 'metodo', label: 'Método', value: (p) => enumLabel('metodo', p.metodo) },
      { key: 'dataHora', label: 'Data', value: (p) => formatDateTime(p.dataHora) },
      { key: 'status', label: 'Status', value: (p) => enumLabel('statusPagamento', p.status), render: (p) => <StatusBadge value={p.status} group="statusPagamento" /> },
    ],
    fields: [
      {
        name: 'idPedido',
        label: 'Pedido',
        type: 'relation',
        source: sources.pedidosParaPagar,
        required: true,
        mode: 'create',
        full: true,
        emptyText: 'Nenhum pedido aberto com itens',
        autofill: (pedido) => ({ valor: pedido.total }),
      },
      { name: 'valor', label: 'Valor (R$)', type: 'number', required: true, min: 0.01, step: 0.01, mode: 'create', hint: 'Preenchido com o total do pedido — precisa ser igual a ele.' },
      { name: 'metodo', label: 'Forma de pagamento', type: 'select', options: 'metodo', required: true },
    ],
    createTitle: 'Registrar pagamento',
    createLabel: 'Registrar pagamento',
    editTitle: 'Alterar forma de pagamento',
    editLabel: 'Alterar forma de pagamento',
    messages: {
      created: (p) => `Pagamento registrado. Pedido #${p.idPedido} fechado.`,
      updated: () => 'Forma de pagamento alterada.',
      deleted: (p) => `Pagamento estornado. O pedido #${p.idPedido} foi reaberto.`,
    },
    deleteLabel: 'Estornar pagamento',
    deleteIcon: Undo2,
    deleteConfirm: (p) => ({
      title: `Estornar o pagamento #${p.id}?`,
      message: `O pagamento de ${formatCurrency(p.valor)} será removido e o pedido #${p.idPedido} voltará a ficar aberto.`,
      confirmLabel: 'Estornar',
      tone: 'danger',
    }),
  },
  {
    key: 'reservas',
    label: 'Reservas',
    singular: 'reserva',
    female: true,
    icon: CalendarDays,
    group: 'Operação',
    description: 'Agende mesas para clientes. Cada reserva bloqueia a mesa por 2 horas.',
    describe: (r) => `a reserva de ${r.cliente?.nome ?? 'cliente'}`,
    sort: (a, b) => String(b.dataHora).localeCompare(String(a.dataHora)),
    statusFilter: { field: 'status', group: 'statusReserva' },
    columns: [
      { key: 'cliente', label: 'Cliente', value: (r) => r.cliente?.nome ?? '—', render: (r) => twoLines(r.cliente?.nome ?? '—', r.cliente?.telefone) },
      { key: 'mesa', label: 'Mesa', value: (r) => mesaName(r.mesa) },
      { key: 'dataHora', label: 'Data e hora', value: (r) => formatDateTime(r.dataHora) },
      { key: 'pessoas', label: 'Pessoas', align: 'right', value: (r) => String(r.quantidadePessoas) },
      { key: 'status', label: 'Status', value: (r) => enumLabel('statusReserva', r.status), render: (r) => <StatusBadge value={r.status} group="statusReserva" /> },
    ],
    fields: [
      { name: 'idCliente', label: 'Cliente', type: 'relation', source: sources.clientes, required: true, full: true, emptyText: 'Cadastre um cliente primeiro' },
      { name: 'idMesa', label: 'Mesa', type: 'relation', source: sources.mesas, required: true, emptyText: 'Cadastre uma mesa primeiro' },
      { name: 'quantidadePessoas', label: 'Pessoas', type: 'number', required: true, min: 1, step: 1, defaultValue: 2, hint: 'Não pode passar da capacidade da mesa.' },
      { name: 'dataHora', label: 'Data e hora', type: 'datetime', required: true, min: nowDateTimeInput, full: true },
    ],
    toForm: (r) => ({
      idCliente: r.cliente?.id ?? '',
      idMesa: r.mesa?.id ?? '',
      quantidadePessoas: r.quantidadePessoas ?? '',
      dataHora: toDateTimeInput(r.dataHora),
    }),
    canEdit: (r) => r.status === 'CONFIRMADA' || 'Só reservas confirmadas podem ser alteradas',
    actions: [
      {
        id: 'cancelar',
        label: 'Cancelar reserva',
        icon: Ban,
        tone: 'danger',
        when: (r) => r.status === 'CONFIRMADA',
        confirm: (r) => ({
          title: 'Cancelar reserva?',
          message: `A reserva de ${r.cliente?.nome} para ${formatDateTime(r.dataHora)} será cancelada.`,
          confirmLabel: 'Cancelar reserva',
          tone: 'danger',
        }),
        run: (r) => apiRequest(`/reservas/${r.id}/cancelar`, { method: 'PATCH' }),
        success: () => 'Reserva cancelada.',
      },
    ],
  },
  {
    key: 'mesas',
    label: 'Mesas',
    singular: 'mesa',
    female: true,
    icon: Armchair,
    group: 'Operação',
    description: 'Mesas do salão. O status muda sozinho ao abrir e fechar pedidos.',
    describe: (m) => `a mesa ${m.numero}`,
    sort: (a, b) => a.numero - b.numero,
    statusFilter: { field: 'status', group: 'statusMesa' },
    columns: [
      { key: 'numero', label: 'Mesa', value: (m) => mesaName(m), render: (m) => strong(mesaName(m)) },
      { key: 'capacidade', label: 'Capacidade', value: (m) => pluralize(m.capacidade, 'lugar', 'lugares') },
      { key: 'status', label: 'Status', value: (m) => enumLabel('statusMesa', m.status), render: (m) => <StatusBadge value={m.status} group="statusMesa" /> },
    ],
    fields: [
      { name: 'numero', label: 'Número', type: 'number', required: true, min: 1, step: 1, placeholder: 'Ex.: 12' },
      { name: 'capacidade', label: 'Capacidade (lugares)', type: 'number', required: true, min: 1, step: 1, placeholder: 'Ex.: 4' },
    ],
    canDelete: (m) => m.status !== 'OCUPADA' || 'Mesas ocupadas não podem ser excluídas',
    conflictMessage: 'Já existe uma mesa com este número.',
  },
  {
    key: 'produtos',
    label: 'Produtos',
    singular: 'produto',
    icon: UtensilsCrossed,
    group: 'Cardápio',
    description: 'Pratos e bebidas. Produtos indisponíveis somem do cardápio público.',
    describe: (p) => `o produto ${p.nome}`,
    sort: (a, b) => a.nome.localeCompare(b.nome),
    columns: [
      { key: 'nome', label: 'Produto', value: (p) => `${p.nome} ${p.descricao ?? ''}`, render: (p) => twoLines(p.nome, p.descricao) },
      { key: 'categoria', label: 'Categoria', value: (p) => enumLabel('categoria', p.categoria) },
      { key: 'preco', label: 'Preço', align: 'right', value: (p) => formatCurrency(p.preco), render: (p) => strong(formatCurrency(p.preco)) },
      {
        key: 'disponivel',
        label: 'Disponibilidade',
        value: (p) => (p.disponivel ? 'Disponível' : 'Indisponível'),
        render: (p) => <Badge tone={p.disponivel ? 'success' : 'neutral'}>{p.disponivel ? 'Disponível' : 'Indisponível'}</Badge>,
      },
    ],
    fields: [
      { name: 'nome', label: 'Nome', required: true, maxLength: 100, placeholder: 'Ex.: Risoto de cogumelos' },
      { name: 'categoria', label: 'Categoria', type: 'select', options: 'categoria', required: true },
      { name: 'preco', label: 'Preço (R$)', type: 'number', required: true, min: 0.01, step: 0.01, placeholder: '0,00' },
      { name: 'disponivel', label: 'Disponibilidade', type: 'switch', defaultValue: true, onLabel: 'Disponível no cardápio', offLabel: 'Indisponível' },
      { name: 'descricao', label: 'Descrição', type: 'textarea', maxLength: 255, full: true, placeholder: 'Ingredientes, modo de preparo, acompanhamentos…' },
    ],
    actions: [
      {
        id: 'disponibilidade',
        label: (p) => (p.disponivel ? 'Marcar como indisponível' : 'Marcar como disponível'),
        iconFor: (p) => (p.disponivel ? ToggleRight : ToggleLeft),
        run: (p) => apiRequest(`/produtos/${p.id}/disponibilidade?disponivel=${!p.disponivel}`, { method: 'PATCH' }),
        success: (p) => `${p.nome} agora está ${p.disponivel ? 'indisponível' : 'disponível'}.`,
      },
      {
        id: 'desconto',
        label: 'Aplicar desconto',
        icon: Percent,
        confirm: (p) => ({
          title: `Desconto em ${p.nome}`,
          message: `Preço atual: ${formatCurrency(p.preco)}. O novo preço substitui o atual.`,
          confirmLabel: 'Aplicar desconto',
          input: { label: 'Percentual de desconto', type: 'number', min: 0.01, max: 99.99, step: 0.01, suffix: '%', defaultValue: '10' },
        }),
        run: (p, percentual) => apiRequest(`/produtos/${p.id}/desconto?percentual=${encodeURIComponent(percentual)}`, { method: 'PATCH' }),
        success: (p, percentual) => `Desconto de ${percentual}% aplicado em ${p.nome}.`,
      },
    ],
  },
  {
    key: 'cardapios',
    label: 'Cardápios',
    singular: 'cardápio',
    icon: BookOpen,
    group: 'Cardápio',
    description: 'Monte cardápios agrupando produtos. Eles aparecem como abas no cardápio público.',
    describe: (c) => `o cardápio ${c.nome}`,
    sort: (a, b) => a.nome.localeCompare(b.nome),
    columns: [
      { key: 'nome', label: 'Cardápio', value: (c) => c.nome, render: (c) => strong(c.nome) },
      { key: 'quantidade', label: 'Produtos', value: (c) => pluralize(c.produtos?.length ?? 0, 'produto', 'produtos') },
      {
        key: 'preview',
        label: 'Inclui',
        value: (c) => (c.produtos ?? []).map((p) => p.nome).join(', ') || '—',
        render: (c) => <span className="cell-truncate">{(c.produtos ?? []).map((p) => p.nome).join(', ') || '—'}</span>,
      },
    ],
    fields: [
      { name: 'nome', label: 'Nome', required: true, maxLength: 100, full: true, placeholder: 'Ex.: Almoço executivo' },
    ],
    detail: 'cardapio',
    detailLabel: 'Gerenciar produtos',
    detailIcon: ListChecks,
  },
  {
    key: 'clientes',
    label: 'Clientes',
    singular: 'cliente',
    icon: Users,
    group: 'Cadastros',
    description: 'Clientes cadastrados para reservas.',
    describe: (c) => `o cliente ${c.nome}`,
    sort: (a, b) => a.nome.localeCompare(b.nome),
    columns: [
      { key: 'nome', label: 'Nome', value: (c) => `${c.nome} ${c.email}`, render: (c) => twoLines(c.nome, c.email) },
      { key: 'telefone', label: 'Telefone', value: (c) => c.telefone || '—' },
      { key: 'cpf', label: 'CPF', value: (c) => formatCpf(c.cpf) },
      { key: 'dataCadastro', label: 'Cliente desde', value: (c) => formatDate(c.dataCadastro) },
    ],
    fields: [
      ...pessoaFields,
      { name: 'cpf', label: 'CPF', required: true, digitsOnly: true, maxLength: 11, minLength: 11, pattern: '\\d{11}', inputMode: 'numeric', placeholder: 'Somente números', hint: '11 dígitos — pode colar com pontos e traço.' },
    ],
    conflictMessage: 'Já existe um cliente cadastrado com este CPF.',
  },
  {
    key: 'funcionarios',
    label: 'Funcionários',
    singular: 'funcionário',
    icon: ChefHat,
    group: 'Cadastros',
    description: 'Equipe do restaurante.',
    describe: (f) => `o funcionário ${f.nome}`,
    sort: (a, b) => a.nome.localeCompare(b.nome),
    statusFilter: { field: 'cargo', group: 'cargo', label: 'Cargo' },
    columns: [
      { key: 'nome', label: 'Nome', value: (f) => `${f.nome} ${f.email}`, render: (f) => twoLines(f.nome, f.email) },
      { key: 'cargo', label: 'Cargo', value: (f) => enumLabel('cargo', f.cargo), render: (f) => <Badge tone="info">{enumLabel('cargo', f.cargo)}</Badge> },
      { key: 'telefone', label: 'Telefone', value: (f) => f.telefone || '—' },
    ],
    fields: [
      ...pessoaFields,
      { name: 'cargo', label: 'Cargo', type: 'select', options: 'cargo', required: true },
    ],
  },
  {
    key: 'restaurantes',
    label: 'Restaurantes',
    singular: 'restaurante',
    icon: Store,
    group: 'Cadastros',
    description: 'Unidades, com cardápio, mesas e equipe vinculados.',
    describe: (r) => `o restaurante ${r.nome}`,
    sort: (a, b) => a.nome.localeCompare(b.nome),
    columns: [
      { key: 'nome', label: 'Restaurante', value: (r) => `${r.nome} ${r.endereco}`, render: (r) => twoLines(r.nome, r.endereco) },
      { key: 'telefone', label: 'Telefone', value: (r) => r.telefone || '—' },
      { key: 'cardapio', label: 'Cardápio', value: (r) => r.cardapio?.nome ?? '—' },
      { key: 'mesas', label: 'Mesas', value: (r) => pluralize(r.mesas?.length ?? 0, 'mesa', 'mesas') },
      { key: 'funcionarios', label: 'Equipe', value: (r) => pluralize(r.funcionarios?.length ?? 0, 'pessoa', 'pessoas') },
    ],
    fields: [
      { name: 'nome', label: 'Nome', required: true, maxLength: 100, placeholder: 'Ex.: Unidade Centro' },
      { name: 'telefone', label: 'Telefone', type: 'tel', required: true, maxLength: 20, placeholder: '(11) 3333-3333' },
      { name: 'endereco', label: 'Endereço', required: true, maxLength: 255, full: true, placeholder: 'Rua, número, bairro, cidade' },
    ],
    detail: 'restaurante',
    detailLabel: 'Gerenciar cardápio, mesas e equipe',
    detailIcon: Link2,
  },
];

export const RESOURCES_BY_KEY = Object.fromEntries(RESOURCES.map((resource) => [resource.key, resource]));

export const NAV_GROUPS = ['Operação', 'Cardápio', 'Cadastros'].map((group) => ({
  label: group,
  items: RESOURCES.filter((resource) => resource.group === group),
}));

/** Mensagens com o gênero certo: "Mesa cadastrada", "Pedido cadastrado". */
export function resourceMessage(resource, kind, item) {
  const custom = resource.messages?.[kind];
  if (custom) return typeof custom === 'function' ? custom(item) : custom;
  const ending = resource.female ? 'a' : 'o';
  const name = resource.singular.charAt(0).toUpperCase() + resource.singular.slice(1);
  const verbs = { created: 'cadastrad', updated: 'atualizad', deleted: 'excluíd' };
  return `${name} ${verbs[kind]}${ending} com sucesso.`;
}

export function newLabel(resource) {
  return resource.createLabel ?? `${resource.female ? 'Nova' : 'Novo'} ${resource.singular}`;
}
