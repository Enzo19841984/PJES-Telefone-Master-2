/**
 * ==========================================================
 * INTEGRAÇÃO V4 — LEGACY -> MUNICIPIOS/FORUM/UNIDADES/SETORES/CONTATOS
 * ==========================================================
 *
 * Este arquivo faz a ponte dos caminhos legados do aplicativo para a
 * arquitetura definitiva. TELEFONES não é usado como fonte operacional.
 */

function _v4Col(mapa, linha, nomes, padrao) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  for (const nome of lista) {
    const idx = mapa[normalizarChave(nome)];
    if (idx !== undefined) return linha[idx - 1];
  }
  return padrao === undefined ? "" : padrao;
}

function _v4Rows(sheet) {
  if (!sheet) return [];
  const mapa = DB.map(sheet);
  return DB.read(sheet).map((linha, i) => ({ linha, mapa, indice: i }));
}

function _v4IdNumero(id) {
  const m = String(id || "").match(/(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function _v4NovoContatoId(tipo) {
  const rows = _v4Rows(DB.contatos());
  const prefixo = normalizarChave(tipo) === "EMAIL" ? "EML" : "T";
  let maior = 0;
  rows.forEach(item => {
    const id = textoSeguro(_v4Col(item.mapa, item.linha, ["ID"]));
    if ((prefixo === "EML" && id.indexOf("EML") === 0) || (prefixo === "T" && id.indexOf("T") === 0)) {
      maior = Math.max(maior, _v4IdNumero(id));
    }
  });
  return prefixo + String(maior + 1).padStart(6, "0");
}

function _v4TipoNormalizado(tipo) {
  const t = normalizarChave(tipo);
  if (t === "EMAIL" || t === "EMAIL") return "E-mail";
  if (t === "TELEFONE") return "Telefone";
  if (t === "RAMAL") return "Ramal";
  if (t === "WHATSAPP") return "WhatsApp";
  if (t === "FAX") return "Fax";
  return textoSeguro(tipo);
}

function _v4ValorNormalizado(valor) {
  return limparTexto(valor);
}

function _v4Usuario() {
  const sheet = DB.usuarios();
  const mapa = DB.map(sheet);
  const emailAtivo = normalizarEmail(AuthService.obterEmailAtivo());
  const dados = DB.read(sheet);
  for (const linha of dados) {
    const email = normalizarEmail(_v4Col(mapa, linha, ["EMAIL"]));
    if (email !== emailAtivo) continue;
    const nivel = Number(_v4Col(mapa, linha, ["NIVEL"], 1)) || 1;
    const ativo = paraBoolean(_v4Col(mapa, linha, ["ATIVO"], false));
    const perfil = CONFIG.NIVEIS.POR_NIVEL[String(nivel)] || CONFIG.PERFIS.USUARIO_CONSULTA;
    return { email, nome: textoSeguro(_v4Col(mapa, linha, ["NOME"])) || email, nivel, perfil, ativo, logado: !!emailAtivo };
  }
  return { email: emailAtivo, nome: emailAtivo, nivel: 1, perfil: CONFIG.PERFIS.USUARIO_CONSULTA, ativo: true, logado: !!emailAtivo };
}

function v4ObterUsuarioAtual() {
  return respostaSucesso(_v4Usuario());
}

function _v4EscopoPermitido(usuario, forumId, unidadeId) {
  if (!usuario || usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) return true;
  if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) return false;

  const sheet = DB.acessosUnidadesOuNulo();
  if (!sheet) return true;
  const mapa = DB.map(sheet);
  const acessos = DB.read(sheet).filter(l => paraBoolean(_v4Col(mapa, l, ["ATIVO"], false)));
  if (!acessos.length) return true;

  const unidades = new Set();
  acessos.forEach(l => {
    const uid = textoSeguro(_v4Col(mapa, l, ["UNIDADE_ID"]));
    const uidUsuario = textoSeguro(_v4Col(mapa, l, ["USUARIO_ID"]));
    if (uid && (!uidUsuario || uidUsuario === usuario.email)) unidades.add(uid);
  });
  if (unidadeId && unidades.has(unidadeId)) return true;
  if (!unidadeId && forumId) {
    const sh = DB.unidades();
    const mu = DB.map(sh);
    return DB.read(sh).some(l => textoSeguro(_v4Col(mu, l, ["FORUM_ID"])) === forumId && unidades.has(textoSeguro(_v4Col(mu, l, ["ID"]))));
  }
  return false;
}

function _v4ResolverContexto(dados) {
  const entrada = ehObjeto(dados) ? dados : {};
  let forumId = textoSeguro(valorObjeto(entrada, "forumId", "FORUM_ID"));
  let unidadeId = textoSeguro(valorObjeto(entrada, "unidadeId", "UNIDADE_ID"));
  let setorId = textoSeguro(valorObjeto(entrada, "setorId", "SETOR_ID"));

  const shSet = DB.setores();
  const ms = DB.map(shSet);
  if (setorId) {
    const row = DB.read(shSet).find(l => textoSeguro(_v4Col(ms, l, ["ID"])) === setorId);
    if (!row) throw new Error("Setor não encontrado.");
    unidadeId = unidadeId || textoSeguro(_v4Col(ms, row, ["UNIDADE_ID"]));
  }

  const shUni = DB.unidades();
  const mu = DB.map(shUni);
  if (unidadeId) {
    const row = DB.read(shUni).find(l => textoSeguro(_v4Col(mu, l, ["ID"])) === unidadeId);
    if (!row) throw new Error("Unidade não encontrada.");
    forumId = forumId || textoSeguro(_v4Col(mu, row, ["FORUM_ID"]));
  }

  if (forumId) {
    const shForum = DB.forum();
    const mf = DB.map(shForum);
    const row = DB.read(shForum).find(l => textoSeguro(_v4Col(mf, l, ["ID"])) === forumId);
    if (!row) throw new Error("Fórum não encontrado.");
  }

  if (!forumId && !unidadeId && !setorId) throw new Error("Informe Fórum, Unidade ou Setor.");
  return { forumId, unidadeId, setorId };
}

function _v4Flat(opcoes) {
  const hier = construirHierarquiaForumContatos(opcoes || {});
  const out = [];
  const vistos = new Set();

  (hier.municipios || []).forEach(m => {
    (m.foruns || []).forEach(f => {
      const base = {
        municipioId: m.id,
        municipio: m.nome,
        microrregiao: m.microrregiao || "",
        forumId: f.id,
        forum: f.nome,
        forumEmail: f.email || "",
        forumEndereco: f.endereco || ""
      };
      const incluir = c => {
        if (!c || vistos.has(c.id)) return;
        vistos.add(c.id);
        let unidade = null, setor = null;
        (f.unidades || []).some(u => {
          if (u.id === c.unidadeId) { unidade = u; return true; }
          return false;
        });
        if (c.setorId) {
          for (const u of (f.unidades || [])) {
            const s = (u.setores || []).find(x => x.id === c.setorId);
            if (s) { unidade = u; setor = s; break; }
          }
        }
        const tipo = _v4TipoNormalizado(c.tipo);
        const valor = textoSeguro(c.valor);
        const row = Object.assign({}, base, {
          ID: c.id,
          id: c.id,
          tipo,
          descricao: c.descricao || "",
          valor,
          setorId: c.setorId || "",
          setor: setor ? setor.nome : "",
          unidadeId: c.unidadeId || (unidade ? unidade.id : ""),
          unidade: unidade ? unidade.nome : "",
          endereco: setor && setor.enderecoExibicao ? setor.enderecoExibicao : (unidade && unidade.enderecoExibicao ? unidade.enderecoExibicao : f.endereco || ""),
          emailEfetivo: setor && setor.emailExibicao ? setor.emailExibicao : (unidade && unidade.emailExibicao ? unidade.emailExibicao : f.email || ""),
          emailHerdado: tipo !== "E-mail",
          contatoDiretoForum: !c.setorId && !c.unidadeId && !!c.forumId,
          contatoDiretoUnidade: !c.setorId && !!c.unidadeId,
          ativo: true,
          status: "ATIVO",
          observacao: c.observacao || (setor ? setor.observacao : ""),
          ordem: c.ordem || ""
        });
        row.numero = tipo === "Telefone" ? valor : "";
        row.ramal = tipo === "Ramal" ? valor : "";
        row.whatsapp = tipo === "WhatsApp" ? valor : "";
        row.email = tipo === "E-mail" ? valor : "";
        out.push(row);
      };
      (f.contatos || []).forEach(incluir);
      (f.unidades || []).forEach(u => {
        (u.contatosDiretos || []).forEach(incluir);
        (u.setores || []).forEach(s => (s.contatos || []).forEach(incluir));
      });
    });
  });
  return out;
}

function v4ListarContatos() {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  const usuario = _v4Usuario();
  return respostaSucesso(_v4Flat({}).filter(x => _v4EscopoPermitido(usuario, x.forumId, x.unidadeId)));
}

function v4PesquisarContatos(texto) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.PESQUISAR);
  const termo = textoSeguro(texto);
  if (termo && limparTexto(termo).length < CONFIG.LIMITES.TAMANHO_PESQUISA) return respostaSucesso([]);
  const usuario = _v4Usuario();
  const dados = _v4Flat({}).filter(x => _v4EscopoPermitido(usuario, x.forumId, x.unidadeId));
  const t = limparTexto(termo);
  if (!t) return respostaSucesso(dados);
  return respostaSucesso(dados.filter(x => limparTexto([x.municipio, x.forum, x.unidade, x.setor, x.tipo, x.descricao, x.valor, x.email, x.endereco, x.observacao].join(" ")).includes(t)));
}

function v4ListarMunicipios() {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  const hier = construirHierarquiaForumContatos({});
  return respostaSucesso((hier.municipios || []).map(m => m.nome));
}

function v4CarregarDashboard() {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  const dados = v4ListarContatos().dados || [];
  const tipos = {}, setores = {}, comarcas = {}, foruns = {}, unidades = {}, municipios = {};
  dados.forEach(x => {
    const tipo = x.tipo || "Não informado";
    const setor = x.setor || "Não informado";
    const comarca = x.municipio || "Não informado";
    tipos[tipo] = (tipos[tipo] || 0) + 1;
    setores[setor] = (setores[setor] || 0) + 1;
    comarcas[comarca] = (comarcas[comarca] || 0) + 1;
    if (x.forumId) foruns[x.forumId] = true;
    if (x.unidadeId) unidades[x.unidadeId] = true;
    if (x.municipioId) municipios[x.municipioId] = true;
  });
  return respostaSucesso({ total: dados.length, tipos, setores, comarcas, totalForuns: Object.keys(foruns).length, totalUnidades: Object.keys(unidades).length, totalMunicipios: Object.keys(municipios).length });
}

function _v4DadosContatoPorId(id) {
  const sh = DB.contatos();
  const mapa = DB.map(sh);
  const row = DB.read(sh).find(l => textoSeguro(_v4Col(mapa, l, ["ID"])) === textoSeguro(id));
  if (!row) return null;
  const obj = {};
  DB.headers(sh).forEach((h, i) => obj[h] = row[i]);
  return { row, mapa, obj };
}

function _v4HistoricoRegistrar(contatoId, acao, antes, depois) {
  const sh = DB.historico();
  const headers = DB.headers(sh);
  const mapa = DB.map(sh);
  const linha = headers.map(h => {
    const k = normalizarChave(h);
    if (k === "ID") return Utilities.getUuid();
    if (k === "CONTATOID" || k === "CONTATO_ID") return contatoId;
    if (k === "TELEFONEID" || k === "TELEFONE_ID") return contatoId;
    if (k === "ACAO") return acao;
    if (k === "ANTES") return JSON.stringify(antes || {});
    if (k === "DEPOIS") return JSON.stringify(depois || {});
    if (k === "USUARIO") return _v4Usuario().email || "SISTEMA";
    if (k === "DATA" || k === "DATACRIACAO") return new Date();
    return "";
  });
  sh.getRange(sh.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
}

function v4ObterContato(id) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  const dados = _v4Flat({}).find(x => x.ID === textoSeguro(id));
  return respostaSucesso(dados || null);
}

function v4CriarContato(dados) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
  const entrada = ehObjeto(dados) ? dados : {};
  const contexto = _v4ResolverContexto(entrada);
  const usuario = _v4Usuario();
  if (!_v4EscopoPermitido(usuario, contexto.forumId, contexto.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const tipo = _v4TipoNormalizado(valorObjeto(entrada, "tipo", "TIPO"));
  const valor = textoSeguro(valorObjeto(entrada, "valor", "VALOR"));
  const descricao = textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO", "descrição"));
  if (!tipo || !valor) throw new Error("Tipo e valor são obrigatórios.");
  if (tipo === "E-mail" && !/^\S+@\S+\.\S+$/.test(valor)) throw new Error("E-mail inválido.");

  const existentes = _v4Flat({});
  const chave = limparTexto(tipo + "|" + valor + "|" + descricao + "|" + contexto.forumId + "|" + contexto.unidadeId + "|" + contexto.setorId);
  if (existentes.some(x => limparTexto(x.tipo + "|" + x.valor + "|" + x.descricao + "|" + x.forumId + "|" + x.unidadeId + "|" + x.setorId) === chave)) throw new Error("Contato duplicado no mesmo contexto.");

  const sh = DB.contatos();
  const headers = DB.headers(sh);
  const agora = new Date();
  const id = _v4NovoContatoId(tipo);
  const linha = headers.map(h => {
    const k = normalizarChave(h);
    if (k === "ID") return id;
    if (k === "FORUMID") return contexto.forumId;
    if (k === "UNIDADEID") return contexto.unidadeId;
    if (k === "SETORID") return contexto.setorId;
    if (k === "TIPO") return tipo;
    if (k === "DESCRICAO") return descricao;
    if (k === "VALOR") return valor;
    if (k === "ORDEM") return valorObjeto(entrada, "ordem", "ORDEM") || "";
    if (k === "DATACRIACAO" || k === "DATA") return agora;
    if (k === "DATAATUALIZACAO") return agora;
    if (k === "ATIVO") return true;
    if (k === "OBSERVACAO") return valorObjeto(entrada, "observacao", "OBSERVACAO") || "";
    return "";
  });
  sh.getRange(sh.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
  _v4HistoricoRegistrar(id, "CRIACAO", {}, { id, ...contexto, tipo, descricao, valor });
  try { CACHE.limparTudo(); } catch (e) {}
  return v4ObterContato(id);
}

function v4AtualizarContato(id, dados) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
  const atual = _v4DadosContatoPorId(id);
  if (!atual) throw new Error("Contato não encontrado.");
  const usuario = _v4Usuario();
  const antigo = v4ObterContato(id).dados;
  const entrada = ehObjeto(dados) ? dados : {};
  const contexto = _v4ResolverContexto(Object.assign({}, antigo, entrada));
  if (!_v4EscopoPermitido(usuario, contexto.forumId, contexto.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const sh = DB.contatos();
  const headers = DB.headers(sh);
  const rowIndex = DB.read(sh).findIndex(l => textoSeguro(_v4Col(atual.mapa, l, ["ID"])) === textoSeguro(id)) + 2;
  const atualObj = atual.obj;
  const tipo = _v4TipoNormalizado(valorObjeto(entrada, "tipo", "TIPO")) || textoSeguro(atualObj.TIPO);
  const valor = textoSeguro(valorObjeto(entrada, "valor", "VALOR")) || textoSeguro(atualObj.VALOR);
  const descricao = textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO")) || textoSeguro(atualObj.DESCRICAO);
  const agora = new Date();
  const linha = headers.map(h => {
    const k = normalizarChave(h);
    if (k === "ID") return id;
    if (k === "FORUMID") return contexto.forumId;
    if (k === "UNIDADEID") return contexto.unidadeId;
    if (k === "SETORID") return contexto.setorId;
    if (k === "TIPO") return tipo;
    if (k === "DESCRICAO") return descricao;
    if (k === "VALOR") return valor;
    if (k === "ORDEM") return valorObjeto(entrada, "ordem", "ORDEM") || atualObj.ORDEM || "";
    if (k === "DATAATUALIZACAO") return agora;
    if (k === "ATIVO") return valorObjeto(entrada, "ativo", "ATIVO") === "" ? true : paraBoolean(valorObjeto(entrada, "ativo", "ATIVO"));
    if (k === "OBSERVACAO") return valorObjeto(entrada, "observacao", "OBSERVACAO") || atualObj.OBSERVACAO || "";
    if (k === "DATACRIACAO" || k === "DATA") return atualObj[h] || agora;
    return atualObj[h] === undefined ? "" : atualObj[h];
  });
  sh.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  _v4HistoricoRegistrar(id, "EDICAO", antigo, { id, ...contexto, tipo, descricao, valor });
  try { CACHE.limparTudo(); } catch (e) {}
  return v4ObterContato(id);
}

function v4ExcluirContato(id) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.EXCLUIR);
  const atual = v4ObterContato(id).dados;
  if (!atual) throw new Error("Contato não encontrado.");
  const usuario = _v4Usuario();
  if (!_v4EscopoPermitido(usuario, atual.forumId, atual.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const sh = DB.contatos();
  const mapa = DB.map(sh);
  const valores = DB.read(sh);
  const idx = valores.findIndex(l => textoSeguro(_v4Col(mapa, l, ["ID"])) === textoSeguro(id));
  if (idx < 0) throw new Error("Contato não encontrado.");
  sh.deleteRow(idx + 2);
  _v4HistoricoRegistrar(id, "EXCLUSAO", atual, {});
  try { CACHE.limparTudo(); } catch (e) {}
  return respostaSucesso({ id, excluido: true });
}

function v4HistoricoContato(id) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.HISTORICO);
  const atual = v4ObterContato(id).dados;
  if (!atual) return respostaSucesso([]);
  if (!_v4EscopoPermitido(_v4Usuario(), atual.forumId, atual.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const sh = DB.historico();
  const mapa = DB.map(sh);
  return respostaSucesso(DB.read(sh).filter(l => textoSeguro(_v4Col(mapa, l, ["CONTATO_ID", "TELEFONE_ID", "TELEFONEID"])) === textoSeguro(id)).map(l => {
    const o = {}; DB.headers(sh).forEach((h,i) => o[h] = l[i]); return o;
  }));
}

function validarDadosReaisForumV4() {
  const ss = DB.getSpreadsheet();
  const obrigatorias = [CONFIG.SHEETS.MUNICIPIOS, CONFIG.SHEETS.FORUM, CONFIG.SHEETS.UNIDADES, CONFIG.SHEETS.SETORES, CONFIG.SHEETS.CONTATOS];
  const ausentes = obrigatorias.filter(n => !ss.getSheetByName(n));
  const possuiTELEFONES = !!ss.getSheetByName("TELEFONES");
  const problemas = [];
  const ids = (sheet, campo) => {
    if (!sheet) return [];
    const m = DB.map(sheet); const i = m[normalizarChave(campo)];
    return DB.read(sheet).map(r => textoSeguro(i ? r[i-1] : "")).filter(Boolean);
  };
  const duplicados = lista => { const s = new Set(), d = []; lista.forEach(x => s.has(x) ? d.push(x) : s.add(x)); return d; };
  obrigatorias.forEach(n => { if (!ss.getSheetByName(n)) problemas.push("Aba ausente: " + n); });
  if (possuiTELEFONES) problemas.push("Aba TELEFONES ainda existe.");

  const mun = DB.municipiosOuNulo(), forum = DB.forumOuNulo(), uni = DB.unidadesOuNulo(), set = DB.setoresOuNulo(), con = DB.contatosOuNulo();
  [["MUNICIPIO",mun],["FORUM",forum],["UNIDADE",uni],["SETOR",set],["CONTATO",con]].forEach(pair => {
    const d = duplicados(ids(pair[1], "ID")); if (d.length) problemas.push(pair[0] + " IDs duplicados: " + d.join(", "));
  });

  if (forum) {
    const mf = DB.map(forum), fm = new Set(ids(mun, "ID"));
    DB.read(forum).forEach((r,i) => { const id = textoSeguro(_v4Col(mf,r,["MUNICIPIO_ID"])); if (id && !fm.has(id)) problemas.push("FORUM linha " + (i+2) + " aponta para MUNICIPIO inexistente: " + id); });
  }
  if (uni) {
    const mu = DB.map(uni), fs = new Set(ids(forum,"ID")), ms = new Set(ids(mun,"ID"));
    DB.read(uni).forEach((r,i) => { const f = textoSeguro(_v4Col(mu,r,["FORUM_ID"])); const m = textoSeguro(_v4Col(mu,r,["MUNICIPIO_ID"])); if (f && !fs.has(f)) problemas.push("UNIDADE linha " + (i+2) + " aponta para FORUM inexistente: " + f); if (m && !ms.has(m)) problemas.push("UNIDADE linha " + (i+2) + " aponta para MUNICIPIO inexistente: " + m); });
  }
  if (set) {
    const ms = DB.map(set), us = new Set(ids(uni,"ID"));
    DB.read(set).forEach((r,i) => { const u = textoSeguro(_v4Col(ms,r,["UNIDADE_ID"])); if (u && !us.has(u)) problemas.push("SETOR linha " + (i+2) + " aponta para UNIDADE inexistente: " + u); });
  }
  if (con) {
    const mc = DB.map(con), fs = new Set(ids(forum,"ID")), us = new Set(ids(uni,"ID")), ssIds = new Set(ids(set,"ID"));
    DB.read(con).forEach((r,i) => {
      const f = textoSeguro(_v4Col(mc,r,["FORUM_ID"])), u = textoSeguro(_v4Col(mc,r,["UNIDADE_ID"])), s = textoSeguro(_v4Col(mc,r,["SETOR_ID"]));
      if (!f && !u && !s) problemas.push("CONTATO linha " + (i+2) + " não possui vínculo de Fórum/Unidade/Setor.");
      if (f && !fs.has(f)) problemas.push("CONTATO linha " + (i+2) + " aponta para FORUM inexistente: " + f);
      if (u && !us.has(u)) problemas.push("CONTATO linha " + (i+2) + " aponta para UNIDADE inexistente: " + u);
      if (s && !ssIds.has(s)) problemas.push("CONTATO linha " + (i+2) + " aponta para SETOR inexistente: " + s);
    });
  }

  return { ok: problemas.length === 0, problemas, abasAusentes: ausentes, possuiTELEFONES, contagens: {
    municipios: mun ? DB.count(mun) : 0,
    foruns: forum ? DB.count(forum) : 0,
    unidades: uni ? DB.count(uni) : 0,
    setores: set ? DB.count(set) : 0,
    contatos: con ? DB.count(con) : 0
  }};
}
