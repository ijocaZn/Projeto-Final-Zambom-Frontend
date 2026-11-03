import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Armchair, ArrowRight, LayoutDashboard, Lock, Sparkles, Users, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../auth';
import { Brand, EmptyState, ErrorState, SlowServerHint } from '../components/ui';
import { CATEGORY_ORDER, CATEGORY_PLURAL, enumLabel, formatCurrency, humanize, pluralize } from '../format';
import { listOf, useApiMany, useDocumentTitle, useSlowFlag } from '../hooks';

const REQUESTS = { cardapios: '/cardapios', produtos: '/produtos', mesas: '/mesas' };

function groupByCategory(produtos) {
  const known = CATEGORY_ORDER.filter((categoria) => produtos.some((produto) => produto.categoria === categoria));
  const extra = [...new Set(produtos.map((produto) => produto.categoria))].filter((categoria) => !CATEGORY_ORDER.includes(categoria));
  return [...known, ...extra].map((categoria) => ({
    categoria,
    title: CATEGORY_PLURAL[categoria] ?? humanize(categoria ?? 'Outros'),
    items: produtos.filter((produto) => produto.categoria === categoria).sort((a, b) => a.nome.localeCompare(b.nome)),
  }));
}

function pickHighlight(produtos) {
  const pratos = produtos.filter((produto) => produto.categoria === 'PRATO_PRINCIPAL');
  const pool = pratos.length ? pratos : produtos;
  return [...pool].sort((a, b) => Number(b.preco) - Number(a.preco))[0] ?? null;
}

export default function PublicMenu({ section }) {
  useDocumentTitle('Cardápio');
  const { token } = useAuth();
  // Rotas públicas não enviam o token: um token vencido não deve impedir a leitura do cardápio.
  const { results, loading, reload } = useApiMany(REQUESTS, { auth: false });
  const firstLoad = loading && Object.keys(results).length === 0;
  const slow = useSlowFlag(firstLoad);
  const [menuId, setMenuId] = useState('all');
  const [category, setCategory] = useState('all');

  const cardapios = listOf(results.cardapios).filter((cardapio) => cardapio.produtos?.some((produto) => produto.disponivel));
  const activeMenu = cardapios.find((cardapio) => String(cardapio.id) === menuId);
  const source = activeMenu ? activeMenu.produtos : listOf(results.produtos);
  const available = source.filter((produto) => produto.disponivel !== false);
  const groups = groupByCategory(available);
  const activeCategory = groups.some((group) => group.categoria === category) ? category : 'all';
  const visibleGroups = activeCategory === 'all' ? groups : groups.filter((group) => group.categoria === activeCategory);
  const highlight = pickHighlight(listOf(results.produtos).filter((produto) => produto.disponivel));

  const mesas = [...listOf(results.mesas)].sort((a, b) => a.numero - b.numero);
  const livres = mesas.filter((mesa) => mesa.status === 'LIVRE');

  useEffect(() => {
    if (section && !firstLoad) document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [section, firstLoad]);

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-container public-header-inner">
          <Brand />
          <nav className="public-nav" aria-label="Seções">
            <a href="#cardapio">Cardápio</a>
            <a href="#mesas">Mesas</a>
          </nav>
          <Link className="button secondary small" to={token ? '/admin/dashboard' : '/admin'}>
            {token ? <LayoutDashboard size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
            <span>{token ? 'Ir para o painel' : 'Área restrita'}</span>
          </Link>
        </div>
      </header>

      <section className="public-hero">
        <div className="public-container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Cardápio digital</p>
            <h1>Boa comida, servida com calma e carinho.</h1>
            <p className="hero-lead">Conheça nossos pratos, escolha seus favoritos e veja quais mesas estão livres agora mesmo.</p>
            <div className="hero-stats">
              <span><UtensilsCrossed size={16} aria-hidden="true" /> {firstLoad ? '…' : pluralize(listOf(results.produtos).filter((p) => p.disponivel).length, 'opção no cardápio', 'opções no cardápio')}</span>
              <span><Armchair size={16} aria-hidden="true" /> {firstLoad ? '…' : pluralize(livres.length, 'mesa livre agora', 'mesas livres agora')}</span>
            </div>
            <div className="hero-actions">
              <a className="button primary large" href="#cardapio">Ver cardápio <ArrowRight size={17} aria-hidden="true" /></a>
              <a className="button secondary large" href="#mesas">Mesas disponíveis</a>
            </div>
          </div>
          <aside className="hero-card" aria-label="Sugestão da casa">
            <span className="hero-card-tag"><Sparkles size={14} aria-hidden="true" /> Sugestão da casa</span>
            {firstLoad ? (
              <div className="skeleton-stack">
                <span className="skeleton" style={{ width: '40%' }} />
                <span className="skeleton tall" style={{ width: '80%' }} />
                <span className="skeleton" style={{ width: '95%' }} />
                <span className="skeleton" style={{ width: '60%' }} />
              </div>
            ) : highlight ? (
              <>
                <small>{enumLabel('categoria', highlight.categoria)}</small>
                <h2>{highlight.nome}</h2>
                <p>{highlight.descricao || 'Uma receita especial da nossa cozinha, preparada na hora.'}</p>
                <strong>{formatCurrency(highlight.preco)}</strong>
              </>
            ) : (
              <>
                <h2>Cardápio em preparação</h2>
                <p>Nossa cozinha está organizando as opções do dia. Volte em instantes!</p>
              </>
            )}
            <span className="hero-card-ornament" aria-hidden="true" />
          </aside>
        </div>
      </section>

      <main className="public-container public-main">
        <section id="cardapio" className="menu-section" aria-labelledby="cardapio-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Nossas opções</p>
              <h2 id="cardapio-title">Cardápio</h2>
            </div>
            {!firstLoad && <span className="muted-text">{pluralize(available.length, 'item disponível', 'itens disponíveis')}</span>}
          </div>

          {firstLoad ? (
            <MenuSkeleton slow={slow} />
          ) : results.produtos?.error ? (
            <ErrorState title="Não foi possível carregar o cardápio" error={results.produtos.error} onRetry={reload} />
          ) : (
            <>
              {cardapios.length > 0 && (
                <div className="menu-tabs" role="group" aria-label="Escolha o cardápio">
                  <button type="button" aria-pressed={!activeMenu} className={!activeMenu ? 'is-active' : ''} onClick={() => setMenuId('all')}>
                    Todos os pratos
                  </button>
                  {cardapios.map((cardapio) => (
                    <button
                      key={cardapio.id}
                      type="button"
                      aria-pressed={activeMenu?.id === cardapio.id}
                      className={activeMenu?.id === cardapio.id ? 'is-active' : ''}
                      onClick={() => setMenuId(String(cardapio.id))}
                    >
                      {cardapio.nome}
                    </button>
                  ))}
                </div>
              )}

              {groups.length > 1 && (
                <div className="filter-chips category-chips" role="group" aria-label="Filtrar por categoria">
                  <button type="button" aria-pressed={activeCategory === 'all'} className={`chip ${activeCategory === 'all' ? 'is-active' : ''}`} onClick={() => setCategory('all')}>
                    Tudo
                  </button>
                  {groups.map((group) => (
                    <button
                      key={group.categoria}
                      type="button"
                      aria-pressed={activeCategory === group.categoria}
                      className={`chip ${activeCategory === group.categoria ? 'is-active' : ''}`}
                      onClick={() => setCategory(group.categoria)}
                    >
                      {group.title} <span>{group.items.length}</span>
                    </button>
                  ))}
                </div>
              )}

              {visibleGroups.length === 0 ? (
                <EmptyState icon={UtensilsCrossed} title="Nenhum item disponível no momento">
                  {activeMenu ? 'Este cardápio ainda não tem itens disponíveis.' : 'Volte mais tarde para conferir as novidades.'}
                </EmptyState>
              ) : (
                <div className="menu-groups">
                  {visibleGroups.map((group) => (
                    <section key={group.categoria} className="menu-group" aria-labelledby={`grupo-${group.categoria}`}>
                      <h3 id={`grupo-${group.categoria}`}>{group.title}</h3>
                      <ul className="menu-items">
                        {group.items.map((produto) => (
                          <li key={produto.id} className="menu-item">
                            <div className="menu-item-line">
                              <h4>{produto.nome}</h4>
                              <span className="menu-item-dots" aria-hidden="true" />
                              <strong>{formatCurrency(produto.preco)}</strong>
                            </div>
                            {produto.descricao && <p>{produto.descricao}</p>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section id="mesas" className="tables-section" aria-labelledby="mesas-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Conforto para você</p>
              <h2 id="mesas-title">Mesas agora</h2>
            </div>
            {!firstLoad && mesas.length > 0 && (
              <span className="muted-text">{livres.length} de {mesas.length} livres</span>
            )}
          </div>

          {firstLoad ? (
            <div className="public-tables">
              {Array.from({ length: 6 }, (_, index) => <span key={index} className="skeleton table-skeleton" />)}
            </div>
          ) : results.mesas?.error ? (
            <ErrorState title="Não foi possível consultar as mesas" error={results.mesas.error} onRetry={reload} />
          ) : mesas.length === 0 ? (
            <EmptyState icon={Armchair} title="Nenhuma mesa cadastrada ainda" />
          ) : (
            <ul className="public-tables">
              {mesas.map((mesa) => {
                const free = mesa.status === 'LIVRE';
                return (
                  <li key={mesa.id} className={`public-table ${free ? 'is-free' : 'is-busy'}`}>
                    <small>Mesa</small>
                    <strong>{mesa.numero}</strong>
                    <span><Users size={13} aria-hidden="true" /> {pluralize(mesa.capacidade, 'lugar', 'lugares')}</span>
                    <em>{free ? 'Livre' : 'Ocupada'}</em>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-container">
          <Brand />
          <p>Preços e disponibilidade atualizados em tempo real pela nossa equipe.</p>
          <Link to={token ? '/admin/dashboard' : '/admin'}>{token ? 'Ir para o painel' : 'Área restrita da equipe'}</Link>
        </div>
      </footer>
    </div>
  );
}

function MenuSkeleton({ slow }) {
  return (
    <div aria-busy="true" aria-label="Carregando cardápio">
      <div className="menu-groups">
        {[0, 1].map((group) => (
          <div key={group} className="menu-group">
            <span className="skeleton heading" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="skeleton-stack menu-skeleton-row">
                <span className="skeleton" style={{ width: '70%' }} />
                <span className="skeleton" style={{ width: '90%' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {slow && <SlowServerHint />}
    </div>
  );
}
