# ADR-006 - Serviço compartilhado de e-mail com falha tolerada

## Status
Aceita

## Data
22/10/2026

## Responsável
Equipe EasyFood

## Contexto
A EasyFood precisa enviar e-mails (boas-vindas ao restaurante cadastrado e notificação ao
comercial). Outros módulos também vão precisar disso no futuro (pratos, usuários). Além disso,
o envio depende de um provedor externo (API de e-mail), que pode ficar indisponível, ser
trocado ou falhar por limites da conta.

Duas perguntas precisavam de resposta: onde fica a lógica de envio, e o que acontece com o
cadastro quando o e-mail falha.

## Alternativas consideradas
1. Implementar o envio dentro de cada Service que precisa (ex: `restaurant.service.js`).
2. Criar um serviço compartilhado e genérico em `src/modules/shared/email.service.js`.
3. Criar um microsserviço de notificações separado, com fila.
4. Tratar a falha do e-mail como falha do cadastro (desfazer a operação principal).

## Decisão
Criar o `email.service.js` em `shared`, expondo uma única função genérica,
`sendEmail({ to, toName, subject, header, body, footer })`. O restante da aplicação só conhece
essa função; tudo que é específico do provedor (MailerSend) fica isolado dentro do serviço.
O envio é tratado como ação secundária: o Service grava primeiro o dado principal e envia o
e-mail depois, dentro de um `try/catch`. Se o envio falhar, o erro é registrado no log e a
operação principal continua válida.

## Justificativa
- Evita duplicar a integração com o provedor em cada módulo.
- O serviço não conhece regras de negócio: recebe conteúdo pronto, então qualquer módulo pode usá-lo com textos diferentes.
- Trocar de provedor exige alterar apenas um arquivo, sem tocar nos módulos que enviam e-mails.
- O objetivo do usuário (cadastrar o restaurante) já foi cumprido quando o e-mail é enviado; derrubar o cadastro por causa de um serviço externo prejudicaria a disponibilidade da API.
- A chave da API e o remetente ficam no `.env`, fora do código e do repositório.

## Consequências

### Positivas
- Reutilização: o mesmo `sendEmail()` envia e-mails diferentes (boas-vindas e notificação ao comercial).
- Baixo acoplamento: os módulos dependem da assinatura de `sendEmail()`, não do provedor.
- Resiliência: uma falha no provedor não impede o cadastro nem derruba a API.
- Manutenção simples: template e integração em um só lugar.

### Negativas
- Uma falha de envio pode passar despercebida (o usuário não recebe o e-mail e o cadastro responde 201); depende de monitorar os logs.
- O envio é aguardado dentro da requisição, então um provedor lento aumenta o tempo de resposta do cadastro.
- Não há reenvio automático: um e-mail que falhou não é tentado novamente.
- Conteúdo vindo do usuário colocado no HTML do e-mail precisa ser escapado pelo chamador (`escapeHtml`).

## Critérios de revisão
Esta decisão deverá ser reavaliada quando:
1. O volume de e-mails ou a latência do provedor passar a impactar o tempo de resposta da API.
2. For necessário garantir a entrega (reenvio, fila, registro de e-mails não enviados).
3. O projeto precisar trocar de provedor ou usar mais de um.
4. Algum e-mail passar a ser parte essencial da operação (ex: confirmação obrigatória de conta), deixando de ser ação secundária.

## Notas
No plano de testes do MailerSend o envio costuma ser limitado a destinatários e domínios
verificados na própria conta. O destinatário dos e-mails de teste fica em `EMAIL_TEST_TO`, no
`.env`.
