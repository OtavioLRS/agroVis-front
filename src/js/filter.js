import { startLoading, finishLoading } from './extra.js'
import { buildHorizon } from './horizon.js';
import { headerTitles, printTableData } from './table.js';


// Função para construir o filtro de anos e meses
function buildTemporalFilter(initialYear, finalYear) {

  // Opção padrão com todos os anos
  $('#year-filter').append($('<option value=0 selected>Todos os anos</option>'));

  for (let year = initialYear; year <= finalYear; year++) {
    let option = $('<option></option>').attr({ "value": year });
    option.text(year);

    $('#year-filter').append(option);
  }

  // Opção padrão com todos os meses
  $('#month-filter').append($('<option value=0 selected>Todos os meses</option>'));

  let meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  for (let month = 1; month <= 12; month++) {
    let option = $('<option></option>').attr({ "value": month });
    option.text(meses[month - 1]);

    $('#month-filter').append(option);
  }
}

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

      // Opção padrão com todos os anos
      $('#sh4-filter').append($('<option value=0 selected>Todos os produtos</option>'));

      response.forEach((product) => {
        // console.log(city);

        let option = $('<option></option>')
        option.attr({ "value": product.CO_SH4 });
        option.text(product.CO_SH4 + " - " + product.NO_SH4_POR);
        option.attr({ "label": product.CO_SH4 });
        option.addClass("option-sh4");

        $('#sh4-filter').append(option);
      });
    });
}

// Função principal para a construção dos filtros
export function buildFilters() {
  buildTemporalFilter(1996, 2020);
  buildSH4Filter();

  $('#filter-button').click(() => { handleFilter(); });
}

// Atualiza os municipios selecionados
function updateMap(cities) {

  // Deseleciona todas as cidades
  $('.city-active').each(function () {
    $(this).removeClass('city-active');
  })

  // Seleciona as cidades novas
  cities.forEach(e => { $('#' + e).addClass('city-active'); });
}

// Estrutura os dados do filtro para realizar a requisição dos dados
export function handleFilter() {
  let cities = $('#city-filter').select2('data');
  let years = $('#year-filter').select2('data');
  let months = $('#month-filter').select2('data');
  let products = $('#sh4-filter').select2('data');

  if (products.length == 0) { // Nenhum produto foi selecionado, aborda
    alert('Por favor, selecione um SH4!');
    return;
  }

  startLoading();

  let filter = {
    cities: [],
    years: [],
    months: [],
    products: []
  }

  // Ids das cidades que devem ser selecionadas no mapa
  let cityIds = cities.map((e) => { return e.id });
  // console.log(cityIds)

  // Atualizando as cidades selecionadas no mapa
  updateMap(cityIds);

  // Adicionando codigos das cidades no filtro
  cities.forEach(e => { filter.cities.push(e.id) });


  // Adicionando anos no filtro
  for (let e of years) {
    // console.log(e)
    // Todos os anos selecionados, não é necessário filtro
    if (e.id == '0') { filter.years = []; break; }

    else filter.years.push(e.id)
  }

  // Adicionando meses no filtro
  for (let e of months) {
    // console.log(e)
    // Todos os meses selecionados, não é necessário filtro
    if (e.id == '0') { filter.months = []; break; }

    else filter.months.push(e.id)
  }

  // Adicionando produtos no filtro
  for (let e of products) {
    // console.log(e)
    // Todos os produtos selecionados, não é necessário filtro
    if (e.id == '0') { filter.products = []; break; }

    // Caso normal, apenas adiciona produto escolhido
    else filter.products.push(e.id)
  }

  getExportData(filter);
}

// Função para requisitar os dados ao banco de acordo com um filtro
export async function getExportData(filter) {
  console.log('Filtro', filter);


  // Requisição com os filtros dos dados requisitados
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
      const horizonData = rawData.map(d => {
        const data = new Date(d.CO_ANO, d.CO_MES, 1); // ts
        const sh4 = d.SH4.toString(); // series
        const fob = d.VL_FOB; // value
        return { data, sh4, fob }
      })
      console.log('Horizon Data', horizonData);

      // Constrói o Horizon Chart
      const overlap = $('#overlap-slider').val();
      console.log(overlap, 'overlap')
      buildHorizon(horizonData, parseInt(overlap));
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