// pages/restaurants/index.js
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { getUserFromRequest } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

export default function Restaurants({ user, restaurants }) {
  return (
    <>
      <Head>
        <title>Restaurants | Culinary Concierge</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <Layout user={user}>
        <div className="mb-6">
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">Restaurants</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            {user.role === 'admin' ? 'All regions' : `Showing ${user.region} region only`}
          </p>
        </div>

        {user.role !== 'admin' && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            Region-locked: You can only see restaurants in your assigned region.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {restaurants.map(r => (
            <Link key={r.id} href={`/restaurants/${r.id}`}
              className="card p-0 overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-48 overflow-hidden bg-surface-container">
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-outline">restaurant</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{r.name}</h3>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-amber-500 text-sm" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                    <span className="text-xs font-bold text-amber-700">{r.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-outline mb-3">{r.cuisine} · {r.city}</p>
                <p className="text-sm text-on-surface-variant line-clamp-2">{r.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`badge ${r.region === 'india' ? 'badge-india' : 'badge-america'}`}>{r.region}</span>
                  <span className="text-xs text-primary font-bold group-hover:underline flex items-center gap-1">
                    View Menu <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {restaurants.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-outline">restaurant</span>
            <p className="text-on-surface-variant mt-3">No restaurants found for your region.</p>
          </div>
        )}
      </Layout>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const user = getUserFromRequest(req);
  if (!user) return { redirect: { destination: '/login', permanent: false } };

  const where = user.role === 'admin'
    ? { isActive: true }
    : { isActive: true, region: user.region };

  const restaurants = await prisma.restaurant.findMany({
    where,
    orderBy: { rating: 'desc' },
  });

  return {
    props: {
      user,
      restaurants: restaurants.map(r => ({
        ...r,
        rating: parseFloat(r.rating.toString()),
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
}
