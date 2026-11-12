# ADR-007 - Processamento de imagens dentro da API EasyFood

## Status
Aceita

## Data
22/10/2026

## Responsável
Equipe EasyFood

## Contexto
Com o cardápio (módulo `dishes`) e o perfil de usuários (módulo `auth`), cada prato e cada
usuário podem ter uma imagem associada. Imagens enviadas por usuários costumam ser grandes e
prejudicam o desempenho de quem as carrega (tempo de transferência e consumo de dados). Por isso
a EasyFood precisa receber a imagem, reduzir seu tamanho e armazenar apenas a versão otimizada.

Durante a aula foram discutidas alternativas arquiteturais para esse processamento, incluindo
Serverless/FaaS. O projeto está em fase acadêmica e tem demanda limitada.

## Alternativas consideradas
1. Processar dentro da API EasyFood (Multer + Sharp no próprio servidor Node.js).
2. Criar um serviço independente (microsserviço) de processamento de imagens.
3. Utilizar Serverless/FaaS (função acionada a cada upload, com armazenamento externo).

## Decisão
Manter o processamento de imagens dentro da API EasyFood. O Multer recebe o arquivo em memória
(limite de 5 MB; JPEG, PNG ou WebP), o `shared/image.service.js` usa o Sharp para corrigir a
orientação, redimensionar para no máximo 800 px de largura e converter para WebP, e a imagem
otimizada é salva em `uploads/<modulo>/` (`uploads/dishes/` ou `uploads/users/`). O caminho
resultante é gravado em `imageUrl` no banco.

## Justificativa
- Simplicidade: não exige novos componentes, filas, funções ou serviços para configurar.
- Baixo volume inicial de imagens, compatível com o contexto acadêmico.
- Aproveita a infraestrutura que já existe (servidor, disco e banco).
- Facilidade de implementação e de depuração, tudo no mesmo processo.
- O serviço fica em `shared`, então pode ser reutilizado por outros módulos (pratos do cardápio, imagens de perfil de usuário, logotipos) sem duplicar a lógica.

## Consequências

### Positivas
- Menor complexidade inicial e menos peças para operar.
- Aproveitamento da infraestrutura existente.
- Imagens menores e em formato moderno, com melhor tempo de carregamento para o usuário.
- Falha no upload não apaga o prato ou o usuário já cadastrado: a imagem é uma ação secundária e o envio pode ser repetido.

### Negativas
- O processamento consome CPU e memória da própria API e pode impactar outras requisições.
- Arquivos em disco local não funcionam bem com várias instâncias da aplicação nem com sistemas de arquivos temporários; em produção seria preciso um armazenamento externo (ex: S3).
- As imagens são públicas e a validação de arquivos é básica (tipo informado pelo cliente, decodificação pelo Sharp e limite de tamanho).
- Necessidade de reavaliar a solução se o volume de imagens crescer.

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. O volume de uploads começar a afetar o desempenho das demais rotas.
2. A aplicação passar a rodar em mais de uma instância ou em ambiente com disco efêmero.
3. Surgirem requisitos de acesso restrito às imagens ou de validação de segurança mais rígida.
4. For necessário gerar vários tamanhos por imagem ou processar arquivos maiores.

## Notas
Esta decisão não significa que Serverless seja inadequado. Significa que, neste momento, manter
o processamento na API atende melhor às necessidades do projeto. Uma evolução natural é mover o
processamento para uma função Serverless e o armazenamento para um serviço externo, mantendo o
contrato do `image.service.js`. A reutilização desse serviço entre os módulos `dishes` e `auth`
foi detalhada na ADR-008.
