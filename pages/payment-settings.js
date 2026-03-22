// pages/payment-settings.js
import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getUserFromRequest, canPerform } from '../lib/auth';
import { prisma } from '../lib/prisma';

// Thin GraphQL helper
async function gql(query, variables = {}) {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const EMPTY = { label: '', type: 'card', lastFour: '', cardholderName: '', expiry: '', region: 'global' };

export default function PaymentSettings({ user, paymentMethods }) {
  const router  = useRouter();
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const input = {
        label: form.label, type: form.type, region: form.region,
        lastFour: form.lastFour || null, cardholderName: form.cardholderName || null,
        expiry: form.expiry || null,
      };
      if (editId) {
        await gql(
          `mutation Update($id: Int!, $input: PaymentMethodInput!) { updatePaymentMethod(id: $id, input: $input) { id } }`,
          { id: editId, input }
        );
        setSuccess('Payment method updated!');
      } else {
        await gql(
          `mutation Create($input: PaymentMethodInput!) { createPaymentMethod(input: $input) { id } }`,
          { input }
        );
        setSuccess('Payment method added!');
      }
      setEditId(null); setForm(EMPTY);
      router.replace(router.asPath);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment method?')) return;
    await gql(`mutation { deletePaymentMethod(id: ${id}) }`);
    router.replace(router.asPath);
  };

  const startEdit = (pm) => {
    setEditId(pm.id);
    setForm({ label: pm.label, type: pm.type, lastFour: pm.lastFour || '', cardholderName: pm.cardholderName || '', expiry: pm.expiry || '', region: pm.region });
    setSuccess(''); setError('');
  };

  return (
    <>
      <Head>
        <title>Payment Settings | Culinary Concierge</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <Layout user={user}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <span className="material-symbols-outlined text-primary">payments</span>
            </div>
            <div>
              <h1 className="text-2xl font-headline font-extrabold text-on-surface">Payment Settings</h1>
              <p className="text-on-surface-variant text-sm">Admin-only: Manage organizational payment methods</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-headline font-bold mb-4">Active Methods</h2>
              <div className="space-y-4">
                {paymentMethods.map(pm => (
                  <div key={pm.id} className={`card transition-all ${editId === pm.id ? 'ring-2 ring-primary' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-sm">
                            {pm.type === 'card' ? 'credit_card' : pm.type === 'bank' ? 'account_balance' : 'payments'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{pm.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {pm.lastFour && <p className="text-xs text-outline">•••• {pm.lastFour}</p>}
                            <span className={`badge text-[10px] ${pm.region === 'india' ? 'badge-india' : pm.region === 'america' ? 'badge-america' : 'badge-global'}`}>{pm.region}</span>
                            {pm.isPrimary && <span className="badge bg-green-100 text-green-700 text-[10px]">Primary</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(pm)} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-primary">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => handleDelete(pm.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-500">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {paymentMethods.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant text-sm">No payment methods added yet.</div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-headline font-bold mb-4">{editId ? 'Edit' : 'Add'} Payment Method</h2>
              <div className="card">
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>}
                {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Label</label>
                    <input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                      className="input" placeholder="e.g. Global Corporate Visa" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Type</label>
                      <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input appearance-none">
                        <option value="card">Card</option>
                        <option value="bank">Bank</option>
                        <option value="upi">UPI</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Region</label>
                      <select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="input appearance-none">
                        <option value="global">Global</option>
                        <option value="india">India</option>
                        <option value="america">America</option>
                      </select>
                    </div>
                  </div>
                  {form.type === 'card' && (
                    <>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Cardholder Name</label>
                        <input type="text" value={form.cardholderName} onChange={e => setForm({ ...form, cardholderName: e.target.value })}
                          className="input" placeholder="NICHOLAS J. FURY" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Last 4 Digits</label>
                          <input type="text" maxLength={4} value={form.lastFour} onChange={e => setForm({ ...form, lastFour: e.target.value })}
                            className="input" placeholder="8842" />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Expiry</label>
                          <input type="text" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })}
                            className="input" placeholder="MM/YY" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={loading}
                      className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all text-sm disabled:opacity-60">
                      {loading ? 'Saving...' : editId ? 'Update Method' : 'Add Method'}
                    </button>
                    {editId && (
                      <button type="button" onClick={() => { setEditId(null); setForm(EMPTY); }}
                        className="px-4 py-2.5 text-sm font-bold text-primary border-2 border-primary rounded-xl hover:bg-primary/5 transition-all">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm mt-0.5">security</span>
                <p>This page is restricted to Admin users only. All mutations go through the GraphQL API with RBAC enforcement.</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const user = getUserFromRequest(req);
  if (!user) return { redirect: { destination: '/login', permanent: false } };
  if (!canPerform(user, 'update_payment')) return { redirect: { destination: '/dashboard', permanent: false } };

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  });

  return {
    props: {
      user,
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id, label: pm.label, type: pm.type,
        lastFour: pm.lastFour, cardholderName: pm.cardholderName,
        expiry: pm.expiry, region: pm.region, isPrimary: pm.isPrimary,
      })),
    },
  };
}
