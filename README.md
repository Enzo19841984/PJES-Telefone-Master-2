# Sistema Inteligente de Gestão de Contatos do PJES

Sistema Web App do **Poder Judiciário do Estado do Espírito Santo (TJES)** para consulta e gestão de contatos institucionais, construído com **Google Apps Script + Google Sheets**.

## Arquitetura atual

A fonte operacional segue a hierarquia:

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

### Regras principais

- Município pode possuir um ou vários Fóruns.
- Município com um único Fórum pode abrir diretamente o Fórum na consulta.
- Fórum possui endereço, e-mail e contatos gerais próprios.
- Unidade pertence a um Fórum e pode possuir endereço/e-mail próprios.
- Telefones, ramais e WhatsApps pertencem aos setores quando a fonte indicar isso.
- E-mail e endereço são herdados para visualização quando não houver dado próprio.
- Contatos podem estar diretamente vinculados ao Fórum ou, quando previsto pelo schema, diretamente à Unidade.
- A ordem funcional dos registros deve respeitar `ORDEM`; na ausência desse campo, preserva-se a ordem da planilha.
- `Protocolo • Distribuição` permanece como uma única Unidade quando assim estiver representado na fonte.

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

## Consulta pública

O mapa responsivo do Espírito Santo permanece na consulta. No desktop ele integra o layout; no mobile é apresentado no topo. A navegação principal é Município → Fórum → Unidade → Setor → Contato, com atalho de busca para telefone, ramal, WhatsApp, e-mail, unidade e setor.

## Administração

Os métodos antigos do frontend (`listarTelefones`, `pesquisarTelefones`, `criarTelefone`, `atualizarTelefone`, `excluirTelefone`, `listarHistorico` e `dashboard`) continuam existindo como contratos de compatibilidade, mas agora são roteados pelo `APIJS.html` para a integração V4, que opera em `CONTATOS` e considera `FORUM_ID`.

O arquivo `16_ForumV4Integration.gs` concentra essa ponte e também fornece `validarDadosReaisForumV4()` para diagnóstico da planilha vinculada sem alterar dados.

## Instalação e validação

1. Vincule a planilha com `registrarPlanilhaVinculada()`.
2. Execute `instalarSistemaForum()` para garantir as abas/cabeçalhos da arquitetura V4 sem criar `TELEFONES`.
3. Execute `validarIntegridadeForumV4()` para validação estrutural.
4. Execute `validarDadosReaisForumV4()` para validação dos registros da planilha vinculada (chaves estrangeiras, IDs, duplicidades de IDs, contatos órfãos e presença indevida da aba `TELEFONES`).

A validação do conteúdo do catálogo/PDF continua sendo uma etapa de dados e deve ser feita contra as fontes oficiais antes de alterações nos registros.

## Deploy

O projeto continua sendo distribuído via `clasp`/Google Apps Script. Depois de sincronizar a branch, faça o `clasp push` e execute as funções de instalação/validação no projeto Apps Script ligado à planilha real.
