import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    const formData = await request.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No images received." }, { status: 400 });
    }

    const uploadRoot = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadRoot, { recursive: true });

    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    const uploaded: { url: string; name: string }[] = [];

    for (const file of files) {
      if (!allowed.has(file.type)) {
        return NextResponse.json(
          { error: `${file.name} is not a supported image type.` },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `${file.name} is larger than 10MB.` },
          { status: 400 }
        );
      }

      const ext = path.extname(file.name).toLowerCase() || ".jpg";
      const safeName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadRoot, safeName), buffer);

      uploaded.push({
        name: file.name,
        url: `/uploads/products/${safeName}`,
      });
    }

    return NextResponse.json({ files: uploaded });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Could not upload images." },
      { status: 500 }
    );
  }
}
