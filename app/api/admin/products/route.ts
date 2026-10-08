import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status") || "active";
  const products = await prisma.product.findMany({
    where: status === "all" ? {} : { status },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      retailListings: { orderBy: { price: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function PATCH(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "Product ID is required." }, { status: 400 });

    if (b.lifecycleAction === "duplicate") {
      const source = await prisma.product.findUnique({
        where: { id: b.id },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          retailListings: { orderBy: { price: "asc" } },
        },
      });
      if (!source) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      if (source.status !== "sold") return NextResponse.json({ error: "Only sold products can be duplicated from this view." }, { status: 409 });

      const sourceNumber = source.stockNumber.match(/^(.*?)(\d+)$/);
      const prefix = sourceNumber?.[1] || "LAP";
      const width = sourceNumber?.[2].length || 4;
      const stockNumbers = await prisma.product.findMany({ select: { stockNumber: true } });
      const used = new Set(stockNumbers.map((product) => product.stockNumber));
      const suffixes = stockNumbers
        .map((product) => product.stockNumber.match(new RegExp(`^${prefix}(\\d+)$`))?.[1])
        .filter((value): value is string => Boolean(value))
        .map(Number);
      let sequence = Math.max(0, ...suffixes) + 1;
      let stockNumber = `${prefix}${String(sequence).padStart(width, "0")}`;
      while (used.has(stockNumber)) {
        sequence += 1;
        stockNumber = `${prefix}${String(sequence).padStart(width, "0")}`;
      }

      const product = await prisma.product.create({
        data: {
          stockNumber,
          name: source.name,
          brand: source.brand,
          model: source.model,
          condition: source.condition,
          category: source.category,
          cpu: source.cpu,
          ram: source.ram,
          storage: source.storage,
          screen: source.screen,
          screenSize: source.screenSize,
          hasNumpad: source.hasNumpad,
          gpu: source.gpu,
          warranty: source.warranty,
          description: source.description,
          sellingPrice: source.sellingPrice,
          retailPrice: source.retailPrice,
          quantity: 1,
          status: "active",
          listedAt: new Date(),
          websiteActive: false,
          googleActive: false,
          metaActive: false,
          takealotActive: false,
          images: source.images.length ? {
            create: source.images.map((image) => ({ url: image.url, sortOrder: image.sortOrder, isPrimary: image.isPrimary })),
          } : undefined,
          retailListings: source.retailListings.length ? {
            create: source.retailListings.map((listing) => ({ retailer: listing.retailer, price: listing.price, url: listing.url })),
          } : undefined,
        },
        include: { images: { orderBy: { sortOrder: "asc" } }, retailListings: { orderBy: { price: "asc" } } },
      });
      return NextResponse.json(product, { status: 201 });
    }

    if (["archive", "sold", "restore"].includes(b.lifecycleAction)) {
      const existing = await prisma.product.findUnique({ where: { id: b.id }, select: { status: true } });
      if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      const validTransition = b.lifecycleAction === "restore"
        ? existing.status === "archived"
        : existing.status === "active";
      if (!validTransition) {
        return NextResponse.json({ error: "That product status transition is not allowed." }, { status: 409 });
      }
      const now = new Date();
      const lifecycle = b.lifecycleAction === "archive"
        ? { status: "archived", archivedAt: now, websiteActive: false, googleActive: false, metaActive: false, takealotActive: false }
        : b.lifecycleAction === "sold"
          ? { status: "sold", soldAt: now, quantity: 0, websiteActive: false, googleActive: false, metaActive: false, takealotActive: false }
          : { status: "active", archivedAt: null, listedAt: now };
      const product = await prisma.product.update({ where: { id: b.id }, data: lifecycle });
      return NextResponse.json(product);
    }

    const listings = Array.isArray(b.retailListings) ? b.retailListings : [];
    const cleanListings = listings
      .map((x: any) => ({
        retailer: String(x.retailer || "").trim(),
        price: Number(x.price),
        url: String(x.url || "").trim(),
      }))
      .filter((x: any) => x.retailer && Number.isFinite(x.price) && x.price >= 0 && x.url);
    const screenSize = b.screenSize === "" || b.screenSize === null || b.screenSize === undefined
      ? null
      : Number(b.screenSize);
    if (screenSize !== null && !Number.isFinite(screenSize)) {
      return NextResponse.json({ error: "Screen size must be a valid number." }, { status: 400 });
    }
    const sellingPrice = b.sellingPrice === "" || b.sellingPrice === null || b.sellingPrice === undefined ? null : Number(b.sellingPrice);
    const salePrice = b.salePrice === "" || b.salePrice === null || b.salePrice === undefined ? null : Number(b.salePrice);
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice <= 0 || sellingPrice === null || salePrice >= sellingPrice)) {
      return NextResponse.json({ error: "Sale price must be greater than zero and lower than the listed price." }, { status: 400 });
    }

    const retailAverage = cleanListings.length
      ? cleanListings.reduce((sum: number, x: any) => sum + x.price, 0) / cleanListings.length
      : null;

    const purchaseDate =
      b.purchaseDate && String(b.purchaseDate).trim()
        ? new Date(`${String(b.purchaseDate).slice(0, 10)}T00:00:00`)
        : null;

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: b.id },
        data: {
          stockNumber: String(b.stockNumber).trim(),
          name: String(b.name).trim(),
          brand: b.brand || null,
          model: b.model || null,
          condition: b.condition || "Pre-owned",
          category: b.category || null,
          cpu: b.cpu || null,
          ram: b.ram || null,
          storage: b.storage || null,
          screen: b.screen || null,
          screenSize,
          hasNumpad: Boolean(b.hasNumpad),
          gpu: b.gpu || null,
          warranty: b.warranty || null,
          description: b.description || null,
          costPrice: b.costPrice === "" ? null : Number(b.costPrice),
          sellingPrice,
          salePrice,
          retailPrice: retailAverage ?? (b.retailPrice === "" ? null : Number(b.retailPrice)),
          quantity: Number(b.quantity) || 0,
          serialNumber: b.serialNumber || null,
          supplier: b.supplier || null,
          purchaseDate:
            purchaseDate && !Number.isNaN(purchaseDate.getTime()) ? purchaseDate : null,
          websiteActive: !!b.websiteActive,
          googleActive: !!b.googleActive,
          metaActive: !!b.metaActive,
          takealotActive: !!b.takealotActive,
        },
      });

      await tx.retailListing.deleteMany({ where: { productId: b.id } });

      if (cleanListings.length) {
        await tx.retailListing.createMany({
          data: cleanListings.map((x: any) => ({
            productId: b.id,
            retailer: x.retailer,
            price: x.price,
            url: x.url,
          })),
        });
      }

      return tx.product.findUnique({
        where: { id: b.id },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          retailListings: { orderBy: { price: "asc" } },
        },
      });
    });

    return NextResponse.json(product);
  } catch (e: any) {
    console.error("Update product error:", e);
    return NextResponse.json(
      { error: e?.message || "Could not update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    const { id } = await request.json();
    const product = await prisma.product.update({
      where: { id },
      data: { status: "archived", archivedAt: new Date(), websiteActive: false, googleActive: false, metaActive: false, takealotActive: false },
    });
    return NextResponse.json({ success: true, product });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Could not delete product." },
      { status: 500 }
    );
  }
}
