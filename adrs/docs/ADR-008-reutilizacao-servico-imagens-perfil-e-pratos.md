# ADR-008 - Reutilização do serviço compartilhado de imagens no perfil do usuário e cardápio

## Status
Aceita

## Data
11/11/2026

## Responsável
Equipe EasyFood

## Contexto
Na evolução da EasyFood (Atividade 8), além de consolidar a correção no cadastro de pratos
(`POST /restaurants/:restaurantId/dishes`) e o envio de imagens para os pratos do cardápio
(`POST /dishes/:dishId/image`), surgiu a necessidade de permitir que os usuários autenticados
adicionem uma foto ao próprio perfil (`POST /auth/me/image`).

Tanto o módulo de pratos (`src/modules/dishes`) quanto o módulo de autenticação/usuários
(`src/modules/auth`) precisam executar exatamente o mesmo pipeline técnico:
1. Receber o arquivo enviado via `multipart/form-data` com validação de tamanho (até 5 MB) e
   formato (JPEG, PNG ou WebP).
2. Validar a decodificação real da imagem, corrigir orientação EXIF, redimensionar (máximo de
   800 px de largura sem ampliação) e converter para WebP utilizando Sharp.
3. Armazenar o arquivo otimizado em disco e persistir o caminho público (`imageUrl`) no
   PostgreSQL via Prisma.
4. Remover a imagem anterior do disco caso o prato ou usuário já possuísse uma imagem vinculada,
   evitando acúmulo de arquivos órfãos.

Além disso, no upload da imagem de perfil, é necessário garantir que um usuário autenticado só
possa alterar a própria foto de perfil, sem permitir a passagem de um `userId` arbitrário na URL
ou no corpo da requisição (prevenção contra vulnerabilidades IDOR — *Insecure Direct Object
Reference*).

## Alternativas consideradas
1. **Duplicar a lógica de upload e processamento** dentro de cada módulo (`auth` e `dishes`),
   criando configurações próprias de Multer e chamadas diretas ao Sharp em `auth.service.js` e
   `dish.service.js`.
2. **Implementar o processamento diretamente nas rotas ou nos Controllers**, acoplando Express,
   Multer, Sharp e Prisma na camada de entrada HTTP.
3. **Reutilizar um serviço compartilhado parametrizável** em `src/modules/shared/image.service.js`
   e o middleware `src/modules/shared/upload.middleware.js`, mantendo nos Services de domínio
   (`auth.service.js` e `dish.service.js`) apenas a regra de negócio e persistência no banco, e
   vinculando a imagem de perfil exclusivamente ao `req.user.id` extraído do token JWT pelo
   `auth.middleware.js`.

## Decisão
Adotar a **Alternativa 3**:
- Centralizar a recepção do arquivo em memória no middleware compartilhado
  `src/modules/shared/upload.middleware.js` (Multer com `memoryStorage`, limite de 5 MB e filtro
  de MIME types `image/jpeg`, `image/png` e `image/webp`).
- Parametrizar `optimizeImage(buffer, folder)` em `src/modules/shared/image.service.js` para
  salvar as imagens otimizadas em subpastas organizadas por contexto (`uploads/dishes/` e
  `uploads/users/`), validando a pasta contra uma lista permitida (`ALLOWED_FOLDERS`) e mantendo
  `removeImage(imageUrl)` confinado ao diretório `uploads/` para evitar *path traversal*.
- Adicionar o campo opcional `imageUrl String?` ao modelo `User` no `prisma/schema.prisma` (assim
  como já existente no modelo `Dish`).
- Expor o endpoint `POST /auth/me/image` protegido por `auth.middleware.js` **antes** do
  `upload.single("image")`, utilizando exclusivamente o identificador `req.user.id` (oriundo do
  payload `sub` do token JWT assinado) para atualizar o registro do usuário no PostgreSQL.
- Atualizar `GET /auth/me` para consultar os dados atualizados do usuário no PostgreSQL
  (`authService.getProfile`), retornando `id`, `name`, `email` e `imageUrl`.

## Justificativa
- **Princípio DRY (*Don't Repeat Yourself*) e Coesão**: Toda a complexidade de manipulação de
  buffers, validação binária com Sharp, conversão para WebP e escrita/remoção em disco fica
  concentrada em um único ponto (`image.service.js`). Se a política de compressão mudar ou se o
  armazenamento migrar para AWS S3 / Cloudflare R2, apenas `image.service.js` precisará ser
  alterado.
- **Separação de Responsabilidades (Controller vs. Service vs. Shared)**:
  - **Routes**: definem o encadeamento do pipeline HTTP (`authMiddleware` -> `upload.single` ->
    `controller`).
  - **Controllers** (`auth.controller.js`, `dish.controller.js`): validam parâmetros de entrada
    HTTP (`parseId`, presença de `req.file`, campos do body) e traduzem o resultado ou exceções
    em códigos de status HTTP adequados (`200`, `201`, `400`, `401`, `404`, `413`, `500`).
  - **Services de Domínio** (`auth.service.js`, `dish.service.js`): verificam a existência da
    entidade no PostgreSQL, coordenam a chamada ao `image.service.js`, atualizam a coluna
    `imageUrl` via Prisma e acionam a limpeza da imagem antiga.
  - **Shared Services** (`image.service.js`, `upload.middleware.js`, `error.middleware.js`):
    encapsulam infraestrutura transversal independente das regras de negócio de restaurantes,
    pratos ou usuários.
- **Segurança por Design (Mitigação de IDOR e Rejeição Precoce)**:
  - Como `auth.middleware.js` é executado antes do Multer nas rotas `POST /auth/me/image` e
    `POST /dishes/:dishId/image`, requisições sem JWT válido são rejeitadas imediatamente com
    `401 Unauthorized` antes mesmo de o servidor alocar memória para receber o buffer do arquivo.
  - Na rota `/auth/me/image`, o usuário não informa seu ID na URL nem no body: o controller usa
    `req.user.id` extraído do JWT verificado, impedindo que um usuário altere a foto de outro.
- **Tolerância a Falhas e Consistência**: O processamento da imagem no Sharp ocorre **antes** do
  `prisma.update`, e a remoção do arquivo antigo (`removeImage`) ocorre **depois** do
  `prisma.update`. Assim, se o arquivo enviado estiver corrompido e o Sharp falhar, o banco de
  dados não é alterado e a imagem anterior permanece intacta.

## Consequências

### Positivas
- Reutilização integral do pipeline Multer + Sharp entre os módulos `auth` e `dishes` sem
  duplicação de código.
- Organização limpa no diretório `/uploads/dishes` e `/uploads/users`, servidos estaticamente
  por `app.use("/uploads", express.static(...))`.
- Proteção contra substituição não autorizada de perfil (IDOR) e contra gastos desnecessários de
  memória/CPU em requisições não autenticadas.
- Arquitetura aberta à extensão: caso o módulo `restaurants` passe a ter logotipo no futuro,
  bastará adicionar `"restaurants"` em `ALLOWED_FOLDERS` e reutilizar `optimizeImage(buffer, "restaurants")`.

### Negativas
- Tanto imagens de pratos quanto fotos de perfil compartilham atualmente a mesma configuração de
  redimensionamento (largura máxima de 800 px, WebP qualidade 80) e permanecem acessíveis
  publicamente via URL caso o caminho seja conhecido.
- O armazenamento continua no sistema de arquivos local do servidor, herdando as limitações já
  documentadas na ADR-007 para ambientes distribuídos.

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. Fotos de perfil exigirem dimensões, recortes (ex.: proporção quadrada 1:1 / *crop* central)
   ou políticas de privacidade diferentes das imagens de pratos do cardápio.
2. O armazenamento local em `/uploads` for substituído por Object Storage em nuvem (S3, GCS, R2).
3. O módulo de pratos passar a exigir validação de propriedade do restaurante (*ownership*:
   apenas o dono do restaurante pode alterar a imagem do prato).

## Notas
Esta ADR complementa a ADR-004 (Autenticação JWT) e a ADR-007 (Processamento de imagens na API),
consolidando a arquitetura modular com serviços compartilhados da Atividade 8.
