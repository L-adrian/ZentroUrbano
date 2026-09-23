export const photoCategories = [
  { value: "exterior", label: "Exterior / fachada" },
  { value: "living", label: "Sala / comedor" },
  { value: "kitchen", label: "Cocina" },
  { value: "bedroom", label: "Dormitorio" },
  { value: "bathroom", label: "Baño" },
  { value: "garage", label: "Parqueo" },
  { value: "patio", label: "Patio / balcón" },
  { value: "amenity", label: "Área común" },
  { value: "other", label: "Otro ambiente" },
] as const;

export type PhotoCategory = (typeof photoCategories)[number]["value"] | "";

export type PhotoAnalysis = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  issues: string[];
  blockingIssues: string[];
  previewUrl?: string;
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;

export async function analyzePhotoFile(file: File, objectUrl: string): Promise<PhotoAnalysis> {
  const blockingIssues: string[] = [];

  if (!allowedImageTypes.has(file.type)) {
    blockingIssues.push("Formato no compatible. Usa JPG, PNG o WebP.");
  }

  if (file.size > maxFileSize) {
    blockingIssues.push("La foto supera el máximo de 10 MB.");
  }

  if (blockingIssues.length > 0) {
    return emptyAnalysis(blockingIssues);
  }

  try {
    const image = await loadBrowserImage(objectUrl);
    const sample = readImageSample(image);
    const issues: string[] = [];
    const shortestSide = Math.min(image.naturalWidth, image.naturalHeight);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);

    if (shortestSide < 600 || longestSide < 900) {
      issues.push("Resolución baja; recomendamos al menos 900 x 600 px.");
    }

    if (sample.brightness < 42) {
      issues.push("La foto está muy oscura.");
    } else if (sample.brightness > 225) {
      issues.push("La foto está sobreexpuesta.");
    }

    if (sample.contrast < 18) {
      issues.push("La imagen tiene poco contraste.");
    }

    if (sample.sharpness < 7) {
      issues.push("La foto podría estar borrosa.");
    }

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const previewUrl = await createPreview(image);
    image.src = "";
    return {
      width,
      height,
      previewUrl,
      brightness: sample.brightness,
      contrast: sample.contrast,
      sharpness: sample.sharpness,
      issues,
      blockingIssues,
    };
  } catch {
    return emptyAnalysis(["No pudimos leer esta imagen. Prueba con otro archivo."]);
  }
}

export function isPhotoTechnicallyValid(analysis: PhotoAnalysis) {
  return analysis.blockingIssues.length === 0 && analysis.issues.length === 0;
}

async function createPreview(image: HTMLImageElement): Promise<string | undefined> {
  const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.8));
  canvas.width = 0;
  canvas.height = 0;
  return blob ? URL.createObjectURL(blob) : undefined;
}

function emptyAnalysis(blockingIssues: string[]): PhotoAnalysis {
  return {
    width: 0,
    height: 0,
    brightness: 0,
    contrast: 0,
    sharpness: 0,
    issues: [],
    blockingIssues,
  };
}

function loadBrowserImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image_decode_failed"));
    image.src = source;
  });
}

function readImageSample(image: HTMLImageElement) {
  const sampleWidth = 96;
  const sampleHeight = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = Math.min(sampleHeight, 128);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("canvas_unavailable");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const luminance = new Float32Array(canvas.width * canvas.height);
  let sum = 0;

  for (let pixel = 0, index = 0; pixel < pixels.length; pixel += 4, index += 1) {
    const value = pixels[pixel] * 0.2126 + pixels[pixel + 1] * 0.7152 + pixels[pixel + 2] * 0.0722;
    luminance[index] = value;
    sum += value;
  }

  const brightness = sum / luminance.length;
  let variance = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = y * canvas.width + x;
      const difference = luminance[index] - brightness;
      variance += difference * difference;

      if (x > 0) {
        edgeSum += Math.abs(luminance[index] - luminance[index - 1]);
        edgeCount += 1;
      }
      if (y > 0) {
        edgeSum += Math.abs(luminance[index] - luminance[index - canvas.width]);
        edgeCount += 1;
      }
    }
  }

  return {
    brightness: Math.round(brightness),
    contrast: Math.round(Math.sqrt(variance / luminance.length)),
    sharpness: Math.round((edgeSum / Math.max(edgeCount, 1)) * 10) / 10,
  };
}
