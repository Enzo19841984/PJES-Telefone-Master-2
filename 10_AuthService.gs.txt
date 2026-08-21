/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 10_AuthService.gs
 * ==========================================================
 */

class AuthService {
  constructor() {
    this.cache = CacheService.getUserCache();
    this.email = this.obterEmailDaSessao();
  }

  /**
   * Obtém a identidade real do usuário ativo.
   */
  static obterEmailAtivo() {
    try {
      return normalizarEmail(
        Session
          .getActiveUser()
          .getEmail()
      );
    } catch (erro) {
      return "";
    }
  }

  /**
   * A identidade do usuário vem da conta Google ativa.
   *
   * Com a implantação em versão única (acesso "Qualquer pessoa com
   * conta Google"), o Session.getActiveUser() é confiável e dispensa
   * o cache de sessão — não existe mais sessão "velha" entre telas.
   */
  obterEmailDaSessao() {
    const emailAtivo = AuthService.obterEmailAtivo();

    if (!emailAtivo || !emailInstitucional(emailAtivo)) {
      return "";
    }

    return emailAtivo;
  }

  /**
   * Salva sessão autenticada do aplicativo.
   */
  static salvarSessao(email, perfil) {
    const emailNormalizado = normalizarEmail(email);

    if (!emailInstitucional(emailNormalizado)
    ) {
      throw new Error("Somente contas institucionais do TJES podem iniciar sessão.");
    }

    const perfilNormalizado =
      String(
        perfil ||
        CONFIG.PERFIS.USUARIO_CONSULTA
      )
        .trim()
        .toUpperCase();

    const perfisValidos = [CONFIG.PERFIS.GESTOR_SISTEMA, CONFIG.PERFIS.GESTOR_CONTEUDO, CONFIG.PERFIS.USUARIO_CONSULTA];

    const perfilSeguro = perfisValidos.includes(perfilNormalizado) ? perfilNormalizado : CONFIG.PERFIS.USUARIO_CONSULTA;

    const cache = CacheService.getUserCache();

    const duracao = CONFIG.AUTH.DURACAO_SESSAO_SEGUNDOS;

    cache.put("emailLogado", emailNormalizado, duracao);

    cache.put("perfilLogado", perfilSeguro, duracao);

    cache.put("sessaoAplicacaoAtiva", "SIM", duracao);
  }

  /**
   * Encerra a sessão do aplicativo.
   *
   * Não encerra a conta Google.
   */
  static limparSessao() {
    const cache = CacheService.getUserCache();

    cache.remove("emailLogado");
    cache.remove("perfilLogado");
    cache.remove("sessaoAplicacaoAtiva");
  }

  /**
   * Retorna o usuário atual.
   */
  usuarioAtual() {
    if (!this.email) {
      return {
        email: "",
        nome: "Visitante",
        perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
        logado: false,
        ativo: false,
        comarcas: []
      };
    }

    if (!emailInstitucional(this.email)) {
      return {
        email: "",
        nome: "Visitante",
        perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
        logado: false,
        ativo: false,
        comarcas: []
      };
    }

    const usuario = this.buscarUsuario(this.email);

    return {
      email: this.email,
      nome: usuario.nome || this.email.split("@")[0],
      perfil: usuario.ativo ? usuario.perfil : CONFIG.PERFIS.USUARIO_CONSULTA,
      logado: true,
      ativo: usuario.ativo === true,
      comarcas: usuario.comarcas || []
    };
  }

  /**
   * Pesquisa usuário na aba USUARIOS.
   */
  buscarUsuario(email) {
    const sheet = DB.usuarios();

    const dados = DB.read(sheet);

    const mapa = DB.map(sheet);

    const idxComarcas = mapa.COMARCAS;

    const idxEmail = mapa.EMAIL;
    const idxNome = mapa.NOME;
    const idxPerfil = mapa.PERFIL;
    const idxAtivo = mapa.ATIVO;

    for (const linha of dados) {
      const emailLinha =
        idxEmail !== undefined
          ? normalizarEmail(linha[idxEmail - 1])
          : normalizarEmail(linha[0]);

      if (emailLinha !== normalizarEmail(email)) {
        continue;
      }

      const nome =
        idxNome !== undefined
          ? textoSeguro(linha[idxNome - 1])
          : textoSeguro(linha[1]);

      const perfilInformado =
        String(
          (idxPerfil !== undefined ? linha[idxPerfil - 1] : linha[2]) ||
          CONFIG.PERFIS.USUARIO_CONSULTA
        )
          .trim()
          .toUpperCase();

      const perfisValidos = [CONFIG.PERFIS.GESTOR_SISTEMA, CONFIG.PERFIS.GESTOR_CONTEUDO, CONFIG.PERFIS.USUARIO_CONSULTA];

      const perfilSeguro = perfisValidos.includes(perfilInformado) ? perfilInformado : CONFIG.PERFIS.USUARIO_CONSULTA;

      const ativo =
        idxAtivo !== undefined
          ? paraBoolean(linha[idxAtivo - 1])
          : paraBoolean(linha[3]);

      const comarcas =
        idxComarcas !== undefined
          ? parseComarcas(linha[idxComarcas - 1])
          : [];

      return {
        email: emailLinha,
        nome: nome,
        perfil: ativo ? perfilSeguro : CONFIG.PERFIS.USUARIO_CONSULTA,
        ativo: ativo,
        comarcas: comarcas
      };
    }

    /**
     * Usuário institucional ainda não aprovado.
     * Ele pode solicitar acesso, mas não pode editar.
     */
    return {
      email: normalizarEmail(email),
      nome: normalizarEmail(email).split("@")[0],
      perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
      ativo: false,
      comarcas: []
    };
  }

  perfilAtual() {
    return this.usuarioAtual().perfil;
  }

  exigirPermissao(permissao) {
    const usuario = this.usuarioAtual();

    const regras = {
      GESTOR_SISTEMA: [
        CONFIG.PERMISSOES.VISUALIZAR,
        CONFIG.PERMISSOES.PESQUISAR,
        CONFIG.PERMISSOES.EDITAR,
        CONFIG.PERMISSOES.EXCLUIR,
        CONFIG.PERMISSOES.HISTORICO
      ],

      GESTOR_CONTEUDO: [
        CONFIG.PERMISSOES.VISUALIZAR,
        CONFIG.PERMISSOES.PESQUISAR,
        CONFIG.PERMISSOES.EDITAR,
        CONFIG.PERMISSOES.EXCLUIR,
        CONFIG.PERMISSOES.HISTORICO
      ],

      USUARIO_CONSULTA: [CONFIG.PERMISSOES.VISUALIZAR, CONFIG.PERMISSOES.PESQUISAR]
    };

    const permissoes = regras[usuario.perfil] || [];

    const permissoesAdministrativas = [CONFIG.PERMISSOES.EDITAR, CONFIG.PERMISSOES.EXCLUIR, CONFIG.PERMISSOES.HISTORICO];

    if (permissoesAdministrativas.includes(permissao) && !usuario.logado) {
      throw new Error("Faça login pelo botão 'Acesso Administrativo'.");
    }

    if (!permissoes.includes(permissao)) {
      throw new Error("Usuário sem permissão para esta operação.");
    }

    return true;
  }

  exigirPerfil(perfilNecessario) {
    const usuario = this.usuarioAtual();

    if (!usuario.logado) {
      throw new Error("É necessário estar autenticado.");
    }

    if (usuario.perfil !== perfilNecessario) {
      throw new Error("Acesso permitido somente para " + perfilNecessario + ".");
    }

    return true;
  }

  /**
   * Verifica se o usuário pode atuar na comarca informada.
   *
   * - GESTOR_SISTEMA: pode atuar em todas as comarcas.
   * - GESTOR_CONTEUDO: somente nas comarcas da coluna COMARCAS
   *   (vazia = todas as comarcas).
   * - Demais perfis: sem permissão de edição.
   */
  exigirPermissaoComarca(comarca) {
    const usuario = this.usuarioAtual();

    if (!usuario.logado) {
      throw new Error("É necessário estar autenticado.");
    }

    if (usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) {
      return true;
    }

    if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) {
      throw new Error("Usuário sem permissão para editar telefones.");
    }

    const comarcaNormalizada =
      normalizarChave(comarca);

    if (!comarcaNormalizada) {
      throw new Error("Comarca não informada.");
    }

    const comarcas = usuario.comarcas || [];

    if (comarcas.length === 0) {
      return true;
    }

    const permitida =
      comarcas.some(item =>
        normalizarChave(item) === comarcaNormalizada
      );

    if (!permitida) {
      throw new Error(
        "Seu perfil permite editar somente as comarcas: " +
        comarcas.join(", ") +
        "."
      );
    }

    return true;
  }
}