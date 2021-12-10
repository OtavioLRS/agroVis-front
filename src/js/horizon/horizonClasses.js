/** Unidade de dados do HorizonChart */
export class HorizonUnit {

  constructor(data, sh4_codigo, sh4_descricao, fob, peso, num_regs) {
    this.data = data;
    this.sh4_codigo = sh4_codigo;
    this.sh4_descricao = sh4_descricao;
    this.fob = fob;
    this.peso = peso;
    this.num_regs = num_regs;
  }

  equivalent(other) {
    const ano = this.data.getYear() == other.data.getYear();
    const mes = this.data.getMonth() == other.data.getMonth();
    const sh4 = this.sh4_codigo == other.sh4_codigo;
    return (ano && mes && sh4);
  }
}

/** Classe container para os dados do HorizonChart */
export class HorizonData {
  // Conjunto de unidades de dados, identificados pela data e codigo do SH4
  constructor() {
    this.units = [];
  }

  // Adiciona um vetor HorizonUnit em 'units'
  addArray(units) {
    // Adiciona as HorizonUnits no vetor
    units.map(unit => this.addUnit(unit))
  }

  // Adiciona uma HorizonUnit em 'units'
  addUnit(unit) {
    this.units.push(unit);
  }

  // Encontra o valor total de um sh4 ('fob' ou 'peso')
  findTotalValueOf(sh4, mode) {
    const filtered = this.units.filter(unit => unit.sh4_codigo == sh4)

    let valueSum = 0;
    for (let un of filtered) {
      valueSum += un[mode];
    }
    return valueSum;
  }

  // Encontra o maior valor de um sh4 ('fob' ou 'peso')
  findMaxValueOf(sh4, mode) {
    const filtered = this.units.filter(unit => unit.sh4_codigo == sh4)
    return d3.max(filtered.map(unit => unit[mode]));
  }

  // Encontra quais os valores únicos de um determinado atributo
  uniqueValues(key) {
    return Array.from(new Set(this.units.map(d => d[key])));
  }

  // Cria e adiciona valores vazios como auxiliares
  createAuxData(sh4s) {
    // console.log('dados aux', sh4s);
    for (let sh4 of sh4s) {
      let ano = 1997;
      while (ano <= 2020) {
        let mes = 1;
        while (mes <= 12) {
          this.units.push(new HorizonUnit(new Date(Date.UTC(ano, mes, 1)), sh4, 'teste', 0, 0));
        }
      }
    }
  }

  countRegs(sh4, year) {
    const filtered = this.units.filter(unit => unit.data.getFullYear() == year && unit.sh4_codigo == sh4 && (unit.fob != 0 || unit.peso != 0));

    let values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    filtered.forEach(d => { values[d.data.getMonth()] = d.num_regs });
    return values;
  }
}