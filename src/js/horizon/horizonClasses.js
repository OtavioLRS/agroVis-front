export class HorizonUnit {

  constructor(data, sh4_codigo, sh4_descricao, fob, peso) {
    this.data = data;
    this.sh4_codigo = sh4_codigo;
    this.sh4_descricao = sh4_descricao;
    this.fob = fob;
    this.peso = peso;
  }

  equivalent(other) {
    const ano = this.data.getYear() == other.data.getYear();
    const mes = this.data.getMonth() == other.data.getMonth();
    const sh4 = this.sh4_codigo == other.sh4_codigo;
    return (ano && mes && sh4);
  }
}

// Classe container para os dados do Horizon Chart
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

    // console.log('sh4', sh4, 'valores', mode, filtered.map(unit => unit[mode]))
    return d3.max(filtered.map(unit => unit[mode]));
  }



  // // Funde os valores de uma HorizonUnit com os de uma já existente em 'unit'
  // concatUnit(unit, index) {
  //   this.units[index].fob += unit.fob;
  //   this.units[index].peso += unit.peso;
  // }

  // // Verifica se uma unit já está na estrutura
  // alreadyIn(unit) {
  //   const result = this.units.findIndex(obj => obj.equivalent(unit));
  //   // Retorna o index do elemento, se não encontrar, retorna -1
  //   return result;
  // }
}