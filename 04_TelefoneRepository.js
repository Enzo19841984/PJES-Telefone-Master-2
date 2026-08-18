/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 04_TelefoneRepository.gs
 * ==========================================================
 */

class TelefoneRepository {
  constructor() {
    this.sheet = DB.telefones();
    this.headers = DB.headers(this.sheet);
    this.map = DB.map(this.sheet);

    if (this.headers.length === 0) {
      throw new Error("A aba TELEFONES não possui cabeçalho.");
    }
  }

  getColIdx(...nomes) {
    for (const nome of nomes) {
      const chave = normalizarChave(nome);
      if (this.map[chave] !== undefined) {
        return this.map[chave] - 1;
      }
    }
    return -1;
  }

  listar() {
    const cache = CACHE.obter(CACHE.chaveTelefones());
    if (Array.isArray(cache)) return cache;

    const dados = DB.read(this.sheet);
    const resultado = dados.map(linha => this.rowToObject(linha));
    CACHE.salvar(CACHE.chaveTelefones(), resultado, CONFIG.CACHE.TEMPO_PADRAO);
    return resultado;
  }

  obter(id) {
    const idBusca = textoSeguro(id);
    if (!idBusca) return null;
    return this.listar().find(item => textoSeguro(item.ID || item.id) === idBusca) || null;
  }

  buscarPorId(id) { return this.obter(id); }

  pesquisar(texto) {
    const termo = limparTexto(texto);
    if (!termo) return this.listar();
    return this.listar().filter(item =>
      Object.values(item).map(valor => limparTexto(valor)).join(" ").includes(termo)
    );
  }

  inserir(dados) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const entrada = ehObjeto(dados) ? dados : {};
      const id = new IdService().novoTelefone();
      const momento = new Date();

      const registro = {
        ID: id,
        id: id,
        microrregiao: textoSeguro(valorObjeto(entrada, "microrregiao", "Microrregiao")),
        comarca: textoSeguro(valorObjeto(entrada, "comarca", "Comarca")),
        setor: textoSeguro(valorObjeto(entrada, "setor", "Setor")),
        tipo: textoSeguro(valorObjeto(entrada, "tipo", "Tipo")),
        numero: textoSeguro(valorObjeto(entrada, "numero", "Numero", "TELEFONE", "Telefone")),
        ramal: textoSeguro(valorObjeto(entrada, "ramal", "Ramal")),
        whatsapp: textoSeguro(valorObjeto(entrada, "whatsapp", "Whatsapp", "WhatsApp")),
        email: textoSeguro(valorObjeto(entrada, "email", "EMAIL", "E_MAIL")),          // ← NOVO
        endereco: textoSeguro(valorObjeto(entrada, "endereco", "ENDERECO")),            // ← NOVO
        status: textoSeguro(valorObjeto(entrada, "status", "Status")) || "ATIVO",
        observacao: textoSeguro(valorObjeto(entrada, "observacao", "Observacao")),
        DATA_CRIACAO: momento,
        DATA_ATUALIZACAO: momento
      };

      new ValidationService().validarTelefone(registro);
      const linha = this.linhaDoObjeto(registro);
      this.sheet.getRange(this.sheet.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush();
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(id, "CRIACAO", {}, registro);
      return serializarParaCliente(registro);
    } finally {
      lock.releaseLock();
    }
  }

  atualizar(id, dados) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id);
      if (!idBusca) throw new Error("ID do telefone é obrigatório.");

      const entrada = ehObjeto(dados) ? dados : {};
      const atual = this.obter(idBusca);
      if (!atual) throw new Error("Telefone não encontrado para o ID: " + idBusca);

      const escolherCampo = (campo, fallback) => {
        if (possuiCampo(entrada, campo)) return textoSeguro(valorObjeto(entrada, campo));
        return fallback;
      };

      const novo = {
        ID: textoSeguro(atual.ID || atual.id) || idBusca,
        id: textoSeguro(atual.ID || atual.id) || idBusca,
        microrregiao: escolherCampo("microrregiao", textoSeguro(atual.microrregiao)),
        comarca: escolherCampo("comarca", textoSeguro(atual.comarca)),
        setor: escolherCampo("setor", textoSeguro(atual.setor)),
        tipo: escolherCampo("tipo", textoSeguro(atual.tipo)),
        numero: escolherCampo("numero", textoSeguro(atual.numero)),
        ramal: escolherCampo("ramal", textoSeguro(atual.ramal)),
        whatsapp: escolherCampo("whatsapp", textoSeguro(atual.whatsapp)),
        email: escolherCampo("email", textoSeguro(atual.email)),          // ← NOVO
        endereco: escolherCampo("endereco", textoSeguro(atual.endereco)), // ← NOVO
        status: escolherCampo("status", textoSeguro(atual.status)) || "ATIVO",
        observacao: escolherCampo("observacao", textoSeguro(atual.observacao)),
        DATA_CRIACAO: dataValida(atual.DATA_CRIACAO, new Date()),
        DATA_ATUALIZACAO: new Date()
      };

      new ValidationService().validarTelefone(novo, idBusca);
      const numeroLinha = this.buscarLinha(idBusca);
      if (!numeroLinha) throw new Error("Linha do telefone não encontrada.");

      const linha = this.linhaDoObjeto(novo);
      this.sheet.getRange(numeroLinha, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush();
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EDICAO", atual, novo);
      return serializarParaCliente(novo);
    } finally {
      lock.releaseLock();
    }
  }

  excluir(id) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id);
      if (!idBusca) throw new Error("ID do telefone é obrigatório.");
      const atual = this.obter(idBusca);
      if (!atual) throw new Error("Telefone não encontrado.");
      const linha = this.buscarLinha(idBusca);
      if (!linha) throw new Error("Linha do telefone não encontrada.");
      this.sheet.deleteRow(linha);
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EXCLUSAO", atual, {});
      return true;
    } finally {
      lock.releaseLock();
    }
  }

  registrarHistoricoSeguro(telefoneId, acao, antes, depois) {
    try {
      new HistoryService().registrar(telefoneId, acao, antes, depois);
    } catch (erro) {
      console.warn("Falha ao registrar histórico:", erro);
    }
  }

  rowToObject(linha) {
    const getVal = (...nomes) => {
      const idx = this.getColIdx(...nomes);
      if (idx === -1 || linha[idx] === undefined || linha[idx] === null) return "";
      return linha[idx];
    };

    return {
      ID: getVal("ID"),
      id: getVal("ID"),
      microrregiao: getVal("MICRORREGIAO", "Microrregiao"),
      comarca: getVal("COMARCA"),
      setor: getVal("SETOR"),
      tipo: getVal("TIPO"),
      numero: getVal("TELEFONE", "NUMERO", "Telefone", "Numero"),
      ramal: getVal("RAMAL"),
      whatsapp: getVal("WHATSAPP", "Whatsapp", "WhatsApp"),
      email: getVal("E_MAIL", "EMAIL"),         // ← NOVO
      endereco: getVal("ENDERECO"),             // ← NOVO
      status: getVal("STATUS") || "ATIVO",
      observacao: getVal("OBSERVACAO", "Observacao"),
      DATA_CRIACAO: getVal("CRIADOEM", "DATA_CRIACAO", "CREATED_AT", "CREATEDAT"),
      DATA_ATUALIZACAO: getVal("ATUALIZADOEM", "DATA_ATUALIZACAO", "UPDATED_AT", "UPDATEDAT")
    };
  }

  objectToRow(objeto) { return this.linhaDoObjeto(objeto); }

  buscarLinha(id) {
    const idBusca = textoSeguro(id);
    if (!idBusca) return null;
    const ultimaLinha = this.sheet.getLastRow();
    if (ultimaLinha <= 1) return null;
    const idxID = this.map["ID"];
    if (!idxID) throw new Error("A aba TELEFONES não possui a coluna ID.");
    const dados = this.sheet.getRange(2, idxID, ultimaLinha - 1, 1).getValues();
    for (let i = 0; i < dados.length; i++) {
      if (textoSeguro(dados[i][0]) === idBusca) return i + 2;
    }
    return null;
  }

  linhaDoObjeto(objeto) {
    return this.headers.map(header => {
      const chave = normalizarChave(header);
      switch (chave) {
        case "ID": return textoSeguro(valorObjeto(objeto, "ID", "id"));
        case "MICROREGIAO": return textoSeguro(valorObjeto(objeto, "microrregiao", "Microrregiao"));
        case "COMARCA": return textoSeguro(valorObjeto(objeto, "comarca", "Comarca"));
        case "SETOR": return textoSeguro(valorObjeto(objeto, "setor", "Setor"));
        case "TIPO": return textoSeguro(valorObjeto(objeto, "tipo", "Tipo"));
        case "NUMERO":
        case "TELEFONE":
          return textoSeguro(valorObjeto(objeto, "numero", "Numero", "TELEFONE", "Telefone"));
        case "RAMAL": return textoSeguro(valorObjeto(objeto, "ramal", "Ramal"));
        case "WHATSAPP": return textoSeguro(valorObjeto(objeto, "whatsapp", "Whatsapp", "WhatsApp"));
        case "E_MAIL": case "EMAIL": return textoSeguro(valorObjeto(objeto, "email", "EMAIL", "E_MAIL"));
        case "ENDERECO": return textoSeguro(valorObjeto(objeto, "endereco", "ENDERECO"));
        case "STATUS": return textoSeguro(valorObjeto(objeto, "status", "Status")) || "ATIVO";
        case "OBSERVACAO": return textoSeguro(valorObjeto(objeto, "observacao", "Observacao"));
        case "CRIADOEM": case "DATACRIACAO": case "CREATEDAT":
          return dataValida(valorObjeto(objeto, "DATA_CRIACAO", "criadoEm", "created_at", "createdAt"), new Date());
        case "ATUALIZADOEM": case "DATAATUALIZACAO": case "UPDATEDAT":
          return dataValida(valorObjeto(objeto, "DATA_ATUALIZACAO", "atualizadoEm", "updated_at", "updatedAt"), new Date());
        default: return valorObjeto(objeto, header) || "";
      }
    });
  }
}