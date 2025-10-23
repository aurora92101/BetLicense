

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { setBotFilePath, getBookieById } from "@/lib/db/bookie";
import { get } from "http";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bookieId = formData.get("bookieId") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!bookieId) return NextResponse.json({ error: "Missing bookieId" }, { status: 400 });

    // 업로드 폴더 생성
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // 기존 파일 조회 (DB에 있던 botFileUrl)
    const [existing] = await getBookieById(bookieId);
    if (existing?.botFileUrl) {
      const oldPath = path.join(process.cwd(), "public", existing.botFileUrl);
      try {
        await unlink(oldPath); // 기존 파일 삭제
        console.log(`Deleted old file: ${existing.botFileUrl}`);
      } catch (err) {
        console.warn("Old file not found or could not delete:", existing.botFileUrl);
      }
    }

    // 새 파일 저장
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    // DB 업데이트 (새 파일 경로 및 업로드 시점)
    await setBotFilePath(bookieId, publicUrl);
    console.log(`Uploaded new file for bookie ${bookieId}: ${publicUrl}`);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}

