const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
const ALLOWED_FOLDERS = ["dishes", "users"];

function resolveFolder(folder = "dishes") {
  const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : "dishes";
  return {
    safeFolder,
    targetDir: path.join(UPLOADS_ROOT, safeFolder)
  };
}

// Recebe a imagem original (em memória), otimiza e salva em disco.
// Pode ser reutilizado por diferentes módulos (ex.: "dishes", "users").
// Retorna o caminho público da imagem otimizada.
async function optimizeImage(buffer, folder = "dishes") {
  // O mimetype vem do cliente e não prova que o arquivo é uma imagem.
  // Se o Sharp não conseguir decodificar, é um erro do cliente (400).
  try {
    await sharp(buffer).metadata();
  } catch (error) {
    const invalid = new Error(
      "Arquivo inválido: envie uma imagem JPEG, PNG ou WebP"
    );
    invalid.statusCode = 400;
    throw invalid;
  }

  const { safeFolder, targetDir } = resolveFolder(folder);
  const filename = `${crypto.randomUUID()}.webp`;

  await fs.mkdir(targetDir, {
    recursive: true
  });

  const filePath = path.join(targetDir, filename);

  await sharp(buffer)
    .rotate()
    .resize({
      width: 800,
      withoutEnlargement: true
    })
    .webp({
      quality: 80
    })
    .toFile(filePath);

  return `/uploads/${safeFolder}/${filename}`;
}

// Remove uma imagem antiga do disco (usado ao substituir a imagem de um prato ou perfil).
// É uma limpeza "best effort": se falhar, não deve derrubar a operação principal.
async function removeImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return;

  try {
    const normalized = imageUrl.replace(/^\/+/, "");
    const resolvedPath = path.resolve(process.cwd(), normalized);

    // Garante que apenas arquivos dentro de /uploads possam ser removidos
    if (!resolvedPath.startsWith(UPLOADS_ROOT + path.sep)) {
      return;
    }

    await fs.unlink(resolvedPath);
  } catch (error) {
    // arquivo já não existe ou não pôde ser removido: ignoramos
  }
}

module.exports = {
  optimizeImage,
  removeImage
};
