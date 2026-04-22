// pages/restaurants/[id].js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { getUserFromRequest } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

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

export default function RestaurantDetail({ user, restaurant, menuItems, draftOrderId, initialCart, draftOutdated, draftOutdatedReason, draftOwnerName, draftSharedWithName }) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart || {});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showDraftRestored, setShowDraftRestored] = useState(Boolean(initialCart && Object.keys(initialCart).length));
  const [needsNewOrder, setNeedsNewOrder] = useState(Boolean(draftOutdated));
  const [clearingDraft, setClearingDraft] = useState(false);
  const [syncingDraft, setSyncingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(Boolean(draftOrderId));
  const hasMountedRef = useRef(false);
  const cartCacheKey = useMemo(
    () => `cart:${user.id}:${restaurant.id}`,
    [user.id, restaurant.id]
  );
  const toAmount = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draftOutdated) {
      localStorage.removeItem(cartCacheKey);
      return;
    }

    try {
      const raw = localStorage.getItem(cartCacheKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (Object.keys(initialCart || {}).length > 0) return;

      const restored = {};
      for (const item of Object.values(parsed)) {
        if (!item || typeof item !== 'object') continue;
        if (!item.id || !item.qty) continue;
        restored[item.id] = { ...item, price: toAmount(item.price) };
      }

      if (Object.keys(restored).length > 0) {
        setCart(restored);
        setShowDraftRestored(true);
      }
    } catch {
      localStorage.removeItem(cartCacheKey);
    }
  }, [cartCacheKey, draftOutdated, initialCart]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (needsNewOrder) {
      localStorage.removeItem(cartCacheKey);
      return;
    }

    if (Object.keys(cart).length === 0) {
      localStorage.removeItem(cartCacheKey);
      return;
    }

    localStorage.setItem(cartCacheKey, JSON.stringify(cart));
  }, [cart, cartCacheKey, needsNewOrder]);

  useEffect(() => {
    if (needsNewOrder) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(async () => {
      setSyncingDraft(true);
      try {
        const data = await gql(
          `
            mutation SaveDraft($draftOrderId: Int, $restaurantId: Int!, $items: [OrderItemInput!]!) {
              saveDraftOrder(draftOrderId: $draftOrderId, restaurantId: $restaurantId, items: $items) {
                id
              }
            }
          `,
          {
            draftOrderId,
            restaurantId: restaurant.id,
            items: Object.values(cart).map((item) => ({
              menuItemId: item.id,
              quantity: item.qty,
            })),
          }
        );

        setDraftSaved(Boolean(data.saveDraftOrder));
      } catch (err) {
        setError(err.message);
      } finally {
        setSyncingDraft(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [cart, needsNewOrder, restaurant.id]);

  const addToCart    = (item) => {
    if (needsNewOrder) return;
    setDraftSaved(false);
    setCart(prev => ({ ...prev, [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1 } }));
  };
  const removeFromCart = (item) => setCart(prev => {
    if (needsNewOrder) return prev;
    const updated = { ...prev };
    if (updated[item.id]?.qty > 1) updated[item.id] = { ...updated[item.id], qty: updated[item.id].qty - 1 };
    else delete updated[item.id];
    setDraftSaved(false);
    return updated;
  });

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, i) => sum + toAmount(i.price) * i.qty, 0);
  const currency  = restaurant.region === 'india' ? '₹' : '$';
  const categories = [...new Set(menuItems.map(i => i.category))];

  // Uses the GraphQL endpoint
  const handleCreateOrder = async () => {
    if (needsNewOrder) {
      setError('This draft is outdated. Start a new order first.');
      return;
    }
    if (!cartItems.length) return;
    setCreating(true); setError('');
    try {
      const data = await gql(
        `
          mutation CreateOrder($draftOrderId: Int, $restaurantId: Int!, $items: [OrderItemInput!]!) {
            createOrder(draftOrderId: $draftOrderId, restaurantId: $restaurantId, items: $items) {
              id
            }
          }
        `,
        {
          draftOrderId,
          restaurantId: restaurant.id,
          items: cartItems.map(i => ({ menuItemId: i.id, quantity: i.qty })),
        }
      );
      setDraftSaved(true);
      if (typeof window !== 'undefined') localStorage.removeItem(cartCacheKey);
      router.push(`/orders/${data.createOrder.id}`);
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  };

  const handleStartNewOrder = async () => {
    setError('');
    setClearingDraft(true);
    try {
      if (draftOrderId) {
        await gql(
          `
            mutation Cancel($id: Int!) {
              cancelOrder(id: $id) { id }
            }
          `,
          { id: draftOrderId }
        );
      }
      setCart({});
      setNeedsNewOrder(false);
      setShowDraftRestored(false);
      setDraftSaved(false);
      if (typeof window !== 'undefined') localStorage.removeItem(cartCacheKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setClearingDraft(false);
    }
  };

  return (
    <>
      <Head>
        <title>{restaurant.name} | Culinary Concierge</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <Layout user={user}>
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Menu */}
          <div className="flex-1 min-w-0">
            {showDraftRestored && !needsNewOrder && (
              <div className="mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm flex items-center justify-between gap-3">
                <p>
                  {draftOwnerName && draftOwnerName !== user.name
                    ? `Restored ${draftOwnerName}'s shared cart so you can keep collaborating.`
                    : draftSharedWithName
                      ? `Restored your shared cart with ${draftSharedWithName}.`
                      : 'Restored your saved cart so you can continue this order.'}
                </p>
                <button onClick={() => setShowDraftRestored(false)} className="text-xs font-bold hover:underline">
                  Dismiss
                </button>
              </div>
            )}

            {needsNewOrder && (
              <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                <p className="text-sm font-bold">Your previous draft is outdated.</p>
                <p className="text-xs mt-1">{draftOutdatedReason || 'Menu availability or prices have changed. Start a new order to continue.'}</p>
                <button
                  onClick={handleStartNewOrder}
                  disabled={clearingDraft}
                  className="mt-3 px-3 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-60"
                >
                  {clearingDraft ? 'Starting...' : 'Start New Order'}
                </button>
              </div>
            )}

            <div className="relative h-56 rounded-2xl overflow-hidden mb-6 bg-surface-container">
              {restaurant.imageUrl ? (
                <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-outline">restaurant</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-6 text-white">
                <h1 className="text-2xl font-headline font-black">{restaurant.name}</h1>
                <p className="text-sm text-white/80 mt-0.5">{restaurant.cuisine} · {restaurant.city}</p>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <span className={`badge ${restaurant.region === 'india' ? 'badge-india' : 'badge-america'}`}>{restaurant.region}</span>
                <span className="badge bg-amber-400 text-amber-900">★ {restaurant.rating}</span>
              </div>
            </div>

            {categories.map(cat => (
              <div key={cat} className="mb-8">
                <h2 className="text-lg font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />{cat}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {menuItems.filter(i => i.category === cat).map(item => {
                    const qty = cart[item.id]?.qty || 0;
                    return (
                      <div key={item.id} className="card p-4 flex gap-4 hover:shadow-md transition-shadow group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container flex-shrink-0">
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-2xl text-outline">fastfood</span></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{item.name}</h3>
                            {item.isVegetarian && (
                              <span className="flex-shrink-0 w-4 h-4 border-2 border-green-600 rounded-sm flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-green-600" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{item.description}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-bold text-primary">{currency}{toAmount(item.price).toFixed(2)}</span>
                            {qty === 0 ? (
                              <button onClick={() => addToCart(item)}
                                className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container active:scale-95 transition-all">
                                Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => removeFromCart(item)}
                                  className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest active:scale-90">
                                  <span className="material-symbols-outlined text-sm">remove</span>
                                </button>
                                <span className="font-bold text-sm w-4 text-center">{qty}</span>
                                <button onClick={() => addToCart(item)}
                                  className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-container active:scale-90">
                                  <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Cart */}
          <div className="xl:w-80 flex-shrink-0">
            <div className="card sticky top-24 p-0 overflow-hidden">
              <div className="p-5 bg-primary text-white">
                <h2 className="font-headline font-bold text-lg">Your Order</h2>
                <p className="text-blue-100/90 text-[11px] mt-1">
                  {syncingDraft ? 'Saving cart to your account...' : draftSaved ? 'Cart is saved to your account.' : 'Changes save automatically to your account.'}
                </p>
                <p className="text-blue-200 text-xs">{cartItems.length} items · {restaurant.name}</p>
              </div>
              <div className="p-5">
                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">shopping_cart</span>
                    <p className="text-sm">Add items to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-on-surface truncate">{item.name}</p>
                          <p className="text-xs text-outline">{item.qty} × {currency}{toAmount(item.price).toFixed(2)}</p>
                        </div>
                        <span className="font-bold text-primary ml-2">{currency}{(item.qty * toAmount(item.price)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {cartItems.length > 0 && (
                  <>
                    <div className="border-t border-surface-container-low mt-4 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Subtotal</span>
                        <span className="font-bold">{currency}{cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Tax (5%)</span>
                        <span className="font-bold">{currency}{(cartTotal * 0.05).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-1 border-t border-surface-container">
                        <span>Total</span>
                        <span className="text-primary">{currency}{(cartTotal * 1.05).toFixed(2)}</span>
                      </div>
                    </div>
                    {error && <p className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
                    <button onClick={handleCreateOrder} disabled={creating}
                      className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all text-sm disabled:opacity-60">
                      {creating ? 'Creating Order...' : 'Save & Review Order'}
                    </button>
                  </>
                )}
                {user.role === 'member' && cartItems.length > 0 && (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5">lock</span>
                    Your order will be saved as a draft. A Manager must approve and place it.
                  </p>
                )}
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

  const restaurantId = parseInt(params.id, 10);
  if (Number.isNaN(restaurantId)) {
    return { redirect: { destination: '/restaurants', permanent: false } };
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, isActive: true },
  });
  if (!restaurant) {
    return { redirect: { destination: '/restaurants', permanent: false } };
  }

  if (user.role !== 'admin' && restaurant.region !== user.region)
    return { redirect: { destination: '/restaurants', permanent: false } };

  const allMenuItems = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const draftOrder = await prisma.order.findFirst({
    where: {
      restaurantId: restaurant.id,
      status: 'draft',
      OR: [{ userId: user.id }, { collaborators: { some: { userId: user.id } } }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      collaborators: true,
    },
  });

  const draftCollaboratorIds = draftOrder?.collaborators?.map((c) => c.userId) || [];

  const [draftOwner, draftSharedWith] = await Promise.all([
    draftOrder ? prisma.user.findUnique({ where: { id: draftOrder.userId } }).catch(() => null) : Promise.resolve(null),
    draftCollaboratorIds.length > 0
      ? prisma.user.findFirst({ where: { id: { in: draftCollaboratorIds } }, orderBy: { name: 'asc' } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const byMenuId = Object.fromEntries(allMenuItems.map((m) => [m.id, m]));
  const initialCart = {};
  let draftOutdated = false;
  let draftOutdatedReason = '';

  if (draftOrder) {
    for (const oi of draftOrder.items) {
      const menuItem = byMenuId[oi.menuItemId];
      const currentPrice = menuItem ? parseFloat(menuItem.price.toString()) : null;
      const draftPrice = parseFloat(oi.unitPrice.toString());

      if (!menuItem || !menuItem.isAvailable) {
        draftOutdated = true;
        draftOutdatedReason = 'One or more items in your draft are no longer available.';
        break;
      }

      if (currentPrice !== draftPrice) {
        draftOutdated = true;
        draftOutdatedReason = 'Item prices changed since your last draft.';
        break;
      }

      initialCart[menuItem.id] = {
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        price: currentPrice,
        category: menuItem.category,
        isVegetarian: menuItem.isVegetarian,
        isAvailable: menuItem.isAvailable,
        imageUrl: menuItem.imageUrl,
        qty: oi.quantity,
      };
    }
  }

  const menuItems = allMenuItems.filter((m) => m.isAvailable);

  const serialize = (obj) => JSON.parse(JSON.stringify(obj, (_, v) =>
    typeof v === 'object' && v?.constructor?.name === 'Decimal' ? parseFloat(v.toString()) :
    v instanceof Date ? v.toISOString() : v
  ));

  return {
    props: {
      user,
      restaurant: serialize(restaurant),
      menuItems: serialize(menuItems),
      draftOrderId: draftOrder?.id ?? null,
      initialCart: draftOutdated ? {} : serialize(initialCart),
      draftOutdated,
      draftOutdatedReason,
      draftOwnerName: draftOwner?.name ?? null,
      draftSharedWithName: draftSharedWith?.name ?? null,
    },
  };
}
