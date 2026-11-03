import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Armchair, CalendarDays, Plus, Receipt, RefreshCw, Users, Wallet } from 'lucide-react';
import { useAuth } from '../auth';
import { EmptyState, ErrorState, IconButton, LoadingState, StatusBadge } from '../components/ui';
import {
  formatCurrency, formatShortDateTime, formatTime, formatToday, greeting, parseLocalDateTime, pluralize,
} from '../format';
import { listOf, useApiMany, useDocumentTitle, useSlowFlag } from '../hooks';

const REQUESTS = {
  pedidos: '/pedidos',
  mesas: '/mesas',
  pagamentos: '/pagamentos',
  reservas: '/reservas',
};

export default function Dashboard() {
  useDocumentTitle('Visão geral');
  const { email } = useAuth();
  const { results, loading, reload } = useApiMany(REQUESTS);
  const firstLoad = loading && Object.keys(results).length === 0;
  const slow = useSlowFlag(firstLoad);

  const pedidos = listOf(results.pedidos);
  const mesas = [...listOf(results.mesas)].sort((a, b) => a.numero - b.numero);
  const pagamentos = listOf(results.pagamentos);
  const reservas = listOf(results.reservas);

  const abertos = pedidos.filter((pedido) => pedido.status === 'ABERTO').sort((a, b) => b.id - a.id);
  const emAberto = abertos.reduce((sum, pedido) => sum + Number(pedido.total ?? 0), 0);
  const livres = mesas.filter((mesa) => mesa.status === 'LIVRE').length;
  const pagos = pagamentos.filter((pagamento) => pagamento.status === 'PAGO');
  const faturamento = pagos.reduce((sum, pagamento) => sum + Number(pagamento.valor ?? 0), 0);
  const now = Date.now();
  const proximas = reservas
    .filter((reserva) => reserva.status === 'CONFIRMADA' && (parseLocalDateTime(reserva.dataHora)?.getTime() ?? 0) >= now)
    .sort((a, b) => String(a.dataHora).localeCompare(String(b.dataHora)));

  const name = email ? email.split('@')[0] : '';

  const stats = [
    {
      key: 'pedidos',
      icon: Receipt,
      label: 'Pedidos em aberto',
      value: abertos.length,
      hint: abertos.length ? `${formatCurrency(emAberto)} a receber` : 'Nenhuma conta aberta',
      to: '/admin/pedidos',
    },
    {
      key: 'mesas',
      icon: Armchair,
      label: 'Mesas livres',
      value: mesas.length ? `${livres}/${mesas.length}` : '0',
      hint: mesas.length ? `${pluralize(mesas.length - livres, 'ocupada', 'ocupadas')}` : 'Nenhuma mesa cadastrada',
      to: '/admin/mesas',
    },
    {
      key: 'pagamentos',
      icon: Wallet,
      label: 'Faturamento',
      value: formatCurrency(faturamento),
      hint: pluralize(pagos.length, 'pagamento recebido', 'pagamentos recebidos'),
      to: '/admin/pagamentos',
    },
    {
      key: 'reservas',
      icon: CalendarDays,
      label: 'Próximas reservas',
      value: proximas.length,
      hint: proximas[0] ? `Próxima: ${formatShortDateTime(proximas[0].dataHora)}` : 'Agenda livre',
      to: '/admin/reservas',
    },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{formatToday()}</p>
          <h1>{greeting()}{name ? `, ${name}` : ''}!</h1>
          <p className="page-description">Um resumo do salão agora: contas abertas, mesas, faturamento e reservas.</p>
        </div>
        <div className="page-actions">
          <IconButton label="Atualizar painel" icon={RefreshCw} busy={loading && !firstLoad} onClick={reload} />
          <Link className="button secondary" to="/admin/reservas?novo=1"><CalendarDays size={17} aria-hidden="true" /> Nova reserva</Link>
          <Link className="button primary" to="/admin/pedidos?novo=1"><Plus size={17} aria-hidden="true" /> Abrir pedido</Link>
        </div>
      </header>

      {firstLoad ? (
        <div className="card"><LoadingState label="Carregando o painel…" slow={slow} /></div>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map(({ key, icon: Icon, label, value, hint, to }) => (
              <Link key={key} to={to} className="stat-card">
                <span className="stat-icon"><Icon size={20} aria-hidden="true" /></span>
                <span className="stat-label">{label}</span>
                <strong className="stat-value">{results[key]?.error ? '—' : value}</strong>
                <span className="stat-hint">{results[key]?.error ? 'Não foi possível carregar' : hint}</span>
              </Link>
            ))}
          </div>

          <div className="dashboard-grid">
            <Panel
              title="Contas em aberto"
              to="/admin/pedidos"
              error={results.pedidos?.error}
              onRetry={reload}
              className="span-2"
            >
              {abertos.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Nenhum pedido em aberto"
                  action={<Link className="button primary small" to="/admin/pedidos?novo=1"><Plus size={16} aria-hidden="true" /> Abrir pedido</Link>}
                >
                  Quando uma mesa fizer um pedido, ele aparece aqui.
                </EmptyState>
              ) : (
                <ul className="activity-list">
                  {abertos.slice(0, 6).map((pedido) => (
                    <li key={pedido.id}>
                      <span className="activity-badge">{pedido.mesa?.numero ?? '?'}</span>
                      <div>
                        <strong>Mesa {pedido.mesa?.numero} · Pedido #{pedido.id}</strong>
                        <small>Aberto às {formatTime(pedido.dataHora)} · {pluralize(pedido.itens?.length ?? 0, 'item', 'itens')}</small>
                      </div>
                      <strong className="activity-value">{formatCurrency(pedido.total)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Mapa de mesas" to="/admin/mesas" error={results.mesas?.error} onRetry={reload}>
              {mesas.length === 0 ? (
                <EmptyState icon={Armchair} title="Nenhuma mesa cadastrada" action={<Link className="button secondary small" to="/admin/mesas?novo=1">Cadastrar mesa</Link>} />
              ) : (
                <>
                  <ul className="table-map">
                    {mesas.map((mesa) => (
                      <li key={mesa.id} className={mesa.status === 'LIVRE' ? 'is-free' : 'is-busy'} title={`Mesa ${mesa.numero} · ${mesa.status === 'LIVRE' ? 'livre' : 'ocupada'}`}>
                        <strong>{mesa.numero}</strong>
                        <small><Users size={11} aria-hidden="true" /> {mesa.capacidade}</small>
                      </li>
                    ))}
                  </ul>
                  <div className="legend">
                    <span><i className="dot is-free" /> Livre</span>
                    <span><i className="dot is-busy" /> Ocupada</span>
                  </div>
                </>
              )}
            </Panel>

            <Panel title="Próximas reservas" to="/admin/reservas" error={results.reservas?.error} onRetry={reload} className="span-3">
              {proximas.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Nenhuma reserva futura"
                  action={<Link className="button secondary small" to="/admin/reservas?novo=1">Nova reserva</Link>}
                />
              ) : (
                <ul className="reservation-list">
                  {proximas.slice(0, 6).map((reserva) => (
                    <li key={reserva.id}>
                      <time dateTime={reserva.dataHora}>{formatShortDateTime(reserva.dataHora)}</time>
                      <div>
                        <strong>{reserva.cliente?.nome}</strong>
                        <small>Mesa {reserva.mesa?.numero} · {pluralize(reserva.quantidadePessoas, 'pessoa', 'pessoas')}</small>
                      </div>
                      <StatusBadge value={reserva.status} group="statusReserva" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Panel({ title, to, error, onRetry, className = '', children }) {
  return (
    <section className={`card panel ${className}`}>
      <header className="panel-header">
        <h2>{title}</h2>
        <Link to={to} className="panel-link">Ver tudo <ArrowRight size={15} aria-hidden="true" /></Link>
      </header>
      {error ? <ErrorState error={error} onRetry={onRetry} /> : children}
    </section>
  );
}
