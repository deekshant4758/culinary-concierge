// pages/orders/[id].js
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { getUserFromRequest, canPerform } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { calculateTax, calculateOrderTotal } from '../../lib/pricing';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', placed: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700', delivering: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};
const STATUS_STEPS = ['draft', 'placed', 'processing', 'delivering', 'delivered'];

// Thin GraphQL client helper
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

export default function OrderDetail({ user, order, orderItems, paymentMethods, eligibleCollaborators, canManageShare, canEditSharedCart }) {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState(order.paymentMethodId || '');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState(order.sharedWithUserId ? String(order.sharedWithUserId) : '');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');

  const canPlace  = canPerform(user, 'place_order');
  const canCancel = canPerform(user, 'cancel_order');
  const currency  = order.region === 'india' ? '₹' : '$';
  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const cancellable = ['draft', 'placed', 'processing'].includes(order.status);
  const taxAmount = calculateTax(order.subtotalAmount);

  const handlePlaceOrder = async () => {
    if (!selectedPayment) { setError('Please select a payment method.'); return; }
    setLoading(true); setError('');
    try {
      await gql(
        `mutation Place($id: Int!, $pmId: Int!) { placeOrder(id: $id, paymentMethodId: $pmId) { id } }`,
        { id: order.id, pmId: parseInt(selectedPayment) }
      );
      router.replace(router.asPath);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this order?')) return;
    setLoading(true);
    try {
      await gql(`mutation { cancelOrder(id: ${order.id}) { id } }`);
      router.replace(router.asPath);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleShareDraft = async () => {
    if (!selectedCollaborator) {
      setShareError('Select a user to invite.');
      return;
    }

    setShareLoading(true);
    setShareError('');
    try {
      await gql(
        `
          mutation ShareDraft($id: Int!, $userId: Int!) {
            shareDraftOrder(id: $id, userId: $userId) { id }
          }
        `,
        { id: order.id, userId: parseInt(selectedCollaborator, 10) }
      );
      router.replace(router.asPath);
    } catch (err) {
      setShareError(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRemoveSharedUser = async () => {
    setShareLoading(true);
    setShareError('');
    try {
      await gql(
        `
          mutation RemoveShare($id: Int!) {
            removeDraftShare(id: $id) { id }
          }
        `,
        { id: order.id }
      );
      router.replace(router.asPath);
    } catch (err) {
      setShareError(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Order #{order.id} | Culinary Concierge</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <Layout user={user}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => router.back()} className="text-outline hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-2xl font-headline font-extrabold text-on-surface">
                  Order #{order.id.toString().padStart(5, '0')}
                </h1>
                <span className={`badge ${STATUS_COLORS[order.status] || ''}`}>{order.status}</span>
              </div>
              <p className="text-sm text-outline ml-9">{order.restaurantName} · {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            {canCancel && cancellable && order.status !== 'cancelled' && (
              <button onClick={handleCancel} disabled={loading} className="btn-danger px-5 py-2 text-sm disabled:opacity-60">
                Cancel Order
              </button>
            )}
          </div>

          {order.status !== 'cancelled' && order.status !== 'draft' && (
            <div className="card mb-6">
              <h2 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">Order Progress</h2>
              <div className="flex items-center">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= stepIndex ? 'bg-primary text-white' : 'bg-surface-container-high text-outline'}`}>
                        {i < stepIndex ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
                      </div>
                      <span className="text-[10px] text-outline mt-1 capitalize">{step}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < stepIndex ? 'bg-primary' : 'bg-surface-container-high'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 card p-0 overflow-hidden">
              <div className="p-5 border-b border-surface-container-low">
                <h2 className="font-headline font-bold">Order Items</h2>
              </div>
              <div className="divide-y divide-surface-container-low">
                {orderItems.map(item => (
                  <div key={item.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-on-surface text-sm">{item.itemName}</p>
                      <p className="text-xs text-outline mt-0.5">Qty: {item.quantity} × {currency}{item.unitPrice.toFixed(2)}</p>
                    </div>
                    <span className="font-bold text-primary text-sm">{currency}{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-surface-container-low space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="font-bold">{currency}{order.subtotalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Tax (5%)</span>
                  <span className="font-bold">{currency}{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-surface-container pt-2">
                  <span>Total</span>
                  <span className="text-primary">{currency}{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {order.status === 'draft' && (
                <div className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-headline font-bold">Shared Cart</h2>
                      <p className="text-xs text-outline mt-1">
                        Invite one same-region teammate or any admin to collaborate on this draft.
                      </p>
                    </div>
                  </div>

                  {canEditSharedCart && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-blue-900">You can edit this draft</p>
                      </div>
                      <Link
                        href={`/restaurants/${order.restaurantId}`}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        Edit Draft
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  )}

                  <div className="text-sm">
                    <p className="text-on-surface-variant">Owner</p>
                    <p className="font-medium">{order.userName}</p>
                  </div>

                  <div className="text-sm">
                    <p className="text-on-surface-variant">Collaborator</p>
                    <p className="font-medium">{order.sharedWithUserName || 'None invited yet'}</p>
                  </div>

                  {canManageShare && (
                    <div className="space-y-2">
                      <label className="text-xs text-outline uppercase tracking-widest font-bold">Invite User</label>
                      <select
                        value={selectedCollaborator}
                        onChange={(e) => setSelectedCollaborator(e.target.value)}
                        className="input"
                      >
                        <option value="">Select a collaborator</option>
                        {eligibleCollaborators.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name} ({candidate.role} - {candidate.region})
                          </option>
                        ))}
                      </select>
                      {shareError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{shareError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleShareDraft}
                          disabled={shareLoading}
                          className="btn-primary flex-1 text-sm disabled:opacity-60"
                        >
                          {shareLoading ? 'Saving...' : order.sharedWithUserId ? 'Update Invite' : 'Invite User'}
                        </button>
                        {order.sharedWithUserId && (
                          <button
                            onClick={handleRemoveSharedUser}
                            disabled={shareLoading}
                            className="btn-secondary flex-1 text-sm disabled:opacity-60"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!canManageShare && order.sharedWithUserId === user.id && (
                    <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                      This draft was shared with you. Your changes in the restaurant cart will sync for both of you.
                    </p>
                  )}
                </div>
              )}

              <div className="card">
                <h2 className="font-headline font-bold mb-4">Payment</h2>
                {order.status === 'draft' && canPlace ? (
                  <div className="space-y-2">
                    <label className="text-xs text-outline uppercase tracking-widest font-bold">Select Method</label>
                    {paymentMethods.map(pm => (
                      <label key={pm.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedPayment == pm.id ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-outline-variant'}`}>
                        <input type="radio" name="payment" value={pm.id}
                          checked={selectedPayment == pm.id} onChange={() => setSelectedPayment(pm.id)}
                          className="accent-primary" />
                        <div>
                          <p className="text-sm font-bold text-on-surface">{pm.label}</p>
                          {pm.lastFour && <p className="text-xs text-outline">•••• {pm.lastFour}</p>}
                        </div>
                      </label>
                    ))}
                    {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
                    <button onClick={handlePlaceOrder} disabled={loading}
                      className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all text-sm mt-2 disabled:opacity-60">
                      {loading ? 'Placing...' : 'Place Order'}
                    </button>
                  </div>
                ) : order.status === 'draft' && !canPlace ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <p className="mt-1">Only Managers and Admins can place orders.</p>
                  </div>
                ) : (
                  <div className="p-4 bg-surface-container-low rounded-xl">
                    <p className="text-xs text-outline mb-1">Payment Method</p>
                    <p className="font-bold text-sm">{order.paymentLabel || 'N/A'}</p>
                    {order.paymentLastFour && <p className="text-xs text-outline">•••• {order.paymentLastFour}</p>}
                  </div>
                )}
              </div>

              <div className="card space-y-3">
                <h2 className="font-headline font-bold">Details</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Region</span>
                    <span className={`badge ${order.region === 'india' ? 'badge-india' : 'badge-america'}`}>{order.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Placed by</span>
                    <span className="font-medium">{order.userName}</span>
                  </div>
                  {order.placedAt && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Placed at</span>
                      <span className="font-medium text-xs">{new Date(order.placedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ req, params }) {
  const user = getUserFromRequest(req);
  if (!user) return { redirect: { destination: '/login', permanent: false } };

  const order = await prisma.order.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      restaurant: true,
      user: true,
      sharedWithUser: true,
      paymentMethod: true,
      items: { include: { menuItem: true } },
    },
  });

  if (!order) return { notFound: true };

  const canViewOrder = user.role === 'admin'
    || order.userId === user.id
    || order.sharedWithUserId === user.id
    || (user.role === 'manager' && order.region === user.region);
  if (!canViewOrder) return { redirect: { destination: '/orders', permanent: false } };

  const paymentMethods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
  const eligibleCollaborators = await prisma.user.findMany({
    where: {
      id: { not: order.userId },
      OR: [{ role: 'admin' }, { region: order.region }],
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  const subtotalAmount = order.items.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0);

  const s = (v) => v instanceof Date ? v.toISOString()
    : v?.constructor?.name === 'Decimal' ? parseFloat(v.toString()) : v;

  return {
    props: {
      user,
      order: {
        id: order.id, status: order.status, region: order.region,
        restaurantId: order.restaurantId,
        subtotalAmount,
        totalAmount: calculateOrderTotal(subtotalAmount),
        createdAt: order.createdAt.toISOString(),
        placedAt: order.placedAt?.toISOString() || null,
        restaurantName: order.restaurant.name,
        userName: order.user.name,
        sharedWithUserId: order.sharedWithUserId,
        sharedWithUserName: order.sharedWithUser?.name || null,
        paymentMethodId: order.paymentMethodId,
        paymentLabel: order.paymentMethod?.label || null,
        paymentLastFour: order.paymentMethod?.lastFour || null,
      },
      orderItems: order.items.map(oi => ({
        id: oi.id, quantity: oi.quantity,
        unitPrice: parseFloat(oi.unitPrice.toString()),
        subtotal: parseFloat(oi.subtotal.toString()),
        itemName: oi.menuItem.name,
      })),
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id, label: pm.label, type: pm.type,
        lastFour: pm.lastFour, isPrimary: pm.isPrimary,
      })),
      eligibleCollaborators: eligibleCollaborators.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        role: candidate.role,
        region: candidate.region,
      })),
      canManageShare: user.role === 'admin' || order.userId === user.id,
      canEditSharedCart: user.role === 'admin' || order.userId === user.id || order.sharedWithUserId === user.id,
    },
  };
}
