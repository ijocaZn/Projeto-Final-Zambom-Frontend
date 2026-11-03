import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, Pencil, Plus, RefreshCw, Search, SearchX, Trash } from 'lucide-react';
import { apiRequest } from '../api';
import { useConfirm, useToast } from '../components/feedback';
import { EmptyState, ErrorState, IconButton, LoadingState, PageHeader } from '../components/ui';
import { enumOptions, normalizeText, pluralize } from '../format';
import { listOf, useApiData, useDocumentTitle, useSlowFlag } from '../hooks';
import { RESOURCES_BY_KEY, newLabel, resourceMessage } from '../resources';
import ResourceForm from './ResourceForm';
import CardapioDetail from './details/CardapioDetail';
import PedidoDetail from './details/PedidoDetail';
import RestauranteDetail from './details/RestauranteDetail';

const DETAILS = { pedido: PedidoDetail, cardapio: CardapioDetail, restaurante: RestauranteDetail };

export default function ResourcePage() {
  const { resource: key } = useParams();
  const resource = RESOURCES_BY_KEY[key];
  if (!resource) return <Navigate to="/admin/dashboard" replace />;
  // `key` recria a página ao trocar de recurso, limpando busca, filtros e formulários abertos.
  return <ResourceView key={resource.key} resource={resource} />;
}

/** `true` libera; `false` esconde; texto desabilita o botão e explica o motivo. */
function permission(rule, item) {
  const result = rule ? rule(item) : true;
  return { allowed: result === true, hidden: result === false, reason: typeof result === 'string' ? result : undefined };
}

function ResourceView({ resource }) {
  useDocumentTitle(resource.label);
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error, reload } = useApiData(`/${resource.key}`);
  const slow = useSlowFlag(loading && data == null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editor, setEditor] = useState(() => (searchParams.get('novo') === '1' ? { item: null } : null));
  const [detailId, setDetailId] = useState(null);
  const [pending, setPending] = useState(null);

  // Links como /admin/pedidos?novo=1 abrem o formulário direto; o parâmetro é limpo em seguida.
  useEffect(() => {
    if (searchParams.has('novo')) setSearchParams({}, { replace: true });
  }, []);

  const items = useMemo(() => {
    const list = [...listOf(data)];
    return resource.sort ? list.sort(resource.sort) : list;
  }, [data, resource]);

  const filter = resource.statusFilter;
  const statusCounts = useMemo(() => {
    if (!filter) return {};
    return items.reduce((counts, item) => {
      counts[item[filter.field]] = (counts[item[filter.field]] ?? 0) + 1;
      return counts;
    }, {});
  }, [items, filter]);

  const visibleItems = useMemo(() => {
    const term = normalizeText(query.trim());
    return items.filter((item) => {
      if (filter && statusFilter !== 'all' && item[filter.field] !== statusFilter) return false;
      if (!term) return true;
      return normalizeText(resource.columns.map((column) => column.value(item)).join(' ')).includes(term);
    });
  }, [items, query, statusFilter, filter, resource]);

  async function withPending(id, task) {
    setPending(id);
    try {
      await task();
    } finally {
      setPending(null);
    }
  }

  async function handleDelete(item) {
    const options = resource.deleteConfirm?.(item) ?? {
      title: `Excluir ${resource.describe(item)}?`,
      message: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      tone: 'danger',
    };
    if (!(await confirm(options))) return;
    await withPending(`${item.id}:delete`, async () => {
      try {
        await apiRequest(`/${resource.key}/${item.id}`, { method: 'DELETE' });
        toast.success(resourceMessage(resource, 'deleted', item));
        reload();
      } catch (requestError) {
        toast.error(requestError, 'Não foi possível concluir');
      }
    });
  }

  async function handleAction(item, action) {
    let input;
    if (action.confirm) {
      const answer = await confirm(action.confirm(item));
      if (answer === false || answer === null) return;
      input = answer;
    }
    await withPending(`${item.id}:${action.id}`, async () => {
      try {
        await action.run(item, input);
        toast.success(action.success(item, input));
        reload();
      } catch (requestError) {
        toast.error(requestError, 'Não foi possível concluir');
      }
    });
  }

  function handleSaved(saved, isEdit) {
    setEditor(null);
    toast.success(resourceMessage(resource, isEdit ? 'updated' : 'created', saved));
    reload();
  }

  const Detail = resource.detail ? DETAILS[resource.detail] : null;
  const hasFilters = query.trim() !== '' || statusFilter !== 'all';

  let body;
  if (loading && data == null) {
    body = <LoadingState label={`Carregando ${resource.label.toLowerCase()}…`} slow={slow} />;
  } else if (error && data == null) {
    body = <ErrorState error={error} onRetry={reload} />;
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon={resource.icon}
        title={`Nenhum${resource.female ? 'a' : ''} ${resource.singular} por aqui ainda`}
        action={(
          <button type="button" className="button primary small" onClick={() => setEditor({ item: null })}>
            <Plus size={16} aria-hidden="true" /> {newLabel(resource)}
          </button>
        )}
      >
        {resource.description}
      </EmptyState>
    );
  } else if (visibleItems.length === 0) {
    body = (
      <EmptyState icon={SearchX} title="Nenhum resultado para os filtros atuais">
        <button type="button" className="link-button" onClick={() => { setQuery(''); setStatusFilter('all'); }}>
          Limpar filtros
        </button>
      </EmptyState>
    );
  } else {
    body = (
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {resource.columns.map((column) => (
                <th key={column.key} scope="col" className={column.align === 'right' ? 'align-right' : undefined}>
                  {column.label}
                </th>
              ))}
              <th scope="col" className="actions-col"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                {resource.columns.map((column) => (
                  <td key={column.key} data-label={column.label} className={column.align === 'right' ? 'align-right' : undefined}>
                    {column.render ? column.render(item) : column.value(item)}
                  </td>
                ))}
                <td className="row-actions">
                  <RowActions
                    resource={resource}
                    item={item}
                    pending={pending}
                    onDetail={() => setDetailId(item.id)}
                    onEdit={() => setEditor({ item })}
                    onDelete={() => handleDelete(item)}
                    onAction={(action) => handleAction(item, action)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        icon={resource.icon}
        eyebrow={resource.group}
        title={resource.label}
        description={resource.description}
        actions={(
          <button type="button" className="button primary" onClick={() => setEditor({ item: null })}>
            <Plus size={17} aria-hidden="true" /> {newLabel(resource)}
          </button>
        )}
      />

      <section className="card table-card" aria-label={`Lista de ${resource.label.toLowerCase()}`}>
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Buscar</span>
            <input
              type="search"
              placeholder={`Buscar ${resource.label.toLowerCase()}…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {filter && items.length > 0 && (
            <div className="filter-chips" role="group" aria-label={`Filtrar por ${filter.label ?? 'status'}`}>
              <button type="button" className={`chip ${statusFilter === 'all' ? 'is-active' : ''}`} aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                Todos <span>{items.length}</span>
              </button>
              {enumOptions(filter.group).filter((option) => statusCounts[option.value]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip ${statusFilter === option.value ? 'is-active' : ''}`}
                  aria-pressed={statusFilter === option.value}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label} <span>{statusCounts[option.value]}</span>
                </button>
              ))}
            </div>
          )}

          <div className="toolbar-end">
            {items.length > 0 && (
              <span className="muted-text">
                {hasFilters ? `${visibleItems.length} de ${items.length}` : pluralize(items.length, 'registro', 'registros')}
              </span>
            )}
            <IconButton label="Atualizar lista" icon={RefreshCw} busy={loading && data != null} onClick={reload} />
          </div>
        </div>
        {error && data != null && (
          <p className="inline-error" role="alert">Falha ao atualizar: {error.message}</p>
        )}
        {body}
      </section>

      {editor && (
        <ResourceForm
          resource={resource}
          item={editor.item}
          // `key` garante um formulário novo ao trocar de registro (evita salvar dados de outro item).
          key={editor.item?.id ?? 'new'}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}

      {Detail && detailId != null && (
        <Detail id={detailId} onClose={() => setDetailId(null)} onChanged={reload} />
      )}
    </div>
  );
}

function RowActions({ resource, item, pending, onDetail, onEdit, onDelete, onAction }) {
  const edit = permission(resource.canEdit, item);
  const remove = permission(resource.canDelete, item);
  const busy = (id) => pending === `${item.id}:${id}`;

  return (
    <div className="row-actions-inner">
      {resource.detail && (
        <IconButton label={resource.detailLabel ?? 'Ver detalhes'} icon={resource.detailIcon ?? Eye} onClick={onDetail} />
      )}
      {(resource.actions ?? []).filter((action) => !action.when || action.when(item)).map((action) => {
        const label = typeof action.label === 'function' ? action.label(item) : action.label;
        const icon = action.iconFor ? action.iconFor(item) : action.icon;
        return (
          <IconButton
            key={action.id}
            label={label}
            icon={icon}
            tone={action.tone}
            busy={busy(action.id)}
            disabled={pending != null}
            onClick={() => onAction(action)}
          />
        );
      })}
      {!edit.hidden && (
        <IconButton
          label={resource.editLabel ?? 'Editar'}
          icon={Pencil}
          disabled={!edit.allowed}
          disabledReason={edit.reason}
          onClick={onEdit}
        />
      )}
      {!remove.hidden && (
        <IconButton
          label={resource.deleteLabel ?? 'Excluir'}
          icon={resource.deleteIcon ?? Trash}
          tone="danger"
          busy={busy('delete')}
          disabled={!remove.allowed || pending != null}
          disabledReason={remove.reason}
          onClick={onDelete}
        />
      )}
    </div>
  );
}
