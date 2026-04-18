"use client";

import { useEffect, useState } from "react";
import { generateDemoProducts, type DemoProduct } from "@/lib/demo-data";
import { getProducts, isAdminLoggedIn, saveProducts, setAdminLoggedIn } from "@/lib/demo-storage";

const emptyProduct: DemoProduct = {
  id: "",
  slug: "",
  name: "",
  category: "shoes",
  brand: "",
  price: 1999,
  colors: ["black", "blue"],
  sizes: ["7", "8", "9", "10"],
  stock: 10,
  image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  description: "",
  tags: ["demo", "new"],
  featured: false,
  rating: 4.4,
};

export function AdminPanel() {
  const [products, setProducts] = useState<DemoProduct[]>(() =>
    typeof window === "undefined" ? generateDemoProducts() : getProducts(),
  );
  const [draft, setDraft] = useState<DemoProduct>(emptyProduct);
  const [ready] = useState(() => (typeof window === "undefined" ? false : isAdminLoggedIn()));

  useEffect(() => {
    if (!ready) {
      window.location.href = "/admin/login";
    }
  }, [ready]);

  function persist(nextProducts: DemoProduct[]) {
    setProducts(nextProducts);
    saveProducts(nextProducts);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!draft.name || !draft.slug || !draft.brand) {
      return;
    }

    const normalized = {
      ...draft,
      id: draft.id || `demo-${Date.now()}`,
    };

    const nextProducts = draft.id
      ? products.map((item) => (item.id === draft.id ? normalized : item))
      : [normalized, ...products];

    persist(nextProducts);
    setDraft(emptyProduct);
  }

  function handleEdit(product: DemoProduct) {
    setDraft(product);
  }

  function handleDelete(id: string) {
    persist(products.filter((product) => product.id !== id));
  }

  function resetCatalog() {
    const seeded = generateDemoProducts();
    persist(seeded);
    setDraft(emptyProduct);
  }

  if (!ready) {
    return <section className="auth-card"><p>Checking admin access...</p></section>;
  }

  return (
    <div className="admin-layout">
      <section className="admin-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">Inventory</span>
            <h2>Update Demo Products</h2>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setAdminLoggedIn(false);
              window.location.href = "/admin/login";
            }}
          >
            Logout
          </button>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="slug" />
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="name" />
          <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="category" />
          <input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} placeholder="brand" />
          <input
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
            placeholder="price"
            type="number"
          />
          <input
            value={draft.colors.join(",")}
            onChange={(e) => setDraft({ ...draft, colors: e.target.value.split(",").map((item) => item.trim()) })}
            placeholder="colors"
          />
          <input
            value={draft.tags.join(",")}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((item) => item.trim()) })}
            placeholder="tags"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="description"
            rows={4}
          />
          <div className="admin-actions">
            <button type="submit" className="primary-button">
              {draft.id ? "Update Item" : "Add Item"}
            </button>
            <button type="button" className="ghost-button" onClick={resetCatalog}>
              Reset 120 Products
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">Items</span>
            <h2>{products.length} products in local demo storage</h2>
          </div>
        </div>
        <div className="inventory-list">
          {products.slice(0, 24).map((product) => (
            <div key={product.id} className="inventory-row">
              <div>
                <strong>{product.name}</strong>
                <p>
                  {product.category} · Rs. {product.price} · stock {product.stock}
                </p>
              </div>
              <div className="inventory-actions">
                <button type="button" className="ghost-button" onClick={() => handleEdit(product)}>
                  Edit
                </button>
                <button type="button" className="danger-button" onClick={() => handleDelete(product.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
