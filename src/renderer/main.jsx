import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowLeft,
  Cake,
  Calculator,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
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
import { createWebApi, shouldUseWebApi } from './webApi.js';
import hunchiesLogo from './assets/hunchies-logo.png';

const api = window.itemCostApi ?? (shouldUseWebApi() ? createWebApi() : createBrowserDemoApi());
const CANONICAL_WEB_HOST = 'item-cost-calculator.vercel.app';
const USER_SESSION_KEY = 'item_cost_current_user';
const USER_ACCESS_SYNC_KEY = 'item_cost_users_updated_at';
const USER_ACCESS_CHANNEL = 'item-cost-user-access';
const SETTINGS_SYNC_KEY = 'item_cost_settings_updated_at';
const SETTINGS_CHANNEL = 'item-cost-settings';
const DEPARTMENT_OPTIONS_KEY = 'item_cost_department_options';

const sectionConfig = [
  { id: 'home', label: 'Home', editable: false },
  { id: 'materials', label: 'Raw Materials', editable: true },
  { id: 'products', label: 'Products', editable: true },
  { id: 'settings', label: 'Settings', editable: true }
];

const defaultPermissions = Object.fromEntries(sectionConfig.map((section) => [
  section.id,
  { visible: true, edit: section.editable }
]));

function createEmptyUserForm() {
  return {
    username: '',
    password: '',
    name: '',
    department: '',
    permissions: normalizePermissions(defaultPermissions)
  };
}

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

redirectToCanonicalWebHost();

function App() {
  return isAdminRoute() ? <AdminApp /> : <MainApp />;
}

function MainApp() {
  const [currentUser, setCurrentUser] = useState(() => readSessionUser());
  const [activeView, setActiveView] = useState({ name: 'home' });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchScope, setProductSearchScope] = useState('all');
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userPermissions = useMemo(() => normalizePermissions(currentUser?.permissions), [currentUser?.permissions]);
  const canView = (section) => canViewSection(userPermissions, section);
  const canEdit = (section) => canEditSection(userPermissions, section);

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

  usePullToRefresh(Boolean(currentUser), refreshAll);

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
        const sessionUser = withoutUserPassword(latest);
        if (JSON.stringify(sessionUser) !== JSON.stringify(currentUser)) {
          sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));
          setCurrentUser(sessionUser);
        }
      });
    }

    function handleStorage(event) {
      if (event.key === USER_ACCESS_SYNC_KEY) syncCurrentUser();
      if (event.key === SETTINGS_SYNC_KEY) refreshAll();
    }

    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(USER_ACCESS_CHANNEL) : null;
    const settingsChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(SETTINGS_CHANNEL) : null;
    if (channel) {
      channel.onmessage = syncCurrentUser;
    }
    if (settingsChannel) {
      settingsChannel.onmessage = refreshAll;
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener('item-cost-users-updated', syncCurrentUser);
    window.addEventListener('item-cost-settings-updated', refreshAll);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('item-cost-users-updated', syncCurrentUser);
      window.removeEventListener('item-cost-settings-updated', refreshAll);
      channel?.close();
      settingsChannel?.close();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (canView(sectionForView(activeView.name))) return;
    const fallback = firstVisibleSection(userPermissions);
    if (fallback && activeView.name !== fallback) {
      setActiveView({ name: fallback });
    }
  }, [activeView.name, currentUser, userPermissions]);

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

  function handleUserChanged(user) {
    const sessionUser = withoutUserPassword(user);
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));
    setCurrentUser(sessionUser);
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
    productSearchScope,
    materials,
    products,
    settings,
    currentUser,
    permissions: userPermissions,
    canView,
    canEdit,
    refreshAll,
    afterMutation,
    setError
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <Sidebar
        activeView={activeView.name}
        canView={canView}
        canEdit={canEdit}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
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
          searchScope={productSearchScope}
          onSearchScopeChange={setProductSearchScope}
          showSearchScope={activeView.name === 'products'}
          onRefresh={refreshAll}
          refreshing={loading}
          onMenu={() => setMobileNavOpen(true)}
          onSettings={() => setActiveView({ name: 'settings' })}
          settings={settings}
          currentUser={currentUser}
          canView={canView}
          onChangePassword={() => setPasswordDialogOpen(true)}
          onLogout={handleLogout}
        />

        <main className="content">
          {error && <Notice type="error" message={error} onClose={() => setError('')} />}
          {loading ? <Loading /> : <ViewRouter context={appContext} />}
        </main>
      </div>
      {passwordDialogOpen && (
        <ChangePasswordDialog
          user={currentUser}
          onChanged={handleUserChanged}
          onClose={() => setPasswordDialogOpen(false)}
        />
      )}
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
        <TextField label="Username" value={form.username} onChange={(value) => setForm({ ...form, username: sanitizeUsernameInput(value) })} />
        <PasswordField label="Password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <button className="primary-button full" disabled={loading}>
          <KeyRound size={18} />
          {loading ? 'Checking...' : 'Open Program'}
        </button>
      </form>
    </main>
  );
}

function ChangePasswordDialog({ user, onChanged, onClose }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.newPassword) {
      setError('Enter a new password.');
      return;
    }
    setSaving(true);
    const result = await api.changePassword(user.id, form);
    setSaving(false);
    if (!result.ok) {
      setForm({ oldPassword: '', newPassword: '' });
      setError(result.error?.code === 'LOGIN_INVALID' ? 'Old password is incorrect.' : result.error?.message ?? 'Could not change password.');
      return;
    }
    onChanged(result.data);
    onClose();
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel" onSubmit={submit}>
        <div>
          <h3>Change password</h3>
          <p>Enter your old password before setting a new one.</p>
        </div>
        {error && <Notice type="error" message={error} onClose={() => setError('')} />}
        <PasswordField label="Old Password" value={form.oldPassword} onChange={(value) => setForm({ ...form, oldPassword: value })} />
        <PasswordField label="New Password" value={form.newPassword} onChange={(value) => setForm({ ...form, newPassword: value })} />
        <div className="button-row">
          <button type="submit" className="primary-button" disabled={saving}><KeyRound size={17} />{saving ? 'Saving...' : 'Save Password'}</button>
          <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AdminApp() {
  const [authorized, setAuthorized] = useState(false);
  const [adminSection, setAdminSection] = useState('users');
  const [pin, setPin] = useState('');
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(() => createEmptyUserForm());
  const [adminSettings, setAdminSettings] = useState(null);
  const [formulaMultiplier, setFormulaMultiplier] = useState(2.5);
  const [userSearch, setUserSearch] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState(() => readDepartmentOptions());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersRefreshing, setUsersRefreshing] = useState(false);
  const visibleDepartmentOptions = useMemo(() => mergeDepartmentOptions(departmentOptions, users.map((user) => user.department)), [departmentOptions, users]);

  async function loadUsers() {
    setUsersRefreshing(true);
    const result = await api.listUsers();
    setUsersRefreshing(false);
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not load users.');
      return;
    }
    setUsers(result.data);
    const mergedOptions = mergeDepartmentOptions(departmentOptions, result.data.map((user) => user.department));
    setDepartmentOptions(mergedOptions);
    writeDepartmentOptions(mergedOptions);
  }

  async function loadAdminSettings() {
    const result = await api.loadSettings();
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not load formulas.');
      return;
    }
    setAdminSettings(result.data);
    setFormulaMultiplier(result.data.formulas?.totalCostMultiplier ?? 2.5);
  }

  async function refreshAdminData() {
    await Promise.all([loadUsers(), loadAdminSettings()]);
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
    api.setAdminKey?.(pin);
    setAuthorized(true);
    await refreshAdminData();
  }

  async function createUser(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const result = await api.createUser(form);
    setLoading(false);
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not create user.');
      return;
    }
    saveDepartmentOption(form.department);
    setForm(createEmptyUserForm());
    setNotice(`${result.data.username} can now access the program.`);
    broadcastUserAccessUpdate();
    setUsers((current) => [...current.filter((user) => user.id !== result.data.id), result.data]);
    loadUsers();
  }

  async function saveUser(id, input) {
    setError('');
    setNotice('');
    let previousUser = null;
    setUsers((current) => current.map((user) => {
      if (user.id !== id) return user;
      previousUser = user;
      return mergeAdminUserUpdate(user, input);
    }));

    const result = await api.updateUser(id, input);
    if (!result.ok) {
      if (previousUser) {
        setUsers((current) => current.map((user) => user.id === id ? previousUser : user));
      }
      setError(result.error?.message ?? 'Could not update user.');
      return false;
    }
    if (typeof input.department !== 'undefined') saveDepartmentOption(input.department);
    setUsers((current) => current.map((user) => (
      user.id === id ? mergeAdminUserUpdate(user, input, result.data) : user
    )));
    broadcastUserAccessUpdate();
    if (input.username || input.password || input.name || input.department) {
      setNotice(`${result.data.username} was updated.`);
    }
    return true;
  }

  async function deleteUser(id) {
    setError('');
    setNotice('');
    const target = users.find((user) => user.id === id);
    const result = await api.deleteUser(id);
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not delete user.');
      return false;
    }
    setUsers((current) => current.filter((user) => user.id !== id));
    broadcastUserAccessUpdate();
    if (target) setNotice(`${target.username} was deleted.`);
    return true;
  }

  async function saveFormulaMultiplier() {
    const multiplier = Number(formulaMultiplier);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      setError('Enter a multiplier greater than zero.');
      return false;
    }
    const result = await api.updateSettings({ formulas: { totalCostMultiplier: multiplier } });
    if (!result.ok) {
      setError(result.error?.message ?? 'Could not save formula.');
      return false;
    }
    setAdminSettings(result.data.settings);
    setFormulaMultiplier(result.data.settings.formulas.totalCostMultiplier);
    setNotice('Formula saved. Product totals now use the updated multiplier.');
    broadcastSettingsUpdate();
    return true;
  }

  function logoutAdmin() {
    api.setAdminKey?.('');
    setAuthorized(false);
    setPin('');
    setUsers([]);
    setError('');
    setNotice('');
  }

  function saveDepartmentOption(value) {
    const nextOptions = mergeDepartmentOptions(departmentOptions, [value]);
    setDepartmentOptions(nextOptions);
    writeDepartmentOptions(nextOptions);
    return nextOptions.some((option) => departmentKey(option) === departmentKey(value));
  }

  const filteredUsers = filterUsers(users, userSearch);

  usePullToRefresh(authorized, refreshAdminData);

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
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={refreshAdminData} disabled={usersRefreshing}>
            <RefreshCw size={16} />{usersRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="secondary-button" type="button" onClick={logoutAdmin}><LogOut size={16} />Log Out</button>
          <a className="secondary-button" href="/">Back to program</a>
        </div>
      </section>
      {error && <Notice type="error" message={error} onClose={() => setError('')} />}
      {notice && <Notice type="success" message={notice} onClose={() => setNotice('')} />}
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {[
          ['add-user', 'Add User'],
          ['users', 'Users'],
          ['formulas', 'Formulas']
        ].map(([value, label]) => (
          <button type="button" key={value} className={adminSection === value ? 'active' : ''} onClick={() => setAdminSection(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="admin-section-body">
        {adminSection === 'add-user' && (
        <form className="info-panel admin-create admin-section-panel" onSubmit={createUser}>
          <div className="panel-title-row">
            <UserPlus size={20} />
            <h3>Add User</h3>
          </div>
          <TextField label="Username" value={form.username} onChange={(value) => setForm({ ...form, username: sanitizeUsernameInput(value) })} placeholder="New_user" />
          <TextField label="Password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
          <TextField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Ahmad Lamaa" />
          <DepartmentField
            value={form.department}
            onChange={(value) => setForm({ ...form, department: value })}
            options={visibleDepartmentOptions}
            onAddOption={saveDepartmentOption}
          />
          <PermissionEditor permissions={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          <button className="primary-button full" disabled={loading}>
            <UserPlus size={18} />
            {loading ? 'Saving...' : 'Add User'}
          </button>
        </form>
        )}
        {adminSection === 'users' && (
        <section className="info-panel admin-section-panel">
          <div className="panel-title-row">
            <User size={20} />
            <h3>Users</h3>
          </div>
          <label className="search-box admin-search">
            <Search size={17} />
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search username, name, or department" />
          </label>
          {usersRefreshing && users.length > 0 && <p className="muted">Refreshing users...</p>}
          {usersRefreshing && users.length === 0 ? <Loading /> : users.length === 0 ? (
            <p className="muted">No users yet. Add the first user to unlock the main program.</p>
          ) : filteredUsers.length === 0 ? (
            <p className="muted">No users match that search.</p>
          ) : (
            <div className="user-list">
              {filteredUsers.map((user) => (
                <UserRow key={user.id} user={user} onSave={saveUser} onDelete={deleteUser} departmentOptions={visibleDepartmentOptions} onAddDepartment={saveDepartmentOption} />
              ))}
            </div>
          )}
        </section>
        )}
        {adminSection === 'formulas' && (
          <FormulaSettingsPanel
            settings={adminSettings}
            multiplier={formulaMultiplier}
            setMultiplier={setFormulaMultiplier}
            onSave={saveFormulaMultiplier}
          />
        )}
      </div>
    </main>
  );
}

function FormulaSettingsPanel({ settings, multiplier, setMultiplier, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const ok = await onSave();
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <section className="info-panel admin-section-panel formula-panel">
      <div className="panel-title-row">
        <Settings size={20} />
        <h3>Formulas</h3>
      </div>
      <div className="formula-card">
        <div>
          <span className="eyebrow">Total Cost (per product)</span>
          <h3>Total Cost = Ingredients Cost x {settings?.formulas?.totalCostMultiplier ?? multiplier}</h3>
          <p>Used across the calculator when displaying product total costs.</p>
        </div>
        {editing ? (
          <div className="formula-edit">
            <TextField label="Multiplier" type="number" value={multiplier} onChange={setMultiplier} />
            <div className="button-row">
              <button type="button" className="primary-button" disabled={saving} onClick={save}><Save size={17} />{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="secondary-button" disabled={saving} onClick={() => {
                setMultiplier(settings?.formulas?.totalCostMultiplier ?? 2.5);
                setEditing(false);
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="secondary-button fit-button" onClick={() => setEditing(true)}><Pencil size={16} />Edit</button>
        )}
      </div>
      <div className="formula-reference">
        <strong>Ingredients Cost</strong>
        <p>Ingredients Cost is the sum of all ingredient portions in a product, based on each raw material cost and the relative quantity used.</p>
      </div>
    </section>
  );
}

function UserRow({ user, onSave, onDelete, departmentOptions, onAddDepartment }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [draft, setDraft] = useState(() => userToDraft(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(userToDraft(user));
  }, [user.id, user.username, user.password, user.name, user.department, user.permissions, user.isActive]);

  async function save() {
    setSaving(true);
    const ok = await onSave(user.id, {
      username: draft.username,
      password: draft.password,
      name: draft.name,
      department: draft.department,
      permissions: draft.permissions,
      isActive: draft.isActive
    });
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function toggleAccess() {
    const nextActive = !draft.isActive;
    setDraft((current) => ({ ...current, isActive: nextActive }));
    setSaving(true);
    const ok = await onSave(user.id, { isActive: nextActive });
    setSaving(false);
    if (!ok) setDraft((current) => ({ ...current, isActive: !nextActive }));
  }

  async function savePermissions(nextPermissions) {
    setDraft((current) => ({ ...current, permissions: nextPermissions }));
    setSaving(true);
    const ok = await onSave(user.id, { permissions: nextPermissions });
    setSaving(false);
    if (!ok) setDraft(userToDraft(user));
  }

  async function confirmDelete() {
    setSaving(true);
    const ok = await onDelete(user.id);
    if (!ok) setSaving(false);
  }

  return (
    <div className={`user-row ${saving ? 'is-saving' : ''}`}>
      <div className="user-row-head">
        <div>
          <strong>{user.username}</strong>
          <span>{user.name || 'No name'}{user.department ? ` · ${user.department}` : ''}</span>
          <span className="admin-password-line">
            Password: {passwordVisible ? user.password : '****'}
            <button type="button" className="inline-icon-button" onClick={() => setPasswordVisible((current) => !current)} aria-label={passwordVisible ? 'Hide admin password' : 'Show admin password'}>
              {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
          <span>{draft.isActive ? 'Active access' : 'Access off'}</span>
        </div>
        <label className="switch" title="Toggle program access">
          <input type="checkbox" checked={draft.isActive} disabled={saving} onChange={toggleAccess} />
          <span />
        </label>
      </div>
      {confirmingDelete ? (
        <div className="delete-confirm-row">
          <span>Delete this user permanently?</span>
          <div className="button-row">
            <button type="button" className="danger-button" disabled={saving} onClick={confirmDelete}><Trash2 size={16} />{saving ? 'Deleting...' : 'Confirm Delete'}</button>
            <button type="button" className="secondary-button" disabled={saving} onClick={() => setConfirmingDelete(false)}>Cancel</button>
          </div>
        </div>
      ) : editing ? (
        <div className="user-edit-stack">
          <div className="user-edit-grid">
            <TextField label="Username" value={draft.username} onChange={(value) => setDraft({ ...draft, username: sanitizeUsernameInput(value) })} />
            <TextField label="Password" value={draft.password} onChange={(value) => setDraft({ ...draft, password: value })} />
            <TextField label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
            <DepartmentField
              value={draft.department}
              onChange={(value) => setDraft({ ...draft, department: value })}
              options={departmentOptions}
              onAddOption={onAddDepartment}
            />
          </div>
          <PermissionEditor permissions={draft.permissions} onChange={savePermissions} />
          <div className="button-row">
            <button type="button" className="primary-button" disabled={saving} onClick={save}><Save size={17} />{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="danger-button subtle small-button" onClick={() => setConfirmingDelete(true)}><Trash2 size={15} />Delete</button>
          </div>
        </div>
      ) : (
        <button type="button" className="secondary-button fit-button" onClick={() => setEditing(true)}><Pencil size={16} />Edit User</button>
      )}
    </div>
  );
}

function DepartmentField({ value, onChange, options, onAddOption }) {
  const [open, setOpen] = useState(false);
  const [optionSearch, setOptionSearch] = useState('');
  const [message, setMessage] = useState('');
  const trimmedValue = String(value ?? '').trim();
  const filteredOptions = filterDepartmentOptions(options, optionSearch || value);

  function addOption() {
    if (!trimmedValue) {
      setMessage('Enter a department first.');
      return;
    }
    if (departmentExists(options, trimmedValue)) {
      setMessage('Department already exists.');
      return;
    }
    onAddOption(trimmedValue);
    onChange(trimmedValue);
    setMessage('Department option added.');
    setOpen(false);
    setOptionSearch('');
  }

  function chooseOption(option) {
    onChange(option);
    setMessage('');
    setOpen(false);
    setOptionSearch('');
  }

  return (
    <label className="field department-field">
      <span>Department</span>
      <div className="department-input-wrap">
        <input
          value={value ?? ''}
          placeholder="Kitchen"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setMessage('');
            setOptionSearch('');
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => {
            if (!document.activeElement?.closest('.department-field')) setOpen(false);
          }, 120)}
        />
        <button type="button" className="department-add-button" onMouseDown={(event) => event.preventDefault()} onClick={addOption} aria-label="Add department option">
          <Plus size={17} />
        </button>
      </div>
      {open && (
        <div className="department-options" role="listbox">
          <div className="department-option-search">
            <Search size={15} />
            <input
              value={optionSearch}
              placeholder="Search departments"
              onFocus={() => setOpen(true)}
              onChange={(event) => setOptionSearch(event.target.value)}
            />
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button type="button" key={departmentKey(option)} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseOption(option)}>
                {option}
              </button>
            ))
          ) : (
            <span className="department-empty">No departments found.</span>
          )}
        </div>
      )}
      {message && <small className="field-hint">{message}</small>}
    </label>
  );
}

function PermissionEditor({ permissions, onChange }) {
  const normalized = normalizePermissions(permissions);
  const homeVisible = normalized.home?.visible !== false;

  function updateSection(sectionId, patch) {
    const current = normalized[sectionId] ?? { visible: true, edit: true };
    const section = sectionConfig.find((item) => item.id === sectionId);
    const next = { ...current, ...patch };
    if (!next.visible || !section?.editable) next.edit = false;
    onChange({ ...normalized, [sectionId]: next });
  }

  return (
    <div className="permission-editor">
      <div className="permission-editor-head">
        <span>Section</span>
        <span>Visible</span>
        <span>Edit</span>
      </div>
      {sectionConfig.map((section) => {
        const value = normalized[section.id] ?? { visible: true, edit: section.editable };
        const homeLocked = section.id !== 'home' && !homeVisible;
        const displayedVisible = homeLocked ? false : value.visible;
        const displayedEdit = homeLocked ? false : value.edit;
        const editDisabled = homeLocked || !displayedVisible || !section.editable;
        return (
          <div className={`permission-row ${homeLocked ? 'is-home-locked' : ''}`} data-section={section.id} key={section.id}>
            <strong>{section.label}</strong>
            <label className={`mini-toggle ${homeLocked ? 'is-disabled' : ''}`}>
              <input
                type="checkbox"
                aria-label={`${section.label} visible`}
                checked={displayedVisible}
                disabled={homeLocked}
                onChange={(event) => updateSection(section.id, { visible: event.target.checked })}
              />
              <span>Visible</span>
            </label>
            <label className={`mini-toggle ${editDisabled ? 'is-disabled' : ''}`}>
              <input
                type="checkbox"
                aria-label={`${section.label} edit`}
                checked={displayedEdit}
                disabled={editDisabled}
                onChange={(event) => updateSection(section.id, { edit: event.target.checked })}
              />
              <span>Edit</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}

function ViewRouter({ context }) {
  const { activeView, canView, canEdit } = context;
  const section = sectionForView(activeView.name);

  if (!canView(section)) return <AccessDenied section={section} />;
  if (['material-new', 'material-edit'].includes(activeView.name) && !canEdit('materials')) return <AccessDenied section="materials" mode="edit" />;
  if (['product-new', 'product-edit'].includes(activeView.name) && !canEdit('products')) return <AccessDenied section="products" mode="edit" />;

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

function Sidebar({ activeView, canView, canEdit, collapsed, onToggleCollapsed, onNavigate, onNewProduct, mobileOpen, onClose }) {
  const nav = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'materials', label: 'Raw Materials', icon: Wheat },
    { id: 'products', label: 'Products', icon: Cake },
    { id: 'settings', label: 'Settings', icon: Settings }
  ].filter((item) => canView(item.id));

  return (
    <>
      {mobileOpen && <button className="scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Calculator size={23} /></div>
          <div className="brand-copy">
            <h1>Item Cost</h1>
            <p>Calculator</p>
          </div>
          <button className="icon-button sidebar-toggle" onClick={onToggleCollapsed} aria-label={collapsed ? 'Open sidebar' : 'Collapse sidebar'}>
            <Menu size={18} />
          </button>
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
        {canEdit('products') && !collapsed && (
          <button className="primary-button full" onClick={onNewProduct}>
            <Plus size={18} />
            New Product
          </button>
        )}
      </aside>
    </>
  );
}

function Header({ title, searchQuery, onSearchChange, searchScope, onSearchScopeChange, showSearchScope, onRefresh, refreshing, onMenu, onSettings, settings, currentUser, canView, onChangePassword, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <button className="icon-button mobile-only" onClick={onMenu} aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <div>
        <h2>{title}</h2>
        <p>1 USD = {(settings?.currency?.usdToLbp ?? 90000).toLocaleString()} LBP</p>
      </div>
      <div className={`search-box ${showSearchScope ? 'has-filter' : ''}`}>
        <Search size={17} />
        <input value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search" />
        {showSearchScope && (
          <select value={searchScope} onChange={(event) => onSearchScopeChange(event.target.value)} aria-label="Search scope">
            <option value="all">All</option>
            <option value="products">Products</option>
          </select>
        )}
      </div>
      <button className="icon-button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh">
        <RefreshCw size={19} />
      </button>
      {canView('settings') && (
        <button className="icon-button" onClick={onSettings} aria-label="Settings">
          <Settings size={20} />
        </button>
      )}
      <div className="user-menu">
        <button className="user-chip" title={currentUser?.username} onClick={() => setMenuOpen((current) => !current)}>
          <User size={16} />
          <span>{currentUser?.username}</span>
        </button>
        {menuOpen && (
          <div className="user-dropdown">
            <button type="button" onClick={() => {
              setMenuOpen(false);
              onChangePassword();
            }}>
              <KeyRound size={15} />Change Password
            </button>
          </div>
        )}
      </div>
      <button className="icon-button" onClick={onLogout} aria-label="Log out">
        <LogOut size={19} />
      </button>
    </header>
  );
}

function HomeView({ setActiveView, materials, products, canView, canEdit }) {
  const [greeting] = useState(() => homeGreetings[Math.floor(Math.random() * homeGreetings.length)]);

  return (
    <div className="page-stack">
      <section className="hero-section">
        <img className="home-logo" src={hunchiesLogo} alt="Hunchies Simply Fresh" />
        <h2>{greeting}</h2>
        <p>Track raw material costs and calculate exactly how much each product costs to make.</p>
      </section>
      <section className="stats-grid">
        {canView('materials') && (
          <ActionCard
            icon={Wheat}
            eyebrow="Raw Materials"
            title={`${materials.length} Cost References`}
            text="Manage base costs, units, and custom food conversions."
            onClick={() => setActiveView({ name: 'materials' })}
          />
        )}
        {canView('products') && (
          <ActionCard
            icon={Cake}
            eyebrow="Products"
            title={`${products.length} Products Costed`}
            text="Build products from raw materials and see live totals."
            onClick={() => setActiveView({ name: 'products' })}
          />
        )}
      </section>
      {canEdit('products') && (
        <section className="cta-band">
          <div>
            <h3>Create a product cost</h3>
            <p>Select raw materials, enter quantities, and calculate production cost in USD and LBP.</p>
          </div>
          <button className="white-button" onClick={() => setActiveView({ name: 'product-new' })}>
            Open Builder <ChevronRight size={17} />
          </button>
        </section>
      )}
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

function RawMaterialsView({ materials, searchQuery, setActiveView, canEdit }) {
  const [sortMode, setSortMode] = useState('default');
  const filtered = sortItems(filterByName(materials, searchQuery), sortMode);
  const canEditMaterials = canEdit('materials');

  return (
    <div className="page-stack">
      <PageTitle
        title="Raw Materials"
        subtitle="Cost references used by products. These do not track stock."
        action={canEditMaterials ? <button className="primary-button" onClick={() => setActiveView({ name: 'material-new' })}><Plus size={18} />Add Raw Material</button> : <span className="readonly-pill">Read only</span>}
      />
      <ListArrangeControl sortMode={sortMode} setSortMode={setSortMode} />
      {filtered.length === 0 ? (
        <EmptyState title="No raw materials yet" text="Add flour, sugar, eggs, or any material you use to make products." actionLabel={canEditMaterials ? 'Add Raw Material' : undefined} onAction={canEditMaterials ? () => setActiveView({ name: 'material-new' }) : undefined} />
      ) : (
        <div className="card-grid">
          {filtered.map((material) => (
            <RawMaterialCard key={material.id} material={material} onClick={() => setActiveView({ name: 'material-detail', id: material.id })} />
          ))}
        </div>
      )}
    </div>
  );
}

function RawMaterialCard({ material, onClick }) {
  const displayCost = rawMaterialDisplayCost(material);
  const boughtCost = boughtUnitDisplayCost(material);

  return (
    <button className="material-card" onClick={onClick}>
      <div className="material-card-head">
        <div className="card-icon"><Wheat size={22} /></div>
        <div>
          <h3>{material.name}</h3>
          <span>Base: {material.baseUnit}</span>
        </div>
      </div>
      <div className="cost-lines">
        <CostLine label={`USD / ${displayCost.label}`} value={`$${formatUsd(displayCost.usd)}`} />
        <CostLine label={`LBP / ${displayCost.label}`} value={`${Math.round(displayCost.lbp).toLocaleString()} LBP`} />
        <CostLine label={`USD / ${boughtCost.label}`} value={`$${formatUsd(boughtCost.usd)}`} />
        <CostLine label={`LBP / ${boughtCost.label}`} value={`${Math.round(boughtCost.lbp).toLocaleString()} LBP`} />
      </div>
    </button>
  );
}

function RawMaterialCostSummary({ material }) {
  const displayCost = rawMaterialDisplayCost(material);
  const boughtCost = boughtUnitDisplayCost(material);

  return (
    <div className="mini-summary">
      <CostLine label={`USD / ${displayCost.label}`} value={`$${formatUsd(displayCost.usd)}`} />
      <CostLine label={`LBP / ${displayCost.label}`} value={`${Math.round(displayCost.lbp).toLocaleString()} LBP`} />
      <CostLine label={`USD / ${boughtCost.label}`} value={`$${formatUsd(boughtCost.usd)}`} />
      <CostLine label={`LBP / ${boughtCost.label}`} value={`${Math.round(boughtCost.lbp).toLocaleString()} LBP`} />
    </div>
  );
}

function RawMaterialDetail({ id, materials, setActiveView, afterMutation, setError, canEdit }) {
  const material = materials.find((item) => item.id === id);
  if (!material) return <MissingView label="raw material" onBack={() => setActiveView({ name: 'materials' })} />;
  const canEditMaterials = canEdit('materials');
  const displayCost = rawMaterialDisplayCost(material);

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
          <p>Cost per {displayCost.label}: ${formatUsd(displayCost.usd)} / {Math.round(displayCost.lbp).toLocaleString()} LBP</p>
        </div>
        {canEditMaterials ? (
          <div className="button-row">
            <button className="secondary-button" onClick={() => setActiveView({ name: 'material-edit', id: material.id })}><Pencil size={16} />Edit</button>
            <button className="danger-button" onClick={remove}><Trash2 size={16} />Delete</button>
          </div>
        ) : <span className="readonly-pill">Read only</span>}
      </div>
      <div className="two-column">
        <InfoPanel title="Purchase">
          <CostLine label="Bought quantity" value={`${material.purchaseQuantity} ${material.purchaseUnit}`} />
          <CostLine label="Purchase price USD" value={`$${formatUsd(material.purchasePriceUSD)}`} />
          <CostLine label="Purchase price LBP" value={`${Math.round(material.purchasePriceLBP).toLocaleString()} LBP`} />
          {(() => {
            const boughtCost = boughtUnitDisplayCost(material);
            return (
              <>
                <CostLine label={`USD / ${boughtCost.label}`} value={`$${formatUsd(boughtCost.usd)}`} />
                <CostLine label={`LBP / ${boughtCost.label}`} value={`${Math.round(boughtCost.lbp).toLocaleString()} LBP`} />
              </>
            );
          })()}
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
      <PageTitle
        title={mode === 'edit' ? 'Edit Raw Material' : 'Add Raw Material'}
        subtitle="Enter the bought quantity and price. The app shows useful cost references for purchasing and display."
        action={<button type="submit" className="primary-button" disabled={saving}><Save size={18} />{saving ? 'Saving...' : 'Save Raw Material'}</button>}
      />
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
          {draft?.ok && <RawMaterialCostSummary material={draft.data} />}
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

function ProductsView({ products, materials, searchQuery, productSearchScope, setActiveView, canEdit }) {
  const [sortMode, setSortMode] = useState('default');
  const filtered = sortItems(filterProducts(products, materials, searchQuery, productSearchScope), sortMode);
  const canEditProducts = canEdit('products');

  return (
    <div className="page-stack">
      <PageTitle
        title="Products"
        subtitle="Products are calculated from the latest raw material costs."
        action={canEditProducts ? <button className="primary-button" onClick={() => setActiveView({ name: 'product-new' })}><Plus size={18} />Create Product</button> : <span className="readonly-pill">Read only</span>}
      />
      <ListArrangeControl sortMode={sortMode} setSortMode={setSortMode} />
      {filtered.length === 0 ? (
        <EmptyState title="No products yet" text="Create a product and add raw materials to calculate total production cost." actionLabel={canEditProducts ? 'Create Product' : undefined} onAction={canEditProducts ? () => setActiveView({ name: 'product-new' }) : undefined} />
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
                <CostLine label="USD Ingredient Cost" value={`$${formatUsd(product.ingredientCostUSD)}`} />
                <CostLine label="USD Total Cost" value={`$${formatUsd(product.totalCostUSD)}`} />
                <CostLine label="LBP Total Cost" value={`${Math.round(product.totalCostLBP).toLocaleString()} LBP`} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListArrangeControl({ sortMode, setSortMode }) {
  return (
    <div className="product-controls">
      <label className="compact-select">
        <span>Arrange</span>
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
          <option value="default">Default</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>
  );
}

function ProductDetail({ id, setActiveView, afterMutation, setError, canEdit }) {
  const [product, setProduct] = useState(null);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const canEditProducts = canEdit('products');

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
  const filteredIngredients = filterProductIngredients(product.ingredients, ingredientSearch);

  return (
    <div className="page-stack">
      <BackButton onClick={() => setActiveView({ name: 'products' })} />
      {product.warnings?.length > 0 && <Notice type="warning" message="This product has a missing raw material reference." />}
      <div className="detail-panel dark-panel">
        <div>
          <span className="eyebrow">{product.id}</span>
          <h2>{product.name}</h2>
          <p>Ingredient cost: ${formatUsd(product.ingredientCostUSD)} / {Math.round(product.ingredientCostLBP).toLocaleString()} LBP</p>
          <p>Total cost: ${formatUsd(product.totalCostUSD)} / {Math.round(product.totalCostLBP).toLocaleString()} LBP</p>
        </div>
        {canEditProducts ? (
          <div className="button-row">
            <button className="secondary-button light" onClick={() => setActiveView({ name: 'product-edit', id })}><Pencil size={16} />Edit</button>
            <button className="danger-button" onClick={remove}><Trash2 size={16} />Delete</button>
          </div>
        ) : <span className="readonly-pill light">Read only</span>}
      </div>
      <InfoPanel title="Ingredient Breakdown">
        <IngredientSearchBar value={ingredientSearch} onChange={setIngredientSearch} placeholder="Search ingredients" />
        <div className="table-list">
          {filteredIngredients.length === 0 ? (
            <p className="muted">No ingredients match that search.</p>
          ) : filteredIngredients.map((ingredient, index) => (
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
  const [ingredientSearch, setIngredientSearch] = useState('');

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

  const ingredientRows = filterProductFormIngredients(form.ingredients, materials, ingredientSearch);

  return (
    <form className="page-stack" onSubmit={submit}>
      <BackButton onClick={() => setActiveView(mode === 'edit' ? { name: 'product-detail', id } : { name: 'products' })} />
      <PageTitle
        title={mode === 'edit' ? 'Edit Product' : 'Product Builder'}
        subtitle="Choose raw materials and quantities. Costs update live from backend calculations."
        action={<button type="submit" className="primary-button" disabled={saving}><Save size={18} />{saving ? 'Saving...' : 'Save Product'}</button>}
      />
      <div className="builder-layout">
        <div className="builder-main">
          <InfoPanel title="Product">
            <TextField label="Product Name" value={form.name} onChange={(value) => setFormValue(setForm, 'name', value)} placeholder="Chocolate Cake" />
          </InfoPanel>
          <InfoPanel title="Ingredients">
            <IngredientSearchBar value={ingredientSearch} onChange={setIngredientSearch} placeholder="Search raw materials to add" />
            <div className="ingredient-list">
              {ingredientRows.length === 0 ? (
                <p className="muted">No ingredients match that search.</p>
              ) : ingredientRows.map(({ ingredient, index }) => (
                <IngredientRow
                  key={index}
                  index={index}
                  ingredient={ingredient}
                  materials={materials}
                  selectedMaterialIds={form.ingredients.map((item, itemIndex) => itemIndex === index ? null : item.rawMaterialId).filter(Boolean)}
                  materialSearchQuery={ingredientSearch}
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
            <span>Ingredient Cost</span>
            <strong>${formatUsd(draft?.ok ? draft.data.ingredientCostUSD : 0)}</strong>
            <p>{Math.round(draft?.ok ? draft.data.ingredientCostLBP : 0).toLocaleString()} LBP</p>
          </div>
          <div className="summary-card total-card">
            <span>Total Cost</span>
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

function IngredientSearchBar({ value, onChange, placeholder }) {
  return (
    <label className="search-box ingredient-search">
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function IngredientRow({ ingredient, materials, selectedMaterialIds, materialSearchQuery, onChange, onRemove, portionCost }) {
  const selected = materials.find((item) => item.id === ingredient.rawMaterialId);
  const units = selected ? availableUnits(selected) : [['', 'Unit']];
  const selectedIds = new Set(selectedMaterialIds);
  const materialOptions = materials.filter((item) => item.id === ingredient.rawMaterialId || !selectedIds.has(item.id));
  const visibleMaterialOptions = filterMaterialOptions(materialOptions, materialSearchQuery, ingredient.rawMaterialId);

  return (
    <div className="ingredient-row">
      <UpwardSelectField label="Raw Material" value={ingredient.rawMaterialId} onChange={(value) => onChange({ ...ingredient, rawMaterialId: value, unit: defaultUnit(materials.find((item) => item.id === value)) })} options={[['', materialSearchQuery.trim() ? 'Select matching material' : 'Select material'], ...visibleMaterialOptions.map((item) => [item.id, item.name])]} />
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

function SettingsView({ settings, refreshAll, setError, canEdit }) {
  const [rate, setRate] = useState(settings?.currency?.usdToLbp ?? 90000);
  const [notice, setNotice] = useState('');
  const canEditSettings = canEdit('settings');

  async function save() {
    if (!canEditSettings) return;
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
          <TextField label="1 USD equals LBP" type="number" value={rate} onChange={setRate} disabled={!canEditSettings} />
        </div>
        <p className="muted">Changing the exchange rate affects displayed LBP/USD values. Raw material base costs remain stored safely.</p>
        {canEditSettings ? <button className="primary-button" onClick={save}><Check size={17} />Save Settings</button> : <span className="readonly-pill">Read only</span>}
      </InfoPanel>
      <InfoPanel title="Data Folder">
        <p className="path-text">{settings?.dataFolder}</p>
      </InfoPanel>
    </div>
  );
}

function AccessDenied({ section, mode = 'view' }) {
  return (
    <div className="empty-state">
      <div className="admin-badge"><ShieldCheck size={26} /></div>
      <h3>{mode === 'edit' ? 'Read-only access' : 'Section unavailable'}</h3>
      <p>
        {mode === 'edit'
          ? `Your account can view ${sectionLabel(section)}, but editing is turned off.`
          : `Your account does not have access to ${sectionLabel(section)}.`}
      </p>
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
      {actionLabel && onAction && <button className="primary-button" onClick={onAction}><Plus size={18} />{actionLabel}</button>}
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

function TextField({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ''} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PasswordField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <label className="field password-field">
      <span>{label}</span>
      <div className="password-input-wrap">
        <input type={visible ? 'text' : 'password'} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="password-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Hide password' : 'Show password'}>
          <Icon size={18} />
        </button>
      </div>
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

function UpwardSelectField({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(([optionValue]) => optionValue === (value ?? ''))?.[1] ?? options[0]?.[1] ?? 'Select';

  function choose(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <label className="field upward-select-field">
      <span>{label}</span>
      <button
        type="button"
        className="custom-select-button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      >
        <span>{selectedLabel}</span>
        <ChevronRight size={16} />
      </button>
      {open && (
        <div className="upward-select-menu" role="listbox">
          {options.map(([optionValue, labelText]) => (
            <button
              type="button"
              key={optionValue}
              className={optionValue === (value ?? '') ? 'active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(optionValue)}
            >
              {labelText}
            </button>
          ))}
        </div>
      )}
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

function rawMaterialDisplayCost(material) {
  const basisQuantity = ['g', 'ml'].includes(material.baseUnit) ? 100 : 1;
  return {
    label: `${basisQuantity} ${material.baseUnit}`,
    usd: Number(material.costPerBaseUnitUSD ?? 0) * basisQuantity,
    lbp: Number(material.costPerBaseUnitLBP ?? 0) * basisQuantity
  };
}

function boughtUnitDisplayCost(material) {
  const quantity = Number(material.purchaseQuantity);
  const divisor = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  return {
    label: `1 ${material.purchaseUnit}`,
    usd: Number(material.purchasePriceUSD ?? 0) / divisor,
    lbp: Number(material.purchasePriceLBP ?? 0) / divisor
  };
}

function filterByName(items, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => item.name.toLowerCase().includes(needle));
}

function filterProducts(products, materials, query, scope) {
  const needle = query.trim().toLowerCase();
  if (!needle) return products;
  return products.filter((product) => {
    const productNameMatches = product.name.toLowerCase().includes(needle);
    if (scope === 'products') return productNameMatches;
    return productNameMatches || product.ingredients?.some((ingredient) => {
      const material = materials.find((item) => item.id === ingredient.rawMaterialId);
      return [
        ingredient.rawMaterialName,
        ingredient.rawMaterialId,
        material?.name
      ].some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  });
}

function sortItems(items, mode) {
  if (mode === 'alphabetical') return [...items].sort((first, second) => first.name.localeCompare(second.name) || first.id.localeCompare(second.id));
  if (mode === 'newest') return [...items].sort((first, second) => dateValue(second.createdAt) - dateValue(first.createdAt));
  if (mode === 'oldest') return [...items].sort((first, second) => dateValue(first.createdAt) - dateValue(second.createdAt));
  return items;
}

function dateValue(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function filterProductIngredients(ingredients, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return ingredients;
  return ingredients.filter((ingredient) => [
    ingredient.rawMaterialName,
    ingredient.rawMaterialId,
    ingredient.quantity,
    ingredient.unit
  ].some((value) => String(value ?? '').toLowerCase().includes(needle)));
}

function filterProductFormIngredients(ingredients, materials, query) {
  const rows = ingredients.map((ingredient, index) => ({ ingredient, index }));
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(({ ingredient }) => {
    if (!ingredient.rawMaterialId) return true;
    const material = materials.find((item) => item.id === ingredient.rawMaterialId);
    return [
      material?.name,
      ingredient.rawMaterialId,
      ingredient.quantity,
      ingredient.unit
    ].some((value) => String(value ?? '').toLowerCase().includes(needle));
  });
}

function filterMaterialOptions(materials, query, selectedId) {
  const needle = query.trim().toLowerCase();
  if (!needle) return materials;
  return materials.filter((material) => (
    material.id === selectedId ||
    material.name.toLowerCase().includes(needle) ||
    material.id.toLowerCase().includes(needle)
  ));
}

function filterUsers(users, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return users;
  return users.filter((user) => [
    user.username,
    user.name,
    user.department
  ].some((value) => String(value ?? '').toLowerCase().includes(needle)));
}

function filterDepartmentOptions(options, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  const cleanOptions = mergeDepartmentOptions(options);
  if (!needle) return cleanOptions;
  return cleanOptions.filter((option) => option.toLowerCase().includes(needle));
}

function mergeDepartmentOptions(...groups) {
  const byKey = new Map();
  groups.flat().forEach((value) => {
    const department = String(value ?? '').trim();
    const key = departmentKey(department);
    if (key && !byKey.has(key)) byKey.set(key, department);
  });
  return [...byKey.values()].sort((first, second) => first.localeCompare(second));
}

function departmentExists(options, value) {
  const key = departmentKey(value);
  return Boolean(key) && options.some((option) => departmentKey(option) === key);
}

function departmentKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function userToDraft(user) {
  return {
    username: user.username,
    password: user.password ?? '',
    name: user.name ?? '',
    department: user.department ?? '',
    permissions: normalizePermissions(user.permissions),
    isActive: user.isActive
  };
}

function mergeAdminUserUpdate(current, input = {}, saved = {}) {
  return {
    ...current,
    ...saved,
    username: input.username ?? saved.username ?? current.username,
    password: input.password ?? saved.password ?? current.password,
    name: input.name ?? saved.name ?? current.name,
    department: input.department ?? saved.department ?? current.department,
    permissions: input.permissions ?? saved.permissions ?? current.permissions,
    isActive: typeof input.isActive === 'boolean' ? input.isActive : (typeof saved.isActive === 'boolean' ? saved.isActive : current.isActive)
  };
}

function normalizePermissions(input = {}) {
  return Object.fromEntries(sectionConfig.map((section) => {
    const current = input?.[section.id] ?? {};
    const visible = typeof current.visible === 'boolean' ? current.visible : true;
    const edit = visible && section.editable && (typeof current.edit === 'boolean' ? current.edit : section.editable);
    return [section.id, { visible, edit }];
  }));
}

function canViewSection(permissions, section) {
  if (permissions?.home?.visible === false) return false;
  return Boolean(permissions?.[section]?.visible);
}

function canEditSection(permissions, section) {
  return canViewSection(permissions, section) && Boolean(permissions?.[section]?.edit);
}

function sectionForView(viewName) {
  if (viewName?.startsWith('material')) return 'materials';
  if (viewName?.startsWith('product')) return 'products';
  if (viewName === 'settings') return 'settings';
  return 'home';
}

function firstVisibleSection(permissions) {
  return sectionConfig.find((section) => canViewSection(permissions, section.id))?.id ?? null;
}

function sectionLabel(sectionId) {
  return sectionConfig.find((section) => section.id === sectionId)?.label ?? 'this section';
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

function redirectToCanonicalWebHost() {
  if (window.itemCostApi || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
  if (!window.location.hostname.endsWith('.vercel.app') || window.location.hostname === CANONICAL_WEB_HOST) return;
  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.hostname = CANONICAL_WEB_HOST;
  window.location.replace(canonicalUrl.toString());
}

function readSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_SESSION_KEY));
  } catch {
    return null;
  }
}

function readDepartmentOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEPARTMENT_OPTIONS_KEY));
    return Array.isArray(parsed) ? mergeDepartmentOptions(parsed) : [];
  } catch {
    return [];
  }
}

function writeDepartmentOptions(options) {
  localStorage.setItem(DEPARTMENT_OPTIONS_KEY, JSON.stringify(mergeDepartmentOptions(options)));
}

function withoutUserPassword(user) {
  const { password, ...sessionUser } = user ?? {};
  return sessionUser;
}

function usePullToRefresh(enabled, onRefresh) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    let startY = null;
    let refreshing = false;

    function onTouchStart(event) {
      if (window.scrollY > 0 || event.touches.length !== 1) {
        startY = null;
        return;
      }
      startY = event.touches[0].clientY;
    }

    function onTouchEnd(event) {
      if (startY == null || refreshing) return;
      const endY = event.changedTouches[0]?.clientY ?? startY;
      if (endY - startY < 90 || window.scrollY > 0) return;
      refreshing = true;
      Promise.resolve(onRefresh()).finally(() => {
        refreshing = false;
      });
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, onRefresh]);
}

function sanitizeUsernameInput(value) {
  return String(value ?? '').replace(/\s+/g, '_');
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

function broadcastSettingsUpdate() {
  localStorage.setItem(SETTINGS_SYNC_KEY, new Date().toISOString());
  if (typeof BroadcastChannel === 'function') {
    const channel = new BroadcastChannel(SETTINGS_CHANNEL);
    channel.postMessage({ type: 'settings-updated' });
    channel.close();
  }
  window.dispatchEvent(new CustomEvent('item-cost-settings-updated'));
}

createRoot(document.getElementById('root')).render(<App />);
