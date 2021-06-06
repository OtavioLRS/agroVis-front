import { startLoading, finishLoading } from './extra.js'
import { buildHorizon, HorizonUnit, HorizonData, structureHorizonData } from './horizon/horizon.js';
import { headerTitles, printTableData } from './table.js';

// Função para construir o filtro de sh4 (produtos)
async function buildSH4Filter() {

  // Requisição para buscar os anos presentes no banco
  await fetch('http://localhost:3333/produtos', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(response => {
      console.log('SH4', response);

      // Opção padrão com todos os produtos
      $('#input-sh4').append($('<option value=0 selected>Todos os produtos</option>'));

      response.forEach((product) => {
        let option = $('<option></option>')
        option.attr({ "value": product.CO_SH4 });
        option.text(product.CO_SH4 + " - " + product.NO_SH4_POR);
        option.attr({ "label": product.CO_SH4 });
        option.addClass("option-sh4");

        $('#input-sh4').append(option);
      });
    });
}

// Função principal para a construção dos filtros
export function buildFilters() {
  // buildTemporalFilter(1996, 2020);
  buildSH4Filter();

  $('#input-sh4').select2();
  $('#input-city').select2();

  $('#filter-button').click(() => { handleFilter(); });
}

// Atualiza os municipios selecionados
function updateMap(cities) {
  // Seleciona todas
  if (cities.length == 0)
    $('.city').each(function () {
      $(this).addClass('city-active');
    })

  else {
    // Desseleciona todas as cidades
    $('.city-active').each(function () {
      $(this).removeClass('city-active');
    })

    // Seleciona as cidades novas
    cities.forEach(e => { $('#' + e).addClass('city-active'); });
  }
}

// Estrutura os dados do filtro para realizar a requisição dos dados
export async function handleFilter() {
  let cities = $('#input-city').select2('data');
  let products = $('#input-sh4').select2('data');
  let date0 = $('#input-date0').val();
  let date1 = $('#input-date1').val();

  if (products.length == 0) { // Nenhum produto foi selecionado, aborda
    alert('Por favor, selecione um SH4!');
    return;
  }
  if (cities.length == 0) { // Nenhum produto foi selecionado, aborda
    alert('Por favor, selecione uma cidade!');
    return;
  }

  startLoading();

  let filter = {
    cities: [],
    products: [],
    beginPeriod: null,
    endPeriod: null
  }

  // Ids das cidades que devem ser selecionadas no mapa
  let cityIds = [];

  // Adicionando cidades no filtro
  for (let c of cities) {
    // Todos os produtos selecionados, não é necessário filtro
    if (c.id == '0') { filter.cities = []; cityIds = []; break; }

    // Caso normal, apenas adiciona cidade escolhida
    else {
      filter.cities.push(c.id);
      cityIds.push(c.id);
    }
  }

  // Adicionando produtos no filtro
  for (let e of products) {
    // Todos as cidades selecionadas, não é necessário filtro
    if (e.id == '0') { filter.products = []; break; }

    // Caso normal, apenas adiciona produto escolhido
    else filter.products.push(e.id)
  }

  // Adicionando período de tempo no filtro
  filter.beginPeriod = date0;
  filter.endPeriod = date1;

  // Atualiza as cidades destacadas no mapa
  updateMap(cityIds);

  // Filtro foi construído, agora serão feitos os processamentos:

  // Requisição dos dados com os filtros requisitados
  await fetch('http://localhost:3333/exportacao', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter,
    })
  }).then(response => response.json()
    .then(rawData => {
      console.log('Dados brutos', rawData)
      /*
        CO_ANO: int - Ano
        CO_MES: int - Mês
        CO_MUN: string - Código do município
        CO_PAIS: string - Pais de destino
        KG_LIQUIDO: int - Peso líquido
        NO_MUN_MIN: string - Nome do município
        NO_PAIS: string - Nome do país de destino
        NO_SH4_POR: string - Descrição do SH4
        SH4: int - Código SH4
        VL_FOB: int - Valor FOB em U$
      */

      // Dados do Horizon Chart
      const horizonData = new HorizonData();


      horizonData.addArray(rawData.map(d => new HorizonUnit(new Date(d.CO_ANO, d.CO_MES, 1), d.SH4, d.NO_SH4_POR, d.VL_FOB, d.KG_LIQUIDO)));
      // const rawHorizonData = rawData.map(d => {
      //   const data = new Date(d.CO_ANO, d.CO_MES, 1); // ts
      //   const sh4 = d.SH4; // series
      //   const fob = d.VL_FOB; // value

      //   const produto = d.SH4;
      //   const peso = d.KG_LIQUIDO;
      //   const descricao = d.NO_SH4_POR;
      //   return { data, sh4, produto, fob, peso, descricao }
      // })
      console.log('Horizon Data', horizonData);

      // Número de bandas dos gráficos
      const overlap = $('#overlap-slider').val();
      console.log(overlap, 'overlap')

      // Modo de ordenação dos gráficos
      const sortMode = $('#fob-radio').prop("checked") ? 'fob' : 'peso';
      console.log(sortMode, 'ordenação')

      // Constrói o Horizon Chart
      buildHorizon(horizonData, parseInt(overlap), sortMode);
    }))
    .then(() => {
      finishLoading();
    });
}









//     .then(response => response.json()
//       .then(response => {
//         console.log('Dados', response)
//         table.select('tbody').remove();

//         // Formatando os dados
//         let tableData = response[0];
//         let horizonData = response[1];

//         console.log('Dados tabela', tableData)
//         console.log('Dados horizon', horizonData)

//         // Adicionando na tabela
//         let rows = table.append('tbody').selectAll('tr')
//           .data(tableData).enter()
//           .append('tr');
//         // Reservado em memória um 'table row' para cada tupla de 'data'

//         rows.selectAll('td')
//           // Em cada uma das 'table row', reserva-se local para uma 'cell'
//           .data((keyData) => {
//             return headerTitles.map((key) => {
//               return { 'attribute': key, 'value': keyData[key] };
//             });
//           }).enter()
//           .append('td')
//           // Coluna onde fica a 'cell'
//           .attr('data-th', (cell) => {
//             return cell.attribute;
//           })
//           // Valor da 'cell'
//           .text((cell) => {
//             return cell.value;
//           });

//         // Constrói o Horizon Chart
//         buildHorizon(horizonData);
//       }))
//     .then(() => {
//       finishLoading();
//     });
// }