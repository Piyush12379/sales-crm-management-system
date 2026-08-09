import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface CustomersProps {
  token: string;
}

export default function Customers({ token }: CustomersProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [formData, setFormData] = useState({
    customer_name: '',
    mobile_number: '',
    email: '',
    business_name: '',
    gst_number: '',
    customer_type: 'Wholesale',
    address: '',
    status: 'Lead',
    follow_up_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Customers fetch karne mein fail ho gaya');
      const data = await response.json();
      setCustomers(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      customer_name: '', mobile_number: '', email: '', business_name: '',
      gst_number: '', customer_type: 'Wholesale', address: '', status: 'Lead',
      follow_up_date: '', notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (cust: any) => {
    setEditingId(cust.id);
    setFormData({
      customer_name: cust.customer_name || '',
      mobile_number: cust.mobile_number || '',
      email: cust.email || '',
      business_name: cust.business_name || '',
      gst_number: cust.gst_number || '',
      customer_type: cust.customer_type || 'Wholesale',
      address: cust.address || '',
      status: cust.status || 'Lead',
      follow_up_date: cust.follow_up_date ? cust.follow_up_date.split('T')[0] : '',
      notes: cust.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${API_URL}/customers/${editingId}` 
        : `${API_URL}/customers`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Customer save nahi ho paya');

      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Search & Filter Logic
  const filteredCustomers = customers.filter(c => 
    c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.mobile_number.includes(searchQuery) ||
    (c.business_name && c.business_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  if (loading) return <div className="text-center py-10 text-gray-500">Loading CRM data...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Top Bar: Responsive Search & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <input 
          type="text" 
          placeholder="Search by name, phone or business..." 
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="w-full sm:w-1/3 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand text-sm bg-white"
        />
        <button 
          onClick={handleOpenAddModal}
          className="bg-brand hover:bg-teal-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm text-center"
        >
          + Add Customer
        </button>
      </div>

      {/* Customers Table (Responsive wrapper) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">Customer / Business</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Follow-up</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
              {currentCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Koi customer nahi mila.</td>
                </tr>
              ) : (
                currentCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{c.customer_name}</div>
                      <div className="text-xs text-gray-400">{c.business_name || 'Individual'}</div>
                    </td>
                    <td className="p-4">
                      <div>{c.mobile_number}</div>
                      <div className="text-xs text-gray-400">{c.email || 'No email'}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
                        {c.customer_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        c.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' :
                        c.status === 'Lead' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {c.follow_up_date ? new Date(c.follow_up_date).toLocaleDateString() : 'Not set'}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleOpenEditModal(c)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition-colors"
                      >
                        Edit / View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-100 text-sm">
            <span className="text-gray-500 text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-white border border-gray-200 rounded text-xs font-semibold disabled:opacity-50 hover:bg-gray-100"
              >
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 bg-white border border-gray-200 rounded text-xs font-semibold disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal code remains same */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'Edit Customer Details' : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmitCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Name *</label>
                  <input type="text" required value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Ramesh Kumar" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile Number *</label>
                  <input type="text" required value={formData.mobile_number} onChange={e => setFormData({...formData, mobile_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="9876543210" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="ramesh@test.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Business Name</label>
                  <input type="text" value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Ramesh Traders" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">GST Number</label>
                  <input type="text" value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Type</label>
                  <select value={formData.customer_type} onChange={e => setFormData({...formData, customer_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand bg-white">
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand bg-white">
                    <option value="Lead">Lead</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Follow-up Date</label>
                  <input type="date" value={formData.follow_up_date} onChange={e => setFormData({...formData, follow_up_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Shop No 12, Market..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Follow-up Notes / History</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Discussion summary..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-brand hover:bg-teal-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  {editingId ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}