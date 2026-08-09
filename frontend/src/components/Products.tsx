import { useState, useEffect } from 'react';

interface ProductsProps {
  token: string;
}

export default function Products({ token }: ProductsProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'logs'>('inventory');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    product_name: '',
    sku_code: '',
    category: '',
    price: '',
    stock_quantity: '',
    warehouse_location: '',
    min_stock_alert: '5'
  });

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5005/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Products fetch karne mein fail ho gaya');
      const data = await response.json();
      setProducts(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch('http://localhost:5005/products/movements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMovements(data);
      }
    } catch (err) {
      console.error('Failed to fetch movements', err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5005/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Product add nahi ho paya');

      setShowModal(false);
      setFormData({
        product_name: '', sku_code: '', category: '', price: '',
        stock_quantity: '', warehouse_location: '', min_stock_alert: '5'
      });
      fetchProducts();
      fetchMovements();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Loading Inventory...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Sub-tabs & Add Button */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveSubTab('inventory')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSubTab === 'inventory' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            📦 Inventory Stock
          </button>
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSubTab === 'logs' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            📋 Stock Movement Logs
          </button>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="bg-brand hover:bg-teal-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          + Add Product
        </button>
      </div>

      {/* TAB 1: INVENTORY LIST */}
      {activeSubTab === 'inventory' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Product Name / SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Alert Limit</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">Koi product nahi mila.</td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isLowStock = p.stock_quantity <= p.min_stock_alert;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">{p.product_name}</div>
                          <div className="text-xs text-gray-400 font-mono">SKU: {p.sku_code}</div>
                        </td>
                        <td className="p-4 text-gray-600">{p.category || 'General'}</td>
                        <td className="p-4 font-medium">₹{p.price}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            isLowStock ? 'bg-red-50 text-red-700 border-red-100 animate-pulse' : 'bg-green-50 text-green-700 border-green-100'
                          }`}>
                            {p.stock_quantity} units {isLowStock && '⚠️ Low'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">{p.warehouse_location || 'Main'}</td>
                        <td className="p-4 text-xs text-gray-500">{p.min_stock_alert}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENT LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Date / Time</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Qty Changed</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">User</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">Abhi tak koi stock movement record nahi hua.</td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-xs text-gray-500">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{m.product_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{m.sku_code}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          m.movement_type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">
                        {m.movement_type === 'IN' ? `+${m.quantity_changed}` : `-${m.quantity_changed}`}
                      </td>
                      <td className="p-4 text-xs text-gray-600">{m.reason}</td>
                      <td className="p-4 text-xs text-gray-400">{m.user_email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Add New Product & Inventory</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Product Name *</label>
                <input type="text" required value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Wireless Mouse" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">SKU / Code *</label>
                  <input type="text" required value={formData.sku_code} onChange={e => setFormData({...formData, sku_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="WM-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Electronics" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price (₹) *</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="499.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Current Stock *</label>
                  <input type="number" required value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Warehouse Location</label>
                  <input type="text" value={formData.warehouse_location} onChange={e => setFormData({...formData, warehouse_location: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Rack A-3" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Min Stock Alert Qty</label>
                  <input type="number" value={formData.min_stock_alert} onChange={e => setFormData({...formData, min_stock_alert: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="5" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-brand hover:bg-teal-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}