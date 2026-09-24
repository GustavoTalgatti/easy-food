# ADR-002 - Escolha do mecanismo de persistência da EasyFood

## Status
Aceita

## Data
27/08/2026

## Responsável
Equipe EasyFood

## Contexto
A ADR-001 registrou a decisão de armazenar os restaurantes em um array em memória durante a
primeira versão da API. Essa decisão cumpriu seu papel: permitiu desenvolver e testar rapidamente
as rotas GET e POST /restaurants.

Ao testar a reinicialização do servidor (Parte 2 desta sprint), confirmamos a limitação prevista
na ADR-001: os restaurantes cadastrados são perdidos sempre que o processo Node.js é encerrado.

Para evoluir a EasyFood além de um protótipo, é necessário adotar um mecanismo de persistência
real, que mantenha os dados entre reinicializações e deploys.

## Alternativas consideradas
1. PostgreSQL - banco relacional robusto; exige um servidor de banco de dados dedicado (local ou em nuvem).
2. MongoDB - banco não relacional (documentos); também exige um servidor rodando separadamente.
3. Firebase (Firestore) - banco em nuvem gerenciado; exige conta, projeto configurado e conexão constante com a internet.
4. Arquivo JSON em disco - simples, mas sem SQL, sem controle de concorrência e com risco de corrupção do arquivo.
5. SQLite via módulo nativo `node:sqlite` - disponível a partir do Node.js 22.5, sem necessidade de instalar servidor ou dependência externa.

## Decisão
Adotar SQLite como banco de dados da EasyFood, utilizando o módulo nativo `node:sqlite` do
próprio Node.js, com os dados salvos em um arquivo `easyfood.db` na raiz do projeto.

## Justificativa
- Resolve o problema real identificado no teste da Parte 2: os dados deixam de ser perdidos ao reiniciar o servidor.
- Não exige instalar, configurar ou manter um servidor de banco de dados separado (diferente de PostgreSQL, MongoDB ou Firebase).
- Não exige nenhuma dependência nova no package.json - o driver de SQLite já vem embutido no Node.js.
- Mantém a complexidade de infraestrutura próxima da que já tínhamos na ADR-001, mas resolve a limitação de persistência.
- É suficiente para o volume de dados e a fase atual (prototipação/validação) da EasyFood.

## Consequências

### Positivas
- Persistência real: os restaurantes cadastrados sobrevivem a reinicializações do servidor.
- Nenhuma dependência nova a instalar; nenhuma infraestrutura externa a configurar.
- Continua simples de rodar localmente (um único arquivo `.db`).
- Permite usar SQL de verdade (consultas, filtros, ordenações), recurso que o array em memória não oferecia.
- Caminho de migração mais suave para um banco cliente-servidor (PostgreSQL/MySQL) no futuro, já que o código já fica organizado em torno de comandos SQL.

### Negativas
- `node:sqlite` ainda é um módulo **experimental** no Node.js - a API pode mudar em versões futuras e o Node emite um aviso (ExperimentalWarning) ao iniciar.
- SQLite não foi feito para múltiplas instâncias da aplicação escrevendo ao mesmo tempo (não escala horizontalmente como um banco cliente-servidor).
- Não há controle de acesso, usuários ou permissões como em um banco de dados gerenciado.
- O arquivo `easyfood.db` precisa ser tratado com cuidado (backup, versionamento) - geralmente é adicionado ao `.gitignore`.

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. `node:sqlite` sair do estágio experimental - reavaliar se a API mudou.
2. A EasyFood precisar rodar em múltiplas instâncias simultâneas (ex: vários containers/servidores).
3. For necessário controle de acesso concorrente mais robusto ou usuários com permissões diferentes.
4. O volume de restaurantes e requisições crescer a ponto de exigir um banco cliente-servidor dedicado.
5. A aplicação for para produção e exigir alta disponibilidade.

## Notas
Esta decisão substitui o mecanismo descrito na ADR-001 (array em memória), mantendo a mesma
filosofia de baixo custo e baixa complexidade, mas resolvendo a limitação de persistência
identificada nos testes da Parte 2.

Uma futura migração para PostgreSQL ou MongoDB, se necessária, deverá gerar uma nova decisão
arquitetural: ADR-003 - Migração do mecanismo de persistência da EasyFood.
