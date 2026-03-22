// pages/dashboard.js
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { getUserFromRequest } from '../lib/auth';
import { prisma } from '../lib/prisma';

export default function Dashboard({ user, stats, recentOrders }) {
  return (
    <>
      <Head>
        <title>Dashboard | Culinary Concierge</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <Layout user={user}>
        <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-on-surface">
              Welcome, {user.name}
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm capitalize">
              {user.role === 'admin' ? 'Global Operations Overview'
                : `${user.region.charAt(0).toUpperCase() + user.region.slice(1)} Region Overview`}
            </p>
          </div>
          <Link href="/restaurants" className="btn-primary flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-sm">add</span>
            New Order
          </Link>
        </section>

        {user.role === 'member' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-sm text-amber-800">
            <span className="material-symbols-outlined text-amber-500">info</span>
            As a Team Member, you can browse restaurants and add items to orders. A Manager must approve and place the final order.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Orders',  value: stats.totalOrders,  icon: 'receipt_long',   color: 'bg-blue-50 text-blue-700' },
            { label: 'Active Orders', value: stats.activeOrders, icon: 'pending_actions', color: 'bg-orange-50 text-orange-700' },
            { label: 'Restaurants',   value: stats.restaurants,  icon: 'restaurant',      color: 'bg-green-50 text-green-700' },
            { label: 'Total Spent',   value: stats.totalSpent,   icon: 'payments',        color: 'bg-purple-50 text-purple-700' },
          ].map(stat => (
            <div key={stat.label} className="card flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-headline font-bold text-on-surface">{stat.value}</p>
                <p className="text-xs text-outline uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="p-6 border-b border-surface-container-low flex items-center justify-between">
            <h2 className="text-lg font-headline font-bold">Recent Orders</h2>
            <Link href="/orders" className="text-primary text-sm font-bold hover:underline">View All</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3">receipt_long</span>
              <p className="text-on-surface-variant">No orders yet.</p>
              <Link href="/restaurants" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
                Browse Restaurants
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low">
                  <tr>
                    {['Order ID', 'Restaurant', ...(user.role === 'admin' ? ['Region'] : []), 'Status', 'Amount', 'Date'].map(h => (
                      <th key={h} className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-outline">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary text-sm">
                        <Link href={`/orders/${order.id}`}>#{order.id.toString().padStart(5, '0')}</Link>
                      </td>
                      <td className="px-6 py-4 text-sm">{order.restaurantName}</td>
                      {user.role === 'admin' && (
                        <td className="px-6 py-4">
                          <span className={`badge ${order.region === 'india' ? 'badge-india' : 'badge-america'}`}>{order.region}</span>
                        </td>
                      )}
                      <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                      <td className="px-6 py-4 font-bold text-sm">
                        {order.region === 'india' ? '₹' : '$'}{order.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-outline">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-700', placed: 'bg-blue-100 text-blue-700',
    processing: 'bg-yellow-100 text-yellow-700', delivering: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
  };
  return <span className={`badge ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
}

export async function getServerSideProps({ req }) {
  const user = getUserFromRequest(req);
  if (!user) return { redirect: { destination: '/login', permanent: false } };

  const orderWhere = user.role === 'admin' ? {}
    : user.role === 'manager' ? { region: user.region }
    : { userId: user.id };

  const rWhere = user.role === 'admin' ? { isActive: true } : { isActive: true, region: user.region };

  const [totalOrders, activeOrders, restaurants, spent, recentOrders] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.order.count({ where: { ...orderWhere, status: { in: ['placed', 'processing', 'delivering'] } } }),
    prisma.restaurant.count({ where: rWhere }),
    prisma.order.aggregate({ where: { ...orderWhere, status: { not: 'cancelled' } }, _sum: { totalAmount: true } }),
    prisma.order.findMany({
      where: orderWhere,
      include: { restaurant: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const currency = user.region === 'america' ? '$' : '₹';
  const totalSpent = parseFloat(spent._sum.totalAmount?.toString() || '0').toFixed(2);

  const serialized = recentOrders.map(o => ({
    id: o.id,
    status: o.status,
    region: o.region,
    totalAmount: parseFloat(o.totalAmount.toString()),
    createdAt: o.createdAt.toISOString(),
    restaurantName: o.restaurant.name,
  }));

  return {
    props: {
      user,
      stats: { totalOrders, activeOrders, restaurants, totalSpent: `${currency}${totalSpent}` },
      recentOrders: serialized,
    },
  };
}
