/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 11_API.gs
 * ==========================================================
 */

/**
 * ==========================================================
 * RESPOSTAS
 * ==========================================================
 */

function respostaSucesso(dados) {
  return {
    sucesso: true,
    dados: serializarDadosAPI(dados)
  };
}

function respostaErro(erro) {
  let mensagem = "Erro desconhecido.";

  if (erro && erro.message) {
    mensagem = String(erro.message);
  } else if (erro !== null && erro !== undefined) {
    mensagem = String(erro);
  }

  return {
    sucesso: false,
    erro: mensagem
  };
}

function serializarDadosAPI(dados) {
  if (dados === undefined || dados === null) {
    return null;
  }

  return JSON.parse(
    JSON.stringify(dados)
  );
}

/**
 * ==========================================================
 * API PRINCIPAL
 * ==========================================================
 */

function carregarSistema() {
  try {
    const usuario =
      new AuthService().usuarioAtual();

    return respostaSucesso({
      usuario: usuario.email || "",
      versao: CONFIG.SISTEMA.VERSAO
    });
  } catch (erro) {
    registrarErroAPI(
      "CARREGAR_SISTEMA",
      erro
    );

    return respostaErro(erro);
  }
}

function listarTelefones() {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const dados =
      new TelefoneRepository().listar();

    /*
     * Gestor de conteúdo limitado a comarcas específicas
     * enxerga (e só consegue atuar) nas suas comarcas.
     */
    const usuario =
      new AuthService().usuarioAtual();

    if (
      usuario.logado &&
      usuario.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuario.comarcas || []).length > 0
    ) {
      const permitidas =
        usuario.comarcas.map(item =>
          normalizarChave(item)
        );

      return respostaSucesso(
        dados.filter(item =>
          permitidas.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        )
      );
    }

    return respostaSucesso(dados);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_TELEFONES",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * Lista as comarcas cadastradas (para o seletor do
 * Formulário de Acesso e demais menus suspensos).
 */
function listarComarcas() {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const dados =
      new TelefoneRepository().listar();

    const usuarioComarcas =
      new AuthService().usuarioAtual();

    let dadosFiltrados = dados;

    if (
      usuarioComarcas.logado &&
      usuarioComarcas.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioComarcas.comarcas || []).length > 0
    ) {
      const permitidasComarcas =
        usuarioComarcas.comarcas.map(item =>
          normalizarChave(item)
        );

      dadosFiltrados =
        dados.filter(item =>
          permitidasComarcas.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    const comarcas = {};

    dadosFiltrados.forEach(item => {
      const comarca =
        textoSeguro(item.comarca);

      if (comarca && !comarcas[comarca]) {
        comarcas[comarca] = true;
      }
    });

    const lista =
      Object.keys(comarcas)
        .sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );

    return respostaSucesso(lista);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_COMARCAS",
      erro
    );

    return respostaErro(erro);
  }
}

function pesquisarTelefones(texto) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.PESQUISAR
    );

    const termo =
      texto === null || texto === undefined
        ? ""
        : String(texto).trim();

    if (
      termo &&
      limparTexto(termo).length <
        CONFIG.LIMITES.TAMANHO_PESQUISA
    ) {
      return respostaSucesso([]);
    }

    let resultadoPesquisa =
      new TelefoneRepository().pesquisar(termo);

    const usuarioPesquisa =
      new AuthService().usuarioAtual();

    if (
      usuarioPesquisa.logado &&
      usuarioPesquisa.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioPesquisa.comarcas || []).length > 0
    ) {
      const permitidasPesquisa =
        usuarioPesquisa.comarcas.map(item =>
          normalizarChave(item)
        );

      resultadoPesquisa =
        resultadoPesquisa.filter(item =>
          permitidasPesquisa.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    return respostaSucesso(resultadoPesquisa);
  } catch (erro) {
    registrarErroAPI(
      "PESQUISAR_TELEFONES",
      erro
    );

    return respostaErro(erro);
  }
}

function obterTelefone(id) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório."
      );
    }

    const registroTelefone =
      new TelefoneRepository().obter(idBusca);

    if (registroTelefone) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(registroTelefone.comarca)
      );
    }

    return respostaSucesso(registroTelefone);
  } catch (erro) {
    registrarErroAPI(
      "OBTER_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function carregarDashboard() {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const telefones =
      new TelefoneRepository().listar();

    const usuarioDashboard =
      new AuthService().usuarioAtual();

    let telefonesDashboard = telefones;

    if (
      usuarioDashboard.logado &&
      usuarioDashboard.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioDashboard.comarcas || []).length > 0
    ) {
      const permitidasDash =
        usuarioDashboard.comarcas.map(item =>
          normalizarChave(item)
        );

      telefonesDashboard =
        telefones.filter(item =>
          permitidasDash.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    const tipos = {};
    const setores = {};
    const comarcas = {};

    telefonesDashboard.forEach(item => {
      const tipo =
        textoSeguro(item.tipo) ||
        "Não informado";

      const setor =
        textoSeguro(item.setor) ||
        "Não informado";

      const comarca =
        textoSeguro(item.comarca) ||
        "Não informado";

      tipos[tipo] =
        (tipos[tipo] || 0) + 1;

      setores[setor] =
        (setores[setor] || 0) + 1;

      comarcas[comarca] =
        (comarcas[comarca] || 0) + 1;
    });

    return respostaSucesso({
      total: telefonesDashboard.length,
      tipos: tipos,
      setores: setores,
      comarcas: comarcas
    });
  } catch (erro) {
    registrarErroAPI(
      "DASHBOARD",
      erro
    );

    return respostaErro(erro);
  }
}

function criarTelefone(dados) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.EDITAR
    );

    if (!ehObjeto(dados)) {
      throw new Error(
        "Os dados do telefone não foram fornecidos."
      );
    }

    new AuthService().exigirPermissaoComarca(
      valorObjeto(dados, "comarca", "COMARCA")
    );

    return respostaSucesso(
      new TelefoneRepository().inserir(dados)
    );
  } catch (erro) {
    registrarErroAPI(
      "CRIAR_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function atualizarTelefone(id, dados) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.EDITAR
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório para atualização."
      );
    }

    if (!ehObjeto(dados)) {
      throw new Error(
        "Dados para atualização não foram fornecidos."
      );
    }

    /*
     * O gestor de conteúdo limitado só pode alterar telefones
     * das suas comarcas — nem a comarca atual nem a nova podem
     * estar fora do escopo dele.
     */
    const atual =
      new TelefoneRepository().obter(idBusca);

    if (atual) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(atual.comarca)
      );
    }

    const novaComarca =
      textoSeguro(
        valorObjeto(dados, "comarca", "COMARCA")
      );

    if (novaComarca) {
      new AuthService().exigirPermissaoComarca(novaComarca);
    }

    return respostaSucesso(
      new TelefoneRepository().atualizar(
        idBusca,
        dados
      )
    );
  } catch (erro) {
    registrarErroAPI(
      "ATUALIZAR_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function excluirTelefone(id) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.EXCLUIR
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório."
      );
    }

    const registro =
      new TelefoneRepository().obter(idBusca);

    if (registro) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(registro.comarca)
      );
    }

    const resultado =
      new TelefoneRepository().excluir(idBusca);

    registrarInfoAPI(
      "EXCLUIR_TELEFONE",
      "Telefone excluído: " + idBusca
    );

    return respostaSucesso(resultado);
  } catch (erro) {
    registrarErroAPI(
      "EXCLUIR_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function listarHistorico(id) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.HISTORICO
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório."
      );
    }

    const registroHistorico =
      new TelefoneRepository().obter(idBusca);

    if (registroHistorico) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(registroHistorico.comarca)
      );
    }

    return respostaSucesso(
      new HistoryService().listar(idBusca)
    );
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_HISTORICO",
      erro
    );

    return respostaErro(erro);
  }
}

function obterUsuarioAtual() {
  try {
    return respostaSucesso(
      new AuthService().usuarioAtual()
    );
  } catch (erro) {
    registrarErroAPI(
      "OBTER_USUARIO",
      erro
    );

    return respostaErro(erro);
  }
}

function encerrarSessao() {
  try {
    AuthService.limparSessao();
    return respostaSucesso(true);
  } catch (erro) {
    registrarErroAPI(
      "LOGOUT",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * ==========================================================
 * SOLICITAÇÕES DE ACESSO
 * ==========================================================
 */

/**
 * Mapa de colunas da aba SOLICITACOES_ACESSO.
 *
 * Usa os cabeçalhos da planilha em vez de posições fixas,
 * tornando o código resiliente a reordenações e à coluna
 * COMARCA (presente em instalações novas e adicionada por
 * migração em instalações antigas).
 */
function indicesSolicitacao(linhaCabecalho) {
  const alvos = {
    ID: ["ID"],
    EMAIL: ["EMAIL"],
    NOME: ["NOME"],
    COMARCA: ["COMARCA"],
    PERFIL: ["PERFIL_SOLICITADO", "PERFIL"],
    JUSTIFICATIVA: ["JUSTIFICATIVA"],
    STATUS: ["STATUS"],
    DATA: ["DATA_SOLICITACAO", "DATA"],
    APROVADOR: ["APROVADOR"],
    DATA_APROVACAO: ["DATA_APROVACAO"]
  };

  const indices = {};

  (Array.isArray(linhaCabecalho) ? linhaCabecalho : []).forEach((cabecalho, i) => {
    const chave = normalizarChave(cabecalho);

    Object.keys(alvos).forEach(grupo => {
      if (
        indices[grupo] === undefined &&
        alvos[grupo].some(nome => normalizarChave(nome) === chave)
      ) {
        indices[grupo] = i;
      }
    });
  });

  return indices;
}

/**
 * Monta uma linha (array) para a aba SOLICITACOES_ACESSO
 * respeitando as colunas existentes na planilha.
 */
function montarLinhaSolicitacao(indices, campos) {
  const largura =
    Object.keys(indices).reduce(
      (maximo, grupo) => Math.max(maximo, indices[grupo] + 1),
      0
    );

  const linha = new Array(largura).fill("");

  Object.keys(campos).forEach(grupo => {
    if (indices[grupo] !== undefined) {
      linha[indices[grupo]] = campos[grupo];
    }
  });

  return linha;
}

function listarSolicitacoes() {
  try {
    new AuthService().exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const sheet =
      DB.solicitacoesAcesso();

    if (!sheet) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const dados =
      sheet.getDataRange().getValues();

    if (dados.length <= 1) {
      return respostaSucesso([]);
    }

    const indices = indicesSolicitacao(dados[0]);

    const result =
      dados
        .slice(1)
        .filter(row =>
          String(row[indices.STATUS] || "")
            .trim()
            .toUpperCase() === "PENDENTE"
        )
        .map(row => ({
          id: row[indices.ID],
          email: row[indices.EMAIL],
          nome: row[indices.NOME],
          comarca: indices.COMARCA !== undefined ? row[indices.COMARCA] : "",
          perfilSolicitado: row[indices.PERFIL],
          justificativa: row[indices.JUSTIFICATIVA],
          status: row[indices.STATUS],
          data: row[indices.DATA]
        }));

    return respostaSucesso(result);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_SOLICITACOES",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * Solicitação de acesso (área administrativa).
 *
 * O solicitante precisa estar autenticado com conta
 * institucional. Justificativa e comarca são opcionais
 * para manter compatibilidade com chamadas antigas.
 */
function solicitarAcesso(nome, perfil, justificativa, comarca) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const usuario =
      new AuthService().usuarioAtual();

    if (
      !usuario.logado ||
      !usuario.email
    ) {
      throw new Error(
        "É necessário estar autenticado."
      );
    }

    if (!emailInstitucional(usuario.email)) {
      throw new Error(
        "Somente contas institucionais podem solicitar acesso."
      );
    }

    if (
      usuario.perfil !==
      CONFIG.PERFIS.USUARIO_CONSULTA
    ) {
      throw new Error(
        "Esta conta já possui um perfil administrativo."
      );
    }

    const nomeNormalizado =
      textoSeguro(nome);

    if (nomeNormalizado.length < 3) {
      throw new Error(
        "Informe um nome válido."
      );
    }

    if (
      nomeNormalizado.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_NOME
    ) {
      throw new Error(
        "O nome informado é muito grande."
      );
    }

    const perfilSolicitado =
      String(perfil || "")
        .trim()
        .toUpperCase();

    if (
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_CONTEUDO &&
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_SISTEMA
    ) {
      throw new Error(
        "Perfil solicitado inválido."
      );
    }

    const justificativaNormalizada =
      textoSeguro(justificativa);

    if (
      justificativaNormalizada.length > 0 &&
      justificativaNormalizada.length < 10
    ) {
      throw new Error(
        "Descreva a justificativa (mínimo de 10 caracteres)."
      );
    }

    if (
      justificativaNormalizada.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_OBSERVACAO
    ) {
      throw new Error(
        "A justificativa é muito longa."
      );
    }

    const comarcaNormalizada =
      textoSeguro(comarca);

    const sheet =
      DB.solicitacoesAcesso();

    if (!sheet) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const dados =
      sheet.getDataRange().getValues();

    const indices = indicesSolicitacao(dados[0] || []);

    const emailSolicitante =
      normalizarEmail(usuario.email);

    const existePendente =
      dados.slice(1).some(row => {
        const emailLinha =
          indices.EMAIL !== undefined
            ? normalizarEmail(row[indices.EMAIL])
            : normalizarEmail(row[1]);

        const statusLinha =
          indices.STATUS !== undefined
            ? String(row[indices.STATUS] || "").trim().toUpperCase()
            : String(row[5] || "").trim().toUpperCase();

        return (
          emailLinha === emailSolicitante &&
          statusLinha === "PENDENTE"
        );
      });

    if (existePendente) {
      throw new Error(
        "Já existe uma solicitação pendente para este e-mail."
      );
    }

    const id = Utilities.getUuid();

    const linha = montarLinhaSolicitacao(indices, {
      ID: id,
      EMAIL: emailSolicitante,
      NOME: nomeNormalizado,
      COMARCA: comarcaNormalizada,
      PERFIL: perfilSolicitado,
      JUSTIFICATIVA: justificativaNormalizada,
      STATUS: "PENDENTE",
      DATA: new Date()
    });

    sheet.appendRow(linha);

    try {
      notificarNovaSolicitacao(
        emailSolicitante,
        nomeNormalizado,
        perfilSolicitado,
        comarcaNormalizada,
        justificativaNormalizada
      );
    } catch (erroEmail) {
      registrarErroAPI(
        "NOTIFICAR_NOVA_SOLICITACAO",
        erroEmail
      );
    }

    return respostaSucesso({ id: id });
  } catch (erro) {
    registrarErroAPI(
      "SOLICITAR_ACESSO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/**
 * Formulário público de acesso (aba "Formulário de Acesso").
 *
 * Qualquer visitante pode preencher: nome, comarca, e-mail,
 * perfil solicitado e justificativa. Os dados são gravados na
 * aba SOLICITACOES_ACESSO com status PENDENTE.
 */
function enviarFormularioAcesso(dados) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const entrada = ehObjeto(dados) ? dados : {};

    const nome =
      textoSeguro(
        valorObjeto(entrada, "nome", "NOME")
      );

    const comarca =
      textoSeguro(
        valorObjeto(entrada, "comarca", "COMARCA")
      );

    const email =
      normalizarEmail(
        valorObjeto(entrada, "email", "EMAIL")
      );

    const perfilSolicitado =
      String(
        valorObjeto(entrada, "perfil", "perfilSolicitado", "PERFIL_SOLICITADO")
          || ""
      )
        .trim()
        .toUpperCase();

    const justificativa =
      textoSeguro(
        valorObjeto(entrada, "justificativa", "JUSTIFICATIVA")
      );

    if (nome.length < 3) {
      throw new Error(
        "Informe o seu nome completo."
      );
    }

    if (
      nome.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_NOME
    ) {
      throw new Error(
        "O nome informado é muito grande."
      );
    }

    if (comarca.length < 2) {
      throw new Error(
        "Informe a comarca em que você trabalha."
      );
    }

    if (
      comarca.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_NOME
    ) {
      throw new Error(
        "A comarca informada é muito grande."
      );
    }

    if (!emailValidoAPI(email)) {
      throw new Error(
        "Informe um e-mail válido."
      );
    }

    if (!emailInstitucional(email)) {
      throw new Error(
        "Somente e-mails institucionais (" +
        CONFIG.AUTH.DOMINIO_INSTITUCIONAL +
        ") podem solicitar acesso."
      );
    }

    if (
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_CONTEUDO &&
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_SISTEMA
    ) {
      throw new Error(
        "Perfil solicitado inválido."
      );
    }

    if (justificativa.length < 10) {
      throw new Error(
        "Descreva a justificativa (mínimo de 10 caracteres)."
      );
    }

    if (
      justificativa.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_OBSERVACAO
    ) {
      throw new Error(
        "A justificativa é muito longa."
      );
    }

    const sheet =
      DB.solicitacoesAcesso();

    if (!sheet) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const dadosPlanilha =
      sheet.getDataRange().getValues();

    const indices = indicesSolicitacao(dadosPlanilha[0] || []);

    if (indices.STATUS === undefined || indices.EMAIL === undefined) {
      throw new Error(
        "A aba SOLICITACOES_ACESSO não possui os cabeçalhos esperados. Execute instalarSistema()."
      );
    }

    const existePendente =
      dadosPlanilha.slice(1).some(row => {
        const emailLinha =
          normalizarEmail(row[indices.EMAIL]);

        const statusLinha =
          String(row[indices.STATUS] || "")
            .trim()
            .toUpperCase();

        return (
          emailLinha === email &&
          statusLinha === "PENDENTE"
        );
      });

    if (existePendente) {
      throw new Error(
        "Já existe uma solicitação pendente para este e-mail."
      );
    }

    const id = Utilities.getUuid();

    const linha = montarLinhaSolicitacao(indices, {
      ID: id,
      EMAIL: email,
      NOME: nome,
      COMARCA: comarca,
      PERFIL: perfilSolicitado,
      JUSTIFICATIVA: justificativa,
      STATUS: "PENDENTE",
      DATA: new Date()
    });

    sheet.appendRow(linha);

    try {
      notificarNovaSolicitacao(
        email,
        nome,
        perfilSolicitado,
        comarca,
        justificativa
      );
    } catch (erroEmail) {
      registrarErroAPI(
        "NOTIFICAR_NOVA_SOLICITACAO",
        erroEmail
      );
    }

    registrarInfoAPI(
      "FORMULARIO_ACESSO",
      "Nova solicitação pelo formulário: " + email
    );

    return respostaSucesso({ id: id });
  } catch (erro) {
    registrarErroAPI(
      "FORMULARIO_ACESSO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

function localizarSolicitacaoAPI(sheet, id) {
  const idBusca = textoSeguro(id);

  const dados =
    sheet.getDataRange().getValues();

  const indices = indicesSolicitacao(dados[0] || []);

  for (
    let i = 1;
    i < dados.length;
    i++
  ) {
    if (
      textoSeguro(dados[i][indices.ID]) ===
      idBusca
    ) {
      return {
        linha: i + 1,
        id: dados[i][indices.ID],
        email: normalizarEmail(dados[i][indices.EMAIL]),
        nome: textoSeguro(dados[i][indices.NOME]),
        comarca: indices.COMARCA !== undefined ? textoSeguro(dados[i][indices.COMARCA]) : "",
        perfil: String(dados[i][indices.PERFIL] || "")
          .trim()
          .toUpperCase(),
        status: String(dados[i][indices.STATUS] || "")
          .trim()
          .toUpperCase()
      };
    }
  }

  return null;
}

function processarSolicitacaoAPI(id, novoStatus) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    new AuthService().exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID da solicitação é obrigatório."
      );
    }

    const status =
      String(novoStatus || "")
        .trim()
        .toUpperCase();

    if (
      !["APROVADO", "REJEITADO"].includes(status)
    ) {
      throw new Error(
        "Status de solicitação inválido."
      );
    }

    const ss = obterPlanilhaAPI();

    const sheetSolic =
      DB.solicitacoesAcesso();

    if (!sheetSolic) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const solicitacao =
      localizarSolicitacaoAPI(
        sheetSolic,
        idBusca
      );

    if (!solicitacao) {
      throw new Error(
        "Solicitação não encontrada."
      );
    }

    if (solicitacao.status !== "PENDENTE") {
      throw new Error(
        "Esta solicitação já foi processada."
      );
    }

    if (
      solicitacao.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO &&
      solicitacao.perfil !== CONFIG.PERFIS.GESTOR_SISTEMA
    ) {
      throw new Error(
        "O perfil solicitado é inválido."
      );
    }

    if (status === "APROVADO") {
      const sheetUsuarios =
        ss.getSheetByName(
          CONFIG.SHEETS.USUARIOS
        );

      if (!sheetUsuarios) {
        throw new Error(
          "Aba USUARIOS não encontrada."
        );
      }

      const mapaU = DB.map(sheetUsuarios);
      const idxEmailU = mapaU.EMAIL;
      const idxNomeU = mapaU.NOME;
      const idxPerfilU = mapaU.PERFIL;
      const idxAtivoU = mapaU.ATIVO;
      const idxComarcasU = mapaU.COMARCAS;

      const dadosU = sheetUsuarios.getDataRange().getValues();
      const perfilSolicitadoNorm = String(solicitacao.perfil || "").trim().toUpperCase();
      const comarcasSolicitadasRaw = String(solicitacao.comarca || "").trim();
      const comarcasSolicitadasLista = comarcasSolicitadasRaw
        ? comarcasSolicitadasRaw.split(/[,;|]+/).map(function(s){ return String(s||"").trim(); }).filter(Boolean)
        : [];

      let usuarioExiste = false;
      let linhaUsuario = -1;

      for (let i = 1; i < dadosU.length; i++) {
        const emailUsuario = idxEmailU !== undefined ? normalizarEmail(dadosU[i][idxEmailU - 1]) : normalizarEmail(dadosU[i][0]);
        if (emailUsuario === solicitacao.email) {
          linhaUsuario = i + 1;
          usuarioExiste = true;
          break;
        }
      }

      if (usuarioExiste) {
        // Nome
        if (idxNomeU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxNomeU).setValue(solicitacao.nome);
        else sheetUsuarios.getRange(linhaUsuario, 2).setValue(solicitacao.nome);

        // Perfil + comarcas + ativo
        if (perfilSolicitadoNorm === CONFIG.PERFIS.GESTOR_SISTEMA) {
          if (idxPerfilU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxPerfilU).setValue(CONFIG.PERFIS.GESTOR_SISTEMA);
          else sheetUsuarios.getRange(linhaUsuario, 3).setValue(CONFIG.PERFIS.GESTOR_SISTEMA);
          if (idxAtivoU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxAtivoU).setValue("SIM");
          else sheetUsuarios.getRange(linhaUsuario, 4).setValue("SIM");
          // Sistema = todas -> limpa COMARCAS
          if (idxComarcasU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxComarcasU).setValue("");
        } else {
          // Gestor de Conteúdo: mescla comarcas existentes + solicitadas
          if (idxPerfilU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxPerfilU).setValue(CONFIG.PERFIS.GESTOR_CONTEUDO);
          else sheetUsuarios.getRange(linhaUsuario, 3).setValue(CONFIG.PERFIS.GESTOR_CONTEUDO);
          if (idxAtivoU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxAtivoU).setValue("SIM");
          else sheetUsuarios.getRange(linhaUsuario, 4).setValue("SIM");

          if (idxComarcasU !== undefined) {
            const existenteRaw = String(dadosU[linhaUsuario - 1][idxComarcasU - 1] || "").trim();
            const existenteLista = existenteRaw ? existenteRaw.split(/[,;|]+/).map(function(s){ return String(s||"").trim(); }).filter(Boolean) : [];
            const mergedMap = {};
            existenteLista.forEach(function(c){ mergedMap[normalizarChave(c)] = c; });
            comarcasSolicitadasLista.forEach(function(c){ var k = normalizarChave(c); if (!mergedMap[k]) mergedMap[k] = c; });
            const merged = Object.keys(mergedMap).map(function(k){ return mergedMap[k]; });
            // Se já tinha vazio (=todas), manter vazio não faz sentido ao adicionar — merged será as solicitadas
            // Se existente era vazio (todas) e agora pede conteudo com lista, vira lista
            const valorComarcas = merged.length ? merged.join(", ") : "";
            sheetUsuarios.getRange(linhaUsuario, idxComarcasU).setValue(valorComarcas);
          }
        }
      } else {
        // Novo usuário
        if (perfilSolicitadoNorm === CONFIG.PERFIS.GESTOR_SISTEMA) {
          const linhaNovaSistema = [];
          // Monta via mapa para respeitar ordem das colunas
          const headersU = DB.headers(sheetUsuarios);
          const widthU = headersU.length;
          for (let c = 0; c < widthU; c++) linhaNovaSistema.push("");
          if (idxEmailU !== undefined) linhaNovaSistema[idxEmailU - 1] = solicitacao.email;
          if (idxNomeU !== undefined) linhaNovaSistema[idxNomeU - 1] = solicitacao.nome;
          if (idxPerfilU !== undefined) linhaNovaSistema[idxPerfilU - 1] = CONFIG.PERFIS.GESTOR_SISTEMA;
          if (idxAtivoU !== undefined) linhaNovaSistema[idxAtivoU - 1] = "SIM";
          if (idxComarcasU !== undefined) linhaNovaSistema[idxComarcasU - 1] = "";
          // fallback se mapa incompleto
          if (linhaNovaSistema.every(function(v){ return !v; })) {
            sheetUsuarios.appendRow([solicitacao.email, solicitacao.nome, CONFIG.PERFIS.GESTOR_SISTEMA, "SIM"]);
          } else {
            sheetUsuarios.appendRow(linhaNovaSistema);
          }
        } else {
          const comarcasValor = comarcasSolicitadasLista.join(", ");
          const headersU2 = DB.headers(sheetUsuarios);
          const widthU2 = headersU2.length;
          const linhaNovaConteudo = new Array(widthU2).fill("");
          if (idxEmailU !== undefined) linhaNovaConteudo[idxEmailU - 1] = solicitacao.email;
          if (idxNomeU !== undefined) linhaNovaConteudo[idxNomeU - 1] = solicitacao.nome;
          if (idxPerfilU !== undefined) linhaNovaConteudo[idxPerfilU - 1] = CONFIG.PERFIS.GESTOR_CONTEUDO;
          if (idxAtivoU !== undefined) linhaNovaConteudo[idxAtivoU - 1] = "SIM";
          if (idxComarcasU !== undefined) linhaNovaConteudo[idxComarcasU - 1] = comarcasValor;
          if (linhaNovaConteudo.every(function(v){ return !v; })) {
            sheetUsuarios.appendRow([solicitacao.email, solicitacao.nome, CONFIG.PERFIS.GESTOR_CONTEUDO, "SIM", comarcasValor]);
          } else {
            sheetUsuarios.appendRow(linhaNovaConteudo);
          }
        }
      }
    }

    const aprovador =
      obterEmailSessaoAPI();

    const indices =
      indicesSolicitacao(
        sheetSolic.getRange(1, 1, 1, sheetSolic.getLastColumn()).getDisplayValues()[0]
      );

    if (indices.STATUS !== undefined) {
      sheetSolic
        .getRange(solicitacao.linha, indices.STATUS + 1)
        .setValue(status);
    }

    if (indices.APROVADOR !== undefined) {
      sheetSolic
        .getRange(solicitacao.linha, indices.APROVADOR + 1)
        .setValue(aprovador);
    }

    if (indices.DATA_APROVACAO !== undefined) {
      sheetSolic
        .getRange(solicitacao.linha, indices.DATA_APROVACAO + 1)
        .setValue(new Date());
    }

    try {
      notificarDecisaoSolicitacao(
        solicitacao.email,
        solicitacao.nome,
        status,
        solicitacao.perfil
      );
    } catch (erroEmail) {
      registrarErroAPI(
        "NOTIFICAR_DECISAO_SOLICITACAO",
        erroEmail
      );
    }

    registrarInfoAPI(
      status === "APROVADO"
        ? "APROVAR_SOLICITACAO"
        : "REJEITAR_SOLICITACAO",
      "Solicitação processada: " +
        idBusca +
        " - " +
        status
    );

    return respostaSucesso(true);
  } catch (erro) {
    registrarErroAPI(
      novoStatus === "APROVADO"
        ? "APROVAR_SOLICITACAO"
        : "REJEITAR_SOLICITACAO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

function aprovarSolicitacao(id) {
  return processarSolicitacaoAPI(
    id,
    "APROVADO"
  );
}

function rejeitarSolicitacao(id) {
  return processarSolicitacaoAPI(
    id,
    "REJEITADO"
  );
}

/**
 * ==========================================================
 * HISTÓRICO GERAL
 * ==========================================================
 */

function listarHistoricoGeral() {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.HISTORICO
    );

    const service =
      new HistoryService();

    const registros =
      service.listarTodos() || [];

    function objetoPreenchido(obj) {
      return !!(
        obj &&
        typeof obj === "object" &&
        !Array.isArray(obj) &&
        Object.keys(obj).length
      );
    }

    function parseHistorico(valor) {
      if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
      ) {
        return {};
      }

      if (
        typeof valor === "object"
      ) {
        return valor;
      }

      try {
        const obj =
          JSON.parse(String(valor));

        return obj &&
          typeof obj === "object"
          ? obj
          : {};
      } catch (erro) {
        return {};
      }
    }

    function ehEmail(valor) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
          String(valor || "").trim()
        );
    }

    function extrairUsuario(
      item,
      usuarioJson
    ) {
      const usuario =
        String(item.usuario || "").trim();

      if (
        usuario &&
        ehEmail(usuario)
      ) {
        return usuario;
      }

      const acao =
        String(item.acao || "").trim();

      if (ehEmail(acao)) {
        return acao;
      }

      if (
        usuarioJson &&
        typeof usuarioJson === "object"
      ) {
        const interno =
          usuarioJson.usuario ||
          usuarioJson.USUARIO ||
          usuarioJson.email ||
          usuarioJson.EMAIL ||
          "";

        if (ehEmail(interno)) {
          return String(interno).trim();
        }
      }

      return usuario || "-";
    }

    function normalizarAcao(
      acao,
      antes,
      depois,
      usuarioJson
    ) {
      const valor =
        String(acao || "")
          .trim()
          .toUpperCase();

      if (
        valor === "CRIACAO" ||
        valor === "CRIAÇÃO"
      ) {
        return "Criação";
      }

      if (
        valor === "EDICAO" ||
        valor === "EDIÇÃO"
      ) {
        return "Edição";
      }

      if (
        valor === "EXCLUSAO" ||
        valor === "EXCLUSÃO"
      ) {
        return "Exclusão";
      }

      /*
       * Compatibilidade com registros antigos
       * em que ACAO pode conter um e-mail.
       */
      if (
        ehEmail(valor) ||
        objetoPreenchido(usuarioJson)
      ) {
        if (
          !objetoPreenchido(antes) &&
          objetoPreenchido(depois)
        ) {
          return "Criação";
        }

        if (
          objetoPreenchido(antes) &&
          !objetoPreenchido(depois)
        ) {
          return "Exclusão";
        }

        if (
          objetoPreenchido(antes) &&
          objetoPreenchido(depois)
        ) {
          return "Edição";
        }

        if (
          !objetoPreenchido(antes) &&
          !objetoPreenchido(depois) &&
          objetoPreenchido(usuarioJson)
        ) {
          return "Criação";
        }
      }

      return String(acao || "-");
    }

    function extrairSnapshot(
      antes,
      depois,
      usuarioJson,
      acao
    ) {
      const acaoNormalizada =
        String(acao || "")
          .trim()
          .toUpperCase();

      /*
       * Para exclusão, o estado relevante é ANTES.
       */
      if (
        acaoNormalizada === "EXCLUSAO" ||
        acaoNormalizada === "EXCLUSÃO"
      ) {
        if (objetoPreenchido(antes)) {
          return antes;
        }

        return
          objetoPreenchido(usuarioJson)
            ? usuarioJson
            : {};
      }

      /*
       * Para criação/edição, preferimos DEPOIS.
       */
      if (objetoPreenchido(depois)) {
        return depois;
      }

      if (objetoPreenchido(antes)) {
        return antes;
      }

      if (objetoPreenchido(usuarioJson)) {
        return usuarioJson;
      }

      return {};
    }

    function campo(obj, ...nomes) {
      if (
        !obj ||
        typeof obj !== "object"
      ) {
        return "";
      }

      for (const nome of nomes) {
        if (
          Object.prototype.hasOwnProperty.call(
            obj,
            nome
          )
        ) {
          return obj[nome];
        }
      }

      return "";
    }

    function formatarContato(obj) {
      if (!objetoPreenchido(obj)) {
        return "-";
      }

      const campos = [];

      const microrregiao =
        campo(
          obj,
          "microrregiao",
          "MICRORREGIAO"
        );

      const comarca =
        campo(
          obj,
          "comarca",
          "COMARCA"
        );

      const setor =
        campo(
          obj,
          "setor",
          "SETOR"
        );

      const tipo =
        campo(
          obj,
          "tipo",
          "TIPO"
        );

      const numero =
        campo(
          obj,
          "numero",
          "NUMERO",
          "telefone",
          "TELEFONE"
        );

      const ramal =
        campo(
          obj,
          "ramal",
          "RAMAL"
        );

      const whatsapp =
        campo(
          obj,
          "whatsapp",
          "WHATSAPP"
        );

      const email =
        campo(
          obj,
          "email",
          "EMAIL",
          "E_MAIL"
        );

      const endereco =
        campo(
          obj,
          "endereco",
          "ENDERECO"
        );

      const status =
        campo(
          obj,
          "status",
          "STATUS"
        );

      const observacao =
        campo(
          obj,
          "observacao",
          "OBSERVACAO"
        );

      if (microrregiao) {
        campos.push(
          "Microrregião: " +
          microrregiao
        );
      }

      if (comarca) {
        campos.push(
          "Comarca: " +
          comarca
        );
      }

      if (setor) {
        campos.push(
          "Setor: " +
          setor
        );
      }

      if (tipo) {
        campos.push(
          "Tipo: " +
          tipo
        );
      }

      if (numero) {
        campos.push(
          "Telefone: " +
          numero
        );
      }

      if (ramal) {
        campos.push(
          "Ramal: " +
          ramal
        );
      }

      if (whatsapp) {
        campos.push(
          "WhatsApp: " +
          whatsapp
        );
      }

      if (email) {
        campos.push(
          "E-mail: " +
          email
        );
      }

      if (endereco) {
        campos.push(
          "Endereço: " +
          endereco
        );
      }

      if (status) {
        campos.push(
          "Status: " +
          status
        );
      }

      if (observacao) {
        campos.push(
          "Obs: " +
          observacao
        );
      }

      return campos.join(" | ") || "-";
    }

    const resultado =
      registros.map(item => {
        const antes =
          parseHistorico(item.antes);

        const depois =
          parseHistorico(item.depois);

        const usuarioJson =
          parseHistorico(item.usuario);

        const acao =
          normalizarAcao(
            item.acao,
            antes,
            depois,
            usuarioJson
          );

        const snapshot =
          extrairSnapshot(
            antes,
            depois,
            usuarioJson,
            item.acao
          );

        const comarca =
          campo(
            snapshot,
            "comarca",
            "COMARCA"
          );

        const setor =
          campo(
            snapshot,
            "setor",
            "SETOR"
          );

        const usuario =
          extrairUsuario(
            item,
            usuarioJson
          );

        let dataFormatada = "-";

        if (item.data) {
          const data =
            item.data instanceof Date
              ? item.data
              : new Date(item.data);

          if (
            !isNaN(data.getTime())
          ) {
            dataFormatada =
              Utilities.formatDate(
                data,
                Session.getScriptTimeZone(),
                "dd/MM/yyyy HH:mm:ss"
              );
          }
        }

        return {
          id: item.id || "",
          telefoneId:
            item.telefoneId ||
            item.telefone_id ||
            "",

          comarca:
            String(comarca || "").trim(),

          setor:
            String(setor || "").trim(),

          data:
            dataFormatada,

          acao:
            acao,

          usuario:
            usuario || "-",

          antes:
            formatarContato(antes),

          depois:
            formatarContato(
              objetoPreenchido(depois)
                ? depois
                : snapshot
            )
        };
      });

    let historicoFiltrado = resultado;

    const usuarioHistorico =
      new AuthService().usuarioAtual();

    if (
      usuarioHistorico.logado &&
      usuarioHistorico.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioHistorico.comarcas || []).length > 0
    ) {
      const permitidasHist =
        usuarioHistorico.comarcas.map(item =>
          normalizarChave(item)
        );

      historicoFiltrado =
        resultado.filter(item =>
          permitidasHist.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    return respostaSucesso(historicoFiltrado);

  } catch (erro) {
    registrarErroAPI(
      "LISTAR_HISTORICO_GERAL",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * ==========================================================
 * E-MAILS
 * ==========================================================
 */

function emailValidoAPI(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      normalizarEmail(email)
    );
}

function notificarNovaSolicitacao(
  emailSolicitante,
  nomeSolicitante,
  perfilSolicitado,
  comarca,
  justificativa
) {
  const gestorEmail =
    obterConfiguracaoAPI(
      "EMAIL_GESTOR"
    );

  if (
    !gestorEmail ||
    !emailValidoAPI(gestorEmail)
  ) {
    registrarInfoAPI(
      "NOTIFICAR_NOVA_SOLICITACAO",
      "EMAIL_GESTOR não está configurado."
    );

    return false;
  }

  const assunto =
    "Nova solicitação de acesso - " +
    nomeSolicitante;

  let corpo =
    "Foi recebida uma nova solicitação de acesso:\n\n" +
    "Nome: " +
    nomeSolicitante +
    "\n" +
    "E-mail: " +
    emailSolicitante +
    "\n";

  const comarcaTexto =
    textoSeguro(comarca);

  if (comarcaTexto) {
    corpo +=
      "Comarca: " +
      comarcaTexto +
      "\n";
  }

  corpo +=
    "Perfil solicitado: " +
    perfilSolicitado +
    "\n";

  const justificativaTexto =
    textoSeguro(justificativa);

  if (justificativaTexto) {
    corpo +=
      "Justificativa: " +
      justificativaTexto +
      "\n";
  }

  corpo +=
    "\nAcesse a área administrativa:\n" +
    obterUrlAdmin();

  adicionarEmailPendente(
    gestorEmail,
    assunto,
    corpo
  );

  return true;
}

function notificarDecisaoSolicitacao(
  emailSolicitante,
  nomeSolicitante,
  status,
  perfil
) {
  const aprovado =
    String(status || "")
      .trim()
      .toUpperCase() === "APROVADO";

  const assunto =
    aprovado
      ? "Acesso administrativo aprovado"
      : "Acesso administrativo rejeitado";

  let corpo =
    "Olá " +
    nomeSolicitante +
    ",\n\n";

  corpo +=
    "A sua solicitação de acesso como " +
    perfil +
    " foi " +
    (
      aprovado
        ? "aprovada"
        : "rejeitada"
    ) +
    ".\n\n";

  if (aprovado) {
    corpo +=
      "Acesse o sistema pelo endereço:\n" +
      obterUrlSistema();
  } else {
    corpo +=
      "Você poderá tentar novamente mais tarde.";
  }

  adicionarEmailPendente(
    emailSolicitante,
    assunto,
    corpo
  );

  return true;
}

function obterAbaEmailsPendenteAPI() {
  const ss =
    obterPlanilhaAPI();

  let sheet =
    ss.getSheetByName(
      CONFIG.SHEETS.EMAILS_PENDENTES
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        CONFIG.SHEETS.EMAILS_PENDENTES
      );
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "DESTINATARIO",
      "ASSUNTO",
      "CORPO"
    ]);
  }

  return sheet;
}

function adicionarEmailPendente(
  destinatario,
  assunto,
  corpo
) {
  const destino =
    normalizarEmail(
      destinatario
    );

  const titulo =
    textoSeguro(
      assunto
    );

  const mensagem =
    String(corpo || "");

  if (
    !emailValidoAPI(destino) ||
    !titulo ||
    !mensagem
  ) {
    return false;
  }

  obterAbaEmailsPendenteAPI()
    .appendRow([
      destino,
      titulo,
      mensagem
    ]);

  return true;
}

function processarFilaDeEmails() {
  const sheet =
    obterAbaEmailsPendenteAPI();

  if (sheet.getLastRow() <= 1) {
    return;
  }

  const dados =
    sheet.getDataRange()
      .getValues();

  for (
    let i = dados.length - 1;
    i >= 1;
    i--
  ) {
    const destinatario =
      normalizarEmail(
        dados[i][0]
      );

    const assunto =
      textoSeguro(
        dados[i][1]
      );

    const corpo =
      String(
        dados[i][2] || ""
      );

    if (
      !emailValidoAPI(
        destinatario
      ) ||
      !assunto ||
      !corpo
    ) {
      sheet.deleteRow(i + 1);
      continue;
    }

    try {
      MailApp.sendEmail(
        destinatario,
        assunto,
        corpo
      );

      sheet.deleteRow(i + 1);
    } catch (erro) {
      registrarErroAPI(
        "PROCESSAR_FILA_EMAILS",
        new Error(
          "Falha ao enviar e-mail para " +
          destinatario +
          ": " +
          (
            erro.message ||
            erro
          )
        )
      );
    }
  }
}

function instalarTriggerEmails() {
  ScriptApp
    .getProjectTriggers()
    .forEach(trigger => {
      if (
        trigger.getHandlerFunction() ===
        "processarFilaDeEmails"
      ) {
        ScriptApp.deleteTrigger(
          trigger
        );
      }
    });

  ScriptApp
    .newTrigger(
      "processarFilaDeEmails"
    )
    .timeBased()
    .everyMinutes(1)
    .create();

  return "Gatilho de e-mails instalado.";
}

/**
 * ==========================================================
 * LOG
 * ==========================================================
 */

function registrarLog(acao) {
  try {
    registrarInfoAPI(
      textoSeguro(acao),
      ""
    );

    return true;
  } catch (erro) {
    return false;
  }
}

function registrarInfoAPI(
  acao,
  mensagem
) {
  try {
    LOG.info(
      textoSeguro(acao),
      String(mensagem || "")
    );
  } catch (erro) {
    console.warn(
      "Falha ao registrar log informativo:",
      erro
    );
  }
}

function registrarErroAPI(
  acao,
  erro
) {
  try {
    const mensagem =
      erro && erro.message
        ? erro.message
        : String(
            erro ||
            "Erro desconhecido."
          );

    LOG.error(
      textoSeguro(acao),
      mensagem
    );
  } catch (erroLog) {
    console.warn(
      "Falha ao registrar log de erro:",
      erroLog
    );
  }
}

/**
 * ==========================================================
 * AUXILIARES
 * ==========================================================
 */

function obterPlanilhaAPI() {
  return DB.getSpreadsheet();
}

function obterEmailSessaoAPI() {
  try {
    const usuario =
      new AuthService()
        .usuarioAtual();

    if (
      usuario &&
      usuario.email
    ) {
      return usuario.email;
    }
  } catch (erro) {}

  return AuthService
    .obterEmailAtivo();
}

function obterConfiguracaoAPI(chave) {
  try {
    const sheet =
      obterPlanilhaAPI()
        .getSheetByName(
          CONFIG.SHEETS.CONFIGURACAO
        );

    if (!sheet) {
      return null;
    }

    const chaveBusca =
      normalizarChave(chave);

    const dados =
      sheet.getDataRange()
        .getValues();

    for (
      let i = 0;
      i < dados.length;
      i++
    ) {
      const chaveLinha =
        normalizarChave(
          dados[i][0]
        );

      if (
        chaveLinha ===
        chaveBusca
      ) {
        const valor =
          dados[i][1];

        if (
          valor === null ||
          valor === undefined ||
          String(valor).trim() === ""
        ) {
          return null;
        }

        return String(valor).trim();
      }
    }

    return null;
  } catch (erro) {
    registrarErroAPI(
      "OBTER_CONFIGURACAO",
      erro
    );

    return null;
  }
}

/**
 * ==========================================================
 * GESTÃO DE USUÁRIOS (somente GESTOR_SISTEMA)
 * ==========================================================
 */

function listarUsuarios() {
  try {
    new AuthService().exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const dados = DB.read(sheet);

    const idxNome = mapa.NOME;
    const idxPerfil = mapa.PERFIL;
    const idxAtivo = mapa.ATIVO;
    const idxComarcas = mapa.COMARCAS;

    /*
     * Visitantes (USUARIO_CONSULTA) não aparecem na lista:
     * a lista gerencia pessoas com acesso administrativo.
     */
    const resultado =
      dados
        .filter(linha => {
          const perfil =
            String(idxPerfil ? linha[idxPerfil - 1] : "")
              .trim()
              .toUpperCase();

          return perfil !== CONFIG.PERFIS.USUARIO_CONSULTA;
        })
        .map(linha => ({
          email: textoSeguro(linha[0]),
          nome: textoSeguro(idxNome ? linha[idxNome - 1] : ""),
          perfil: String(idxPerfil ? linha[idxPerfil - 1] : "").trim().toUpperCase(),
          ativo: paraBoolean(idxAtivo ? linha[idxAtivo - 1] : false),
          comarcas: idxComarcas !== undefined ? textoSeguro(linha[idxComarcas - 1]) : ""
        }));

    return respostaSucesso(resultado);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_USUARIOS",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * Solicita acesso de edição a uma comarca fora do escopo
 * do gestor de conteúdo.
 *
 * O pedido é registrado no LOG e notifica os gestores do
 * sistema ativos por e-mail (fila EMAILS_PENDENTES).
 */
function solicitarPermissaoComarca(comarca) {
  try {
    const auth = new AuthService();

    auth.exigirPermissao(
      CONFIG.PERMISSOES.EDITAR
    );

    const usuario = auth.usuarioAtual();

    if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) {
      throw new Error(
        "Somente gestores de conteúdo solicitam acesso a comarcas."
      );
    }

    const comarcaAlvo =
      textoSeguro(comarca);

    if (!comarcaAlvo) {
      throw new Error("Informe a comarca desejada.");
    }

    /*
     * A comarca precisa existir na base.
     */
    const dados =
      new TelefoneRepository().listar();

    const chaveAlvo =
      normalizarChave(comarcaAlvo);

    const existe =
      dados.some(item =>
        normalizarChave(
          textoSeguro(item.comarca)
        ) === chaveAlvo
      );

    if (!existe) {
      throw new Error(
        "A comarca \"" +
        comarcaAlvo +
        "\" não foi encontrada na base."
      );
    }

    /*
     * Sem escopo definido (vazia = todas) não há o que solicitar.
     */
    const atuais =
      Array.isArray(usuario.comarcas)
        ? usuario.comarcas
        : [];

    if (atuais.length === 0) {
      throw new Error(
        "Você já pode editar todas as comarcas."
      );
    }

    const jaTem =
      atuais.some(item =>
        normalizarChave(item) === chaveAlvo
      );

    if (jaTem) {
      throw new Error(
        "Você já tem acesso à comarca \"" +
        comarcaAlvo +
        "\"."
      );
    }

    /*
     * Destinatários: gestores do sistema ativos;
     * sem nenhum, usa a configuração EMAIL_GESTOR.
     */
    const destinatarios = [];

    try {
      const sheet = DB.usuarios();
      const mapa = DB.map(sheet);

      const idxPerfil = mapa.PERFIL;
      const idxAtivo = mapa.ATIVO;
      const idxEmail = mapa.EMAIL;

      DB.read(sheet).forEach(linha => {
        const perfil =
          String(
            idxPerfil ? linha[idxPerfil - 1] : ""
          )
            .trim()
            .toUpperCase();

        const ativo =
          paraBoolean(
            idxAtivo ? linha[idxAtivo - 1] : false
          );

        const email =
          textoSeguro(
            idxEmail ? linha[idxEmail - 1] : ""
          );

        if (
          perfil === CONFIG.PERFIS.GESTOR_SISTEMA &&
          ativo &&
          emailValidoAPI(email)
        ) {
          destinatarios.push(email);
        }
      });
    } catch (erro) {
      registrarInfoAPI(
        "SOLICITAR_ACESSO_COMARCA",
        "Falha ao listar gestores do sistema: " + erro.message
      );
    }

    if (destinatarios.length === 0) {
      const fallback =
        obterConfiguracaoAPI("EMAIL_GESTOR");

      if (fallback && emailValidoAPI(fallback)) {
        destinatarios.push(fallback);
      }
    }

    const nomeSolicitante =
      textoSeguro(usuario.nome) ||
      String(usuario.email || "")
        .split("@")[0];

    const assunto =
      "Solicitação de acesso à comarca - " +
      comarcaAlvo;

    const corpo =
      "Um gestor de conteúdo solicitou acesso de edição a uma comarca:\n\n" +
      "Nome: " + nomeSolicitante + "\n" +
      "E-mail: " + textoSeguro(usuario.email) + "\n" +
      "Comarca solicitada: " + comarcaAlvo + "\n\n" +
      "Para liberar o acesso, edite o usuário no painel de Usuários\n" +
      "e adicione a comarca à coluna COMARCAS.\n\n" +
      "Acesse a área administrativa:\n" +
      obterUrlAdmin();

    let notificados = 0;

    destinatarios.forEach(destino => {
      if (
        adicionarEmailPendente(
          destino,
          assunto,
          corpo
        )
      ) {
        notificados++;
      }
    });

    registrarLog(
      "SOLICITAR_ACESSO_COMARCA " +
      textoSeguro(usuario.email) +
      " -> " +
      comarcaAlvo
    );

    return respostaSucesso({
      comarca: comarcaAlvo,
      notificados: notificados
    });
  } catch (erro) {
    registrarErroAPI(
      "SOLICITAR_ACESSO_COMARCA",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * Atualiza um usuário da aba USUARIOS.
 *
 * Permite trocar o perfil (GESTOR_SISTEMA, GESTOR_CONTEUDO ou
 * USUARIO_CONSULTA/visitante), ativar/desativar e definir as
 * comarcas permitidas para gestores de conteúdo.
 *
 * Proteções:
 * - Somente GESTOR_SISTEMA;
 * - não é possível editar a própria conta (evita trava acidental);
 * - não é possível remover o último gestor do sistema ativo.
 */
function atualizarUsuario(email, dados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const auth = new AuthService();

    auth.exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const emailAlvo = normalizarEmail(email);

    if (!emailAlvo) {
      throw new Error("E-mail do usuário é obrigatório.");
    }

    const sessao = auth.usuarioAtual();

    if (normalizarEmail(sessao.email) === emailAlvo) {
      throw new Error("Você não pode editar a sua própria conta pelo painel de usuários.");
    }

    const entrada = ehObjeto(dados) ? dados : {};

    const possuiNome =
      possuiCampo(entrada, "nome", "NOME");

    const nomeNovo =
      possuiNome
        ? textoSeguro(
            valorObjeto(entrada, "nome", "NOME")
          )
        : null;

    const possuiPerfil =
      possuiCampo(entrada, "perfil", "PERFIL");

    const possuiAtivo =
      possuiCampo(entrada, "ativo", "ATIVO");

    const possuiComarcas =
      possuiCampo(entrada, "comarcas", "COMARCAS");

    const perfilBruto =
      possuiPerfil
        ? String(
            valorObjeto(entrada, "perfil", "PERFIL") || ""
          )
            .trim()
            .toUpperCase()
        : null;

    const ativoBruto =
      possuiAtivo
        ? valorObjeto(entrada, "ativo", "ATIVO")
        : null;

    const comarcasBruto =
      possuiComarcas
        ? valorObjeto(entrada, "comarcas", "COMARCAS")
        : null;

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const dadosSheet = sheet.getDataRange().getValues();

    const idxEmail = mapa.EMAIL;
    const idxNome = mapa.NOME;
    const idxPerfil = mapa.PERFIL;
    const idxAtivo = mapa.ATIVO;
    const idxComarcas = mapa.COMARCAS;

    let linhaEncontrada = -1;

    for (let i = 1; i < dadosSheet.length; i++) {
      if (normalizarEmail(dadosSheet[i][idxEmail - 1]) === emailAlvo) {
        linhaEncontrada = i + 1;
        break;
      }
    }

    if (linhaEncontrada === -1) {
      throw new Error("Usuário não encontrado na aba USUARIOS.");
    }

    const perfilAtual =
      String(dadosSheet[linhaEncontrada - 1][idxPerfil - 1] || "")
        .trim()
        .toUpperCase();

    const ativoAtual =
      paraBoolean(dadosSheet[linhaEncontrada - 1][idxAtivo - 1]);

    const comarcasAtualRaw =
      idxComarcas !== undefined
        ? textoSeguro(dadosSheet[linhaEncontrada - 1][idxComarcas - 1])
        : "";

    const comarcasAtual = parseComarcas(comarcasAtualRaw);

    const perfilNovo =
      possuiPerfil ? perfilBruto : perfilAtual;

    const perfisValidos = [
      CONFIG.PERFIS.GESTOR_SISTEMA,
      CONFIG.PERFIS.GESTOR_CONTEUDO,
      CONFIG.PERFIS.USUARIO_CONSULTA
    ];

    if (!perfisValidos.includes(perfilNovo)) {
      throw new Error("Perfil inválido.");
    }

    const ativoNovo =
      possuiAtivo ? paraBoolean(ativoBruto) : ativoAtual;

    const comarcasNovo =
      possuiComarcas
        ? parseComarcas(comarcasBruto)
        : comarcasAtual;

    if (
      perfilNovo === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      comarcasNovo.length > 0
    ) {
      // valida apenas que o texto não contém separadores inválidos
      if (comarcasNovo.some(item => item.length > 150)) {
        throw new Error("Nome de comarca muito longo.");
      }
    }

    /*
     * Proteção: não permitir desativar/demover o último
     * gestor do sistema ativo.
     */
    if (
      perfilAtual === CONFIG.PERFIS.GESTOR_SISTEMA &&
      ativoAtual &&
      (perfilNovo !== CONFIG.PERFIS.GESTOR_SISTEMA || !ativoNovo)
    ) {
      let outrosGestores = 0;

      for (let i = 1; i < dadosSheet.length; i++) {
        if (i === linhaEncontrada - 1) continue;

        const perfil =
          String(dadosSheet[i][idxPerfil - 1] || "")
            .trim()
            .toUpperCase();

        const ativo =
          paraBoolean(dadosSheet[i][idxAtivo - 1]);

        if (
          perfil === CONFIG.PERFIS.GESTOR_SISTEMA &&
          ativo
        ) {
          outrosGestores++;
        }
      }

      if (outrosGestores === 0) {
        throw new Error(
          "Não é possível remover o último gestor do sistema ativo."
        );
      }
    }

    if (idxNome !== undefined && nomeNovo !== null) {
      sheet.getRange(linhaEncontrada, idxNome).setValue(nomeNovo);
    }

    if (idxPerfil !== undefined && possuiPerfil) {
      sheet.getRange(linhaEncontrada, idxPerfil).setValue(perfilNovo);
    }

    if (idxAtivo !== undefined && possuiAtivo) {
      sheet.getRange(linhaEncontrada, idxAtivo).setValue(ativoNovo ? "SIM" : "NÃO");
    }

    if (idxComarcas !== undefined && possuiComarcas) {
      sheet.getRange(linhaEncontrada, idxComarcas).setValue(
        serializarComarcas(comarcasNovo)
      );
    }

    SpreadsheetApp.flush();

    registrarInfoAPI(
      "ATUALIZAR_USUARIO",
      emailAlvo + " -> " + perfilNovo + (ativoNovo ? " (ativo)" : " (inativo)")
    );

    return respostaSucesso({
      email: emailAlvo,
      perfil: perfilNovo,
      ativo: ativoNovo,
      comarcas: serializarComarcas(comarcasNovo)
    });
  } catch (erro) {
    registrarErroAPI(
      "ATUALIZAR_USUARIO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}
/**
 * Cria um novo usuário na aba USUARIOS.
 *
 * Somente GESTOR_SISTEMA pode criar.
 * Valida e-mail institucional (@tjes.jus.br), perfil,
 * comarcas e verifica duplicidade.
 */
function criarUsuario(dados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const auth = new AuthService();
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);

    const entrada = ehObjeto(dados) ? dados : {};

    const emailBruto = textoSeguro(valorObjeto(entrada, "email", "EMAIL"));
    const email = normalizarEmail(emailBruto);

    if (!email) {
      throw new Error("E-mail é obrigatório.");
    }

    if (!emailValidoAPI(email)) {
      throw new Error("E-mail inválido.");
    }

    if (!emailInstitucional(email)) {
      throw new Error("Somente e-mails institucionais (@tjes.jus.br) são permitidos.");
    }

    const nome = textoSeguro(valorObjeto(entrada, "nome", "NOME"));

    if (nome && nome.length > CONFIG.LIMITES.TAMANHO_MAXIMO_NOME) {
      throw new Error("Nome muito longo.");
    }

    const perfilBruto = String(valorObjeto(entrada, "perfil", "PERFIL") || "").trim().toUpperCase();
    const perfil = perfilBruto || CONFIG.PERFIS.GESTOR_CONTEUDO;

    const perfisValidos = [CONFIG.PERFIS.GESTOR_SISTEMA, CONFIG.PERFIS.GESTOR_CONTEUDO];

    if (!perfisValidos.includes(perfil)) {
      throw new Error("Perfil inválido. Use Gestor do Sistema ou Gestor de Conteúdo.");
    }

    const ativo = possuiCampo(entrada, "ativo", "ATIVO") ? paraBoolean(valorObjeto(entrada, "ativo", "ATIVO")) : true;

    const comarcasBruto = valorObjeto(entrada, "comarcas", "COMARCAS");
    const comarcasLista = parseComarcas(comarcasBruto);

    if (perfil === CONFIG.PERFIS.GESTOR_CONTEUDO && comarcasLista.length > 0) {
      if (comarcasLista.some(item => item.length > 150)) {
        throw new Error("Nome de comarca muito longo.");
      }
    }

    const comarcasSerial = perfil === CONFIG.PERFIS.GESTOR_SISTEMA ? "" : serializarComarcas(comarcasLista);

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const idxEmail = mapa.EMAIL;
    const idxNome = mapa.NOME;
    const idxPerfil = mapa.PERFIL;
    const idxAtivo = mapa.ATIVO;
    const idxComarcas = mapa.COMARCAS;

    if (!idxEmail || !idxPerfil || !idxAtivo) {
      throw new Error("Aba USUARIOS sem cabeçalhos esperados. Execute instalarSistema().");
    }

    const dadosSheet = sheet.getDataRange().getValues();

    for (let i = 1; i < dadosSheet.length; i++) {
      if (normalizarEmail(dadosSheet[i][idxEmail - 1]) === email) {
        throw new Error("Já existe um usuário com este e-mail.");
      }
    }

    const headers = DB.headers(sheet);
    const novaLinha = new Array(headers.length).fill("");

    if (idxEmail) novaLinha[idxEmail - 1] = email;
    if (idxNome) novaLinha[idxNome - 1] = nome;
    if (idxPerfil) novaLinha[idxPerfil - 1] = perfil;
    if (idxAtivo) novaLinha[idxAtivo - 1] = ativo ? "SIM" : "NÃO";
    if (idxComarcas !== undefined) novaLinha[idxComarcas - 1] = comarcasSerial;

    sheet.appendRow(novaLinha);
    SpreadsheetApp.flush();

    registrarInfoAPI("CRIAR_USUARIO", email + " -> " + perfil + (ativo ? " (ativo)" : " (inativo)"));

    return respostaSucesso({
      email: email,
      nome: nome,
      perfil: perfil,
      ativo: ativo,
      comarcas: comarcasSerial
    });
  } catch (erro) {
    registrarErroAPI("CRIAR_USUARIO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/**
 * Exclui um usuário da aba USUARIOS (remoção física da linha).
 *
 * Somente GESTOR_SISTEMA. Proteções:
 * - não pode excluir a própria conta;
 * - não pode excluir o último gestor do sistema ativo.
 */
function excluirUsuario(email) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const auth = new AuthService();
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);

    const emailAlvo = normalizarEmail(email);

    if (!emailAlvo) {
      throw new Error("E-mail é obrigatório.");
    }

    const sessao = auth.usuarioAtual();

    if (normalizarEmail(sessao.email) === emailAlvo) {
      throw new Error("Você não pode remover a sua própria conta.");
    }

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const idxEmail = mapa.EMAIL;
    const idxPerfil = mapa.PERFIL;
    const idxAtivo = mapa.ATIVO;

    if (!idxEmail) {
      throw new Error("Aba USUARIOS sem cabeçalho EMAIL.");
    }

    const dadosSheet = sheet.getDataRange().getValues();
    let linhaEncontrada = -1;

    for (let i = 1; i < dadosSheet.length; i++) {
      if (normalizarEmail(dadosSheet[i][idxEmail - 1]) === emailAlvo) {
        linhaEncontrada = i + 1;
        break;
      }
    }

    if (linhaEncontrada === -1) {
      throw new Error("Usuário não encontrado na aba USUARIOS.");
    }

    const perfilAtual = String(dadosSheet[linhaEncontrada - 1][idxPerfil - 1] || "").trim().toUpperCase();
    const ativoAtual = paraBoolean(dadosSheet[linhaEncontrada - 1][idxAtivo - 1]);

    if (perfilAtual === CONFIG.PERFIS.GESTOR_SISTEMA && ativoAtual) {
      let outrosGestores = 0;

      for (let i = 1; i < dadosSheet.length; i++) {
        if (i === linhaEncontrada - 1) continue;

        const perfil = String(dadosSheet[i][idxPerfil - 1] || "").trim().toUpperCase();
        const ativo = paraBoolean(dadosSheet[i][idxAtivo - 1]);

        if (perfil === CONFIG.PERFIS.GESTOR_SISTEMA && ativo) {
          outrosGestores++;
        }
      }

      if (outrosGestores === 0) {
        throw new Error("Não é possível remover o último gestor do sistema ativo.");
      }
    }

    sheet.deleteRow(linhaEncontrada);
    SpreadsheetApp.flush();

    registrarInfoAPI("EXCLUIR_USUARIO", emailAlvo);

    return respostaSucesso({ email: emailAlvo });
  } catch (erro) {
    registrarErroAPI("EXCLUIR_USUARIO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}
