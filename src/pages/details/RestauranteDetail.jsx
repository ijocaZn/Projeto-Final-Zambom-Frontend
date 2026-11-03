import React, { useState } from 'react';
import { Armchair, BookOpen, ChefHat, MapPin, Phone } from 'lucide-react';
import { apiRequest } from '../../api';
import { useToast } from '../../components/feedback';
import { ErrorState, LoadingState, Modal, Spinner } from '../../components/ui';
import { enumLabel, pluralize } from '../../format';
import { listOf, useApiMany } from '../../hooks';

const OPTION_REQUESTS = { cardapios: '/cardapios', mesas: '/mesas', funcionarios: '/funcionarios' };

export default function RestauranteDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const { results, loading, reload } = useApiMany({ restaurante: `/restaurantes/${id}`, ...OPTION_REQUESTS });
  const [busy, setBusy] = useState('');
  const restaurante = results.restaurante?.data;
  const restauranteError = results.restaurante?.error;

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

  let content;
  if (loading && !restaurante) {
    content = <LoadingState label="Carregando restaurante…" />;
  } else if (restauranteError && !restaurante) {
    content = <ErrorState error={restauranteError} onRetry={reload} />;
  } else if (restaurante) {
    const mesaIds = new Set((restaurante.mesas ?? []).map((mesa) => mesa.id));
    const funcionarioIds = new Set((restaurante.funcionarios ?? []).map((funcionario) => funcionario.id));
    const cardapios = listOf(results.cardapios).filter((cardapio) => cardapio.id !== restaurante.cardapio?.id);
    const mesas = listOf(results.mesas).filter((mesa) => !mesaIds.has(mesa.id)).sort((a, b) => a.numero - b.numero);
    const funcionarios = listOf(results.funcionarios).filter((funcionario) => !funcionarioIds.has(funcionario.id));

    content = (
      <>
        <div className="detail-contact">
          <span><MapPin size={16} aria-hidden="true" /> {restaurante.endereco}</span>
          <span><Phone size={16} aria-hidden="true" /> {restaurante.telefone}</span>
        </div>

        <LinkSection
          icon={BookOpen}
          title="Cardápio"
          summary={restaurante.cardapio ? restaurante.cardapio.nome : 'Nenhum cardápio definido'}
          selectLabel={restaurante.cardapio ? 'Trocar cardápio' : 'Definir cardápio'}
          buttonLabel="Definir"
          options={cardapios.map((cardapio) => ({ value: cardapio.id, label: `${cardapio.nome} · ${pluralize(cardapio.produtos?.length ?? 0, 'produto', 'produtos')}` }))}
          emptyOption="Nenhum outro cardápio cadastrado"
          busy={busy === 'cardapio'}
          disabled={busy !== ''}
          onSubmit={(value) => run('cardapio', () => apiRequest(`/restaurantes/${id}/cardapio/${value}`, { method: 'PUT' }), 'Cardápio do restaurante definido.')}
        />

        <LinkSection
          icon={Armchair}
          title="Mesas"
          summary={pluralize(restaurante.mesas?.length ?? 0, 'mesa vinculada', 'mesas vinculadas')}
          items={(restaurante.mesas ?? []).map((mesa) => ({ id: mesa.id, label: `Mesa ${mesa.numero}`, sub: pluralize(mesa.capacidade, 'lugar', 'lugares') }))}
          selectLabel="Vincular mesa"
          buttonLabel="Vincular"
          options={mesas.map((mesa) => ({ value: mesa.id, label: `Mesa ${mesa.numero} · ${pluralize(mesa.capacidade, 'lugar', 'lugares')}` }))}
          emptyOption="Todas as mesas já estão vinculadas"
          busy={busy === 'mesa'}
          disabled={busy !== ''}
          onSubmit={(value) => run('mesa', () => apiRequest(`/restaurantes/${id}/mesas/${value}`, { method: 'POST' }), 'Mesa vinculada ao restaurante.')}
        />

        <LinkSection
          icon={ChefHat}
          title="Equipe"
          summary={pluralize(restaurante.funcionarios?.length ?? 0, 'pessoa', 'pessoas')}
          items={(restaurante.funcionarios ?? []).map((funcionario) => ({ id: funcionario.id, label: funcionario.nome, sub: enumLabel('cargo', funcionario.cargo) }))}
          selectLabel="Vincular funcionário"
          buttonLabel="Vincular"
          options={funcionarios.map((funcionario) => ({ value: funcionario.id, label: `${funcionario.nome} · ${enumLabel('cargo', funcionario.cargo)}` }))}
          emptyOption="Todos os funcionários já estão vinculados"
          busy={busy === 'funcionario'}
          disabled={busy !== ''}
          onSubmit={(value) => run('funcionario', () => apiRequest(`/restaurantes/${id}/funcionarios/${value}`, { method: 'POST' }), 'Funcionário vinculado ao restaurante.')}
        />
      </>
    );
  }

  return (
    <Modal title={restaurante?.nome ?? 'Restaurante'} description="Cardápio, mesas e equipe desta unidade." size="lg" onClose={onClose}>
      {content}
    </Modal>
  );
}

function LinkSection({ icon: Icon, title, summary, items, selectLabel, buttonLabel, options, emptyOption, busy, disabled, onSubmit }) {
  const [value, setValue] = useState('');
  const selectId = `link-${title}`;

  async function submit(event) {
    event.preventDefault();
    const ok = await onSubmit(value);
    if (ok) setValue('');
  }

  return (
    <section className="detail-section link-section">
      <h3><Icon size={17} aria-hidden="true" /> {title} <span className="muted-text">{summary}</span></h3>
      {items && items.length > 0 && (
        <ul className="pill-list">
          {items.map((item) => (
            <li key={item.id}><strong>{item.label}</strong>{item.sub && <small>{item.sub}</small>}</li>
          ))}
        </ul>
      )}
      <form className="inline-add" onSubmit={submit}>
        <div className="field">
          <label htmlFor={selectId}>{selectLabel}</label>
          <select id={selectId} required value={value} onChange={(event) => setValue(event.target.value)}>
            <option value="">{options.length ? 'Selecione…' : emptyOption}</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <button type="submit" className="button secondary" disabled={disabled || !value}>
          {busy && <Spinner size={16} />} {buttonLabel}
        </button>
      </form>
    </section>
  );
}
