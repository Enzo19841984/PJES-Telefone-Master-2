/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 03_Database.gs
 * ==========================================================
 *
 * A planilha é obtida desta forma:
 *
 * 1. Quando executado pelo editor do Apps Script:
 *    usa a planilha ativa e registra sua vinculação.
 *
 * 2. Quando executado como Web App:
 *    usa a vinculação armazenada nas propriedades do script.
 */

const CHAVE_PLANILHA_VINCULADA = "PLANILHA_VINCULADA_ID";

class Database {
  constructor() {
    this.spreadsheet = null;
  }

  /**
   * Executada manualmente pelo editor do Apps Script.
   *
   * Usa a planilha ativa, que é a planilha à qual
   * este projeto está vinculado, e grava a associação
   * nas propriedades do projeto.
   */
  
  registrarPlanilhaAtiva() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (!spreadsheet) {
      throw new Error(
        "Não foi possível obter a planilha ativa. " +
        "Abra o Apps Script pelo menu " +
        "'Extensões > Apps Script' da planilha."
      );
    }

    PropertiesService
      .getScriptProperties()
      .setProperty(CHAVE_PLANILHA_VINCULADA, spreadsheet.getId());

    this.spreadsheet = spreadsheet;

    return spreadsheet;
  }

  /**
   * Retorna a planilha vinculada.
   *
   * Durante o Web App, recupera a associação salva
   * nas propriedades do projeto.
   */
  getSpreadsheet() {
    if (this.spreadsheet) {
      return this.spreadsheet;
    }

    const id =
      PropertiesService
        .getScriptProperties()
        .getProperty(CHAVE_PLANILHA_VINCULADA);

    if (!id) {
      throw new Error(
        "A planilha ainda não foi vinculada. " +
        "Execute registrarPlanilhaVinculada() " +
        "manualmente no editor do Apps Script."
      );
    }

    try {
      this.spreadsheet = SpreadsheetApp.openById(id);
    } catch (erro) {
      throw new Error(
        "Não foi possível abrir a planilha vinculada. " +
        "Verifique se a conta que executa o Web App " +
        "possui acesso à planilha."
      );
    }

    return this.spreadsheet;
  }

  /**
   * Retorna uma aba pelo nome.
   */
  getSheet(nomeAba) {
    const nome = textoSeguro(nomeAba);

    if (!nome) {
      throw new Error("Nome da aba não informado.");
    }

    const sheet =
      this
        .getSpreadsheet()
        .getSheetByName(nome);

    if (!sheet) {
      throw new Error("A aba '" + nome + "' não existe na planilha.");
    }

    return sheet;
  }

  telefones() {
    return this.getSheet(CONFIG.SHEETS.TELEFONES);
  }

  historico() {
    return this.getSheet(CONFIG.SHEETS.HISTORICO);
  }

  configuracao() {
    return this.getSheet(CONFIG.SHEETS.CONFIGURACAO);
  }

  usuarios() {
    return this.getSheet(CONFIG.SHEETS.USUARIOS);
  }

  /**
   * Retorna a aba de solicitações de acesso.
   *
   * Aceita tanto o nome canônico ("Solicitações de Acesso do sistema")
   * quanto o nome legado ("SOLICITACOES_ACESSO") de instalações antigas.
   */
  solicitacoesAcesso() {
    const spreadsheet = this.getSpreadsheet();

    const nomes =
      [
        CONFIG.SHEETS.SOLICITACOES_ACESSO,
        CONFIG.SHEETS.SOLICITACOES_ACESSO_LEGADO
      ].filter(Boolean);

    const chaveAlvo =
      normalizarChave(CONFIG.SHEETS.SOLICITACOES_ACESSO);

    for (const nome of nomes) {
      const sheet = spreadsheet.getSheetByName(nome);

      if (sheet) {
        return sheet;
      }

      if (normalizarChave(nome) === chaveAlvo) {
        continue;
      }
    }

    const abas =
      spreadsheet
        .getSheets()
        .find(sheet =>
          normalizarChave(sheet.getName()) === chaveAlvo
        );

    if (abas) {
      return abas;
    }

    throw new Error(
      "A aba '" +
      CONFIG.SHEETS.SOLICITACOES_ACESSO +
      "' não existe na planilha. Execute instalarSistema()."
    );
  }

  log() {
    return this.getSheet(CONFIG.SHEETS.LOG);
  }

  headers(sheet) {
    if (!sheet) {
      throw new Error("Planilha não informada.");
    }

    const ultimaColuna = sheet.getLastColumn();

    if (ultimaColuna <= 0) {
      return [];
    }

    return sheet
      .getRange(1, 1, 1, ultimaColuna)
      .getDisplayValues()[0]
      .map(function (header) {
        return textoSeguro(header);
      });
  }

  map(sheet) {
    const headers = this.headers(sheet);

    const mapa = {};

    headers.forEach(function (header, index) {
      const chave = normalizarChave(header);

      if (chave) {
        mapa[chave] = index + 1;
      }
    });

    return mapa;
  }

  read(sheet) {
    if (!sheet) {
      throw new Error("Planilha não informada.");
    }

    const ultimaLinha = sheet.getLastRow();

    const ultimaColuna = sheet.getLastColumn();

    if (ultimaLinha <= 1 || ultimaColuna <= 0) {
      return [];
    }

    return sheet
      .getRange(2, 1, ultimaLinha - 1, ultimaColuna)
      .getValues();
  }

  count(sheet) {
    return Math.max(sheet.getLastRow() - 1, 0);
  }

  lastRow(sheet) {
    return sheet.getLastRow();
  }
}

/*
 * Deve existir somente uma declaração de DB
 * em todo o projeto.
 */

const DB =
  new Database();