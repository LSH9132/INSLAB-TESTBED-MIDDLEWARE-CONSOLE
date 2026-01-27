'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import type { PiNode } from '@inslab/shared';

export default function PiManagementPage() {
  const [pis, setPis] = useState<PiNode[]>([]);
  const [form, setForm] = useState({ hostname: '', ipManagement: '', ipRing: '', sshUser: 'pi', sshPort: '22' });

  const load = () => apiFetch<PiNode[]>('/api/pis').then(setPis).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    await apiFetch('/api/pis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sshPort: Number(form.sshPort) }),
    });
    setForm({ hostname: '', ipManagement: '', ipRing: '', sshUser: 'pi', sshPort: '22' });
    load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/pis/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Pi Management</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Register New Pi</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input placeholder="Hostname" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <input placeholder="Management IP" value={form.ipManagement} onChange={(e) => setForm({ ...form, ipManagement: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <input placeholder="Ring IP" value={form.ipRing} onChange={(e) => setForm({ ...form, ipRing: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <input placeholder="SSH User" value={form.sshUser} onChange={(e) => setForm({ ...form, sshUser: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <input placeholder="SSH Port" value={form.sshPort} onChange={(e) => setForm({ ...form, sshPort: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
        </div>
        <button onClick={handleAdd} className="mt-3 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">Add Pi</button>
      </div>

      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 border-b border-gray-800">
          <tr>
            <th className="px-3 py-2">Hostname</th>
            <th className="px-3 py-2">Management IP</th>
            <th className="px-3 py-2">Ring IP</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Ring #</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pis.map((pi) => (
            <tr key={pi.id} className="border-b border-gray-900">
              <td className="px-3 py-2">{pi.hostname}</td>
              <td className="px-3 py-2">{pi.ipManagement}</td>
              <td className="px-3 py-2">{pi.ipRing}</td>
              <td className="px-3 py-2">{pi.status}</td>
              <td className="px-3 py-2">{pi.ringPosition ?? '-'}</td>
              <td className="px-3 py-2">
                <button onClick={() => handleDelete(pi.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
