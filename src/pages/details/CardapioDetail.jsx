import React, { useState } from 'react';
import { Plus, Trash } from 'lucide-react';
import { apiRequest } from '../../api';
import { useToast } from '../../components/feedback';
import { Badge, EmptyState, ErrorState, IconButton, LoadingState, Modal, Spinner } from '../../components/ui';
import { enumLabel, formatCurrency, pluralize } from '../../format';
import { listOf, useApiData } from '../../hooks';

export default function CardapioDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const { data: cardapio, loading, error, reload } = useApiData(`/cardapios/${id}`);
  const produtosRequest = useApiData('/produtos');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState('');

  const noCardapio = cardapio?.produtos ?? [];
  const idsNoCardapio = new Set(noCardapio.map((produto) => produto.id));
  const candidatos = listOf(produtosRequest.data)
    .filter((produto) => !idsNoCardapio.has(produto.id))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  async function run(key, request, message) {
    setBusy(key);
    try {
      await request();
      toast.success(message);
      reload();
      onChanged?.();
      return true;
    } catch (requestError) {
      toast.error(requestError, 'Não foi possível concluir');
      return false;
    } finally {
      setBusy('');
    }
  }

  async function add(event) {
    event.preventDefault();
    const produto = candidatos.find((candidate) => String(candidate.id) === selected);
    const ok = await run('add', () => apiRequest(`/cardapios/${id}/produtos/${selected}`, { method: 'POST' }), `${produto?.nome ?? 'Produto'} incluído no cardápio.`);
    if (ok) setSelected('');
  }

  function remove(produto) {
    run(`rm:${produto.id}`, () => apiRequest(`/cardapios/${id}/produtos/${produto.id}`, { method: 'DELETE' }), `${produto.nome} retirado do cardápio.`);
  }

  let content;
  if (loading && !cardapio) {
    content = <LoadingState label="Carregando cardápio…" />;
  } else if (error && !cardapio) {
    content = <ErrorState error={error} onRetry={reload} />;
  } else if (cardapio) {
    content = (
      <>
        <form className="inline-add" onSubmit={add}>
          <div className="field">
            <label htmlFor="cardapio-produto">Incluir produto</label>
            <select
              id="cardapio-produto"
              required
              value={selected}
              disabled={produtosRequest.loading}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">
                {produtosRequest.loading ? 'Carregando…' : candidatos.length ? 'Selecione um produto' : 'Todos os produtos já estão no cardápio'}
              </option>
              {candidatos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} · {formatCurrency(produto.preco)}{produto.disponivel ? '' : ' (indisponível)'}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="button primary" disabled={busy !== '' || !selected}>
            {busy === 'add' ? <Spinner size={16} /> : <Plus size={16} aria-hidden="true" />} Incluir
          </button>
        </form>

        <section className="detail-section">
          <h3>No cardápio <span className="muted-text">{pluralize(noCardapio.length, 'produto', 'produtos')}</span></h3>
          {noCardapio.length === 0 ? (
            <EmptyState title="Cardápio vazio">Inclua produtos acima para que apareçam nesta aba do cardápio público.</EmptyState>
          ) : (
            <ul className="link-list">
              {noCardapio.map((produto) => (
                <li key={produto.id}>
                  <div>
                    <strong>{produto.nome}</strong>
                    <small>{enumLabel('categoria', produto.categoria)} · {formatCurrency(produto.preco)}</small>
                  </div>
                  {!produto.disponivel && <Badge tone="neutral">Indisponível</Badge>}
                  <IconButton
                    label={`Retirar ${produto.nome} do cardápio`}
                    icon={Trash}
                    tone="danger"
                    busy={busy === `rm:${produto.id}`}
                    disabled={busy !== ''}
                    onClick={() => remove(produto)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }

  return (
    <Modal title={cardapio?.nome ?? 'Cardápio'} description="Escolha quais produtos fazem parte deste cardápio." onClose={onClose}>
      {content}
    </Modal>
  );
}
