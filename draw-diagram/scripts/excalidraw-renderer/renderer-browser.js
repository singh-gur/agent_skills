import "@excalidraw/excalidraw/index.css";
import { exportToBlob } from "@excalidraw/excalidraw";

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

window.renderExcalidrawPng = async (scene, options) => {
  await document.fonts.ready;

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
        throw new Error(
          `Export dimensions are unsafe: ${scaledWidth}x${scaledHeight}`,
        );
      }
      return {
        width: scaledWidth,
        height: scaledHeight,
        scale: options.scale,
      };
    },
  });

  await document.fonts.ready;
  if (document.fonts.status !== "loaded") {
    throw new Error(`Excalidraw fonts did not finish loading: ${document.fonts.status}`);
  }

  return blobToBase64(blob);
};

window.excalidrawRendererReady = true;
