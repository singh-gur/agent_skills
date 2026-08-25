import "@excalidraw/excalidraw/index.css";
import {
  FONT_FAMILY,
  convertToExcalidrawElements,
  exportToBlob,
  restore,
} from "@excalidraw/excalidraw";

const MAX_SIDE = 16_384;
const MAX_PIXELS = 64 * 1024 * 1024;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.readAsDataURL(blob);
  });
}

async function fontsReady() {
  await document.fonts.ready;
  if (document.fonts.status !== "loaded") {
    throw new Error(`Excalidraw fonts did not finish loading: ${document.fonts.status}`);
  }
}

/**
 * Text metrics are only correct once the real Excalidraw web fonts are loaded.
 * A throwaway export of one text element per font family walks Excalidraw's own
 * font-loading path, which is more reliable than guessing CSS family names.
 */
let fontWarmup = null;
function warmFonts(fontFamilies) {
  if (!fontWarmup) {
    const probes = fontFamilies.map((fontFamily, index) => ({
      type: "text",
      x: index * 200,
      y: 0,
      text: "Warm up 0123",
      fontSize: 20,
      fontFamily,
    }));
    fontWarmup = exportToBlob({
      elements: convertToExcalidrawElements(probes),
      appState: { exportBackground: false },
      files: {},
      mimeType: "image/png",
    }).then(fontsReady);
  }
  return fontWarmup;
}

/** Measure text exactly the way Excalidraw does, by round-tripping a text skeleton. */
function measureOne(text, fontSize, fontFamily) {
  const [element] = convertToExcalidrawElements([
    { type: "text", x: 0, y: 0, text: text === "" ? " " : text, fontSize, fontFamily },
  ]);
  return { width: element.width, height: element.height };
}

/**
 * Greedy word wrap against a maximum width, using real font metrics.
 * Words longer than maxWidth are kept intact on their own line.
 */
function wrapText(text, fontSize, fontFamily, maxWidth) {
  const paragraphs = String(text).split("\n");
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (measureOne(candidate, fontSize, fontFamily).width <= maxWidth) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** FNV-1a, folded into the positive 31-bit range Excalidraw uses for seeds. */
function hashToInt(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash | 0) % 2147483647;
}

window.dd = {
  fontFamilies: FONT_FAMILY,

  /** Load the fonts used by a diagram before any measurement happens. */
  async ready(fontFamilies) {
    await warmFonts(fontFamilies);
    return true;
  },

  /** [{ text, fontSize, fontFamily, maxWidth? }] -> [{ width, height, lines, text }] */
  measure(requests) {
    return requests.map(({ text, fontSize, fontFamily, maxWidth }) => {
      const lines = maxWidth
        ? wrapText(text, fontSize, fontFamily, maxWidth)
        : String(text).split("\n");
      const wrapped = lines.join("\n");
      const { width, height } = measureOne(wrapped, fontSize, fontFamily);
      return { text: wrapped, lines, width, height };
    });
  },

  /**
   * Convert a skeleton to real elements, then apply post-conversion geometry
   * patches keyed by element id (used to place labels inside nodes precisely).
   */
  build(skeleton, patches = {}) {
    const elements = convertToExcalidrawElements(skeleton, { regenerateIds: false }).map(
      (element) => ({ ...element }),
    );
    const byId = new Map(elements.map((element) => [element.id, element]));
    const boundTextByContainer = new Map();
    for (const element of elements) {
      if (element.containerId) boundTextByContainer.set(element.containerId, element);
    }

    for (const [key, patch] of Object.entries(patches)) {
      const element = key.startsWith("text:")
        ? boundTextByContainer.get(key.slice(5))
        : byId.get(key);
      if (!element) continue;
      const { addBoundElements, ...rest } = patch;
      Object.assign(element, rest);
      if (addBoundElements) {
        element.boundElements = [...(element.boundElements ?? []), ...addBoundElements];
      }
    }

    // Ids, seeds and nonces must be a function of the spec, not of the clock or
    // Math.random(), so that rebuilding an unchanged spec produces an unchanged
    // scene file and an unchanged PNG.
    for (const element of elements) {
      if (!element.containerId) continue;
      const stableId = `${element.containerId}-text`;
      const container = byId.get(element.containerId);
      if (container?.boundElements) {
        container.boundElements = container.boundElements.map((bound) =>
          bound.id === element.id ? { ...bound, id: stableId } : bound,
        );
      }
      byId.delete(element.id);
      element.id = stableId;
      byId.set(stableId, element);
    }
    for (const element of elements) {
      element.seed = hashToInt(`${element.id}:seed`);
      element.versionNonce = hashToInt(`${element.id}:nonce`);
      element.version = 1;
      element.updated = 1;
    }

    // Labels bound to connectors must paint above the boxes the connectors run behind.
    const arrowIds = new Set(elements.filter((e) => e.type === "arrow").map((e) => e.id));
    const onTop = [];
    const rest = [];
    for (const element of elements) {
      if (element.containerId && arrowIds.has(element.containerId)) onTop.push(element);
      else rest.push(element);
    }
    return [...rest, ...onTop];
  },

  /**
   * Round-trip the scene through Excalidraw's own loader. Anything the editor
   * would drop or repair on import shows up here instead of in the user's tab.
   */
  validate(scene) {
    const restored = restore(scene, null, null, { repairBindings: true });
    const kept = new Set(restored.elements.map((element) => element.id));
    const dropped = scene.elements.filter((element) => !kept.has(element.id));
    const missingFiles = restored.elements
      .filter((element) => element.type === "image" && !restored.files?.[element.fileId])
      .map((element) => element.id);
    return {
      elements: scene.elements.length,
      restored: restored.elements.length,
      dropped: dropped.map((element) => `${element.type}:${element.id}`),
      missingFiles,
    };
  },

  async renderPng(scene, options) {
    await fontsReady();
    const blob = await exportToBlob({
      elements: scene.elements,
      appState: {
        ...scene.appState,
        exportBackground: true,
        exportEmbedScene: false,
        exportWithDarkMode: false,
        viewBackgroundColor: options.background,
      },
      files: scene.files ?? {},
      mimeType: "image/png",
      exportPadding: options.padding,
      getDimensions: (width, height) => {
        const scaledWidth = Math.ceil(width * options.scale);
        const scaledHeight = Math.ceil(height * options.scale);
        if (
          scaledWidth > MAX_SIDE ||
          scaledHeight > MAX_SIDE ||
          scaledWidth * scaledHeight > MAX_PIXELS
        ) {
          throw new Error(`Export dimensions are unsafe: ${scaledWidth}x${scaledHeight}`);
        }
        return { width: scaledWidth, height: scaledHeight, scale: options.scale };
      },
    });
    await fontsReady();
    return blobToBase64(blob);
  },
};

window.excalidrawRendererReady = true;
