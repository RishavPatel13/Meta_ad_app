import { useEffect, useState } from "react";
import { api } from "./api";
import type { Product } from "./types";
import NewProductForm from "./NewProductForm";
import ProductWorkspace from "./ProductWorkspace";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  async function refresh(selectId?: string) {
    const data = await api.products();
    setProducts(data.products);
    if (selectId) {
      setSelectedId(selectId);
      return;
    }
    setSelectedId((current) => {
      if (current && data.products.some((product) => product.id === current)) {
        return current;
      }
      return data.products[0]?.id || null;
    });
  }

  async function removeProduct(product: Product) {
    const ok = window.confirm(
      `Delete "${product.name}" and its personas, angles, and scripts from Airtable? This cannot be undone.`
    );
    if (!ok) return;
    setDeletingId(product.id);
    setError("");
    try {
      await api.deleteProduct(product.id);
      const remaining = products.filter((item) => item.id !== product.id);
      setProducts(remaining);
      if (selectedId === product.id) {
        setCreating(false);
        setSelectedId(remaining[0]?.id || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete product");
    } finally {
      setDeletingId("");
    }
  }

  useEffect(() => {
    refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Could not load products")
    );
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>Meta Ad Desk</h1>
          <p>Airtable in, n8n pipeline, Meta out.</p>
        </div>
        <button
          className="new-btn"
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
        >
          + New product
        </button>
        <div className="product-list">
          {products.map((product) => (
            <div
              key={product.id}
              className={`product-item ${selectedId === product.id && !creating ? "active" : ""}`}
            >
              <button
                className="product-item-main"
                onClick={() => {
                  setCreating(false);
                  setSelectedId(product.id);
                }}
              >
                <strong>{product.name}</strong>
                <span>
                  {product.researchStatus} · {product.personaIds.length} personas
                </span>
              </button>
              <button
                className="icon-delete"
                type="button"
                disabled={deletingId === product.id}
                title="Delete product and history"
                onClick={() => removeProduct(product)}
              >
                {deletingId === product.id ? "…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      </aside>
      <main className="main">
        {error ? <div className="flash error">{error}</div> : null}
        {creating ? (
          <NewProductForm
            onCancel={() => {
              setCreating(false);
              setSelectedId(products[0]?.id || null);
            }}
            onCreated={(id) => {
              setCreating(false);
              refresh(id).catch((err) =>
                setError(err instanceof Error ? err.message : "Reload failed")
              );
            }}
          />
        ) : selectedId ? (
          <ProductWorkspace
            productId={selectedId}
            onDeleted={(id) => {
              const remaining = products.filter((item) => item.id !== id);
              setProducts(remaining);
              setSelectedId(remaining[0]?.id || null);
            }}
          />
        ) : (
          <div className="empty">Create a product to start the pipeline.</div>
        )}
      </main>
    </div>
  );
}
