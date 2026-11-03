import React, { useMemo, useState } from 'react';
import { apiRequest } from '../api';
import { ErrorAlert, Modal, Spinner } from '../components/ui';
import { enumOptions } from '../format';
import { listOf, useApiMany } from '../hooks';
import { newLabel } from '../resources';

function visibleFields(resource, isEdit) {
  return resource.fields.filter((field) => !field.mode || field.mode === (isEdit ? 'edit' : 'create'));
}

function initialForm(resource, fields, item) {
  const fromItem = item ? resource.toForm?.(item) ?? item : {};
  return Object.fromEntries(fields.map((field) => {
    const raw = item ? fromItem[field.name] : field.defaultValue;
    if (field.type === 'switch') return [field.name, raw ?? false];
    return [field.name, raw == null ? '' : String(raw)];
  }));
}

/** Converte o estado do formulário (strings) nos tipos esperados pela API. */
function buildPayload(fields, form) {
  const body = {};
  fields.forEach((field) => {
    const value = form[field.name];
    if (field.type === 'switch') {
      body[field.name] = Boolean(value);
    } else if (value === '' || value == null) {
      body[field.name] = null;
    } else if (field.type === 'number' || field.type === 'relation') {
      body[field.name] = Number(value);
    } else {
      body[field.name] = String(value).trim();
    }
  });
  return body;
}

function useRelationOptions(fields, item) {
  const requests = useMemo(() => {
    const paths = fields.filter((field) => field.type === 'relation').map((field) => field.source.path);
    return Object.fromEntries([...new Set(paths)].map((path) => [path, path]));
  }, [fields]);
  const { results } = useApiMany(requests);

  return (field) => {
    const result = results[field.source.path];
    if (!result) return { loading: true, options: [] };
    if (result.error) return { error: result.error, options: [] };
    let records = listOf(result);
    if (field.source.filter) records = records.filter((record) => field.source.filter(record, item));
    if (field.source.sort) records = [...records].sort(field.source.sort);
    return {
      options: records.map((record) => ({ value: String(record.id), label: field.source.label(record), record })),
    };
  };
}

export default function ResourceForm({ resource, item, onClose, onSaved }) {
  const isEdit = item != null;
  const fields = useMemo(() => visibleFields(resource, isEdit), [resource, isEdit]);
  const [form, setForm] = useState(() => initialForm(resource, fields, item));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const relationFor = useRelationOptions(fields, item);

  const title = isEdit
    ? resource.editTitle ?? `Editar ${resource.singular}`
    : resource.createTitle ?? newLabel(resource);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateRelation(field, value, options) {
    const extra = {};
    const option = options.find((candidate) => candidate.value === value);
    if (option && field.autofill) {
      Object.entries(field.autofill(option.record)).forEach(([key, autoValue]) => {
        extra[key] = autoValue == null ? '' : String(autoValue);
      });
    }
    setForm((current) => ({ ...current, [field.name]: value, ...extra }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = buildPayload(fields, form);
    const path = isEdit ? `/${resource.key}/${item.id}` : resource.createPath?.(body) ?? `/${resource.key}`;
    try {
      const saved = await apiRequest(path, { method: isEdit ? 'PUT' : 'POST', body });
      onSaved(saved ?? item, isEdit);
    } catch (requestError) {
      // A API devolve uma mensagem genérica para violação de unicidade (409); o recurso pode explicar melhor.
      if (requestError.status === 409 && resource.conflictMessage) {
        requestError.message = resource.conflictMessage;
      }
      setError(requestError);
      setSaving(false);
    }
  }

  return (
    <Modal title={title} description={isEdit ? undefined : resource.description} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={form[field.name]}
              relation={field.type === 'relation' ? relationFor(field) : null}
              onChange={(value, options) => (
                field.type === 'relation' ? updateRelation(field, value, options) : update(field.name, value)
              )}
            />
          ))}
        </div>
        <ErrorAlert error={error} title={error?.details?.length ? 'Revise os campos' : undefined} />
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving && <Spinner size={16} />}
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : resource.createLabel ?? 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FormField({ field, value, relation, onChange }) {
  const id = `field-${field.name}`;
  const hintId = field.hint ? `${id}-hint` : undefined;
  const common = {
    id,
    name: field.name,
    required: field.required,
    'aria-describedby': hintId,
  };

  let control;
  if (field.type === 'switch') {
    control = (
      <label className="switch" htmlFor={id}>
        <input {...common} type="checkbox" role="switch" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
        <span className="switch-label">{value ? field.onLabel ?? 'Sim' : field.offLabel ?? 'Não'}</span>
      </label>
    );
  } else if (field.type === 'select') {
    control = (
      <select {...common} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione…</option>
        {enumOptions(field.options).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  } else if (field.type === 'relation') {
    const { loading, error, options } = relation;
    const placeholder = loading ? 'Carregando opções…' : options.length ? 'Selecione…' : field.emptyText ?? 'Nenhuma opção disponível';
    control = (
      <select {...common} value={value} disabled={loading} onChange={(event) => onChange(event.target.value, options)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
    if (error) {
      control = (
        <>
          {control}
          <p className="field-error">Não foi possível carregar as opções: {error.message}</p>
        </>
      );
    }
  } else if (field.type === 'textarea') {
    control = (
      <textarea
        {...common}
        rows={3}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  } else {
    const type = field.type === 'datetime' ? 'datetime-local' : field.type ?? 'text';
    // Campos só de dígitos (CPF) aceitam colar "123.456.789-01": a máscara é removida antes de limitar o tamanho.
    const sanitize = (raw) => (field.digitsOnly ? raw.replace(/\D/g, '').slice(0, field.maxLength) : raw);
    control = (
      <input
        {...common}
        type={type}
        min={typeof field.min === 'function' ? field.min() : field.min}
        max={field.max}
        step={field.step}
        minLength={field.minLength}
        maxLength={field.digitsOnly ? undefined : field.maxLength}
        pattern={field.pattern}
        inputMode={field.inputMode ?? (field.type === 'number' ? 'decimal' : undefined)}
        placeholder={field.placeholder}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(sanitize(event.target.value))}
      />
    );
  }

  return (
    <div className={`field ${field.full || field.type === 'textarea' ? 'field-full' : ''}`}>
      {field.type === 'switch' ? (
        <span className="field-label">{field.label}</span>
      ) : (
        <label htmlFor={id}>
          {field.label}
          {field.required && <span className="required-mark" aria-hidden="true"> *</span>}
        </label>
      )}
      {control}
      {field.hint && <p id={hintId} className="field-hint">{field.hint}</p>}
    </div>
  );
}
