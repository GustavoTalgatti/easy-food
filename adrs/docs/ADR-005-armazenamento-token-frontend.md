# ADR-005 - Armazenamento do token JWT no front-end (index.html)

## Status
Aceita

## Data
17/09/2026

## Responsável
Equipe EasyFood

## Contexto
Com a ADR-004, a EasyFood passou a autenticar usuários via JWT, e o `POST /restaurants` passou a
exigir um token válido no header `Authorization` (Atividade 5). O `public/index.html` - usado
para testar a API pelo navegador - precisa guardar esse token em algum lugar entre o momento do
login e o momento em que o usuário cadastra um restaurante.

## Alternativas consideradas
1. Guardar o token em uma variável JavaScript em memória (`let authToken`).
2. Guardar o token em `localStorage`.
3. Guardar o token em `sessionStorage`.
4. O backend define um cookie `httpOnly` contendo o token.

## Decisão
Guardar o token em uma variável JavaScript em memória, válida apenas enquanto a página estiver
aberta. Ao recarregar a página (F5), o usuário precisa fazer login novamente.

## Justificativa
- É a opção mais simples de implementar num arquivo HTML de teste, sem nenhuma configuração adicional no backend.
- Evita o principal risco de `localStorage`/`sessionStorage`: um token ali gravado fica legível por qualquer script que rode na página (inclusive um ataque XSS), já que essas APIs são acessíveis via JavaScript.
- Como o `index.html` é uma ferramenta de teste/demonstração da API - não o produto final da EasyFood - não há necessidade real de persistir a sessão entre recarregamentos.

## Consequências

### Positivas
- Nenhum risco de vazamento do token via XSS lendo `localStorage`.
- Implementação simples, sem dependências extras.
- Reforça o hábito de tratar o token como algo sensível, não como algo salvo despreocupadamente no navegador.

### Negativas
- A cada recarregamento da página, o usuário perde a sessão e precisa logar de novo - inviável para uma aplicação real voltada ao usuário final.
- Não é a abordagem usada em produção; um app real tende a usar cookies `httpOnly` (mais seguros que `localStorage`) ou um fluxo de refresh token.

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. O `index.html` deixar de ser só uma ferramenta de teste e passar a ser a interface real da EasyFood para usuários finais.
2. For necessário manter o usuário logado entre sessões/recarregamentos.
3. A aplicação evoluir para um front-end com framework (React, Vue, etc.), quando cookies `httpOnly` setados pelo backend tendem a ser a escolha mais segura.

## Notas
Esta decisão é específica do front-end de testes (`public/index.html`) e não se aplica
necessariamente a uma futura interface de produção da EasyFood.
