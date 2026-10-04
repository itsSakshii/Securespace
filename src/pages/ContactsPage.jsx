import { useEffect, useState } from 'react';
import { userApi } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import MainLayout from '../layouts/MainLayout';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relationship: '', notifyOnSOS: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      const res = await userApi.getProfile();
      setContacts(res.data.user.emergencyContacts || []);
    } catch {} finally { setLoading(false); }
  };

  const save = async (updatedContacts) => {
    setSaving(true);
    try {
      await userApi.updateEmergencyContacts({ emergencyContacts: updatedContacts });
      setContacts(updatedContacts);
    } catch (err) { alert(getErrorMessage(err, 'Save failed')); }
    setSaving(false);
  };

  const addContact = async () => {
    if (!form.name || !form.phone) return;
    const updated = [...contacts, { ...form, _id: Date.now().toString() }];
    await save(updated);
    setForm({ name: '', phone: '', relationship: '', notifyOnSOS: true });
    setEditMode(false);
  };

  const removeContact = async (id) => {
    const updated = contacts.filter(c => c._id !== id);
    await save(updated);
  };

  const toggleNotify = async (id) => {
    const updated = contacts.map(c => c._id === id ? { ...c, notifyOnSOS: !c.notifyOnSOS } : c);
    await save(updated);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Contacts</h1>
            <p className="text-gray-500 text-sm mt-1">Notified during confirmed emergencies</p>
          </div>
          <button onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-dark">
            + Add Contact
          </button>
        </div>

        {/* Simulated notification notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex gap-2 items-start">
          <span className="text-amber-500">⚠</span>
          <div className="text-xs text-amber-700">
            <strong>SIMULATED NOTIFICATION</strong> — Contacts listed here would receive SOS alerts in production.
            Real SMS integration requires additional configuration. For this prototype, notifications are simulated only.
          </div>
        </div>

        {/* Add form */}
        {editMode && (
          <div className="bg-white rounded-xl border border-brand p-5 mb-5">
            <h3 className="font-semibold text-gray-800 mb-3">Add Contact</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Full name" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Phone *</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="+91-XXXXXXXXXX" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Relationship</label>
                <input value={form.relationship} onChange={e => setForm({...form, relationship: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="e.g. Mother" />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" id="notify" checked={form.notifyOnSOS} onChange={e => setForm({...form, notifyOnSOS: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="notify" className="text-sm text-gray-700">Notify on SOS</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addContact} disabled={saving}
                className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Contact'}
              </button>
              <button onClick={() => setEditMode(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}

        {/* Contacts list */}
        {loading ? <div className="text-gray-400 text-center py-8">Loading...</div> :
          contacts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">👥</span>
              <p>No emergency contacts yet</p>
              <p className="text-sm mt-1">Add contacts who will be notified during emergencies</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => (
                <div key={c._id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center text-brand-dark font-bold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.phone} · {c.relationship}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleNotify(c._id)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${c.notifyOnSOS ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.notifyOnSOS ? '🔔 SOS On' : '🔕 SOS Off'}
                    </button>
                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">SIM</span>
                    <button onClick={() => removeContact(c._id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </MainLayout>
  );
}
