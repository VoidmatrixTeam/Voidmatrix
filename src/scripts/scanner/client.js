export class ScannerClient {
  constructor() {
    this.worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    this.nextId = 0;
    this.pending = new Map();
    this.worker.onmessage = ({ data }) => {
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      if (data.error) pending.reject(new Error(data.error));
      else pending.resolve(data.result);
    };
  }

  analyze(frames, target, options = {}) {
    return this.send("analyze", frames, { target, ...options });
  }

  detect(frame, roi) {
    return this.send("detect", [frame], { roi });
  }

  send(type, frames, options) {
    const id = this.nextId++;
    const payload = frames.map((f) => ({
      width: f.width,
      height: f.height,
      buffer: f.data.buffer,
    }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(
        { id, type, frames: payload, ...options },
        payload.map((f) => f.buffer),
      );
    });
  }

  terminate() {
    this.worker.terminate();
    for (const { reject } of this.pending.values()) {
      reject(new Error("Scanner closed"));
    }
    this.pending.clear();
  }
}

export async function imageDataFromFile(file, maxLongSide = 2048) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(
    1,
    maxLongSide / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return ctx.getImageData(0, 0, width, height);
}
