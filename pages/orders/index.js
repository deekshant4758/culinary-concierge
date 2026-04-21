// pages/orders/index.js
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { getUserFromRequest, canPerform } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { calculateOrderTotal } from '../../lib/pricing';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700', placed: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700', delivering: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

export default function Orders({ user, orders }) {
  const canCancel = canPerform(user, 'cancel_order');

  const handleCancel = async (orderId) => {
    if (!confirm('Cancel this order?')) return;
    await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation { cancelOrder(id: ${orderId}) { id } }`,
      }),
    });
    window.location.reload();
  };

  return (
    <>
      <Head>
        <title>Orders | Culinary Concierge</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <Layout user={user}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-on-surface">Orders</h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              {user.role === 'admin' ? 'All regions' : `${user.region} region`}
            </p>
          </div>
          <Link href="/restaurants" className="btn-primary flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-sm">add</span>New Order
          </Link>
        </div>

        <div className="card p-0 overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3">receipt_long</span>
              <p className="text-on-surface-variant">No orders found.</p>
              <Link href="/restaurants" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">Browse Restaurants</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low">
                  <tr>
                    {['Order ID', 'Restaurant', ...(user.role === 'admin' ? ['Customer', 'Region'] : []), 'Status', 'Amount', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-outline">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {orders.map(order => {
                    const currency = order.region === 'india' ? '₹' : '$';
                    const cancellable = ['draft', 'placed', 'processing'].includes(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-primary text-sm">
                          <Link href={`/orders/${order.id}`}>#{order.id.toString().padStart(5, '0')}</Link>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{order.restaurantName}</td>
                        {user.role === 'admin' && (
                          <>
                            <td className="px-6 py-4 text-sm">{order.userName}</td>
                            <td className="px-6 py-4">
                              <span className={`badge ${order.region === 'india' ? 'badge-india' : 'badge-america'}`}>{order.region}</span>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <span className={`badge ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-sm">{currency}{order.totalAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-outline">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/orders/${order.id}`} className="text-xs font-bold text-primary hover:underline">View</Link>
                            {canCancel && cancellable && (
                              <button onClick={() => handleCancel(order.id)} className="btn-danger">Cancel</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const user = getUserFromRequest(req);
  if (!user) return { redirect: { destination: '/login', permanent: false } };

  const where = user.role === 'admin' ? {}
    : user.role === 'manager' ? { region: user.region }
    : { OR: [{ userId: user.id }, { sharedWithUserId: user.id }] };

  const orders = await prisma.order.findMany({
    where,
    include: { restaurant: true, user: true, items: true },
    orderBy: { createdAt: 'desc' },
  });

  const serialized = orders.map(o => ({
    id: o.id, status: o.status, region: o.region,
    totalAmount: calculateOrderTotal(
      o.items.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0)
    ),
    createdAt: o.createdAt.toISOString(),
    restaurantName: o.restaurant.name,
    userName: o.user.name,
  }));

  return { props: { user, orders: serialized } };
}
