# ADR-004 - Escolha da solução de autenticação da EasyFood

## Status
Proposta

## Data
03/09/2026

## Responsável
Equipe EasyFood

## Contexto
A EasyFood agora precisa de um mecanismo de autenticação. Hoje, qualquer cliente pode consultar
(`GET /restaurants`) e cadastrar (`POST /restaurants`) sem se identificar.

Precisamos decidir como a aplicação vai identificar e autenticar usuários, considerando que a
EasyFood ainda está em fase de aprendizado/protótipo, sem equipe de infraestrutura dedicada nem
orçamento para serviços de terceiros.

## Alternativas consideradas
1. **JWT** com autenticação própria (e-mail/senha), gerenciada dentro da própria aplicação.
2. **AWS Cognito** - serviço gerenciado de identidade da AWS, com suporte a login social, MFA e recuperação de senha prontos.
3. **Login com Google** (OAuth 2.0 / OpenID Connect) - delega a autenticação inteiramente ao Google.
4. **Outra solução** (ex: Auth0, Firebase Authentication) - serviços de terceiros com propósito parecido ao Cognito.

## Decisão
Adotar autenticação própria baseada em **JWT**: registro com e-mail + senha (hash via bcrypt) e
login que emite um token assinado, validado por um middleware Express nas rotas protegidas.

## Justificativa
- Não exige conta nem configuração em nenhum provedor externo (AWS, Google, Auth0) - consistente com a filosofia de baixa infraestrutura que a EasyFood vem seguindo desde a ADR-001.
- É a forma mais didática de entender o que acontece de fato em um fluxo de autenticação (hash de senha, emissão/verificação de token, middleware de proteção de rota) - alinhado ao momento de aprendizado da disciplina.
- Funciona totalmente local/offline, sem depender de contas em nuvem de terceiros.
- É simples de evoluir depois: dá para adicionar login social (Google) como método adicional sem descartar o JWT, que continuaria emitindo a sessão internamente.

## Consequências

### Positivas
- Controle total sobre o fluxo de autenticação e sobre os dados dos usuários.
- Nenhuma dependência de serviço externo, nenhum custo adicional.
- Fácil de testar e depurar localmente.
- Boa oportunidade de aprendizado sobre hashing de senha, tokens e middlewares de autenticação.

### Negativas
- A equipe é responsável por toda a segurança do fluxo (armazenamento de senha, expiração/revogação de token, proteção contra força bruta) - um provedor gerenciado já resolveria isso pronto.
- Não oferece login social, MFA ou recuperação de senha por e-mail prontos - precisariam ser construídos manualmente.
- Tokens JWT, uma vez emitidos, são difíceis de revogar antes da expiração sem uma camada extra (ex: lista de tokens revogados).
- Não escala tão bem quanto um serviço gerenciado quando o número de usuários e requisitos de compliance (ex: LGPD, auditoria) crescerem.

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. A EasyFood precisar de login social (Google, Facebook, Apple) como requisito de produto.
2. Surgirem requisitos de segurança mais rígidos (MFA, políticas de senha corporativas, auditoria de acesso).
3. O volume de usuários justificar terceirizar a complexidade de identidade para um serviço gerenciado (Cognito, Auth0, Firebase Auth).
4. For necessário revogar tokens antes da expiração (ex: logout forçado, usuário banido).

## Notas
Esta é uma decisão inicial para viabilizar o aprendizado do módulo de autenticação. Nada impede
que, no futuro, a EasyFood adicione login com Google como opção adicional ao lado do JWT próprio,
em vez de uma substituição completa.
