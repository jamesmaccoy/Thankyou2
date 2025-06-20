"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Plek {
  id: string;
  title: string;
  subdomain: string;
  description?: string;
  packages?: string[];
  customDomain?: string;
  domainStatus?: string;
  customDomainInput?: string;
}

const fetchPleks = async (): Promise<Plek[]> => {
  const res = await fetch('/api/pages?limit=100');
  if (!res.ok) throw new Error('Failed to fetch pleks');
  const data = await res.json();
  return data.docs || [];
};

export default function PlekAdminsPage() {
  const [pleks, setPleks] = useState<Plek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    subdomain: '',
    description: '',
    customDomain: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    fetchPleks()
      .then(setPleks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    if (!form.title || !form.subdomain) {
      setFormError('Title and Subdomain are required.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          subdomain: form.subdomain,
          description: form.description,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create plek');
      }
      setForm({ title: '', subdomain: '', description: '', customDomain: '' });
      setFormSuccess(true);
      setLoading(true);
      fetchPleks()
        .then(setPleks)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    if (!form.customDomain) {
      setFormError('Custom domain is required.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: form.customDomain,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add domain');
      }
      setForm({ ...form, customDomain: '' });
      setFormSuccess(true);
      setLoading(true);
      fetchPleks()
        .then(setPleks)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    setFormLoading(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove domain');
      }
      setLoading(true);
      fetchPleks()
        .then(setPleks)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddDomainForPlek = async (id: string, customDomain: string) => {
    setFormLoading(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: customDomain,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add domain');
      }
      setLoading(true);
      fetchPleks()
        .then(setPleks)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <div className="container py-10">Loading pleks...</div>;
  if (error) return <div className="container py-10 text-red-500">Error: {error}</div>;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">All Pleks (Admin)</h1>
      {/* Create New Plek Form */}
      <form className="mb-8 p-4 border rounded-lg bg-muted" onSubmit={handleFormSubmit}>
        <h2 className="text-xl font-semibold mb-4">Create New Plek</h2>
        <div className="mb-2">
          <label className="block mb-1 font-medium">Title *</label>
          <input name="title" value={form.title} onChange={handleFormChange} className="w-full p-2 border rounded" required />
        </div>
        <div className="mb-2">
          <label className="block mb-1 font-medium">Subdomain *</label>
          <input name="subdomain" value={form.subdomain} onChange={handleFormChange} className="w-full p-2 border rounded" required />
        </div>
        <div className="mb-2">
          <label className="block mb-1 font-medium">Description</label>
          <textarea name="description" value={form.description} onChange={handleFormChange} className="w-full p-2 border rounded" rows={3} />
        </div>
        {formError && <div className="text-red-500 mb-2">{formError}</div>}
        {formSuccess && <div className="text-green-600 mb-2">Plek created successfully!</div>}
        <Button type="submit" disabled={formLoading}>{formLoading ? 'Creating...' : 'Create Plek'}</Button>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-border rounded-lg">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Subdomain</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Public Link</th>
              <th className="p-2 text-left">Custom Domain</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pleks.map((plek) => (
              <tr key={plek.id} className="border-t border-border">
                <td className="p-2 font-medium">{plek.title}</td>
                <td className="p-2">{plek.subdomain}</td>
                <td className="p-2">{plek.description || '-'}</td>
                <td className="p-2">
                  <a
                    href={`https://${plek.subdomain}.simpleplek.co.za`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {plek.subdomain}.simplelek.co.za
                  </a>
                </td>
                <td>
                  {/* Add Domain Form for each plek */}
                  <form onSubmit={e => {
                    e.preventDefault();
                    if (!plek.customDomainInput) return;
                    handleAddDomainForPlek(plek.id, plek.customDomainInput);
                  }}>
                    <input
                      type="text"
                      name="customDomain"
                      value={plek.customDomainInput || ''}
                      onChange={e => {
                        setPleks(prev => prev.map(p => p.id === plek.id ? { ...p, customDomainInput: e.target.value } : p));
                      }}
                      placeholder="custom.domain.com"
                    />
                    <Button type="submit">Add Domain</Button>
                  </form>
                  {plek.customDomain && (
                    <div>
                      <span>{plek.customDomain}</span>
                      <span>Status: {plek.domainStatus}</span>
                      {typeof plek.customDomain === 'string' && (
                        <Button onClick={() => handleRemoveDomain(plek.customDomain!)}>Remove</Button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-2">
                  <a
                    href={`https://${plek.subdomain}.simpleplek.co.za`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {plek.subdomain}.simpleplek.co.za
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 