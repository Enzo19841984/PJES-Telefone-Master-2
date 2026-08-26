# Sistema Inteligente de Gestão de Contatos do PJES

Sistema Web App do **Poder Judiciário do Estado do Espírito Santo (TJES)** para consulta e gestão de contatos institucionais, construído com **Google Apps Script + Google Sheets**.

## Arquitetura atual

```text
MUNICIPIOS
    ↓
FORUM
    ↓
UNIDADES
    ↓
SETORES
    ↓
CONTATOS
```

A aba `TELEFONES` não faz parte da arquitetura operacional e não deve ser recriada.

## Regras principais

- Município pode possuir um ou vários Fóruns.
- Município com um único Fórum pode abrir diretamente o Fórum na consulta.
- Fórum possui endereço, e-mail e contatos gerais próprios.
- Unidade pertence a um Fórum e pode possuir endereço/e-mail próprios.
- Telefones, ramais e WhatsApps pertencem aos setores quando a fonte indicar isso.
- E-mail e endereço são herdados para visualização quando não houver dado próprio.
- Contatos podem estar diretamente vinculados ao Fórum ou, quando previsto pelo schema, diretamente à Unidade.
- A ordem funcional deve respeitar `ORDEM`; quando ausente, preserva-se a ordem física da planilha.
- `Protocolo • Distribuição` permanece como uma única entidade quando assim estiver na fonte.

## Consulta pública

O mapa responsivo do Espírito Santo permanece na consulta. No desktop ele integra o layout; no mobile é apresentado no topo. A navegação é Município → Fórum → Unidade → Setor → Contato, com busca por unidade, setor, telefone, ramal, WhatsApp e e-mail.

## Backend e compatibilidade

O frontend mantém os nomes históricos de API para evitar regressões, mas `APIJS.html` agora direciona os caminhos de listagem, pesquisa, CRUD, histórico, usuário e dashboard para a integração V4 em `16_ForumV4Integration.gs`.

Essa camada opera diretamente sobre `CONTATOS` e usa `FORUM_ID`, `UNIDADE_ID` e `SETOR_ID`, preservando contatos diretos do Fórum e a herança de endereço/e-mail.

A autenticação de usuários continua baseada na conta Google e na aba `USUARIOS`, com `NIVEL` convertido para o perfil do sistema. O escopo de gestores de conteúdo é resolvido por `ACESSOS_UNIDADES` quando houver vínculos ativos.

## Abas principais

- `MUNICIPIOS`
- `FORUM`
- `UNIDADES`
- `SETORES`
- `CONTATOS`
- `USUARIOS`
- `ACESSOS_UNIDADES`
- `TELEFONES_UTEIS`
- `HISTORICO`
- `LOG`
- `CONFIGURACAO`
- `NOTIFICACOES`
- `Solicitações de Acesso do sistema`

## Instalação e validação

1. `registrarPlanilhaVinculada()` — vincula a planilha ativa.
2. `instalarSistemaForum()` — garante o schema V4 sem criar `TELEFONES`.
3. `validarIntegridadeForumV4()` — valida estrutura/IDs.
4. `validarDadosReaisForumV4()` — valida a planilha vinculada, sem alterar dados:
   - abas obrigatórias;
   - ausência de `TELEFONES`;
   - IDs duplicados;
   - referências `FORUM_ID`, `UNIDADE_ID` e `SETOR_ID` válidas;
   - contatos órfãos.

A verificação de conteúdo contra o PDF e a planilha `(6)` deve continuar sendo feita contra os arquivos oficiais antes de qualquer correção de dados. Nesta execução, o arquivo `(6).xlsx` estava disponível como anexo no ambiente, mas não pôde ser lido pelo parser disponível; por isso não foi declarado um cruzamento linha a linha do workbook.

## Deploy

O projeto continua sendo sincronizado para o Google Apps Script via `clasp`. Após atualizar sua cópia local, execute `clasp push` e então as rotinas de instalação/validação no projeto vinculado à planilha real.
