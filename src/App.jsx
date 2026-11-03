import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, clearCredentials, getCredentials, saveToken } from './api';

const resources = [
  { key: 'clientes', label: 'Clientes', icon: '👥', singular: 'cliente', fields: ['nome', 'email', 'telefone', 'cpf'] },
  { key: 'produtos', label: 'Produtos', icon: '🍽️', singular: 'produto', fields: ['nome', 'descricao', 'preco', 'categoria', 'disponivel'] },
  { key: 'cardapios', label: 'Cardápios', icon: '📋', singular: 'cardápio', fields: ['nome'] },
  { key: 'mesas', label: 'Mesas', icon: '🪑', singular: 'mesa', fields: ['numero', 'capacidade'] },
  { key: 'pedidos', label: 'Pedidos', icon: '🧾', singular: 'pedido', fields: ['idMesa'] },
  { key: 'itens-pedido', label: 'Itens do pedido', icon: '🛒', singular: 'item', fields: ['idPedido', 'idProduto', 'quantidade', 'observacao'] },
  { key: 'pagamentos', label: 'Pagamentos', icon: '💳', singular: 'pagamento', fields: ['idPedido', 'valor', 'metodo'] },
  { key: 'reservas', label: 'Reservas', icon: '📅', singular: 'reserva', fields: ['idCliente', 'idMesa', 'dataHora', 'quantidadePessoas'] },
  { key: 'funcionarios', label: 'Funcionários', icon: '🧑‍🍳', singular: 'funcionário', fields: ['nome', 'email', 'cargo', 'telefone'] },
  { key: 'restaurantes', label: 'Restaurantes', icon: '🏠', singular: 'restaurante', fields: ['nome', 'endereco', 'telefone'] },
];

const resourceMap = Object.fromEntries(resources.map((resource) => [resource.key, resource]));
const fieldOptions = {
  categoria: ['ENTRADA', 'PRATO_PRINCIPAL', 'ACOMPANHAMENTO', 'SOBREMESA', 'BEBIDA'],
  metodo: ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX'],
  cargo: ['GERENTE', 'GARCOM', 'COZINHEIRO', 'CAIXA'],
  disponivel: ['true', 'false'],
};

function App() {
  const [credentials, setCredentials] = useState(getCredentials());
  const [notice, setNotice] = useState(null);

  function handleLogin(token) {
    saveToken(token);
    setCredentials({ token });
  }

  function handleLogout() {
    clearCredentials();
    setCredentials(null);
  }

  return (
    <Routes>
      <Route path="/" element={<PublicMenu />} />
      <Route path="/cardapios" element={<PublicMenu />} />
      <Route path="/produtos" element={<PublicMenu />} />
      <Route path="/mesas" element={<PublicMenu />} />
      <Route path="/admin" element={credentials ? <Navigate to="/admin/dashboard" replace /> : <Login onLogin={handleLogin} />} />
      <Route path="/admin/*" element={credentials ? (
        <AppShell onLogout={handleLogout} notice={notice} setNotice={setNotice}>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path=":resource" element={<ResourcePage setNotice={setNotice} />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </AppShell>
      ) : <Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    if (!form.username || !form.password) {
      setError('Informe e-mail e senha para continuar.');
      return;
    }
    if (mode === 'register') {
      try {
        await apiRequest('/usuarios', { method: 'POST', body: JSON.stringify({ email: form.username, senha: form.password }) });
        setMode('login');
        setError('');
      } catch (requestError) {
        setError(requestError.message);
      }
      return;
    }
    try {
      const response = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.username, senha: form.password }),
      });
      onLogin(response.token);
      navigate('/admin/dashboard');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">R</div>
        <p className="eyebrow">GESTÃO INTELIGENTE</p>
        <h1>{mode === 'login' ? 'Bem-vindo ao seu restaurante' : 'Crie seu acesso'}</h1>
        <p className="muted">{mode === 'login' ? 'Entre com suas credenciais para gerenciar o restaurante.' : 'Cadastre um e-mail e senha para acessar o painel.'}</p>
        <form onSubmit={submit} className="stack-form">
          <label>E-mail<input type="email" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" /></label>
          <label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary wide" type="submit">{mode === 'login' ? 'Entrar no painel' : 'Cadastrar acesso'}</button>
        </form>
        <button className="login-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Ainda não tenho acesso' : 'Já tenho uma conta'}
        </button>
        <p className="login-help">A autenticação é feita pela API via token JWT.</p>
      </section>
    </main>
  );
}

function PublicMenu() {
  const [menus, setMenus] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiRequest('/cardapios'),
      apiRequest('/produtos'),
      apiRequest('/mesas'),
    ]).then(([menuData, productData, tableData]) => {
      setMenus(Array.isArray(menuData) ? menuData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setTables(Array.isArray(tableData) ? tableData : []);
    }).catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleProducts = products.filter((product) => product.disponivel !== false);
  const availableTables = tables.filter((table) => table.status === 'LIVRE');
  return (
    <main className="public-page">
      <header className="public-header">
        <div className="public-brand"><div className="brand-mark small">R</div><div><strong>Restaurante</strong><span>Cardápio digital</span></div></div>
        <NavLink className="button outline" to="/admin">Área administrativa</NavLink>
      </header>
      <section className="public-hero">
        <p className="eyebrow">SEJA BEM-VINDO</p>
        <h1>Bem-vindo ao seu restaurante</h1>
        <p>Confira nosso cardápio e escolha seus pratos favoritos.</p>
      </section>
      {loading ? <div className="empty-state"><span className="spinner" />Carregando cardápio...</div> : error ? <div className="empty-state error-state"><strong>Não foi possível carregar o cardápio</strong><span>{error}</span></div> : (
        <div className="public-content">
          <section><div className="public-section-heading"><div><p className="eyebrow">NOSSAS OPÇÕES</p><h2>Cardápio</h2></div><span className="public-count">{visibleProducts.length} itens disponíveis</span></div>
            {menus.length > 0 && <div className="menu-list">{menus.map((menu) => <div className="menu-pill" key={menu.id}>{menu.nome}</div>)}</div>}
            <div className="public-product-grid">{visibleProducts.map((product) => <article className="public-product" key={product.id}><div className="product-category">{formatLabel(product.categoria || 'PRATO')}</div><h3>{product.nome}</h3><p>{product.descricao || 'Uma opção especial preparada para você.'}</p><strong>{formatCurrency(product.preco)}</strong></article>)}</div>
            {visibleProducts.length === 0 && <div className="empty-state"><strong>Nenhum item disponível no momento.</strong></div>}
          </section>
          <section className="availability-panel"><div><p className="eyebrow">CONFORTO PARA VOCÊ</p><h2>Mesas disponíveis</h2><p>Consulte as mesas livres no momento.</p></div><div className="table-status-list">{availableTables.map((table) => <span className="free" key={table.id}>Mesa {table.numero} · Livre</span>)}{availableTables.length === 0 && <span className="no-tables">Nenhuma mesa livre no momento.</span>}</div></section>
        </div>
      )}
    </main>
  );
}

function AppShell({ children, onLogout, notice, setNotice }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, notice, setNotice]);

  return (
    <div className="app-layout">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><div className="brand-mark small">R</div><div><strong>Restaurante</strong><span>Gestão</span></div></div>
        <nav>
          <NavLink to="/admin/dashboard" end className="nav-item"><span>⌂</span> Visão geral</NavLink>
          <p className="nav-heading">Operação</p>
          {resources.slice(0, 5).map((resource) => <NavLink key={resource.key} to={`/admin/${resource.key}`} className="nav-item"><span>{resource.icon}</span>{resource.label}</NavLink>)}
          <p className="nav-heading">Gestão</p>
          {resources.slice(5).map((resource) => <NavLink key={resource.key} to={`/admin/${resource.key}`} className="nav-item"><span>{resource.icon}</span>{resource.label}</NavLink>)}
        </nav>
        <button className="logout" onClick={onLogout}>↪ <span>Sair da conta</span></button>
      </aside>
      <div className="main-area">
        <header className="topbar"><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button><div><span className="topbar-title">Painel administrativo</span><span className="topbar-subtitle">Acompanhe sua operação em um só lugar</span></div><div className="user-badge">● <span>Administrador</span></div></header>
        {notice && <div className={`notice ${notice.type || 'success'}`}>{notice.message}<button onClick={() => setNotice(null)}>×</button></div>}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function Dashboard() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(resources.slice(0, 5).map(async (resource) => {
      try {
        const data = await apiRequest(`/${resource.key}`);
        return [resource.key, Array.isArray(data) ? data.length : 0];
      } catch {
        return [resource.key, null];
      }
    })).then((entries) => setCounts(Object.fromEntries(entries))).finally(() => setLoading(false));
  }, []);

  return <div>
    <div className="page-heading"><div><p className="eyebrow">TERÇA-FEIRA, 03 DE NOVEMBRO</p><h1>Visão geral</h1><p className="muted">Tenha uma visão rápida do que está acontecendo hoje.</p></div></div>
    <div className="stats-grid">
      {resources.slice(0, 5).map((resource) => <div className="stat-card" key={resource.key}><div className="stat-icon">{resource.icon}</div><div><span>{resource.label}</span><strong>{loading ? '—' : counts[resource.key] ?? '—'}</strong></div></div>)}
    </div>
    <section className="welcome-panel"><div><p className="eyebrow">CENTRAL DE OPERAÇÕES</p><h2>Seu restaurante, mais organizado.</h2><p>Use o menu lateral para cadastrar e acompanhar clientes, produtos, pedidos, mesas e muito mais.</p></div><div className="welcome-emoji">🍲</div></section>
    <h2 className="section-title">Acessos rápidos</h2>
    <div className="quick-grid">{resources.slice(0, 6).map((resource) => <NavLink className="quick-card" to={`/admin/${resource.key}`} key={resource.key}><span>{resource.icon}</span><div><strong>{resource.label}</strong><small>Gerenciar {resource.singular}s</small></div><b>→</b></NavLink>)}</div>
  </div>;
}

function ResourcePage({ setNotice }) {
  const { resource: resourceKey } = useParams();
  const resource = resourceMap[resourceKey];
  if (!resource) return <Navigate to="/admin/dashboard" replace />;
  return <CrudPage resource={resource} setNotice={setNotice} />;
}

function CrudPage({ resource, setNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/${resource.key}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, [resource.key]);

  const filteredItems = useMemo(() => items.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase())), [items, search]);

  async function removeItem(item) {
    const id = item.id ?? item.codigo;
    if (id == null || !window.confirm(`Remover este ${resource.singular}?`)) return;
    try {
      await apiRequest(`/${resource.key}/${id}`, { method: 'DELETE' });
      setNotice({ message: `${resource.label.slice(0, -1)} removido com sucesso.` });
      loadItems();
    } catch (requestError) { setNotice({ type: 'error', message: requestError.message }); }
  }

  async function saveItem(formData) {
    const id = editing?.id ?? editing?.codigo;
    const body = Object.fromEntries(Object.entries(formData).filter(([, value]) => value !== ''));
    let path = id != null ? `/${resource.key}/${id}` : `/${resource.key}`;
    let method = id != null ? 'PUT' : 'POST';

    if (resource.key === 'itens-pedido') {
      path = id != null ? `/itens-pedido/${id}` : `/pedidos/${formData.idPedido}/itens`;
      delete body.idPedido;
    } else if (resource.key === 'pedidos' || resource.key === 'reservas') {
      delete body.idPedido;
    }

    if (resource.key === 'pagamentos' && id != null) {
      delete body.idPedido;
      delete body.valor;
    }
    try {
      await apiRequest(path, { method, body: JSON.stringify(body) });
      setEditing(null);
      setNotice({ message: `${resource.singular[0].toUpperCase() + resource.singular.slice(1)} ${id != null ? 'atualizado' : 'cadastrado'} com sucesso.` });
      loadItems();
    } catch (requestError) { setNotice({ type: 'error', message: requestError.message }); }
  }

  return <div>
    <div className="page-heading"><div><p className="eyebrow">CADASTRO E CONTROLE</p><h1>{resource.icon} {resource.label}</h1><p className="muted">Consulte e gerencie os {resource.label.toLowerCase()} cadastrados.</p></div><button className="button primary" onClick={() => setEditing({})}>+ Novo {resource.singular}</button></div>
    {editing && <ResourceForm resource={resource} initial={editing} onCancel={() => setEditing(null)} onSave={saveItem} />}
    <section className="table-card">
      <div className="table-toolbar"><div><h2>Registros</h2><span className="counter">{filteredItems.length} registro(s)</span></div><label className="search">⌕<input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
      {loading ? <div className="empty-state"><span className="spinner" />Carregando dados...</div> : error ? <div className="empty-state error-state"><strong>Não foi possível carregar os dados</strong><span>{error}</span><button className="button outline" onClick={loadItems}>Tentar novamente</button></div> : filteredItems.length === 0 ? <div className="empty-state"><span className="empty-icon">◌</span><strong>Nenhum registro encontrado</strong><span>Cadastre o primeiro {resource.singular} para começar.</span></div> : <div className="table-wrapper"><table><thead><tr>{resource.fields.slice(0, 4).map((field) => <th key={field}>{formatLabel(field)}</th>)}<th className="actions-cell">Ações</th></tr></thead><tbody>{filteredItems.map((item, index) => <tr key={item.id ?? item.codigo ?? index}>{resource.fields.slice(0, 4).map((field) => <td key={field}>{formatValue(getDisplayValue(item, field))}</td>)}<td className="actions-cell"><button className="icon-button" title="Editar" onClick={() => setEditing(item)}>✎</button><button className="icon-button danger-text" title="Remover" onClick={() => removeItem(item)}>⌫</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

function ResourceForm({ resource, initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => Object.fromEntries(resource.fields.map((field) => [field, getFormValue(initial, field)])));
  return <section className="form-card"><div className="form-card-heading"><div><h2>{initial.id ? 'Editar registro' : `Novo ${resource.singular}`}</h2><p className="muted">Preencha os campos abaixo para salvar na API.</p></div><button className="close-button" onClick={onCancel}>×</button></div><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="form-grid">{resource.fields.map((field) => <label key={field}>{formatLabel(field)}{fieldOptions[field] ? <select value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={field === resource.fields[0]}><option value="">Selecione</option>{fieldOptions[field].map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}</select> : <input type={field === 'dataHora' ? 'datetime-local' : field === 'preco' ? 'number' : 'text'} step={field === 'preco' ? '0.01' : undefined} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={`Digite ${formatLabel(field).toLowerCase()}`} required={field === resource.fields[0]} />}</label>)}</div><div className="form-actions"><button type="button" className="button outline" onClick={onCancel}>Cancelar</button><button className="button primary" type="submit">Salvar registro</button></div></form></section>;
}

function formatLabel(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return value.nome ?? value.name ?? JSON.stringify(value);
  return String(value);
}

function formatCurrency(value) {
  if (value == null || value === '') return 'Preço não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function getDisplayValue(item, field) {
  if (item[field] !== undefined) return item[field];
  if (field === 'idMesa') return item.mesa?.id;
  if (field === 'idCliente') return item.cliente?.id;
  return undefined;
}

function getFormValue(item, field) {
  if (item[field] !== undefined && item[field] !== null) return item[field];
  if (field === 'idMesa') return item.mesa?.id ?? '';
  if (field === 'idCliente') return item.cliente?.id ?? '';
  return '';
}

export default App;
