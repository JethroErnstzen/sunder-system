import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const condition = searchParams.get("condition")?.trim() || "";
  const brand = searchParams.get("brand")?.trim() || "";
  const ram = searchParams.get("ram")?.trim() || "";
  const storage = searchParams.get("storage")?.trim() || "";
  const maxPrice = Number(searchParams.get("maxPrice") || 0);
  const sort = searchParams.get("sort")?.trim() || "newest";
  const take = Math.min(Number(searchParams.get("take") || 60), 100);
  const categoryAliases: Record<string, string[]> = {
    Laptops: ["Laptops", "Business Laptops", "Gaming", "Apple", "Business Notebooks", "Gaming Laptops", "Laptop Computers", "Apple Products"],
    Desktops: ["Desktops", "Desktop Computers"],
    Components: ["Components", "Accessories & Components", "Accessories &amp; Components"],
    Gadgets: ["Gadgets", "Mobile Phones", "Tablets", "Wearables", "Audio"],
  };

  const products = await prisma.product.findMany({
    where: {
      websiteActive: true,
      status: "active",
      quantity: { gt: 0 },
      ...(category ? { category: { in: categoryAliases[category] || [category] } } : {}),
      ...(condition ? { condition } : {}),
      ...(brand ? { brand } : {}),
      ...(ram ? { ram: { contains: ram } } : {}),
      ...(storage ? { storage: { contains: storage } } : {}),
      ...(maxPrice > 0 ? { sellingPrice: { lte: maxPrice } } : {}),
      ...(q ? { OR: [
        { stockNumber: { contains: q } },
        { name: { contains: q } },
        { brand: { contains: q } },
        { model: { contains: q } },
      ] } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      retailListings: { orderBy: { price: "asc" } },
    },
    orderBy: sort === "priceAsc" ? { sellingPrice: "asc" } : sort === "priceDesc" ? { sellingPrice: "desc" } : sort === "name" ? { name: "asc" } : { createdAt: "desc" },
    take: Number.isFinite(take) && take > 0 ? take : 60,
  });

  const result = products.map((product) => {
    return product;
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    const body = await request.json();
    if (!body.stockNumber || !body.name) {
      return NextResponse.json({ error: "Stock number and product name are required." }, { status: 400 });
    }

    const stockNumber = String(body.stockNumber).trim();
    const existing = await prisma.product.findUnique({ where: { stockNumber } });
    if (existing) return NextResponse.json({ error: `Stock number ${stockNumber} already exists.` }, { status: 409 });

    const numberOrNull = (value: unknown) => {
      if (value === "" || value === null || value === undefined) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    const intOrZero = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    };
    const purchaseDate = body.purchaseDate ? new Date(`${body.purchaseDate}T00:00:00`) : null;
    const validPurchaseDate = purchaseDate && !Number.isNaN(purchaseDate.getTime()) ? purchaseDate : null;
    const sellingPrice = numberOrNull(body.sellingPrice);
    const salePrice = numberOrNull(body.salePrice);
    if (salePrice !== null && (sellingPrice === null || salePrice <= 0 || salePrice >= sellingPrice)) {
      return NextResponse.json({ error: "Sale price must be greater than zero and lower than the listed price." }, { status: 400 });
    }

    const retailListings = Array.isArray(body.retailListings)
      ? body.retailListings
          .map((item: any) => ({
            retailer: String(item.retailer || "").trim(),
            price: Number(item.price),
            url: String(item.url || "").trim(),
          }))
          .filter((item: any) => item.retailer && Number.isFinite(item.price) && item.price > 0 && item.url)
      : [];

    const product = await prisma.product.create({
      data: {
        stockNumber,
        name: String(body.name).trim(),
        brand: body.brand ? String(body.brand).trim() : null,
        model: body.model ? String(body.model).trim() : null,
        condition: body.condition ? String(body.condition) : "Pre-owned",
        category: body.category ? String(body.category) : null,
        cpu: body.cpu ? String(body.cpu).trim() : null,
        ram: body.ram ? String(body.ram).trim() : null,
        storage: body.storage ? String(body.storage).trim() : null,
        screen: body.screen ? String(body.screen).trim() : null,
        screenSize: numberOrNull(body.screenSize),
        hasNumpad: Boolean(body.hasNumpad),
        gpu: body.gpu ? String(body.gpu).trim() : null,
        warranty: body.warranty ? String(body.warranty).trim() : null,
        description: body.description ? String(body.description).trim() : null,
        costPrice: numberOrNull(body.costPrice),
        sellingPrice,
        salePrice,
        retailPrice: numberOrNull(body.retailPrice),
        quantity: intOrZero(body.quantity),
        status: "active",
        listedAt: new Date(),
        serialNumber: body.serialNumber ? String(body.serialNumber).trim() : null,
        supplier: body.supplier ? String(body.supplier).trim() : null,
        purchaseDate: validPurchaseDate,
        websiteActive: Boolean(body.websiteActive),
        googleActive: Boolean(body.googleActive),
        metaActive: Boolean(body.metaActive),
        takealotActive: Boolean(body.takealotActive),
        images: Array.isArray(body.images) && body.images.length ? {
          create: body.images.map((image: any, index: number) => ({
            url: String(image.url || ""),
            sortOrder: index,
            isPrimary: index === 0,
          })),
        } : undefined,
        retailListings: retailListings.length ? { create: retailListings } : undefined,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        retailListings: { orderBy: { price: "asc" } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: error?.message || "Could not create product." }, { status: 500 });
  }
}
