import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowLeft,
  Cake,
  Check,
  ChevronRight,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Wheat,
  X
} from 'lucide-react';
import './styles.css';
import { createBrowserDemoApi } from './browserDemoApi.js';
import hunchiesLogo from './assets/hunchies-logo.png';

const api = window.itemCostApi ?? createBrowserDemoApi();
const USER_SESSION_KEY = 'item_cost_current_user';
const USER_ACCESS_SYNC_KEY = 'item_cost_users_updated_at';
const USER_ACCESS_CHANNEL = 'item-cost-user-access';

const emptyRawMaterialForm = {
  name: '',
  baseUnit: 'kg',
  purchaseQuantity: '',
  purchaseUnit: 'kg',
  purchasePrice: '',
  purchaseCurrency: 'USD',
  customConversions: {},
  conversionMode: 'none',
  notes: ''
};

const liquidPresets = {
  water: { label: 'Water', density: 1 },
  milk: { label: 'Milk', density: 1.03 },
  vegetableOil: { label: 'Vegetable oil', density: 0.92 },
  heavyCream: { label: 'Heavy cream', density: 0.99 }
};

const metricSpoons = {
  cup: 240,
  tbsp: 15,
  tsp: 5
};

const homeGreetings = [
  'Hello there!',
  'Welcome!',
  'Welcome back!',
  'Ready to get started?',
  'Let us get to work.',
  'Keep smiling!',
  'Do not have a good day. Have a great day.',
  'Let us make today productive.',
  'Ready when you are.',
  "Today's business starts here.",
  'The smarter way to manage.',
  'Every gram matters.',
  'Thumbs up, let us get to work.',
  'Ready to dive in?',
  'Your workspace is ready.',
  'Start where you left off.',
  'Let us build something great.',
  'Everything is ready for you.',
  'Margins are waiting. Politely, for now.',
  'Fresh numbers, fresh decisions.',
  'Your cost counter is warmed up.',
  'Tiny inputs. Big clarity.',
  'The kitchen math desk is open.',
  'Let us keep the guesswork out of the recipe.',
  'Today feels like a profitable spreadsheet.',
  'Your ingredients are ready for their close-up.',
  'Good ideas deserve clean costs.',
  'The calculator is calm. The prices may not be.',
  'Let us make the numbers behave.',
  'Business brain: activated.'
];

const emptyProductForm = {
  name: '',
  ingredients: [{ rawMaterialId: '', quantity: '', unit: '' }]
};

function App() {
  return isAdminRoute() ? <AdminApp /> : <MainApp />;
}

function MainApp() {
  const [currentUser, setCurrentUser] = useState(() => readSessionUser());
  const [activeView, setActiveView] = useState({ name: 'home' });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refreshAll() {
    if (!api) {
      setError('Desktop backend is not available. Open this app through Electron.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const init = await api.initializeApp();
    if (!init.ok) return applyError(init);

    const [rawMaterialsResult, productsResult, settingsResult] = await Promise.all([
      api.listRawMaterials(),
      api.listProducts(),
      api.loadSettings()
    ]);

    if (!rawMaterialsResult.ok) return applyError(rawMaterialsResult);
    if (!productsResult.ok) return applyError(productsResult);
    if (!settingsResult.ok) return applyError(settingsResult);

    setMaterials(rawMaterialsResult.data);
    setProducts(productsResult.data);
    setSettings(settingsResult.data);
    setLoading(false);
  }

  function applyError(result) {
    setError(result.error?.message ?? 'Something went wrong.');
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser) {
      refreshAll();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    function syncCurrentUser() {
      if (!currentUser) return;
      api.listUsers().then((result) => {
        if (!result.ok) return;
        const latest = result.data.find((user) => user.id === currentUser.id);
        if (!latest?.isActive) {
          handleLogout();
          return;
        }
        if (latest.username !== currentUser.username) {
          sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(latest));
          setCurrentUser(latest);
        }
      });
    }

    function handleStorage(event) {
      if (event.key === USER_ACCESS_SYNC_KEY) syncCurrentUser();
    }

    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(USER_ACCESS_CHANNEL) : null;
    if (channel) {
      channel.onmessage = syncCurrentUser;
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener('item-cost-users-updated', syncCurrentUser);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('item-cost-users-updated', syncCurrentUser);
      channel?.close();
    };
  }, [currentUser?.id, currentUser?.username]);

  function handleLogin(user) {
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setActiveView({ name: 'home' });
    setError('');
  }

  function handleLogout() {
    sessionStorage.removeItem(USER_SESSION_KEY);
    setCurrentUser(null);
    setMaterials([]);
    setProducts([]);
    setSettings(null);
    setActiveView({ name: 'home' });
  }

  const title = useMemo(() => {
    if (activeView.name === 'materials') return 'Raw Materials';
    if (activeView.name === 'products') return 'Products';
    if (activeView.name === 'settings') return 'Settings';
    if (activeView.name === 'material-new') return 'Add Raw Material';
    if (activeView.name === 'material-detail') return 'Raw Material Detail';
    if (activeView.name === 'material-edit') return 'Edit Raw Material';
    if (activeView.name === 'product-new') return 'Product Builder';
    if (activeView.name === 'product-detail') return 'Product Detail';
    if (activeView.name === 'product-edit') return 'Edit Product';
    return 'Home';
  }, [activeView.name]);

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  async function afterMutation(nextView = undefined) {
    await refreshAll();
    if (nextView) setActiveView(nextView);
  }

  const appContext = {
    activeView,
    setActiveView,
    searchQuery,
    materials,
    products,
    settings,
    refreshAll,
    afterMutation,
    setError
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView.name}
        onNavigate={(name) => {
          setActiveView({ name });
          setSearchQuery('');
          setMobileNavOpen(false);
        }}
        onNewProduct={() => {
          setActiveView({ name: 'product-new' });
          setMobileNavOpen(false);
        }}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="app-main">
        <Header
          title={title}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenu={() => setMobileNavOpen(true)}
          onSettings={() => setActiveView({ name: 'settings' })}
          settings={settings}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="content">
          {error && <Notice type="error" message={error} onClose={() => setError('')} />}
          {loading ? <Loading /> : <ViewRouter context={appContext} />}
        </main>
      </div>
    </div>
  );
}

function LoginView({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const init = await api.initializeApp();
    if (!init.ok) {
      setLoading(false);
      setError(init.error?.message ?? 'Could not initialize the app.');
      return;
    }
    const result = await api.authenticateUser(form);
    setLoading(false);
    if (!result.ok) {
      setForm({ username: '', password: '' });
      setError('Wrong username or password.');
      return;
    }
    onLogin(result.data);
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <img className="auth-logo" src={hunchiesLogo} alt="Hunchies Simply Fresh" />
        <div>
          <h1>Sign in</h1>
          <p>Your workspace is locked until an active user signs in.</p>
        </div>
        {error && <Notice type="error" message={error} onClose={() => setError('')} />}
        <TextField label="Username" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
        <TextField label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <button className="primary-button full" disabled={loading}>
          <KeyRound size={18} />
          {loading ? 'Checking...' : 'Open Program'}
        </button>
      </form>
    </main>
  );
}

function AdminApp() {
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const result = await api.listUsers();
    setLoading(false);
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not load users.');
      return;
    }
    setUsers(result.data);
  }

  async function submitPin(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const init = await api.initializeApp();
    if (!init.ok) {
      setLoading(false);
      setError(init.error?.message ?? 'Could not initialize the app.');
      return;
    }
    const result = await api.verifyAdminKey(pin);
    setLoading(false);
    if (!result.ok) {
      setError(result.error?.message ?? 'Admin key is incorrect.');
      return;
    }
    setAuthorized(true);
    await loadUsers();
  }

  async function createUser(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const result = await api.createUser(form);
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not create user.');
      return;
    }
    setForm({ username: '', password: '' });
    setNotice(`${result.data.username} can now access the program.`);
    broadcastUserAccessUpdate();
    await loadUsers();
  }

  async function saveUser(id, input) {
    setError('');
    setNotice('');
    const result = await api.updateUser(id, input);
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not update user.');
      return false;
    }
    setNotice(`${result.data.username} was updated.`);
    broadcastUserAccessUpdate();
    await loadUsers();
    return true;
  }

  if (!authorized) {
    return (
      <main className="auth-shell admin-auth">
        <form className="auth-card" onSubmit={submitPin}>
          <div className="admin-badge"><ShieldCheck size={24} /></div>
          <div>
            <h1>Admin access</h1>
            <p>Enter the security key to manage who can open the calculator.</p>
          </div>
          {error && <Notice type="error" message={error} onClose={() => setError('')} />}
          <TextField label="Security Key" type="password" value={pin} onChange={setPin} />
          <button className="primary-button full" disabled={loading}>
            <KeyRound size={18} />
            {loading ? 'Checking...' : 'Unlock Admin'}
          </button>
          <a className="auth-link" href="/">Back to program</a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-header">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>User Access</h1>
          <p>Create users and decide who can still access the Item Cost Calculator.</p>
        </div>
        <a className="secondary-button" href="/">Back to program</a>
      </section>
      {error && <Notice type="error" message={error} onClose={() => setError('')} />}
      {notice && <Notice type="success" message={notice} onClose={() => setNotice('')} />}
      <div className="admin-grid">
        <form className="info-panel admin-create" onSubmit={createUser}>
          <div className="panel-title-row">
            <UserPlus size={20} />
            <h3>Add User</h3>
          </div>
          <TextField label="Username" value={form.username} onChange={(value) => setForm({ ...form, username: value })} placeholder="New user" />
          <TextField label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
          <button className="primary-button full">
            <UserPlus size={18} />
            Add User
          </button>
        </form>
        <section className="info-panel">
          <div className="panel-title-row">
            <User size={20} />
            <h3>Users</h3>
          </div>
          {loading ? <Loading /> : users.length === 0 ? (
            <p className="muted">No users yet. Add the first user to unlock the main program.</p>
          ) : (
            <div className="user-list">
              {users.map((user) => (
                <UserRow key={user.id} user={user} onSave={saveUser} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function UserRow({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ username: user.username, password: '', isActive: user.isActive });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({ username: user.username, password: '', isActive: user.isActive });
  }, [user.id, user.username, user.isActive]);

  async function save() {
    setSaving(true);
    const ok = await onSave(user.id, {
      username: draft.username,
      ...(draft.password ? { password: draft.password } : {}),
      isActive: draft.isActive
    });
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function toggleAccess() {
    const nextActive = !draft.isActive;
    setDraft((current) => ({ ...current, isActive: nextActive }));
    const ok = await onSave(user.id, { isActive: nextActive });
    if (!ok) setDraft((current) => ({ ...current, isActive: !nextActive }));
  }

  return (
    <div className="user-row">
      <div className="user-row-head">
        <div>
          <strong>{user.username}</strong>
          <span>{user.isActive ? 'Active access' : 'Access off'}</span>
        </div>
        <label className="switch" title="Toggle program access">
          <input type="checkbox" checked={draft.isActive} onChange={toggleAccess} />
          <span />
        </label>
      </div>
      {editing ? (
        <div className="user-edit-grid">
          <TextField label="Username" value={draft.username} onChange={(value) => setDraft({ ...draft, username: value })} />
          <TextField label="New Password" type="password" value={draft.password} onChange={(value) => setDraft({ ...draft, password: value })} placeholder="Leave blank to keep" />
          <button type="button" className="primary-button" disabled={saving} onClick={save}><Save size={17} />{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="secondary-button fit-button" onClick={() => setEditing(true)}><Pencil size={16} />Edit User</button>
      )}
    </div>
  );
}

function ViewRouter({ context }) {
  const { activeView } = context;

  if (activeView.name === 'materials') return <RawMaterialsView {...context} />;
  if (activeView.name === 'material-new') return <RawMaterialForm {...context} mode="create" />;
  if (activeView.name === 'material-detail') return <RawMaterialDetail {...context} id={activeView.id} />;
  if (activeView.name === 'material-edit') return <RawMaterialForm {...context} mode="edit" id={activeView.id} />;
  if (activeView.name === 'products') return <ProductsView {...context} />;
  if (activeView.name === 'product-new') return <ProductForm {...context} mode="create" />;
  if (activeView.name === 'product-detail') return <ProductDetail {...context} id={activeView.id} />;
  if (activeView.name === 'product-edit') return <ProductForm {...context} mode="edit" id={activeView.id} />;
  if (activeView.name === 'settings') return <SettingsView {...context} />;
  return <HomeView {...context} />;
}

function Sidebar({ activeView, onNavigate, onNewProduct, mobileOpen, onClose }) {
  const nav = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'materials', label: 'Raw Materials', icon: Wheat },
    { id: 'products', label: 'Products', icon: Cake },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      {mobileOpen && <button className="scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark">I</div>
          <div>
            <h1>Item Cost</h1>
            <p>Calculator</p>
          </div>
          <button className="icon-button mobile-only" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id || (activeView.startsWith(item.id.slice(0, -1)) && item.id !== 'home');
            return (
              <button key={item.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => onNavigate(item.id)}>
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="primary-button full" onClick={onNewProduct}>
          <Plus size={18} />
          New Product
        </button>
      </aside>
    </>
  );
}

function Header({ title, searchQuery, onSearchChange, onMenu, onSettings, settings, currentUser, onLogout }) {
  return (
    <header className="header">
      <button className="icon-button mobile-only" onClick={onMenu} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <div>
        <h2>{title}</h2>
        <p>1 USD = {(settings?.currency?.usdToLbp ?? 90000).toLocaleString()} LBP</p>
      </div>
      <label className="search-box">
        <Search size={17} />
        <input value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search" />
      </label>
      <button className="icon-button" onClick={onSettings} aria-label="Settings">
        <Settings size={20} />
      </button>
      <div className="user-chip" title={currentUser?.username}>
        <User size={16} />
        <span>{currentUser?.username}</span>
      </div>
      <button className="icon-button" onClick={onLogout} aria-label="Log out">
        <LogOut size={19} />
      </button>
    </header>
  );
}

function HomeView({ setActiveView, materials, products }) {
  const [greeting] = useState(() => homeGreetings[Math.floor(Math.random() * homeGreetings.length)]);

  return (
    <div className="page-stack">
      <section className="hero-section">
        <img className="home-logo" src={hunchiesLogo} alt="Hunchies Simply Fresh" />
        <h2>{greeting}</h2>
        <p>Track raw material costs and calculate exactly how much each product costs to make.</p>
      </section>
      <section className="stats-grid">
        <ActionCard
          icon={Wheat}
          eyebrow="Raw Materials"
          title={`${materials.length} Cost References`}
          text="Manage base costs, units, and custom food conversions."
          onClick={() => setActiveView({ name: 'materials' })}
        />
        <ActionCard
          icon={Cake}
          eyebrow="Products"
          title={`${products.length} Products Costed`}
          text="Build products from raw materials and see live totals."
          onClick={() => setActiveView({ name: 'products' })}
        />
      </section>
      <section className="cta-band">
        <div>
          <h3>Create a product cost</h3>
          <p>Select raw materials, enter quantities, and calculate production cost in USD and LBP.</p>
        </div>
        <button className="white-button" onClick={() => setActiveView({ name: 'product-new' })}>
          Open Builder <ChevronRight size={17} />
        </button>
      </section>
    </div>
  );
}

function ActionCard({ icon: Icon, eyebrow, title, text, onClick }) {
  return (
    <button className="action-card" onClick={onClick}>
      <div className="card-icon"><Icon size={27} /></div>
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </button>
  );
}

function RawMaterialsView({ materials, searchQuery, setActiveView }) {
  const filtered = filterByName(materials, searchQuery);

  return (
    <div className="page-stack">
      <PageTitle
        title="Raw Materials"
        subtitle="Cost references used by products. These do not track stock."
        action={<button className="primary-button" onClick={() => setActiveView({ name: 'material-new' })}><Plus size={18} />Add Raw Material</button>}
      />
      {filtered.length === 0 ? (
        <EmptyState title="No raw materials yet" text="Add flour, sugar, eggs, or any material you use to make products." actionLabel="Add Raw Material" onAction={() => setActiveView({ name: 'material-new' })} />
      ) : (
        <div className="card-grid">
          {filtered.map((material) => (
            <button key={material.id} className="material-card" onClick={() => setActiveView({ name: 'material-detail', id: material.id })}>
              <div className="material-card-head">
                <div className="card-icon"><Wheat size={22} /></div>
                <div>
                  <h3>{material.name}</h3>
                  <span>Base: {material.baseUnit}</span>
                </div>
              </div>
              <div className="cost-lines">
                <CostLine label="USD Cost" value={`$${formatUsd(material.costPerBaseUnitUSD)} / ${material.baseUnit}`} />
                <CostLine label="LBP Cost" value={`${Math.round(material.costPerBaseUnitLBP).toLocaleString()} / ${material.baseUnit}`} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RawMaterialDetail({ id, materials, setActiveView, afterMutation, setError }) {
  const material = materials.find((item) => item.id === id);
  if (!material) return <MissingView label="raw material" onBack={() => setActiveView({ name: 'materials' })} />;

  async function remove() {
    const result = await api.deleteRawMaterial(material.id);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await afterMutation({ name: 'materials' });
  }

  return (
    <div className="page-stack">
      <BackButton onClick={() => setActiveView({ name: 'materials' })} />
      <div className="detail-panel">
        <div>
          <span className="eyebrow">{material.id}</span>
          <h2>{material.name}</h2>
          <p>Cost per {material.baseUnit}: ${formatUsd(material.costPerBaseUnitUSD)} / {Math.round(material.costPerBaseUnitLBP).toLocaleString()} LBP</p>
        </div>
        <div className="button-row">
          <button className="secondary-button" onClick={() => setActiveView({ name: 'material-edit', id: material.id })}><Pencil size={16} />Edit</button>
          <button className="danger-button" onClick={remove}><Trash2 size={16} />Delete</button>
        </div>
      </div>
      <div className="two-column">
        <InfoPanel title="Purchase">
          <CostLine label="Bought quantity" value={`${material.purchaseQuantity} ${material.purchaseUnit}`} />
          <CostLine label="Purchase price USD" value={`$${formatUsd(material.purchasePriceUSD)}`} />
          <CostLine label="Purchase price LBP" value={`${Math.round(material.purchasePriceLBP).toLocaleString()} LBP`} />
        </InfoPanel>
        <InfoPanel title="Conversions">
          {Object.keys(material.customConversions ?? {}).length === 0 ? <p className="muted">No custom conversions.</p> : Object.entries(material.customConversions).map(([unit, conversion]) => (
            <CostLine key={unit} label={`1 ${unit}`} value={`${conversion.quantity} ${conversion.unit}`} />
          ))}
        </InfoPanel>
      </div>
      {material.notes && <InfoPanel title="Notes"><p>{material.notes}</p></InfoPanel>}
    </div>
  );
}

function RawMaterialForm({ mode, id, materials, setActiveView, afterMutation, setError }) {
  const existing = materials.find((item) => item.id === id);
  const [form, setForm] = useState(() => existing ? materialToForm(existing) : emptyRawMaterialForm);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function calculate() {
      if (!api || !form.name || !form.purchaseQuantity || form.purchasePrice === '') {
        setDraft(null);
        return;
      }
      const result = await api.calculateRawMaterialDraft(form);
      if (!cancelled) setDraft(result);
    }
    calculate();
    return () => { cancelled = true; };
  }, [form]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = mode === 'edit'
      ? await api.updateRawMaterial(id, form)
      : await api.createRawMaterial(form);
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await afterMutation({ name: 'material-detail', id: result.data.id });
  }

  return (
    <form className="page-stack form-page" onSubmit={submit}>
      <BackButton onClick={() => setActiveView(mode === 'edit' ? { name: 'material-detail', id } : { name: 'materials' })} />
      <PageTitle title={mode === 'edit' ? 'Edit Raw Material' : 'Add Raw Material'} subtitle="Enter the bought quantity and price. The app calculates cost per base unit." />
      <div className="raw-material-layout">
        <InfoPanel title="Ingredient">
          <div className="compact-form-grid">
            <TextField label="Name" value={form.name} onChange={(value) => setFormValue(setForm, 'name', value)} placeholder="Flour" />
            <SelectField label="Base Unit" value={form.baseUnit} onChange={(value) => setFormValue(setForm, 'baseUnit', value)} options={unitOptions()} />
            <TextField label="Bought Quantity" type="number" value={form.purchaseQuantity} onChange={(value) => setFormValue(setForm, 'purchaseQuantity', value)} />
            <SelectField label="Bought Unit" value={form.purchaseUnit} onChange={(value) => setFormValue(setForm, 'purchaseUnit', value)} options={[...unitOptions(), ...customUnitOptions()]} />
          </div>
        </InfoPanel>
        <InfoPanel title="Price">
          <div className="compact-form-grid">
            <TextField label="Bought Price" type="number" value={form.purchasePrice} onChange={(value) => setFormValue(setForm, 'purchasePrice', value)} />
            <SelectField label="Currency" value={form.purchaseCurrency} onChange={(value) => setFormValue(setForm, 'purchaseCurrency', value)} options={[['USD', 'USD'], ['LBP', 'LBP']]} />
          </div>
          {draft?.ok && (
            <div className="mini-summary">
              <CostLine label="USD / base unit" value={`$${formatUsd(draft.data.costPerBaseUnitUSD)} / ${draft.data.baseUnit}`} />
              <CostLine label="LBP / base unit" value={`${Math.round(draft.data.costPerBaseUnitLBP).toLocaleString()} / ${draft.data.baseUnit}`} />
            </div>
          )}
        </InfoPanel>
      </div>

      <InfoPanel title="Optional food conversions">
        <div className="liquid-preset-row">
          <SelectField
            label="Conversion mode"
            value={form.conversionMode}
            onChange={(value) => applyConversionMode(setForm, value)}
            options={[
              ['none', 'No custom conversions'],
              ['manual', 'Manual conversions'],
              ...Object.entries(liquidPresets).map(([value, preset]) => [value, preset.label])
            ]}
          />
          <div className="preset-note">
            <strong>Kitchen standard</strong>
            <span>{form.conversionMode === 'manual' ? 'Enter cup in grams; tbsp and tsp auto-fill.' : 'cup (240 ml), tbsp (15 ml), tsp (5 ml)'}</span>
          </div>
        </div>
        <div className="form-grid conversion-grid">
          {['cup', 'tbsp', 'tsp'].map((unit) => (
            <ConversionFields key={unit} unit={unit} form={form} setForm={setForm} />
          ))}
        </div>
      </InfoPanel>
      <label className="field full-field">
        <span>Notes</span>
        <textarea value={form.notes} onChange={(event) => setFormValue(setForm, 'notes', event.target.value)} rows={3} />
      </label>
      {draft && !draft.ok && <Notice type="warning" message={draft.error.message} />}
      <button className="primary-button submit-button" disabled={saving}><Save size={18} />{saving ? 'Saving...' : 'Save Raw Material'}</button>
    </form>
  );
}

function ProductsView({ products, searchQuery, setActiveView }) {
  const filtered = filterByName(products, searchQuery);

  return (
    <div className="page-stack">
      <PageTitle
        title="Products"
        subtitle="Products are calculated from the latest raw material costs."
        action={<button className="primary-button" onClick={() => setActiveView({ name: 'product-new' })}><Plus size={18} />Create Product</button>}
      />
      {filtered.length === 0 ? (
        <EmptyState title="No products yet" text="Create a product and add raw materials to calculate total production cost." actionLabel="Create Product" onAction={() => setActiveView({ name: 'product-new' })} />
      ) : (
        <div className="card-grid">
          {filtered.map((product) => (
            <button key={product.id} className="material-card" onClick={() => setActiveView({ name: 'product-detail', id: product.id })}>
              <div className="material-card-head">
                <div className="card-icon"><Cake size={22} /></div>
                <div>
                  <h3>{product.name}</h3>
                  <span>{product.ingredientCount ?? product.ingredients.length} ingredients</span>
                </div>
              </div>
              <div className="cost-lines">
                <CostLine label="USD Total" value={`$${formatUsd(product.totalCostUSD)}`} />
                <CostLine label="LBP Total" value={`${Math.round(product.totalCostLBP).toLocaleString()} LBP`} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductDetail({ id, setActiveView, afterMutation, setError }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.getProduct(id).then((result) => {
      if (result.ok) setProduct(result.data);
      else setError(result.error.message);
    });
  }, [id]);

  async function remove() {
    const result = await api.deleteProduct(id);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await afterMutation({ name: 'products' });
  }

  if (!product) return <Loading />;

  return (
    <div className="page-stack">
      <BackButton onClick={() => setActiveView({ name: 'products' })} />
      {product.warnings?.length > 0 && <Notice type="warning" message="This product has a missing raw material reference." />}
      <div className="detail-panel dark-panel">
        <div>
          <span className="eyebrow">{product.id}</span>
          <h2>{product.name}</h2>
          <p>Total cost: ${formatUsd(product.totalCostUSD)} / {Math.round(product.totalCostLBP).toLocaleString()} LBP</p>
        </div>
        <div className="button-row">
          <button className="secondary-button light" onClick={() => setActiveView({ name: 'product-edit', id })}><Pencil size={16} />Edit</button>
          <button className="danger-button" onClick={remove}><Trash2 size={16} />Delete</button>
        </div>
      </div>
      <InfoPanel title="Ingredient Breakdown">
        <div className="table-list">
          {product.ingredients.map((ingredient, index) => (
            <div className="table-row" key={`${ingredient.rawMaterialId}-${index}`}>
              <span>{ingredient.rawMaterialName ?? ingredient.rawMaterialId}</span>
              <span>{ingredient.quantity} {ingredient.unit}</span>
              <strong>${formatUsd(ingredient.portionCostUSD)}</strong>
            </div>
          ))}
        </div>
      </InfoPanel>
    </div>
  );
}

function ProductForm({ mode, id, products, materials, setActiveView, afterMutation, setError }) {
  const existing = products.find((item) => item.id === id);
  const [form, setForm] = useState(() => existing ? productToForm(existing) : emptyProductForm);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((current) => ensureTrailingEmptyRow(current));
  }, [form.ingredients.length]);

  useEffect(() => {
    let cancelled = false;
    async function calculate() {
      if (!api || !form.name) {
        setDraft(null);
        return;
      }
      const result = await api.calculateProductDraft(form);
      if (!cancelled) setDraft(result);
    }
    calculate();
    return () => { cancelled = true; };
  }, [form]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = mode === 'edit' ? await api.updateProduct(id, form) : await api.createProduct(form);
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await afterMutation({ name: 'product-detail', id: result.data.id });
  }

  return (
    <form className="page-stack" onSubmit={submit}>
      <BackButton onClick={() => setActiveView(mode === 'edit' ? { name: 'product-detail', id } : { name: 'products' })} />
      <PageTitle title={mode === 'edit' ? 'Edit Product' : 'Product Builder'} subtitle="Choose raw materials and quantities. Costs update live from backend calculations." />
      <div className="builder-layout">
        <div className="builder-main">
          <InfoPanel title="Product">
            <TextField label="Product Name" value={form.name} onChange={(value) => setFormValue(setForm, 'name', value)} placeholder="Chocolate Cake" />
          </InfoPanel>
          <InfoPanel title="Ingredients">
            <div className="ingredient-list">
              {form.ingredients.map((ingredient, index) => (
                <IngredientRow
                  key={index}
                  index={index}
                  ingredient={ingredient}
                  materials={materials}
                  onChange={(next) => updateIngredient(setForm, index, next)}
                  onRemove={() => removeIngredient(setForm, index)}
                  portionCost={draft?.ok ? draft.data.ingredients.find((item) => item.rawMaterialId === ingredient.rawMaterialId)?.portionCostUSD : null}
                />
              ))}
            </div>
          </InfoPanel>
        </div>
        <aside className="builder-summary">
          <div className="summary-card">
            <span>Product Total</span>
            <strong>${formatUsd(draft?.ok ? draft.data.totalCostUSD : 0)}</strong>
            <p>{Math.round(draft?.ok ? draft.data.totalCostLBP : 0).toLocaleString()} LBP</p>
          </div>
          {draft && !draft.ok && <Notice type="warning" message={draft.error.message} />}
          <button className="primary-button full" disabled={saving}><Save size={18} />{saving ? 'Saving...' : 'Save Product'}</button>
        </aside>
      </div>
    </form>
  );
}

function IngredientRow({ ingredient, materials, onChange, onRemove, portionCost }) {
  const selected = materials.find((item) => item.id === ingredient.rawMaterialId);
  const units = selected ? availableUnits(selected) : [['', 'Unit']];

  return (
    <div className="ingredient-row">
      <SelectField label="Raw Material" value={ingredient.rawMaterialId} onChange={(value) => onChange({ ...ingredient, rawMaterialId: value, unit: defaultUnit(materials.find((item) => item.id === value)) })} options={[['', 'Select material'], ...materials.map((item) => [item.id, item.name])]} />
      <TextField label="Quantity" type="number" value={ingredient.quantity} onChange={(value) => onChange({ ...ingredient, quantity: value })} />
      <SelectField label="Unit" value={ingredient.unit} onChange={(value) => onChange({ ...ingredient, unit: value })} options={units} />
      <div className="portion-cost">
        <span>Portion</span>
        <strong>{portionCost == null ? '-' : `$${formatUsd(portionCost)}`}</strong>
      </div>
      <button type="button" className="icon-button danger-text" onClick={onRemove} aria-label="Remove ingredient"><Trash2 size={17} /></button>
    </div>
  );
}

function SettingsView({ settings, refreshAll, setError }) {
  const [rate, setRate] = useState(settings?.currency?.usdToLbp ?? 90000);
  const [notice, setNotice] = useState('');

  async function save() {
    const result = await api.updateSettings({ currency: { usdToLbp: Number(rate) } });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setNotice(result.data.warnings?.[0]?.message ?? 'Settings saved.');
    await refreshAll();
  }

  return (
    <div className="page-stack">
      <PageTitle title="Settings" subtitle="Version 1.0 local data and currency settings." />
      {notice && <Notice type="success" message={notice} onClose={() => setNotice('')} />}
      <InfoPanel title="Currency">
        <div className="form-grid">
          <TextField label="1 USD equals LBP" type="number" value={rate} onChange={setRate} />
        </div>
        <p className="muted">Changing the exchange rate affects displayed LBP/USD values. Raw material base costs remain stored safely.</p>
        <button className="primary-button" onClick={save}><Check size={17} />Save Settings</button>
      </InfoPanel>
      <InfoPanel title="Data Folder">
        <p className="path-text">{settings?.dataFolder}</p>
      </InfoPanel>
    </div>
  );
}

function PageTitle({ title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="card-icon large"><Plus size={28} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="primary-button" onClick={onAction}><Plus size={18} />{actionLabel}</button>
    </div>
  );
}

function InfoPanel({ title, children }) {
  return (
    <section className="info-panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function CostLine({ label, value }) {
  return (
    <div className="cost-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  );
}

function ConversionFields({ unit, form, setForm }) {
  const conversion = form.customConversions?.[unit] ?? { quantity: '', unit: 'g' };
  const ml = metricSpoons[unit];
  const grams = liquidPresets[form.conversionMode] ? roundForInput(ml * liquidPresets[form.conversionMode].density) : null;
  const disabled = form.conversionMode === 'none';
  return (
    <div className={`conversion-box ${disabled ? 'is-disabled' : ''}`}>
      <span>1 {unit} ({ml} ml)</span>
      <input disabled={disabled} value={disabled ? '' : conversion.quantity} type="number" placeholder={disabled ? 'off' : 'amount'} onChange={(event) => updateConversion(setForm, unit, { ...conversion, quantity: event.target.value })} />
      <select disabled={disabled} value={disabled ? 'g' : conversion.unit} onChange={(event) => updateConversion(setForm, unit, { ...conversion, unit: event.target.value })}>
        {unitOptions().map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {grams != null && <small>{grams} g approx.</small>}
    </div>
  );
}

function Notice({ type, message, onClose }) {
  return (
    <div className={`notice ${type}`}>
      <AlertTriangle size={18} />
      <span>{message}</span>
      {onClose && <button className="icon-button" onClick={onClose}><X size={16} /></button>}
    </div>
  );
}

function Loading() {
  return <div className="loading"><RefreshCw size={22} />Loading...</div>;
}

function BackButton({ onClick }) {
  return <button className="ghost-button" onClick={onClick}><ArrowLeft size={17} />Back</button>;
}

function MissingView({ label, onBack }) {
  return <EmptyState title={`Missing ${label}`} text={`This ${label} could not be found.`} actionLabel="Go Back" onAction={onBack} />;
}

function setFormValue(setForm, key, value) {
  setForm((current) => ({ ...current, [key]: value }));
}

function updateConversion(setForm, unit, conversion) {
  setForm((current) => {
    const nextConversions = { ...(current.customConversions ?? {}) };
    if (conversion.quantity === '') delete nextConversions[unit];
    else nextConversions[unit] = conversion;

    if (
      current.conversionMode === 'manual' &&
      unit === 'cup' &&
      conversion.unit === 'g' &&
      conversion.quantity !== '' &&
      Number.isFinite(Number(conversion.quantity))
    ) {
      const gramsPerMl = Number(conversion.quantity) / metricSpoons.cup;
      nextConversions.tbsp = {
        quantity: roundForInput(gramsPerMl * metricSpoons.tbsp),
        unit: 'g'
      };
      nextConversions.tsp = {
        quantity: roundForInput(gramsPerMl * metricSpoons.tsp),
        unit: 'g'
      };
    }

    return { ...current, customConversions: nextConversions };
  });
}

function applyConversionMode(setForm, mode) {
  setForm((current) => {
    if (mode === 'none') {
      return { ...current, conversionMode: 'none', customConversions: {} };
    }

    if (mode === 'manual') {
      return { ...current, conversionMode: 'manual', customConversions: current.customConversions ?? {} };
    }

    const preset = liquidPresets[mode];
    const customConversions = Object.fromEntries(
      Object.entries(metricSpoons).map(([unit, ml]) => [
        unit,
        {
          quantity: roundForInput(ml * preset.density),
          unit: 'g'
        }
      ])
    );

    return {
      ...current,
      conversionMode: mode,
      customConversions
    };
  });
}

function updateIngredient(setForm, index, next) {
  setForm((current) => ensureTrailingEmptyRow({
    ...current,
    ingredients: current.ingredients.map((ingredient, itemIndex) => itemIndex === index ? next : ingredient)
  }));
}

function removeIngredient(setForm, index) {
  setForm((current) => ensureTrailingEmptyRow({
    ...current,
    ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index)
  }));
}

function ensureTrailingEmptyRow(form) {
  const ingredients = [...form.ingredients];
  const last = ingredients[ingredients.length - 1];
  if (!last || last.rawMaterialId || last.quantity || last.unit) {
    ingredients.push({ rawMaterialId: '', quantity: '', unit: '' });
  }
  return { ...form, ingredients };
}

function materialToForm(material) {
  return {
    name: material.name,
    baseUnit: material.baseUnit,
    purchaseQuantity: material.purchaseQuantity,
    purchaseUnit: material.purchaseUnit,
    purchasePrice: material.purchasePriceUSD,
    purchaseCurrency: 'USD',
    customConversions: material.customConversions ?? {},
    conversionMode: Object.keys(material.customConversions ?? {}).length > 0 ? 'manual' : 'none',
    notes: material.notes ?? ''
  };
}

function productToForm(product) {
  return ensureTrailingEmptyRow({
    name: product.name,
    ingredients: product.ingredients.map((ingredient) => ({
      rawMaterialId: ingredient.rawMaterialId,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    }))
  });
}

function unitOptions() {
  return [['kg', 'kg'], ['g', 'g'], ['L', 'L'], ['ml', 'ml'], ['piece', 'piece'], ['pack', 'pack'], ['custom', 'custom']];
}

function customUnitOptions() {
  return [['cup', 'cup'], ['tbsp', 'tbsp'], ['tsp', 'tsp']];
}

function availableUnits(material) {
  const units = new Set([material.baseUnit]);
  if (material.baseUnit === 'kg' || material.baseUnit === 'g') ['kg', 'g'].forEach((unit) => units.add(unit));
  if (material.baseUnit === 'L' || material.baseUnit === 'ml') ['L', 'ml'].forEach((unit) => units.add(unit));
  Object.keys(material.customConversions ?? {}).forEach((unit) => units.add(unit));
  return [...units].map((unit) => [unit, unit]);
}

function defaultUnit(material) {
  return material ? material.baseUnit : '';
}

function filterByName(items, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => item.name.toLowerCase().includes(needle));
}

function formatUsd(value) {
  return Number(value ?? 0).toFixed(2);
}

function roundForInput(value) {
  return Number(Number(value).toFixed(2));
}

function isAdminRoute() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin';
}

function readSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_SESSION_KEY));
  } catch {
    return null;
  }
}

function broadcastUserAccessUpdate() {
  localStorage.setItem(USER_ACCESS_SYNC_KEY, new Date().toISOString());
  if (typeof BroadcastChannel === 'function') {
    const channel = new BroadcastChannel(USER_ACCESS_CHANNEL);
    channel.postMessage({ type: 'users-updated' });
    channel.close();
  }
  window.dispatchEvent(new CustomEvent('item-cost-users-updated'));
}

createRoot(document.getElementById('root')).render(<App />);
