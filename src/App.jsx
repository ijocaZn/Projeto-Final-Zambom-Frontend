import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, clearCredentials, getCredentials, saveToken } from './api';

const resources = [
  { key: 'clientes', label: 'Clientes', icon: 'clientes', singular: 'cliente', fields: ['nome', 'email', 'telefone', 'cpf'], columns: ['id', 'nome', 'email', 'cpf'] },
  { key: 'produtos', label: 'Produtos', icon: 'produtos', singular: 'produto', fields: ['nome', 'descricao', 'preco', 'categoria', 'disponivel'], columns: ['id', 'nome', 'categoria', 'preco', 'disponivel'] },
  { key: 'cardapios', label: 'Cardápios', icon: 'cardapios', singular: 'cardápio', fields: ['nome'], columns: ['id', 'nome', 'produtos'] },
  { key: 'mesas', label: 'Mesas', icon: 'mesas', singular: 'mesa', feminine: true, fields: ['numero', 'capacidade'], columns: ['id', 'numero', 'capacidade', 'status'] },
  { key: 'pedidos', label: 'Pedidos', icon: 'pedidos', singular: 'pedido', fields: ['idMesa'], columns: ['id', 'mesa', 'status', 'itens', 'total'] },
  { key: 'itens-pedido', label: 'Itens do pedido', icon: 'itens', singular: 'item', fields: ['idPedido', 'idProduto', 'quantidade', 'observacao'], editFields: ['idProduto', 'quantidade', 'observacao'], columns: ['id', 'idPedido', 'nomeProduto', 'quantidade', 'subtotal'] },
  { key: 'pagamentos', label: 'Pagamentos', icon: 'pagamentos', singular: 'pagamento', fields: ['idPedido', 'valor', 'metodo'], editFields: ['metodo'], columns: ['id', 'idPedido', 'valor', 'metodo', 'status'] },
  { key: 'reservas', label: 'Reservas', icon: 'reservas', singular: 'reserva', feminine: true, fields: ['idCliente', 'idMesa', 'dataHora', 'quantidadePessoas'], columns: ['id', 'cliente', 'mesa', 'dataHora', 'status'] },
  { key: 'funcionarios', label: 'Funcionários', icon: 'funcionarios', singular: 'funcionário', fields: ['nome', 'email', 'cargo', 'telefone'], columns: ['id', 'nome', 'email', 'cargo'] },
  { key: 'restaurantes', label: 'Restaurantes', icon: 'restaurantes', singular: 'restaurante', fields: ['nome', 'endereco', 'telefone'], columns: ['id', 'nome', 'cardapio', 'mesas', 'funcionarios'] },
];

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  clientes: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2" /></>,
  produtos: <><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M12 3v4M8 5v2M16 5v2" /></>,
  cardapios: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 9h6M9 13h4" /></>,
  mesas: <><path d="M3 9h18M5 9v11M19 9v11M8 9V5h8v4" /></>,
  pedidos: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  itens: <><path d="M4 5h2l2 11h11l2-8H7" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></>,
  pagamentos: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6 15h4" /></>,
  reservas: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  funcionarios: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6" /></>,
  restaurantes: <><path d="M3 10l9-6 9 6v10H3z" /><path d="M9 20v-6h6v6" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l4-4-4-4M14 12H4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Logo({ size = 32 }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#F2A93B" /><circle cx="16" cy="16" r="8" fill="none" stroke="#16241D" strokeWidth="2.4" /><circle cx="16" cy="16" r="3" fill="#16241D" /></svg>;
}

const resourceMap = Object.fromEntries(resources.map((resource) => [resource.key, resource]));
const fieldOptions = {
  categoria: ['ENTRADA', 'PRATO_PRINCIPAL', 'ACOMPANHAMENTO', 'SOBREMESA', 'BEBIDA'],
  metodo: ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX'],
  cargo: ['GERENTE', 'GARCOM', 'COZINHEIRO', 'CAIXA'],
  disponivel: ['true', 'false'],
};
const referenceFields = {
  idMesa: ['/mesas', (mesa) => `Mesa ${mesa.numero} · ${formatLabel(mesa.status)}`],
  idCliente: ['/clientes', (cliente) => `${cliente.nome} · ${cliente.cpf}`],
  idProduto: ['/produtos', (produto) => `${produto.nome} · ${formatCurrency(produto.preco)}`],
  idPedido: ['/pedidos?status=ABERTO', (pedido) => `Pedido ${pedido.id} · Mesa ${pedido.mesa.numero} · ${formatCurrency(pedido.total)}`],
};
const labels = {
  id: 'ID', cpf: 'CPF', email: 'E-mail', descricao: 'Descrição', preco: 'Preço', numero: 'Número', endereco: 'Endereço',
  idMesa: 'Mesa', idCliente: 'Cliente', idProduto: 'Produto', idPedido: 'Pedido', nomeProduto: 'Produto',
  observacao: 'Observação', metodo: 'Método', dataHora: 'Data e hora', quantidadePessoas: 'Pessoas',
  cardapio: 'Cardápio', funcionarios: 'Funcionários', disponivel: 'Disponível',
  CARTAO_CREDITO: 'Cartão de crédito', CARTAO_DEBITO: 'Cartão de débito', GARCOM: 'Garçom', CONCLUIDA: 'Concluída',
};
const numberFields = ['numero', 'capacidade', 'quantidade', 'quantidadePessoas', 'preco', 'valor'];
const optionalFields = ['descricao', 'observacao', 'disponivel'];
const rowActions = {
  pedidos: [{ label: 'Cancelar', show: (item) => item.status === 'ABERTO', run: (item) => apiRequest(`/pedidos/${item.id}/cancelar`, { method: 'PATCH' }), message: 'Pedido cancelado.' }],
  reservas: [{ label: 'Cancelar', show: (item) => item.status === 'CONFIRMADA', run: (item) => apiRequest(`/reservas/${item.id}/cancelar`, { method: 'PATCH' }), message: 'Reserva cancelada.' }],
  produtos: [{ label: 'Alternar disponível', show: () => true, run: (item) => apiRequest(`/produtos/${item.id}/disponibilidade?disponivel=${!item.disponivel}`, { method: 'PATCH' }), message: 'Disponibilidade alterada.' }],
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
      <section className="login-hero">
        <div className="login-brand"><Logo size={40} /><span>Comanda</span></div>
        <div className="login-hero-text">
          <h1>Do salão ao caixa, <span>tudo na mesma comanda.</span></h1>
          <p>Mesas, reservas, pedidos e pagamentos do restaurante em um só lugar, com as regras do serviço aplicadas em cada passo.</p>
        </div>
        <div className="login-features">
          <div><strong>Mesas</strong><span>Livre ou ocupada, em tempo real</span></div>
          <div><strong>Pedidos</strong><span>Itens, trocas de mesa e total</span></div>
          <div><strong>Pagamento</strong><span>Pix, cartão ou dinheiro</span></div>
        </div>
      </section>
      <section className="login-card">
        <h2>{mode === 'login' ? 'Entrar' : 'Criar acesso'}</h2>
        <p className="muted">{mode === 'login' ? 'Use o e-mail cadastrado pela gerência.' : 'Cadastre um e-mail e uma senha de pelo menos 6 caracteres.'}</p>
        <form onSubmit={submit} className="stack-form">
          <label>E-mail<input type="email" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" placeholder="voce@restaurante.com" /></label>
          <label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" placeholder="••••••••" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary wide" type="submit">{mode === 'login' ? 'Entrar' : 'Cadastrar acesso'}</button>
        </form>
        <div className="login-divider"><span />ou<span /></div>
        <NavLink className="button outline wide" to="/"><Icon name="cardapios" size={16} />Ver cardápio público</NavLink>
        <button className="login-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Ainda não tem acesso? Criar conta' : 'Já tenho uma conta'}
        </button>
        <p className="login-help">A sessão fica ativa por 1 hora. Depois disso, é preciso entrar de novo.</p>
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

  const filledMenus = menus.filter((menu) => menu.produtos.some((product) => product.disponivel));
  const visibleProducts = filledMenus.length > 0 ? [...new Map(filledMenus.flatMap((menu) => menu.produtos).filter((product) => product.disponivel).map((product) => [product.id, product])).values()] : products.filter((product) => product.disponivel);
  const availableTables = tables.filter((table) => table.status === 'LIVRE');
  return (
    <main className="public-page">
      <header className="public-header">
        <div className="public-brand"><Logo /><div><strong>Comanda</strong><span>Cardápio digital</span></div></div>
        <NavLink className="button outline" to="/admin">Área administrativa</NavLink>
      </header>
      <section className="public-hero">
        <p className="eyebrow">Seja bem-vindo</p>
        <h1>Bem-vindo ao seu restaurante</h1>
        <p>Confira nosso cardápio e escolha seus pratos favoritos.</p>
      </section>
      {loading ? <div className="empty-state"><span className="spinner" />Carregando cardápio...</div> : error ? <div className="empty-state error-state"><strong>Não foi possível carregar o cardápio</strong><span>{error}</span></div> : (
        <div className="public-content">
          <section><div className="public-section-heading"><div><p className="eyebrow">Nossas opções</p><h2>Cardápio</h2></div><span className="public-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'item disponível' : 'itens disponíveis'}</span></div>
            {filledMenus.length > 0 ? filledMenus.map((menu) => <div key={menu.id}><h3 className="public-menu-title">{menu.nome}</h3><ProductGrid products={menu.produtos.filter((product) => product.disponivel)} /></div>) : <ProductGrid products={visibleProducts} />}
            {visibleProducts.length === 0 && <div className="empty-state"><strong>Nenhum item disponível no momento.</strong></div>}
          </section>
          <section className="availability-panel"><div><p className="eyebrow">Conforto para você</p><h2>Mesas disponíveis</h2><p>Consulte as mesas livres no momento.</p></div><div className="table-status-list">{availableTables.map((table) => <span className="free" key={table.id}>Mesa {table.numero} · Livre</span>)}{availableTables.length === 0 && <span className="no-tables">Nenhuma mesa livre no momento.</span>}</div></section>
        </div>
      )}
    </main>
  );
}

function ProductGrid({ products }) {
  return <div className="public-product-grid">{products.map((product) => <article className="public-product" key={product.id}><div className="product-category">{formatLabel(product.categoria || 'PRATO')}</div><h3>{product.nome}</h3><p>{product.descricao || 'Uma opção especial preparada para você.'}</p><strong>{formatCurrency(product.preco)}</strong></article>)}</div>;
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
        <div className="sidebar-brand"><Logo /><strong>Comanda</strong></div>
        <nav>
          <NavLink to="/admin/dashboard" end className="nav-item"><Icon name="dashboard" />Visão geral</NavLink>
          <p className="nav-heading">Operação</p>
          {resources.slice(0, 5).map((resource) => <NavLink key={resource.key} to={`/admin/${resource.key}`} className="nav-item"><Icon name={resource.icon} />{resource.label}</NavLink>)}
          <p className="nav-heading">Gestão</p>
          {resources.slice(5).map((resource) => <NavLink key={resource.key} to={`/admin/${resource.key}`} className="nav-item"><Icon name={resource.icon} />{resource.label}</NavLink>)}
        </nav>
        <div className="sidebar-user"><span className="avatar">AD</span><div><strong>Administrador</strong><span>Gerência</span></div><button className="logout" aria-label="Sair da conta" onClick={onLogout}><Icon name="logout" /></button></div>
      </aside>
      <div className="main-area">
        <header className="topbar"><button className="menu-toggle" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" size={22} /></button><div><span className="topbar-title">Painel administrativo</span><span className="topbar-subtitle">Acompanhe sua operação em um só lugar</span></div><div className="user-badge"><span className="dot" />API conectada</div></header>
        {notice && <div className={`notice ${notice.type || 'success'}`}>{notice.message}<button onClick={() => setNotice(null)}><Icon name="close" /></button></div>}
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
    <div className="page-heading"><div><p className="eyebrow">{capitalize(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>Visão geral</h1><p className="muted">Tenha uma visão rápida do que está acontecendo hoje.</p></div></div>
    <div className="stats-grid">
      {resources.slice(0, 5).map((resource) => <div className="stat-card" key={resource.key}><div className="stat-icon"><Icon name={resource.icon} /></div><div><span>{resource.label}</span><strong>{loading ? '—' : counts[resource.key] ?? '—'}</strong></div></div>)}
    </div>
    <section className="welcome-panel"><div><p className="eyebrow">Central de operações</p><h2>Seu restaurante, mais organizado.</h2><p>Use o menu lateral para cadastrar e acompanhar clientes, produtos, pedidos, mesas e muito mais.</p></div><div className="welcome-mark"><Logo size={88} /></div></section>
    <h2 className="section-title">Acessos rápidos</h2>
    <div className="quick-grid">{resources.slice(0, 6).map((resource) => <NavLink className="quick-card" to={`/admin/${resource.key}`} key={resource.key}><span className="quick-icon"><Icon name={resource.icon} /></span><div><strong>{resource.label}</strong><small>Gerenciar {resource.label.toLowerCase()}</small></div><b><Icon name="arrow" /></b></NavLink>)}</div>
  </div>;
}

function ResourcePage({ setNotice }) {
  const { resource: resourceKey } = useParams();
  const resource = resourceMap[resourceKey];
  if (!resource) return <Navigate to="/admin/dashboard" replace />;
  return <CrudPage key={resource.key} resource={resource} setNotice={setNotice} />;
}

function CrudPage({ resource, setNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [managing, setManaging] = useState(null);

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
    if (id == null || !window.confirm(`Remover ${resource.feminine ? 'esta' : 'este'} ${resource.singular}?`)) return;
    try {
      await apiRequest(`/${resource.key}/${id}`, { method: 'DELETE' });
      setNotice({ message: `${capitalize(resource.singular)} ${resource.feminine ? 'removida' : 'removido'} com sucesso.` });
      loadItems();
    } catch (requestError) { setNotice({ type: 'error', message: requestError.message }); }
  }

  async function runAction(action, item) {
    try {
      await action.run(item);
      setNotice({ message: action.message });
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
    }
    try {
      await apiRequest(path, { method, body: JSON.stringify(body) });
      setEditing(null);
      setNotice({ message: `${capitalize(resource.singular)} ${id != null ? 'atualizad' : 'cadastrad'}${resource.feminine ? 'a' : 'o'} com sucesso.` });
      loadItems();
    } catch (requestError) { setNotice({ type: 'error', message: requestError.message }); }
  }

  return <div>
    <div className="page-heading"><div><p className="eyebrow">Cadastro e controle</p><h1>{resource.label}</h1><p className="muted">Consulte e gerencie {resource.feminine ? 'as' : 'os'} {resource.label.toLowerCase()} {resource.feminine ? 'cadastradas' : 'cadastrados'}.</p></div> <button className="button primary" onClick={() => setEditing({})}><Icon name="plus" size={16} />{resource.feminine ? 'Nova' : 'Novo'} {resource.singular}</button></div>
    {editing && <ResourceForm key={editing.id ?? 'novo'} resource={resource} initial={editing} onCancel={() => setEditing(null)} onSave={saveItem} />}
    {managing && resource.key === 'cardapios' && <MenuProducts menu={managing} onClose={() => { setManaging(null); loadItems(); }} />}
    {managing && resource.key === 'restaurantes' && <RestaurantLinks restaurant={managing} onClose={() => { setManaging(null); loadItems(); }} />}
    <section className="table-card">
      <div className="table-toolbar"><div><h2>Registros</h2><span className="counter">{filteredItems.length} registro(s)</span></div><label className="search"><Icon name="search" size={16} /><input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
      {loading ? <div className="empty-state"><span className="spinner" />Carregando dados...</div> : error ? <div className="empty-state error-state"><strong>Não foi possível carregar os dados</strong><span>{error}</span><button className="button outline" onClick={loadItems}>Tentar novamente</button></div> : filteredItems.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name={resource.icon} size={30} /></span><strong>Nenhum registro encontrado</strong><span>Cadastre {resource.feminine ? 'a primeira' : 'o primeiro'} {resource.singular} para começar.</span></div> : <div className="table-wrapper"><table><thead><tr>{resource.columns.map((field) => <th key={field}>{formatLabel(field)}</th>)}<th className="actions-cell">Ações</th></tr></thead><tbody>{filteredItems.map((item, index) => <tr key={item.id ?? index}>{resource.columns.map((field) => <td key={field}>{field === 'status' ? <span className={`pill ${String(item.status).toLowerCase()}`}>{formatValue(item.status)}</span> : formatValue(item[field], field)}</td>)}<td className="actions-cell">{(rowActions[resource.key] || []).filter((action) => action.show(item)).map((action) => <button key={action.label} className="button outline small" onClick={() => runAction(action, item)}>{action.label}</button>)}{['cardapios', 'restaurantes'].includes(resource.key) && <button className="button outline small" onClick={() => setManaging(item)}>{resource.key === 'cardapios' ? 'Produtos' : 'Vínculos'}</button>}<button className="icon-button" title="Editar" aria-label="Editar" onClick={() => setEditing(item)}><Icon name="edit" size={17} /></button><button className="icon-button danger-text" title="Remover" aria-label="Remover" onClick={() => removeItem(item)}><Icon name="trash" size={17} /></button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

function ResourceForm({ resource, initial, onCancel, onSave }) {
  const isEdit = initial.id != null;
  const fields = isEdit && resource.editFields ? resource.editFields : resource.fields;
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((field) => [field, getFormValue(initial, field)])));
  const [references, setReferences] = useState({});

  useEffect(() => {
    fields.filter((field) => referenceFields[field]).forEach((field) => {
      apiRequest(referenceFields[field][0]).then((data) => setReferences((current) => ({ ...current, [field]: data }))).catch(() => {});
    });
  }, []);

  function change(field, value) {
    const next = { ...form, [field]: value };
    if (resource.key === 'pagamentos' && field === 'idPedido') {
      const pedido = (references.idPedido || []).find((option) => String(option.id) === value);
      if (pedido) next.valor = pedido.total;
    }
    setForm(next);
  }

  function input(field) {
    const required = !optionalFields.includes(field);
    if (referenceFields[field]) {
      const options = references[field] || [];
      const current = form[field] !== '' && !options.some((option) => String(option.id) === String(form[field])) ? [{ id: form[field] }] : [];
      return <select value={form[field]} onChange={(e) => change(field, e.target.value)} required={required}><option value="">Selecione</option>{current.map((option) => <option key={option.id} value={option.id}>#{option.id}</option>)}{options.map((option) => <option key={option.id} value={option.id}>{referenceFields[field][1](option)}</option>)}</select>;
    }
    if (fieldOptions[field]) {
      return <select value={String(form[field])} onChange={(e) => change(field, e.target.value)} required={required}><option value="">Selecione</option>{fieldOptions[field].map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}</select>;
    }
    const type = field === 'dataHora' ? 'datetime-local' : numberFields.includes(field) ? 'number' : field === 'email' ? 'email' : 'text';
    return <input type={type} step={['preco', 'valor'].includes(field) ? '0.01' : undefined} min={numberFields.includes(field) ? '0' : undefined} value={form[field]} onChange={(e) => change(field, e.target.value)} placeholder={`Digite ${formatLabel(field).toLowerCase()}`} required={required} />;
  }

  const title = isEdit ? resource.key === 'pedidos' ? `Trocar mesa do pedido ${initial.id}` : resource.key === 'pagamentos' ? 'Alterar método de pagamento' : 'Editar registro' : `${resource.feminine ? 'Nova' : 'Novo'} ${resource.singular}`;
  return <section className="form-card"><div className="form-card-heading"><div><h2>{title}</h2><p className="muted">Preencha os campos abaixo para salvar na API.</p></div><button className="close-button" aria-label="Fechar" onClick={onCancel}><Icon name="close" /></button></div><form onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="form-grid">{fields.map((field) => <label key={field}>{formatLabel(field)}{input(field)}</label>)}</div><div className="form-actions"><button type="button" className="button outline" onClick={onCancel}>Cancelar</button><button className="button primary" type="submit">Salvar registro</button></div></form></section>;
}

function MenuProducts({ menu, onClose }) {
  const [current, setCurrent] = useState(menu);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { apiRequest('/produtos').then(setProducts).catch((requestError) => setError(requestError.message)); }, []);

  async function change(method, idProduto) {
    setError('');
    try {
      setCurrent(await apiRequest(`/cardapios/${current.id}/produtos/${idProduto}`, { method }));
      setSelected('');
    } catch (requestError) { setError(requestError.message); }
  }

  const available = products.filter((product) => !current.produtos.some((item) => item.id === product.id));
  return <section className="form-card"><div className="form-card-heading"><div><h2>Produtos do cardápio {current.nome}</h2><p className="muted">Adicione ou remova produtos deste cardápio.</p></div><button className="close-button" aria-label="Fechar" onClick={onClose}><Icon name="close" /></button></div>
    <div className="link-row"><select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Selecione um produto</option>{available.map((product) => <option key={product.id} value={product.id}>{product.nome} · {formatCurrency(product.preco)}</option>)}</select><button className="button primary" disabled={!selected} onClick={() => change('POST', selected)}>Adicionar</button></div>
    {error && <p className="form-error">{error}</p>}
    <ul className="link-list">{current.produtos.map((product) => <li key={product.id}><span>{product.nome} · {formatLabel(product.categoria)} · {formatCurrency(product.preco)}{!product.disponivel && ' · indisponível'}</span><button className="icon-button danger-text" title="Remover" aria-label="Remover" onClick={() => change('DELETE', product.id)}><Icon name="trash" size={17} /></button></li>)}{current.produtos.length === 0 && <li className="muted">Nenhum produto neste cardápio.</li>}</ul>
  </section>;
}

function RestaurantLinks({ restaurant, onClose }) {
  const [current, setCurrent] = useState(restaurant);
  const [options, setOptions] = useState({ cardapios: [], mesas: [], funcionarios: [] });
  const [selected, setSelected] = useState({ cardapio: '', mesas: '', funcionarios: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all(['/cardapios', '/mesas', '/funcionarios'].map((path) => apiRequest(path)))
      .then(([cardapios, mesas, funcionarios]) => setOptions({ cardapios, mesas, funcionarios }))
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function link(path, method) {
    setError('');
    try {
      setCurrent(await apiRequest(`/restaurantes/${current.id}/${path}`, { method }));
      setSelected({ cardapio: '', mesas: '', funcionarios: '' });
    } catch (requestError) { setError(requestError.message); }
  }

  const freeMesas = options.mesas.filter((mesa) => !current.mesas.some((item) => item.id === mesa.id));
  const freeFuncionarios = options.funcionarios.filter((funcionario) => !current.funcionarios.some((item) => item.id === funcionario.id));
  return <section className="form-card"><div className="form-card-heading"><div><h2>Vínculos de {current.nome}</h2><p className="muted">Defina o cardápio e adicione mesas e funcionários ao restaurante.</p></div><button className="close-button" aria-label="Fechar" onClick={onClose}><Icon name="close" /></button></div>
    {error && <p className="form-error">{error}</p>}
    <h3 className="link-title">Cardápio: {current.cardapio?.nome ?? 'nenhum'}</h3>
    <div className="link-row"><select value={selected.cardapio} onChange={(e) => setSelected({ ...selected, cardapio: e.target.value })}><option value="">Selecione um cardápio</option>{options.cardapios.map((cardapio) => <option key={cardapio.id} value={cardapio.id}>{cardapio.nome}</option>)}</select><button className="button primary" disabled={!selected.cardapio} onClick={() => link(`cardapio/${selected.cardapio}`, 'PUT')}>Definir</button></div>
    <h3 className="link-title">Mesas: {current.mesas.map((mesa) => mesa.numero).join(', ') || 'nenhuma'}</h3>
    <div className="link-row"><select value={selected.mesas} onChange={(e) => setSelected({ ...selected, mesas: e.target.value })}><option value="">Selecione uma mesa</option>{freeMesas.map((mesa) => <option key={mesa.id} value={mesa.id}>Mesa {mesa.numero}</option>)}</select><button className="button primary" disabled={!selected.mesas} onClick={() => link(`mesas/${selected.mesas}`, 'POST')}>Adicionar</button></div>
    <h3 className="link-title">Funcionários: {current.funcionarios.map((funcionario) => funcionario.nome).join(', ') || 'nenhum'}</h3>
    <div className="link-row"><select value={selected.funcionarios} onChange={(e) => setSelected({ ...selected, funcionarios: e.target.value })}><option value="">Selecione um funcionário</option>{freeFuncionarios.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome} · {formatLabel(funcionario.cargo)}</option>)}</select><button className="button primary" disabled={!selected.funcionarios} onClick={() => link(`funcionarios/${selected.funcionarios}`, 'POST')}>Adicionar</button></div>
  </section>;
}

function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1);
}

function formatLabel(value) {
  if (labels[value]) return labels[value];
  if (value === value.toUpperCase()) return capitalize(value.toLowerCase().replace(/_/g, ' '));
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value, field) {
  if (value == null || value === '') return '—';
  if (['preco', 'valor', 'total', 'subtotal'].includes(field)) return formatCurrency(value);
  if (field === 'dataHora') return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  if (field === 'mesa') return `Mesa ${value.numero}`;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') return value.nome ?? JSON.stringify(value);
  if (typeof value === 'string' && /^[A-Z_]+$/.test(value)) return formatLabel(value);
  return String(value);
}

function formatCurrency(value) {
  if (value == null || value === '') return 'Preço não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function getFormValue(item, field) {
  if (item[field] !== undefined && item[field] !== null) return item[field];
  if (field === 'idMesa') return item.mesa?.id ?? '';
  if (field === 'idCliente') return item.cliente?.id ?? '';
  return '';
}

export default App;
