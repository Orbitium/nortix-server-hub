import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@nortix/database";

export const MAX_STORE_IMAGE_BYTES = 2_000_000;

const imageType = (body: Buffer) => {
  if (
    body.length >= 8 &&
    body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { contentType: "image/png", extension: "png" };
  }
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    body.length >= 12 &&
    body.subarray(0, 4).toString("ascii") === "RIFF" &&
    body.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
};

export const validateStoreImage = (body: Buffer, declaredContentType?: string) => {
  if (body.length === 0) throw new Error("The store image is empty.");
  if (body.length > MAX_STORE_IMAGE_BYTES) {
    throw new Error("Store images must be 2 MB or smaller.");
  }
  const detected = imageType(body);
  if (!detected) {
    throw new Error("Store images must be PNG, JPEG, or WebP files.");
  }
  if (declaredContentType && declaredContentType !== detected.contentType) {
    throw new Error("The store image content does not match its file type.");
  }
  return detected;
};

export class ServerStoreMediaService {
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = path.resolve(directory);
  }

  async upload(
    serverId: string,
    uploadedById: string,
    body: Buffer,
    declaredContentType: string | undefined,
    requestId: string,
  ) {
    const detected = validateStoreImage(body, declaredContentType);
    const id = crypto.randomUUID();
    const storageKey = `${id}.${detected.extension}`;
    const target = path.join(this.directory, storageKey);
    await mkdir(this.directory, { recursive: true });
    await writeFile(target, body, { flag: "wx" });
    try {
      const asset = await prisma.$transaction(async (tx) => {
        const created = await tx.serverStoreMediaAsset.create({
          data: {
            id,
            serverId,
            uploadedById,
            storageKey,
            contentType: detected.contentType,
            byteSize: body.length,
          },
          select: { id: true, contentType: true, byteSize: true, createdAt: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: uploadedById,
            action: "server_store_media.uploaded",
            entityType: "ServerStoreMediaAsset",
            entityId: created.id,
            requestId,
            afterSnapshot: {
              serverId,
              contentType: created.contentType,
              byteSize: created.byteSize,
            },
          },
        });
        return created;
      });
      return {
        ...asset,
        url: `/api/v1/media/store-items/${storageKey}`,
      };
    } catch (error) {
      await unlink(target).catch(() => undefined);
      throw error;
    }
  }

  async open(assetName: string) {
    if (!/^[0-9a-f-]{36}\.(?:png|jpg|webp)$/i.test(assetName)) return null;
    const asset = await prisma.serverStoreMediaAsset.findFirst({
      where: { storageKey: assetName },
      select: { storageKey: true, contentType: true, byteSize: true },
    });
    if (!asset) return null;
    const body = await readFile(path.join(this.directory, asset.storageKey)).catch(() => null);
    return body ? { ...asset, body } : null;
  }
}
