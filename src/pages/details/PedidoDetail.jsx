import React, { useState } from 'react';
import { Ban, Minus, Plus, Trash, Wallet } from 'lucide-react';
import { apiRequest } from '../../api';
import { useConfirm, useToast } from '../../components/feedback';
import { EmptyState, ErrorState, IconButton, LoadingState, Modal, Spinner, StatusBadge } from '../../components/ui';
import { enumLabel, enumOptions, formatCurrency, formatDateTime, pluralize } from '../../format';
import { listOf, useApiData } from '../../hooks';

const EMPTY_DRAFT = { idProduto: '', quantidade: '1', observacao: '' };

export default function PedidoDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: pedido, loading, error, reload } = useApiData(`/pedidos/${id}`);
  const produtosRequest = useApiData('/produtos?disponivel=true');
  const produtos = [...listOf(produtosRequest.data)].sort((a, b) => a.nome.localeCompare(b.nome));
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [metodo, setMetodo] = useState('PIX');
  const [busy, setBusy] = useState('');

  const aberto = pedido?.status === 'ABERTO';
  const itens = pedido?.itens ?? [];

  async function run(key, request, successMessage) {
    setBusy(key);
    try {
      await request();
      if (successMessage) toast.success(successMessage);
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

  async function addItem(event) {
    event.preventDefault();
    const produto = produtos.find((candidate) => String(candidate.id) === draft.idProduto);
    const ok = await run('add', () => apiRequest(`/pedidos/${id}/itens`, {
      method: 'POST',
      body: {
        idProduto: Number(draft.idProduto),
        quantidade: Number(draft.quantidade),
        observacao: draft.observacao.trim() || null,
      },
    }), `${produto?.nome ?? 'Item'} adicionado ao pedido.`);
    if (ok) setDraft(EMPTY_DRAFT);
  }

  function changeQuantity(item, delta) {
    run(`qty:${item.id}`, () => apiRequest(`/itens-pedido/${item.id}`, {
      method: 'PUT',
      body: { idProduto: item.idProduto, quantidade: item.quantidade + delta, observacao: item.observacao },
    }));
  }

  async function removeItem(item) {
    const ok = await confirm({
      title: `Remover ${item.nomeProduto}?`,
      message: 'O item sairá do pedido e o total será recalculado.',
      confirmLabel: 'Remover item',
      tone: 'danger',
    });
    if (ok) run(`rm:${item.id}`, () => apiRequest(`/itens-pedido/${item.id}`, { method: 'DELETE' }), 'Item removido.');
  }

  async function pay() {
    const ok = await confirm({
      title: `Receber ${formatCurrency(pedido.total)}?`,
      message: `Pagamento em ${enumLabel('metodo', metodo).toLowerCase()}. O pedido será fechado e a mesa ${pedido.mesa?.numero} ficará livre.`,
      confirmLabel: 'Confirmar pagamento',
    });
    if (ok) {
      run('pay', () => apiRequest('/pagamentos', {
        method: 'POST',
        body: { idPedido: id, valor: pedido.total, metodo },
      }), `Pagamento registrado. Pedido #${id} fechado.`);
    }
  }

  async function cancel() {
    const ok = await confirm({
      title: `Cancelar o pedido #${id}?`,
      message: `A mesa ${pedido.mesa?.numero} será liberada e o pedido não poderá mais receber itens.`,
      confirmLabel: 'Cancelar pedido',
      tone: 'danger',
    });
    if (ok) run('cancel', () => apiRequest(`/pedidos/${id}/cancelar`, { method: 'PATCH' }), `Pedido #${id} cancelado.`);
  }

  let content;
  if (loading && !pedido) {
    content = <LoadingState label="Carregando pedido…" />;
  } else if (error && !pedido) {
    content = <ErrorState error={error} onRetry={reload} />;
  } else if (pedido) {
    content = (
      <>
        <div className="detail-summary">
          <div>
            <span>Mesa</span>
            <strong>{pedido.mesa?.numero ?? '—'}</strong>
          </div>
          <div>
            <span>Aberto em</span>
            <strong>{formatDateTime(pedido.dataHora)}</strong>
          </div>
          <div>
            <span>Status</span>
            <StatusBadge value={pedido.status} group="statusPedido" />
          </div>
          <div className="detail-total">
            <span>Total</span>
            <strong>{formatCurrency(pedido.total)}</strong>
          </div>
        </div>

        <section className="detail-section">
          <h3>Itens <span className="muted-text">{pluralize(itens.length, 'item', 'itens')}</span></h3>
          {itens.length === 0 ? (
            <EmptyState title="Nenhum item lançado">
              {aberto ? 'Adicione produtos abaixo para montar o pedido.' : 'Este pedido não recebeu itens.'}
            </EmptyState>
          ) : (
            <ul className="order-items">
              {itens.map((item) => (
                <li key={item.id}>
                  <div className="order-item-main">
                    <strong>{item.nomeProduto}</strong>
                    <small>
                      {formatCurrency(item.precoUnitario)} cada
                      {item.observacao && <> · <em>{item.observacao}</em></>}
                    </small>
                  </div>
                  {aberto ? (
                    <div className="stepper" role="group" aria-label={`Quantidade de ${item.nomeProduto}`}>
                      <IconButton
                        label="Diminuir quantidade"
                        icon={Minus}
                        disabled={item.quantidade <= 1 || busy !== ''}
                        busy={busy === `qty:${item.id}`}
                        onClick={() => changeQuantity(item, -1)}
                      />
                      <span aria-live="polite">{item.quantidade}</span>
                      <IconButton label="Aumentar quantidade" icon={Plus} disabled={busy !== ''} onClick={() => changeQuantity(item, 1)} />
                    </div>
                  ) : (
                    <span className="order-item-qty">{item.quantidade}×</span>
                  )}
                  <strong className="order-item-subtotal">{formatCurrency(item.subtotal)}</strong>
                  {aberto && (
                    <IconButton
                      label={`Remover ${item.nomeProduto}`}
                      icon={Trash}
                      tone="danger"
                      busy={busy === `rm:${item.id}`}
                      disabled={busy !== ''}
                      onClick={() => removeItem(item)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {aberto && (
          <form className="detail-section add-item-form" onSubmit={addItem}>
            <h3>Adicionar item</h3>
            <div className="add-item-grid">
              <div className="field">
                <label htmlFor="novo-item-produto">Produto</label>
                <select
                  id="novo-item-produto"
                  required
                  value={draft.idProduto}
                  disabled={produtosRequest.loading}
                  onChange={(event) => setDraft({ ...draft, idProduto: event.target.value })}
                >
                  <option value="">{produtosRequest.loading ? 'Carregando…' : produtos.length ? 'Selecione um produto' : 'Nenhum produto disponível'}</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>{produto.nome} · {formatCurrency(produto.preco)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="novo-item-qtd">Qtd.</label>
                <input
                  id="novo-item-qtd"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={draft.quantidade}
                  onChange={(event) => setDraft({ ...draft, quantidade: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="novo-item-obs">Observação</label>
                <input
                  id="novo-item-obs"
                  maxLength={255}
                  placeholder="Opcional"
                  value={draft.observacao}
                  onChange={(event) => setDraft({ ...draft, observacao: event.target.value })}
                />
              </div>
              <button type="submit" className="button secondary" disabled={busy !== ''}>
                {busy === 'add' ? <Spinner size={16} /> : <Plus size={16} aria-hidden="true" />} Adicionar
              </button>
            </div>
          </form>
        )}

        {aberto ? (
          <footer className="checkout">
            <div className="field">
              <label htmlFor="pedido-metodo">Forma de pagamento</label>
              <select id="pedido-metodo" value={metodo} onChange={(event) => setMetodo(event.target.value)}>
                {enumOptions('metodo').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="checkout-actions">
              <button type="button" className="button ghost danger-text" onClick={cancel} disabled={busy !== ''}>
                {busy === 'cancel' ? <Spinner size={16} /> : <Ban size={16} aria-hidden="true" />} Cancelar pedido
              </button>
              <button
                type="button"
                className="button primary"
                onClick={pay}
                disabled={busy !== '' || itens.length === 0}
                title={itens.length === 0 ? 'Adicione itens antes de fechar a conta' : undefined}
              >
                {busy === 'pay' ? <Spinner size={16} /> : <Wallet size={16} aria-hidden="true" />}
                Fechar conta · {formatCurrency(pedido.total)}
              </button>
            </div>
          </footer>
        ) : (
          <p className="detail-note">
            {pedido.status === 'FECHADO'
              ? `Conta fechada${pedido.idPagamento ? ` (pagamento #${pedido.idPagamento})` : ''}. Para reabrir, estorne o pagamento na tela de Pagamentos.`
              : 'Pedido cancelado. Ele não pode mais ser alterado.'}
          </p>
        )}
      </>
    );
  }

  return (
    <Modal title={`Pedido #${id}`} size="lg" onClose={onClose}>
      {content}
    </Modal>
  );
}
