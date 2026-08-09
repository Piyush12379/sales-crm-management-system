import { useState } from 'react';
import Customers from './components/Customers'; 
import Products from './components/Products'; 
import Billing from './components/Billing'; 

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  // Nayi line: Role ko bhi localStorage se utha rahe hain
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || ''); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('customers');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5005/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role); // Role save kar rahe hain
      setToken(data.token);
      setUserRole(data.role); // State update kar rahe hain
      
      // Login hote hi role ke hisaab se default tab set karna
      if (data.role === 'Warehouse') setActiveTab('products');
      else if (data.role === 'Accounts') setActiveTab('billing');
      else setActiveTab('customers');

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role'); // Logout par role hatana
    setToken('');
    setUserRole('');
    setEmail('');
    setPassword('');
  };

  // ==========================================
  // VIEW 1: DASHBOARD
  // ==========================================
  if (token) {
    return (
      <div className="flex h-screen bg-brand-light font-sans text-gray-800">
        {/* Sidebar */}
        <div className="w-64 bg-brand-dark text-white flex flex-col">
          <div className="p-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              ☁️ Mini ERP
            </h2>
            <div className="mt-2 text-xs text-teal-300 font-semibold px-2 py-1 bg-teal-900 rounded inline-block">
              Role: {userRole}
            </div>
          </div>
          <nav className="flex-1 px-4 space-y-2 mt-4">
            
            {/* Sales aur Admin ko Customers dikhega */}
            {(userRole === 'Admin' || userRole === 'Sales') && (
              <button 
                onClick={() => setActiveTab('customers')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-brand text-white' : 'hover:bg-gray-800 text-gray-300'}`}
              >
                👥 Customers
              </button>
            )}

            {/* Warehouse aur Admin ko Products dikhega */}
            {(userRole === 'Admin' || userRole === 'Warehouse') && (
              <button 
                onClick={() => setActiveTab('products')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-brand text-white' : 'hover:bg-gray-800 text-gray-300'}`}
              >
                📦 Products
              </button>
            )}

            {/* Sales, Accounts, aur Admin ko Billing dikhegi */}
            {(userRole === 'Admin' || userRole === 'Sales' || userRole === 'Accounts') && (
              <button 
                onClick={() => setActiveTab('billing')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${activeTab === 'billing' ? 'bg-brand text-white' : 'hover:bg-gray-800 text-gray-300'}`}
              >
                🧾 Billing
              </button>
            )}

          </nav>
          <div className="p-4 border-t border-gray-700">
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
            <h1 className="text-2xl font-semibold capitalize text-gray-800">{activeTab}</h1>
            <div className="text-sm text-gray-500">Hello, {userRole}!</div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-8">
            {/* Conditional Rendering based on active tab AND role */}
            {activeTab === 'customers' && (userRole === 'Admin' || userRole === 'Sales') && <Customers token={token} />}
            {activeTab === 'products' && (userRole === 'Admin' || userRole === 'Warehouse') && <Products token={token} />}
            {activeTab === 'billing' && (userRole === 'Admin' || userRole === 'Sales' || userRole === 'Accounts') && <Billing token={token} />}
          </main>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: LOGIN SCREEN
  // ==========================================
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Mini ERP</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand outline-none transition-all"
              placeholder="sales@test.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand hover:bg-teal-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;