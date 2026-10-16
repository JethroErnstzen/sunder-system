 "use client";

import { useEffect, useMemo, useState } from "react";

const money = (v: any) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const blankRetail = () => ({ retailer: "", price: "", url: "" });
const cpuOptions = ["Celeron", "i3", "i5", "i7", "i9", "Ultra 5", "Ultra 7", "Ultra 9", "Other"];
const gpuOptions = ["Intel UHD Integrated Graphics", "Intel Iris Xe Integrated Graphics", "Intel Arc 140T Integrated Graphics", "AMD Radeon Integrated Graphics", "Apple Integrated Graphics", "NVIDIA GeForce GTX Dedicated Graphics", "NVIDIA GeForce RTX Dedicated Graphics", "NVIDIA Quadro / RTX Professional Dedicated Graphics", "AMD Radeon RX Dedicated Graphics", "Other (details in description)"];
const conditions = ["New", "Demo", "Pre-owned", "Refurbished"];
const categories = ["Laptops", "Desktops", "Components", "Gadgets"];
const ramOptions = ["4GB", "8GB", "12GB", "16GB", "24GB", "32GB", "64GB"];
const storageOptions = ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB"];
const screenSizeOptions = ["11", "13", "14", "15.6", "16", "17.3", "18"];
const screenOptions = ["1366x768", "1600x900", "1920x1080", "1920x1200", "2240x1400", "2560x1440", "2560x1600", "2880x1800", "3024x1964", "3456x2234", "3840x2160", "Other"];
type InventorySortKey = "product" | "stockNumber" | "quantity" | "cost" | "price" | "profit" | "daysListed" | "soldAt" | "website";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [sortKey, setSortKey] = useState<InventorySortKey>("product");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [edit, setEdit] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/products?status=${status}`)
      .then((r) => r.json())
      .then(setItems)
      .catch((e) => setMsg(e.message));
  }, [status]);

  const list = useMemo(() => {
    const filtered = items.filter((p) =>
        [p.stockNumber, p.name, p.brand, p.model, p.serialNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      );
    const numericValue = (p: any, key: InventorySortKey) => {
      const cost = Number(p.costPrice) || 0;
      const listed = Number(p.sellingPrice) || 0;
      const sale = Number(p.salePrice);
      const price = sale > 0 && sale < listed ? sale : listed;
      if (key === "quantity") return Number(p.quantity) || 0;
      if (key === "cost") return cost;
      if (key === "price") return price;
      if (key === "profit") return price - cost;
      if (key === "daysListed") return durationDays(p.listedAt || p.createdAt, status === "sold" ? p.soldAt || p.updatedAt : new Date()) ?? -1;
      if (key === "soldAt") return p.soldAt ? new Date(p.soldAt).getTime() : 0;
      if (key === "website") return p.websiteActive ? 1 : 0;
      return 0;
    };
    return [...filtered].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const comparison = sortKey === "product" || sortKey === "stockNumber"
        ? String(sortKey === "product" ? a.name : a.stockNumber || "").localeCompare(String(sortKey === "product" ? b.name : b.stockNumber || ""), "en", { sensitivity: "base" })
        : numericValue(a, sortKey) - numericValue(b, sortKey);
      return comparison * direction || String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
    });
  }, [items, q, sortDirection, sortKey, status]);

  function toggleSort(key: InventorySortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function sortHeader(label: string, key: InventorySortKey) {
    const active = sortKey === key;
    const indicator = active ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
    return <th key={key} aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}><button type="button" className="inventory-sort-button" onClick={() => toggleSort(key)}>{label}<span aria-hidden="true">{indicator}</span></button></th>;
  }

  function openEdit(product: any) {
    setEdit({
      ...product,
      images: (product.images || []).map((image: any) => ({ ...image, preview: image.url, file: null })),
      purchaseDate: product.purchaseDate
        ? String(product.purchaseDate).slice(0, 10)
        : "",
      retailListings:
        product.retailListings?.map((x: any) => ({
          id: x.id,
          retailer: x.retailer || "",
          price: String(x.price ?? ""),
          url: x.url || "",
        })) || [],
    });
    setMsg("");
  }

  function closeEdit() {
    edit?.images?.forEach((image: any) => { if (image.file) URL.revokeObjectURL(image.preview); });
    setEdit(null);
  }

  function addEditImages(files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type),
    );
    setEdit((current: any) => ({
      ...current,
      images: [...(current.images || []), ...accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        url: "",
      }))],
    }));
  }

  function removeEditImage(index: number) {
    setEdit((current: any) => {
      const image = current.images[index];
      if (image?.file) URL.revokeObjectURL(image.preview);
      return { ...current, images: current.images.filter((_: any, i: number) => i !== index) };
    });
  }

  function moveEditImage(from: number, to: number) {
    setEdit((current: any) => {
      if (to < 0 || to >= current.images.length) return current;
      const images = [...current.images];
      const [image] = images.splice(from, 1);
      images.splice(to, 0, image);
      return { ...current, images };
    });
  }

  function updateRetail(index: number, key: string, value: string) {
    setEdit((current: any) => {
      const retailListings = [...current.retailListings];
      retailListings[index] = { ...retailListings[index], [key]: value };
      return { ...current, retailListings };
    });
  }

  function addRetail() {
    setEdit((current: any) => ({
      ...current,
      retailListings: [...(current.retailListings || []), blankRetail()],
    }));
  }

  function removeRetail(index: number) {
    setEdit((current: any) => ({
      ...current,
      retailListings: current.retailListings.filter((_: any, i: number) => i !== index),
    }));
  }

  const retailAverage = useMemo(() => {
    if (!edit?.retailListings?.length) return 0;
    const prices = edit.retailListings
      .map((x: any) => Number(x.price))
      .filter((x: number) => Number.isFinite(x) && x >= 0);
    return prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
  }, [edit]);

  async function save() {
    if (!edit) return;
    setSaving(true);
    setMsg("");
    try {
      if (!edit.images?.length) throw new Error("Keep at least one product photo.");
      const newImages = edit.images.filter((image: any) => image.file instanceof File);
      let uploadedFiles: any[] = [];
      if (newImages.length) {
        const uploadData = new FormData();
        newImages.forEach((image: any) => uploadData.append("files", image.file));
        const uploadResponse = await fetch("/api/uploads/products", { method: "POST", body: uploadData });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || "Image upload failed.");
        uploadedFiles = uploadResult.files || [];
        if (uploadedFiles.length !== newImages.length) throw new Error("Some product photos did not upload. Please try again.");
      }
      let uploadIndex = 0;
      const images = edit.images.map((image: any, index: number) => {
        const url = image.file ? uploadedFiles[uploadIndex++]?.url : image.url;
        return { url, sortOrder: index, isPrimary: index === 0 };
      });
      if (images.some((image: any) => typeof image.url !== "string" || !image.url)) {
        throw new Error("A product photo is missing. Please remove it and upload it again.");
      }
      const r = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...edit, images, retailPrice: retailAverage || "" }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(d.error || "Could not save changes.");
        return;
      }
      setItems((x) => x.map((p) => (p.id === d.id ? d : p)));
      edit.images.forEach((image: any) => { if (image.file) URL.revokeObjectURL(image.preview); });
      setEdit(null);
      setMsg("Product updated successfully.");
    } catch (e: any) {
      setMsg(e.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function changeLifecycle(id: string, lifecycleAction: "archive" | "sold" | "restore" | "duplicate" | "delete-sold") {
    if (lifecycleAction === "duplicate") {
      if (!confirm("Create a new active stock record from this sold product? The original will stay in the sold archive.")) return;
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lifecycleAction }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMsg(result.error || "Could not duplicate product.");
        return;
      }
      setMsg(`Created ${result.stockNumber} in active stock. Review its details, cost and website status before publishing.`);
      setStatus("active");
      return;
    }
    const confirmation = lifecycleAction === "delete-sold"
      ? "Permanently delete this sold archive item? Its saved order item details will remain on the customer’s order, but this inventory archive record cannot be restored."
      : lifecycleAction === "sold"
      ? "Mark this product as sold? It will move to the sold archive."
      : lifecycleAction === "archive"
        ? "Delete this product from active inventory? It will be removed from sale and kept in Archived so order records stay intact."
        : "Restore this product to active inventory?";
    if (!confirm(confirmation)) return;
    const r = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, lifecycleAction }),
    });
    const data = await r.json();
    if (!r.ok) {
      setMsg(data.error || "Could not update product status.");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function durationDays(start: string | Date | null, end: string | Date = new Date()) {
    if (!start) return null;
    return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
  }

  const soldDurations = items
    .map((product) => durationDays(product.listedAt || product.createdAt, product.soldAt || product.updatedAt))
    .filter((duration: number | null): duration is number => duration !== null);
  const averageTimeToSell = soldDurations.length
    ? Math.round(soldDurations.reduce((sum, duration) => sum + duration, 0) / soldDurations.length)
    : null;

  return (
    <main className="inventory-admin">
      <header className="inventory-head">
        <div>
          <div className="eyebrow">SUNDER INVENTORY</div>
          <h1>Inventory</h1>
          <p>View and edit your current stock.</p>
        </div>
        <div className="inventory-head-actions">
          <a href="/admin/products">+ Add Product</a>
        </div>
      </header>

      {msg && <div className="inventory-message">{msg}</div>}

      <div className="inventory-toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stock number, product, brand, model or serial..."
        />
        <strong>{list.length} products</strong>
      </div>

      <nav className="inventory-tabs" aria-label="Inventory status">
        {[["active", "Active stock"], ["sold", "Sold archive"], ["archived", "Archived"]].map(([value, label]) => (
          <button key={value} type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>
        ))}
      </nav>

      {status === "sold" && <div className="inventory-sales-summary">
        <div><span>Archived sales</span><strong>{items.length}</strong></div>
        <div><span>Average time to sell</span><strong>{averageTimeToSell === null ? "—" : `${averageTimeToSell} days`}</strong></div>
      </div>}

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              {sortHeader("Product", "product")}{sortHeader("Stock", "stockNumber")}{sortHeader("Qty", "quantity")}{sortHeader("Cost", "cost")}
              {sortHeader("Price", "price")}{sortHeader("Profit", "profit")}{sortHeader(status === "sold" ? "Time to sell" : "Listed for", "daysListed")}{status === "sold" && sortHeader("Sold on", "soldAt")}{sortHeader("Website", "website")}<th />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const effectivePrice = Number(p.salePrice || p.sellingPrice) || 0;
              const profit = effectivePrice - (Number(p.costPrice) || 0);
              return (
                <tr key={p.id}>
                  <td className="inventory-product">
                    <div className="inventory-product-content">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" />
                      ) : (
                        <div className="inventory-no-image">NO IMG</div>
                      )}
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.brand || ""} {p.model || ""}</span>
                      </div>
                    </div>
                  </td>
                  <td>{p.stockNumber}</td>
                  <td>{p.quantity}</td>
                  <td>{money(p.costPrice)}</td>
                      <td>{p.salePrice ? <><s>{money(p.sellingPrice)}</s><br /><strong>{money(p.salePrice)}</strong></> : <strong>{money(p.sellingPrice)}</strong>}</td>
                      <td>{money(profit)}</td>
                      <td>{status === "sold" ? `${durationDays(p.listedAt || p.createdAt, p.soldAt || p.updatedAt) ?? "—"} days` : `${durationDays(p.listedAt || p.createdAt) ?? "—"} days`}</td>
                      {status === "sold" && <td>{p.soldAt ? new Date(p.soldAt).toLocaleDateString("en-ZA") : "—"}</td>}
                  <td>{p.websiteActive ? "Live" : "Off"}</td>
                  <td>
                    <button onClick={() => openEdit(p)}>Edit</button>
                        {status === "active" && <><button onClick={() => changeLifecycle(p.id, "sold")}>Mark sold</button><button onClick={() => changeLifecycle(p.id, "archive")}>Delete</button></>}
                        {status === "sold" && <><button onClick={() => changeLifecycle(p.id, "duplicate")}>Duplicate to active stock</button><button onClick={() => changeLifecycle(p.id, "delete-sold")}>Delete from sold archive</button></>}
                        {status === "archived" && <button onClick={() => changeLifecycle(p.id, "restore")}>Restore</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="inventory-modal-backdrop">
          <div className="inventory-modal inventory-modal-large">
            <div className="inventory-modal-head">
              <div>
                <div className="eyebrow">EDIT PRODUCT</div>
                <h2>{edit.stockNumber} · {edit.status || "active"}</h2>
              </div>
              <button onClick={closeEdit}>×</button>
            </div>

            <div className="inventory-edit-grid">
              {[
                ["stockNumber","Stock Number"],["name","Product Name"],["brand","Brand"],["model","Model"],
                ["condition","Condition"],["category","Category"],["cpu","CPU"],["ram","RAM"],
                ["storage","Storage"],["screen","Screen Resolution"],["screenSize","Screen Size (inches)"],["gpu","GPU"],
                ["warranty","Warranty"],["costPrice","Cost Price"],["sellingPrice","Price"],["salePrice","Sale Price"],
                ["quantity","Quantity"],["serialNumber","Serial Number"],["supplier","Supplier"]
              ].map(([k,l]) => (
                <label key={k} className={k === "name" ? "inventory-edit-name" : undefined}>
                  {l}
                  {(["condition","category","cpu","ram","storage","screen","screenSize","gpu"].includes(k)) ? (() => {
                    const options = k === "condition" ? conditions : k === "category" ? categories : k === "cpu" ? cpuOptions : k === "ram" ? ramOptions : k === "storage" ? storageOptions : k === "screen" ? screenOptions : k === "gpu" ? gpuOptions : screenSizeOptions;
                    return <select value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}>
                      <option value="">Select {l.toLowerCase()}</option>
                      {edit[k] && !options.includes(edit[k]) && <option>{edit[k]}</option>}
                      {options.map((option) => <option key={option}>{option}</option>)}
                    </select>;
                  })() : <input
                    type={["costPrice","sellingPrice","salePrice","quantity"].includes(k) ? "number" : "text"}
                    min={["costPrice","sellingPrice","salePrice","quantity"].includes(k) ? "0" : undefined}
                    value={edit[k] ?? ""}
                    onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                  />}
                </label>
              ))}

              <label className="inventory-check-field">
                <input type="checkbox" checked={!!edit.hasNumpad} onChange={(e) => setEdit({ ...edit, hasNumpad: e.target.checked })} />
                Has dedicated number pad
              </label>

              <label>
                Purchase Date
                <input
                  type="date"
                  value={edit.purchaseDate || ""}
                  onChange={(e) => setEdit({ ...edit, purchaseDate: e.target.value })}
                />
              </label>

            </div>

            <label className="inventory-description">
              Description
              <textarea rows={5} value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </label>

            <section className="inventory-image-editor">
              <div className="inventory-image-editor-head">
                <div>
                  <h3>Product Photos</h3>
                  <p>Add, remove or reorder photos. The first photo is the main product image.</p>
                </div>
              </div>
              <label className="inventory-image-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addEditImages(e.dataTransfer.files); }}>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e) => { if (e.target.files) addEditImages(e.target.files); e.currentTarget.value = ""; }} />
                <strong>Drop replacement or additional photos here</strong>
                <span>or click to browse · JPG, PNG, WEBP or AVIF · max 10MB each</span>
              </label>
              <div className="inventory-edit-photo-grid">
                {edit.images.map((image: any, index: number) => (
                  <div className="inventory-edit-photo" key={image.id || image.preview}>
                    <img src={image.preview || image.url} alt={`${edit.name} photo ${index + 1}`} />
                    {index === 0 && <span className="inventory-edit-primary">MAIN PHOTO</span>}
                    <div className="inventory-edit-photo-actions">
                      <button type="button" onClick={() => moveEditImage(index, index - 1)} disabled={index === 0}>←</button>
                      <button type="button" onClick={() => moveEditImage(index, index + 1)} disabled={index === edit.images.length - 1}>→</button>
                      <button type="button" onClick={() => removeEditImage(index)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="retail-editor">
              <div className="retail-editor-head">
                <div>
                  <h3>Retail Price Comparisons</h3>
                  <p>Add the actual retailer, price and listing URL. The average is calculated automatically.</p>
                </div>
                <button type="button" onClick={addRetail}>+ Add Retailer</button>
              </div>

              {edit.retailListings?.map((item: any, index: number) => (
                <div className="retail-row" key={index}>
                  <input
                    placeholder="Retailer e.g. Takealot"
                    value={item.retailer}
                    onChange={(e) => updateRetail(index, "retailer", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateRetail(index, "price", e.target.value)}
                  />
                  <input
                    className="retail-url"
                    placeholder="https://..."
                    value={item.url}
                    onChange={(e) => updateRetail(index, "url", e.target.value)}
                  />
                  <button type="button" className="retail-remove" onClick={() => removeRetail(index)}>Remove</button>
                </div>
              ))}

              {!edit.retailListings?.length && (
                <div className="retail-empty">No retail comparisons added yet.</div>
              )}

              <div className="retail-average">
                <span>Average Retail Price</span>
                <strong>{retailAverage ? money(retailAverage) : "—"}</strong>
              </div>
            </section>

            {edit.status !== "active" && <p className="inventory-status-note">This record is {edit.status}. Website publishing does not change inventory status. Use “Duplicate to active stock” from the sold archive to create a new item.</p>}
            <div className="inventory-publish">
              {[
                ["websiteActive","Website"],["googleActive","Google"],
                ["metaActive","Meta"],["takealotActive","Takealot"]
              ].map(([k,l]) => (
                <label key={k}>
                  <input type="checkbox" checked={!!edit[k]} disabled={edit.status !== "active"} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })}/>
                  {l}
                </label>
              ))}
            </div>

            <div className="inventory-modal-actions">
              <button onClick={closeEdit}>Cancel</button>
              <button className="save" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
