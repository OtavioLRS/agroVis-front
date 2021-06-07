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
    // Para dada HorizonUnit, 
    units.map(unit => {
      this.addUnit(unit);

      // Verifica se já há uma HorizonUnit equivalente
      // const index = this.alreadyIn(unit);
      // const index = -1;
      // Se sim, concatena nela, senão, adiciona uma nova
      // console.log(index)
      // index != -1 ? this.concatUnit(unit, index) : this.addUnit(unit);
    });
  }

  // Verifica se uma unit já está na estrutura
  alreadyIn(unit) {
    const result = this.units.findIndex(obj => obj.equivalent(unit));
    // Retorna o index do elemento, se não encontrar, retorna -1
    return result;
  }

  // Adiciona uma HorizonUnit em 'units'
  addUnit(unit) {
    this.units.push(unit);
  }

  // Funde os valores de uma HorizonUnit com os de uma já existente em 'unit'
  concatUnit(unit, index) {
    this.units[index].fob += unit.fob;
    this.units[index].peso += unit.peso;
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
}