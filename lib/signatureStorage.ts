import { documentDirectory, makeDirectoryAsync, writeAsStringAsync } from "expo-file-system/legacy";

export function pathsToSvg(
  paths: string[],
  width: number,
  height: number,
  stroke = "#0f172a",
): string {
  const pathElements = paths
    .map(
      (d) =>
        `<path d="${d}" stroke="${stroke}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${pathElements}</svg>`;
}

function svgToBase64(svg: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(svg);
  }
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

/** Data URL for sz-technician-service processSignaturePayload (uploads to Supabase). */
export function pathsToDataUrl(
  paths: string[],
  width: number,
  height: number,
  stroke = '#000000',
): string | null {
  if (paths.length === 0) return null;
  const svg = pathsToSvg(paths, width, height, stroke);
  return `data:image/svg+xml;base64,${svgToBase64(svg)}`;
}

export type WorkOrderSignatureStepPayload = {
  technicianNotes?: string;
  customerName?: string;
  signedAt: string;
  technician: { role: 'technician'; signedAt: string; dataUrl: string };
  customer: { role: 'customer'; signedAt: string; signerName?: string; dataUrl: string };
};

/** Work order and PPM sign-off — technician + customer signatures required. */
export function buildWorkOrderSignatureStepPayload(input: {
  techPaths: string[];
  custPaths: string[];
  width: number;
  height: number;
  customerName?: string;
  technicianNotes?: string;
}): WorkOrderSignatureStepPayload {
  const techDataUrl = pathsToDataUrl(input.techPaths, input.width, input.height);
  const custDataUrl = pathsToDataUrl(input.custPaths, input.width, input.height);
  if (!techDataUrl || !custDataUrl) {
    throw new Error('Both signatures are required');
  }

  const signedAt = new Date().toISOString();
  const customerName = input.customerName?.trim();

  return {
    ...(input.technicianNotes?.trim() ? { technicianNotes: input.technicianNotes.trim() } : {}),
    ...(customerName ? { customerName } : {}),
    signedAt,
    technician: { role: 'technician', signedAt, dataUrl: techDataUrl },
    customer: {
      role: 'customer',
      signedAt,
      signerName: customerName,
      dataUrl: custDataUrl,
    },
  };
}

export const buildSignatureStepPayload = buildWorkOrderSignatureStepPayload;

export type SavedSignature = {
  uri: string;
  role: "technician" | "customer";
  workOrderId: string;
};

export async function saveSignatureSvg(
  workOrderId: string,
  role: "technician" | "customer",
  paths: string[],
  width: number,
  height: number,
): Promise<SavedSignature | null> {
  if (!documentDirectory || paths.length === 0) return null;

  const dir = `${documentDirectory}work-orders/${workOrderId}/signatures/`;
  await makeDirectoryAsync(dir, { intermediates: true });

  const fileName = `${role}_${Date.now()}.svg`;
  const uri = `${dir}${fileName}`;
  const svg = pathsToSvg(paths, width, height);

  await writeAsStringAsync(uri, svg, { encoding: "utf8" });
  return { uri, role, workOrderId };
}

export async function saveWorkOrderSignatures(
  workOrderId: string,
  techPaths: string[],
  custPaths: string[],
  width: number,
  height: number,
): Promise<{ technician: SavedSignature | null; customer: SavedSignature | null }> {
  const [technician, customer] = await Promise.all([
    saveSignatureSvg(workOrderId, "technician", techPaths, width, height),
    saveSignatureSvg(workOrderId, "customer", custPaths, width, height),
  ]);
  return { technician, customer };
}
