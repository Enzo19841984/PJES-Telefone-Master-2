/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 06_ValidationService.gs
 * ==========================================================
 */

class ValidationService {
  validarTelefone(dados, idAtual) {
    const registro = ehObjeto(dados) ? dados : {};

    this.validarCamposObrigatorios(registro);

    const numero = textoSeguro(valorObjeto(registro, "numero", "Numero"));

    const ramal = textoSeguro(valorObjeto(registro, "ramal", "Ramal"));

    const whatsapp = textoSeguro(valorObjeto(registro, "whatsapp", "Whatsapp", "WhatsApp"));

    if (!numero && !ramal && !whatsapp) {
      throw new Error("Informe ao menos um meio de contato: Telefone, Ramal ou WhatsApp.");
    }

    this.validarNumero(numero);
    this.validarRamal(ramal);
    this.validarWhatsapp(whatsapp);
    this.validarDuplicidade(registro,idAtual);

    return true;
  }

  normalizarNumero(valor) {
    return String(valor || "")
      .replace(/\D/g, "");
  }

  validarTextoNumerico(valor, mensagem, minimo, maximo) {
    const texto = textoSeguro(valor);

    if (!texto) {
      return true;
    }

    if (!/^[0-9+().\-\s]+$/.test(texto)) {
      throw new Error(mensagem);
    }

    const digitos =this.normalizarNumero(texto);

    if (digitos.length < minimo || digitos.length > maximo) {
      throw new Error(mensagem);
    }

    return true;
  }

  validarDuplicidade(dados, idAtual) {
    const numero = this.normalizarNumero(valorObjeto(dados, "numero", "Numero"));

    if (!numero) {
      return;
    }

    const setor = textoSeguro(valorObjeto(dados, "setor", "Setor"));

    const telefones =
      new TelefoneRepository()
        .listar();

    const encontrado =
      telefones.find(item => {
        const itemId = textoSeguro(item.ID || item.id);

        if (idAtual && itemId === textoSeguro(idAtual)) {
          return false;
        }

        const setorExistente = textoSeguro(item.setor);

        const numeroExistente = this.normalizarNumero(item.numero);

        return (limparTexto(setorExistente) === limparTexto(setor) && numeroExistente === numero);
      });

    if (encontrado) {
      throw new Error("Já existe um telefone cadastrado para este setor com o mesmo número.");
    }
  }

  validarCamposObrigatorios(dados) {
    const regras = [{campo: "microrregiao", nome: "Microrregião"}, {campo: "comarca", nome: "Comarca"},
      {campo: "setor", nome: "Setor"}
    ];

    const faltantes = [];

    regras.forEach(regra => {
      const valor = textoSeguro(valorObjeto(dados,regra.campo));

      if (!valor) {
        faltantes.push(regra.nome);
      }
    });

    if (faltantes.length > 0) {
      throw new Error("Por favor, preencha os campos obrigatórios: " + faltantes.join(", ") + ".");
    }

    const status = textoSeguro(valorObjeto(dados, "status", "Status")
      );

    if (status && !["ATIVO", "INATIVO"].includes(status.toUpperCase())
    ) {
      throw new Error("Status inválido.");
    }
  }

  validarNumero(numero) {
    return this.validarTextoNumerico(numero, "Número de telefone inválido.", 8, 13);
  }

  validarRamal(ramal) {
    return this.validarTextoNumerico(ramal, "Ramal inválido.", 1, 6);
  }

  validarWhatsapp(whatsapp) {
    return this.validarTextoNumerico(whatsapp, "WhatsApp inválido.", 10, 13);
  }
}