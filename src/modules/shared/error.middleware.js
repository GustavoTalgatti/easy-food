const multer = require("multer");

// Middleware global de erros: precisa ser registrado por último no app.js.
// Converte erros conhecidos (upload, JSON inválido) em respostas HTTP
// adequadas, para que a API nunca encerre inesperadamente.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Imagem muito grande. O limite é de 5 MB"
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: 'Campo de arquivo inesperado. Envie a imagem no campo "image"'
      });
    }

    return res.status(400).json({
      error: "Erro ao receber o arquivo enviado"
    });
  }

  if (err.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      error: err.message
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "JSON inválido na requisição"
    });
  }

  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  console.error("Erro não tratado:", err);

  return res.status(500).json({
    error: "Erro interno do servidor"
  });
}

module.exports = errorHandler;
