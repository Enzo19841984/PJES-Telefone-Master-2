# Sistema Inteligente de Gestão de Telefones do PJES

Sistema Web App do **Poder Judiciário do Estado do Espírito Santo (TJES)** para gestão e consulta da base de telefones (comarcas, setores e contatos), construído sobre **Google Apps Script + Google Sheets**.

## Funcionalidades

- **Consulta pública** de telefones por microrregião, comarca e setor (com mapa do ES, links `tel:`, `wa.me` e `mailto:`)
- **Dashboard** com totais de contatos, setores e tipos
- **Gestão administrativa** (CRUD) da base de telefones, com histórico de alterações
- **Acesso por cargo (versão única)**: o login é feito pela conta Google. Quem possui perfil ativo na aba `USUARIOS` — `GESTOR_SISTEMA` ou `GESTOR_CONTEUDO` — entra automaticamente no cargo; quem não tem, permanece como visitante e pode solicitar acesso
- **Gestor de Conteúdo limitado a comarcas**: a coluna `COMARCAS` da aba `USUARIOS` restringe o gestor a editar somente as comarcas listadas (vazia = todas); a restrição é aplicada na API e na consulta
- **Painel de Usuários** (somente Gestor do Sistema): altera perfil (Gestor do Sistema / Gestor de Conteúdo / Visitante), ativa/desativa contas e define as comarcas dos gestores de conteúdo
- **Solicitações de acesso**: aba *Formulário de Acesso* na sidebar (nome, comarca, e-mail, perfil solicitado e justificativa) grava na aba *Solicitações de Acesso do sistema* com status `PENDENTE`; o Gestor do Sistema aprova ou rejeita
- **Notificações por e-mail** (fila em `EMAILS_PENDENTES` processada por gatilho)
- Modo escuro, impressão/PDF da consulta e versão exibida na sidebar

## Perfis

| Perfil | Acesso |
|---|---|
| `GESTOR_SISTEMA` | Tudo: edita qualquer telefone, aprova solicitações e gerencia usuários |
| `GESTOR_CONTEUDO` | Edita telefones; limitado às comarcas da coluna `COMARCAS`, se preenchida |
| `USUARIO_CONSULTA` (visitante) | Somente consulta |

## Estrutura do projeto

| Arquivo | Finalidade |
|---|---|
| `Main.gs` | Roteamento do Web App (versão única) |
| `01_Config.gs` | Configurações centrais (URL, abas, perfis, limites) |
| `02_Utils.gs` | Utilitários (normalização, comarcas, datas) |
| `03_Database.gs` | Acesso à planilha vinculada |
| `04_TelefoneRepository.gs` | CRUD da base TELEFONES |
| `05_HistoryService.gs` | Histórico de alterações |
| `06_ValidationService.gs` | Validação de telefones |
| `07_IdService.gs` | Geração de IDs |
| `08_CacheService.gs` | Cache de listagens |
| `09_LogService.gs` | Log de erros/operações |
| `10_AuthService.gs` | Autenticação (conta Google) e permissões |
| `11_API.gs` | Funções expostas ao frontend (`google.script.run`) |
| `12_Install.gs` | Instalação/migração das abas |
| `*.html` | Telas e scripts do frontend |

## Implantação (versão única)

1. Crie um projeto no [Google Apps Script](https://script.google.com) vinculado à planilha do sistema (Extensões → Apps Script).
2. Copie todos os arquivos `.gs` (sem a extensão `.txt` do repositório) e `.html` para o projeto.
3. No editor, execute na ordem:
   - `registrarPlanilhaVinculada()` — vincula a planilha ativa;
   - `instalarSistema()` — cria as abas e cabeçalhos (inclui `COMARCA` em *Solicitações de Acesso do sistema* e `COMARCAS` em `USUARIOS`);
   - `autorizar()` — concede as autorizações de planilha e e-mail;
   - `instalarTriggerEmails()` — instala o gatilho que processa a fila de e-mails (a cada minuto).
4. Ajuste `CONFIG.WEB_APP.URL_PUBLICA` para a URL real da implantação.
5. Publique: **Implantar → Nova implantação → Aplicativo da web**:
   - *Executar como*: **Eu (conta do deployer)**;
   - *Quem pode acessar*: **Qualquer pessoa com conta Google** (`ANYONE` no `appsscript.json`).
   - ⚠️ É essencial que o acesso seja "Qualquer pessoa com conta Google" (não anônimo): é isso que permite ao sistema identificar a conta ativa e aplicar os cargos automaticamente.
6. **Remova/ignore implantações antigas** (a antiga "URL privada" servia uma versão antiga do sistema — o motivo dos erros de versão e mapa). Com a versão única, há somente uma URL e uma versão.
7. Em instalações antigas, as colunas novas podem ser adicionadas executando apenas:
   - `atualizarAbaSolicitacoesAcesso()` (coluna `COMARCA`);
   - `instalarSistema()` (também garante `COMARCAS` em `USUARIOS`).

## Abas da planilha

- `TELEFONES` — ID, MICRORREGIAO, COMARCA, SETOR, TIPO, TELEFONE, RAMAL, WHATSAPP, E-MAIL, ENDERECO, STATUS, OBSERVACAO, DATA_CRIACAO, DATA_ATUALIZACAO
- `USUARIOS` — EMAIL, NOME, PERFIL, ATIVO, COMARCAS (lista separada por vírgula; vazia = todas)
- `Solicitações de Acesso do sistema` — ID, EMAIL, NOME, COMARCA, PERFIL_SOLICITADO, JUSTIFICATIVA, STATUS, DATA_SOLICITACAO, APROVADOR, DATA_APROVACAO (aceita também a aba legada `SOLICITACOES_ACESSO`)
- `CONFIGURACAO` — CHAVE, VALOR (ex.: `EMAIL_GESTOR`)
- `HISTORICO`, `LOG`, `EMAILS_PENDENTES`

## Segurança

- Consulta liberada para qualquer pessoa com conta Google.
- Ações administrativas exigem cargo ativo em `USUARIOS` (sem cadastro automático).
- Gestor de Conteúdo restrito a comarcas só enxerga e edita as próprias comarcas (validação no servidor).
- O Gestor do Sistema não pode editar a própria conta pelo painel e o sistema impede remover o último gestor do sistema ativo.
- Todas as escritas usam `LockService` para evitar concorrência.
