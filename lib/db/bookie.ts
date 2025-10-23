import { db } from './drizzle';
import { bookie } from "@/lib/db/schema";
import { isNull, eq, asc } from "drizzle-orm";
import { alias } from 'drizzle-orm/pg-core';

// 모든 유저 가져오기 (삭제 안 된 것만)
export async function getAllBookie() {
  return db
    .select({
      id: bookie.id,
      bookieName: bookie.bookieName,
      botVersion: bookie.botVersion,
      botFileUrl: bookie.botFileUrl,
      fileSizeMB: bookie.fileSizeMB,
      releaseNote: bookie.releaseNote,
      uploadedAt: bookie.uploadedAt,
      isActive: bookie.isActive,
    })
    .from(bookie)
    .orderBy(asc(bookie.id));
}

export async function createBookie(data: { bookieName: string; botVersion: string }) {
  return db
    .insert(bookie)
    .values({
      ...data,
      isActive: true,
    })
    .returning();
}

export async function getBookieById(bookieId: string) {
  return db
    .select()
    .from(bookie)
    .where(eq(bookie.id, Number(bookieId)));
}

export async function setBotFilePath(bookieId: string, filePath: string) {
  return db
    .update(bookie)
    .set({ 
      botFileUrl: filePath,
      uploadedAt: new Date(),
      isActive: true
    })
    .where(eq(bookie.id, Number(bookieId)));
}

export async function updateActiveState(bookieId: number, isActive: boolean) {
  return db
    .update(bookie)
    .set({ isActive })
    .where(eq(bookie.id, bookieId));
}

export async function updateBookie(bookieId: number, data: { bookieName?: string; botVersion?: string }) {
  return db
    .update(bookie)
    .set({ 
      ...data,
      uploadedAt: new Date(),
    })
    .where(eq(bookie.id, bookieId));
}