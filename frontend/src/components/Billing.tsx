import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface BillingProps {
  token: string;
}

export default function Billing({ token }: BillingProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [challans, setChallans] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'list'>('create');

  // Form States
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [challanStatus, setChallanStatus] = useState('Draft');
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [custRes, prodRes, challanRes] = await Promise.all([
        fetch(`${API_URL}/customers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/delivery`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (custRes.ok) setCustomers(await custRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (challanRes.ok) setChallans(await challanRes.json());
    } catch (err) {
      console.error('Data fetch error', err);
    }
  };

  const currentProduct = products.find(p => p.id.toString() === selectedProduct);
  const totalAmount = currentProduct ? parseFloat(currentProduct.price) * quantity : 0;

  const handleGenerateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer,
          status: challanStatus,
          products: [
            {
              product_id: selectedProduct,
              quantity: Number(quantity)
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate challan');
      }

      setMessage({ type: 'success', text: `Challan (${data.challan_number}) successfully saved as ${challanStatus}!` });
      setSelectedCustomer('');
      setSelectedProduct('');
      setQuantity(1);
      setChallanStatus('Draft');
      fetchData(); // Refresh challans and product stocks
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button 
          onClick={() => setActiveSubTab('create')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSubTab === 'create' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          ➕ Create Sales Challan
        </button>
        <button 
          onClick={() => setActiveSubTab('list')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSubTab === 'list' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          🧾 All Challans History
        </button>
      </div>

      {/* TAB 1: CREATE CHALLAN */}
      {activeSubTab === 'create' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Generate Sales Challan / Bill</h2>

          {message.text && (
            <div className={`p-4 rounded-lg mb-6 text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleGenerateChallan} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Customer *</label>
                <select 
                  required 
                  value={selectedCustomer} 
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.customer_name} ({c.business_name || 'Individual'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Challan Status *</label>
                <select 
                  value={challanStatus} 
                  onChange={e => setChallanStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand bg-white font-semibold text-teal-700"
                >
                  <option value="Draft">Draft (Save for later, No stock reduction)</option>
                  <option value="Confirmed">Confirmed (Final Bill, Immediate stock deduction)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Product *</label>
                <select 
                  required 
                  value={selectedProduct} 
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} (Stock: {p.stock_quantity} | ₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={quantity} 
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            {currentProduct && (
              <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border border-gray-100">
                <div>
                  <div className="text-xs text-gray-500">Unit Price: ₹{currentProduct.price}</div>
                  <div className="text-xs text-gray-500">Available Stock: {currentProduct.stock_quantity} units</div>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  Total Amount: ₹{totalAmount.toFixed(2)}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-teal-800 text-white font-semibold py-3 rounded-lg transition-colors shadow-sm"
            >
              {loading ? 'Processing Challan...' : 'Generate & Save Challan'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: ALL CHALLANS LIST */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Challan Number</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                {challans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">Koi challan generate nahi hua hai.</td>
                  </tr>
                ) : (
                  challans.map(ch => (
                    <tr key={ch.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-teal-800">{ch.challan_number}</td>
                      <td className="p-4 font-semibold text-gray-900">{ch.customer_name}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          ch.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                        }`}>
                          {ch.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-800">₹{ch.total_amount}</td>
                      <td className="p-4 text-xs text-gray-500">{new Date(ch.created_at).toLocaleString()}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Invoice - ${ch.challan_number}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                                      .header { text-align: center; margin-bottom: 30px; }
                                      .invoice-box { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
                                      .flex { display: flex; justify-content: space-between; }
                                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                      th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
                                      th { background-color: #f4f4f4; }
                                      .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="invoice-box">
                                      <div class="header">
                                        <h2>MINI ERP & CRM SYSTEM</h2>
                                        <p>Tax Invoice / Delivery Challan</p>
                                      </div>
                                      <div class="flex">
                                        <div>
                                          <p><strong>Challan Number:</strong> ${ch.challan_number}</p>
                                          <p><strong>Customer:</strong> ${ch.customer_name}</p>
                                        </div>
                                        <div>
                                          <p><strong>Date:</strong> ${new Date(ch.created_at).toLocaleString()}</p>
                                          <p><strong>Status:</strong> ${ch.status}</p>
                                        </div>
                                      </div>
                                      <table>
                                        <tr>
                                          <th>Description</th>
                                          <th>Status</th>
                                          <th>Total Amount</th>
                                        </tr>
                                        <tr>
                                          <td>Sales Order items under challan</td>
                                          <td>${ch.status}</td>
                                          <td>₹${ch.total_amount}</td>
                                        </tr>
                                      </table>
                                      <div class="total">
                                        Grand Total: ₹${ch.total_amount}
                                      </div>
                                    </div>
                                    <script>
                                      window.onload = function() { window.print(); }
                                    </script>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }
                          }}
                          className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-xs font-semibold border border-teal-200 transition-colors"
                        >
                          📥 Download PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}