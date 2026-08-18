/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 01_Config.gs
 * ==========================================================
 */

const CONFIG = {
  SISTEMA: {
    NOME: "Sistema Inteligente de Gestão de Telefones do Poder Judiciário do Estado do Espírito Santo",
    VERSAO: "3.12"
  },

  WEB_APP: {
    /**
     * DUAS IMPLANTAÇÕES do MESMO projeto (mesma versão de código):
     *
     * URL_PUBLICA — acesso ANÔNIMO ("Qualquer pessoa", sem conta
     *   Google): visitantes consultam os telefones sem login.
     *   Crie com: Executar como "Eu" + Quem pode acessar
     *   "Qualquer pessoa" (anônimo) + Versão "Nova".
     *
     * URL_ADMIN — acesso com conta Google ("Qualquer pessoa com
     *   uma Conta do Google"): quem tem cargo ativo em USUARIOS
     *   entra automaticamente; os demais permanecem visitantes.
     *
     * MANTENHA AS DUAS URLs ATUALIZADAS AQUI (Implantar >
     * Gerenciar implantações > copiar URL do App da Web).
     */
    URL_PUBLICA: "https://script.google.com/macros/s/AKfycbyDK1r3NTUn6MVBL1J4BGcG3ldRRKIWLQeOwa8CZeBX2-aBRUn7SqUf0FDm7NlfLPcx/exec",
    URL_ADMIN: "https://script.google.com/macros/s/AKfycbxiX7gWnzO0mIs95cYY3ELmm3BmGSx0NkVrxRwQugeHZ0kgbsDFfne6CuJDM11dx59a/exec",

    /**
     * Deixe false para evitar que o sistema seja colocado
     * dentro de iframes de sites externos.
     *
     * Se o sistema for incorporado ao Google Sites ou outro
     * portal, altere para true conscientemente.
     */
    PERMITIR_IFRAME: false
  },

  AUTH: {
    DOMINIO_INSTITUCIONAL: "tjes.jus.br",
    DURACAO_SESSAO_SEGUNDOS: 3600
  },

  SHEETS: {
    TELEFONES: "TELEFONES",
    USUARIOS: "USUARIOS",
    CONFIGURACAO: "CONFIGURACAO",
    HISTORICO: "HISTORICO",
    LOG: "LOG",
    SOLICITACOES_ACESSO: "Solicitações de Acesso do sistema",
    SOLICITACOES_ACESSO_LEGADO: "SOLICITACOES_ACESSO",
    EMAILS_PENDENTES: "EMAILS_PENDENTES"
  },

  PERFIS: {
    GESTOR_SISTEMA: "GESTOR_SISTEMA",
    GESTOR_CONTEUDO: "GESTOR_CONTEUDO",
    USUARIO_CONSULTA: "USUARIO_CONSULTA"
  },

  PERMISSOES: {
    VISUALIZAR: "VISUALIZAR",
    PESQUISAR: "PESQUISAR",
    EDITAR: "EDITAR",
    EXCLUIR: "EXCLUIR",
    HISTORICO: "HISTORICO"
  },

  TELEFONES: {
    ID: "ID",
    MICROREGIAO: "Microrregiao",
    COMARCA: "Comarca",
    SETOR: "Setor",
    TIPO: "Tipo",
    TELEFONE: "Telefone",
    NUMERO: "Telefone",
    RAMAL: "Ramal",
    WHATSAPP: "Whatsapp",
    E_MAIL: "E-mail",
    ENDERECO: "Endereco",
    STATUS: "Status",
    OBSERVACAO: "Observacao",
    CRIADO: "CriadoEm",
    ATUALIZADO: "AtualizadoEm"
  },

  CACHE: {
    TEMPO_PADRAO: 300,
    CHAVE_TELEFONES: "TELEFONES_LISTA_V2"
  },

  LIMITES: {
    TAMANHO_PESQUISA: 2,
    TAMANHO_MAXIMO_NOME: 150,
    TAMANHO_MAXIMO_OBSERVACAO: 2000
  }
};

function teste() {
  Logger.log("OK");
}