 "use client";

import { useMemo, useState } from "react";

type ImageItem = { file: File; preview: string };

const money = (value: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const conditions = ["New", "Demo", "Pre-owned", "Refurbished"];
const categories = ["Laptops", "Desktops", "Components", "Gadgets"];
const cpuOptions = ["Celeron", "i3", "i5", "i7", "i9", "Ultra 5", "Ultra 7", "Ultra 9", "Other"];
const gpuOptions = ["Intel UHD Integrated Graphics", "Intel Iris Xe Integrated Graphics", "AMD Radeon Integrated Graphics", "Apple Integrated Graphics", "Intel Arc Dedicated Graphics", "NVIDIA GeForce GTX Dedicated Graphics", "NVIDIA GeForce RTX Dedicated Graphics", "NVIDIA Quadro / RTX Professional Dedicated Graphics", "AMD Radeon RX Dedicated Graphics", "Other (details in description)"];
const ramOptions = ["4GB", "8GB", "12GB", "16GB", "24GB", "32GB", "64GB"];
const storageOptions = ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB"];
const screenSizeOptions = ["11", "13", "14", "15.6", "16", "17.3", "18"];
const screenOptions = ["1366x768", "1600x900", "1920x1080", "1920x1200", "2240x1400", "2560x1440", "2560x1600", "2880x1800", "3024x1964", "3456x2234", "3840x2160"];

export default function AddProductPage() {
  const [form, setForm] = useState({
    stockNumber: "",
    brand: "",
    name: "",
    model: "",
    condition: "Pre-owned",
    category: "Laptops",
    cpu: "",
    ram: "",
    storage: "",
    screen: "",
    screenSize: "",
    hasNumpad: false,
    gpu: "",
    warranty: "",
    description: "",
    costPrice: "",
    sellingPrice: "",
    salePrice: "",
    retailPrice: "",
    quantity: "1",
    serialNumber: "",
    supplier: "",
    purchaseDate: "",
    websiteActive: true,
    googleActive: false,
    metaActive: false,
    takealotActive: false,
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [retailListings, setRetailListings] = useState([{ retailer: "", price: "", url: "" }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const profit = useMemo(() => {
    const cost = Number(form.costPrice) || 0;
    const price = Number(form.salePrice || form.sellingPrice) || 0;
    return price - cost;
  }, [form.costPrice, form.sellingPrice, form.salePrice]);

  const averageRetail = useMemo(() => {
    const prices = retailListings.map((item) => Number(item.price)).filter((price) => Number.isFinite(price) && price > 0);
    return prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : Number(form.retailPrice) || 0;
  }, [retailListings, form.retailPrice]);

  const margin = useMemo(() => {
    const selling = Number(form.salePrice || form.sellingPrice) || 0;
    return selling > 0 ? (profit / selling) * 100 : 0;
  }, [profit, form.sellingPrice, form.salePrice]);

  const update = (key: string, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));

  const addImages = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
    );
    const items = accepted.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...items]);
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const item = current[index];
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((_, i) => i !== index);
    });
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages((current) => {
      const copy = [...current];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  async function saveProduct() {
    setSaving(true);
    setMessage("");

    try {
      if (!form.stockNumber.trim() || !form.name.trim()) {
        throw new Error("Stock number and product name are required.");
      }

      if (images.length === 0) {
        throw new Error("Add at least one product photo.");
      }

      const uploadData = new FormData();
      images.forEach((image) => uploadData.append("files", image.file));

      const uploadResponse = await fetch("/api/uploads/products", {
        method: "POST",
        body: uploadData,
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadResult.error || "Image upload failed.");

      const productResponse = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          retailListings,
          images: uploadResult.files.map((file: any, index: number) => ({
            url: file.url,
            name: file.name,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        }),
      });

      const productResult = await productResponse.json();
      if (!productResponse.ok) throw new Error(productResult.error || "Product could not be saved.");

      setMessage(`Product ${productResult.stockNumber} saved successfully.`);
      setForm({
        stockNumber: "",
        brand: "",
        name: "",
        model: "",
        condition: "Pre-owned",
        category: "Laptops",
        cpu: "",
        ram: "",
        storage: "",
        screen: "",
        screenSize: "",
        hasNumpad: false,
        gpu: "",
        warranty: "",
        description: "",
        costPrice: "",
        sellingPrice: "",
        salePrice: "",
        retailPrice: "",
        quantity: "1",
        serialNumber: "",
        supplier: "",
        purchaseDate: "",
        websiteActive: true,
        googleActive: false,
        metaActive: false,
        takealotActive: false,
      });
      images.forEach((image) => URL.revokeObjectURL(image.preview));
      setImages([]);
      setRetailListings([{ retailer: "", price: "", url: "" }]);
    } catch (error: any) {
      setMessage(error?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-product-page">
      <div className="admin-product-head">
        <div>
          <div className="eyebrow">SUNDER INVENTORY</div>
          <h1>Add Product</h1>
          <p>Add stock once and prepare it for the website, Google, Meta and Takealot.</p>
        </div>
        <a href="/shop" className="admin-back">View Shop</a>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <section className="admin-product-grid">
        <div className="admin-card">
          <h2>Product details</h2>
          <div className="admin-fields">
            <label>Stock Number<input value={form.stockNumber} onChange={(e) => update("stockNumber", e.target.value)} placeholder="e.g. SC-10025" /></label>
            <label>Product Name<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Dell Latitude 5540" /></label>
            <label>Brand<input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Dell" /></label>
            <label>Model<input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="Latitude 5540" /></label>
            <label>Condition<select value={form.condition} onChange={(e) => update("condition", e.target.value)}>{conditions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>Category<select value={form.category} onChange={(e) => update("category", e.target.value)}>{categories.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>CPU<select value={form.cpu} onChange={(e) => update("cpu", e.target.value)}><option value="">Select processor</option>{cpuOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>RAM<select value={form.ram} onChange={(e) => update("ram", e.target.value)}><option value="">Select RAM</option>{ramOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>Storage<select value={form.storage} onChange={(e) => update("storage", e.target.value)}><option value="">Select storage</option>{storageOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>Screen Resolution<select value={form.screen} onChange={(e) => update("screen", e.target.value)}><option value="">Select resolution</option>{screenOptions.map((option) => <option key={option}>{option}</option>)}<option>Other</option></select></label>
            <label>Screen Size (inches)<select value={form.screenSize} onChange={(e) => update("screenSize", e.target.value)}><option value="">Select size</option>{screenSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label className="admin-check-field"><input type="checkbox" checked={form.hasNumpad} onChange={(e) => update("hasNumpad", e.target.checked)} /> Has dedicated number pad</label>
            <label>GPU<select value={form.gpu} onChange={(e) => update("gpu", e.target.value)}><option value="">Select graphics</option>{gpuOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>Warranty<input value={form.warranty} onChange={(e) => update("warranty", e.target.value)} placeholder="6 Months" /></label>
          </div>
          <label className="admin-wide">Description<textarea rows={5} value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
        </div>

        <div className="admin-card">
          <h2>Pricing & stock</h2>
          <div className="admin-fields">
            <label>Cost Price<input type="number" min="0" value={form.costPrice} onChange={(e) => update("costPrice", e.target.value)} placeholder="0" /></label>
            <label>Price<input type="number" min="0" value={form.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} placeholder="0" /></label>
            <label>Sale Price (optional)<input type="number" min="0" value={form.salePrice} onChange={(e) => update("salePrice", e.target.value)} placeholder="Optional" /></label>
            <label>Retail Comparison Price<input type="number" min="0" value={form.retailPrice} onChange={(e) => update("retailPrice", e.target.value)} placeholder="0" /></label>
            <label>Quantity<input type="number" min="0" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></label>
            <label>Serial Number<input value={form.serialNumber} onChange={(e) => update("serialNumber", e.target.value)} /></label>
            <label>Supplier<input value={form.supplier} onChange={(e) => update("supplier", e.target.value)} /></label>
            <label>Purchase Date<input type="date" value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} /></label>
          </div>

          <div className="profit-box">
            <div><span>Profit</span><strong>{money(profit)}</strong></div>
            <div><span>Margin</span><strong>{margin.toFixed(1)}%</strong></div>
            <div><span>Retail saving</span><strong>{money(Math.max((Number(form.retailPrice) || 0) - (Number(form.salePrice || form.sellingPrice) || 0), 0))}</strong></div>
          </div>

          <h3>Retail price comparison</h3>
          <p className="admin-help">Add the retail listings you used to establish the comparison price. The website will calculate the average automatically.</p>
          <div className="retail-admin-list">
            {retailListings.map((item, index) => (
              <div className="retail-admin-row" key={index}>
                <input value={item.retailer} onChange={(e) => setRetailListings((rows) => rows.map((r, i) => i === index ? { ...r, retailer: e.target.value } : r))} placeholder="Retailer" />
                <input type="number" min="0" value={item.price} onChange={(e) => setRetailListings((rows) => rows.map((r, i) => i === index ? { ...r, price: e.target.value } : r))} placeholder="Price" />
                <input type="url" value={item.url} onChange={(e) => setRetailListings((rows) => rows.map((r, i) => i === index ? { ...r, url: e.target.value } : r))} placeholder="https://retailer.co.za/product" />
                <button type="button" onClick={() => setRetailListings((rows) => rows.filter((_, i) => i !== index))} disabled={retailListings.length === 1}>Remove</button>
              </div>
            ))}
          </div>
          <div className="retail-average">Average retail price: <strong>{money(averageRetail)}</strong></div>
          <button type="button" className="add-retail-button" onClick={() => setRetailListings((rows) => [...rows, { retailer: "", price: "", url: "" }])}>+ Add retail listing</button>

          <h3>Publish to channels</h3>
          <div className="publish-grid">
            {[
              ["websiteActive", "Website"],
              ["googleActive", "Google Merchant"],
              ["metaActive", "Facebook / Meta"],
              ["takealotActive", "Takealot"],
            ].map(([key, label]) => (
              <label className="publish-toggle" key={key}>
                <input type="checkbox" checked={(form as any)[key]} onChange={(e) => update(key, e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="admin-card admin-images-card">
          <h2>Product photos</h2>
          <p className="admin-help">Drag images into the box. The first image is the primary product image.</p>
          <label
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addImages(e.dataTransfer.files);
            }}
          >
            <input type="file" accept="image/*" multiple onChange={(e) => e.target.files && addImages(e.target.files)} />
            <strong>Drop product photos here</strong>
            <span>or click to browse • JPG, PNG, WEBP or AVIF • max 10MB each</span>
          </label>

          {!!images.length && (
            <div className="admin-photo-grid">
              {images.map((image, index) => (
                <div className="admin-photo" key={image.preview}>
                  <img src={image.preview} alt={`Product ${index + 1}`} />
                  {index === 0 && <span className="primary-photo">PRIMARY</span>}
                  <div className="photo-actions">
                    <button type="button" onClick={() => moveImage(index, index - 1)} disabled={index === 0}>←</button>
                    <button type="button" onClick={() => moveImage(index, index + 1)} disabled={index === images.length - 1}>→</button>
                    <button type="button" onClick={() => removeImage(index)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="admin-save-bar">
        <div><strong>{images.length}</strong> photo{images.length === 1 ? "" : "s"} ready · <strong>{money(profit)}</strong> estimated profit per unit</div>
        <button type="button" onClick={saveProduct} disabled={saving}>{saving ? "Saving Product..." : "Save Product"}</button>
      </div>
    </main>
  );
}
