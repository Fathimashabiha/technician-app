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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${pathElements}</svg>`;
}

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
