import { startLoading, changeLoadingMessage, finishLoading, formatValues, getSortByValue, showHorizonLoader, hideHorizonLoader, getSortValue, cleanDashboard, getScaleByValue, fixMonth, blurElement, unblurElement, median, } from '../extra';
import HorizonTSChart from 'horizon-timeseries-chart';
import { HorizonUnit, HorizonData } from './horizonClasses';
import { changeMapTitle, cleanCity } from '../map';
import { showHorizonModal } from './horizonModal';

// Constroi o horizon chart
export async function buildHorizon(filter) {
  // Primeiro click no HorizonChart
  await localStorage.setItem('horizonclick', '1');

  // Requisição dos dados do HorizonChart 
  const response = await fetch('https://mighty-taiga-07455.herokuapp.com/horizondata', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter,
    })
  });

  const rawData = await response.json();

  changeLoadingMessage('Estruturando dados...');
  // console.log('Dados brutos', rawData);
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

  const resultVerifier = rawData[0]['CO_MUN'];

  // Dataframe de dados do Horizon Chart
  const horizonData = new HorizonData();

  // Preenchendo o dataframe
  horizonData.addArray(rawData.map(d => new HorizonUnit(new Date(d.CO_ANO, d.CO_MES - 1, 1), d.SH4, d.NO_SH4_POR, d.VL_FOB, d.KG_LIQUIDO, d.NUM_REGS)));
  // console.log('Horizon Data', horizonData);

  // Sh4s unicos
  const uniqueSh4 = horizonData.uniqueValues('sh4_codigo');

  // Filtro de produtos dos dados auxiliares, contém somente SH4s com dados
  filter.products = uniqueSh4;

  // Dados auxiliares do HorizonChart
  const responseAux = await fetch('https://mighty-taiga-07455.herokuapp.com/horizondata-aux', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter,
    })
  });
  const rawAuxData = await responseAux.json();
  horizonData.addArray(rawAuxData.map(d => new HorizonUnit(new Date(d.CO_ANO, d.CO_MES - 1, 1), d.SH4, d.NO_SH4_POR, d.VL_FOB, d.KG_LIQUIDO, d.NUM_REGS)));
  // console.log('Horizon Data Aux', horizonData);

  // Número de bandas dos gráficos
  const overlap = $('#overlap-slider').val();

  // Atributo que será exibido no gráfico
  const sortValue = $('input[name="datatype-radio"]:checked', '#container-datatype').val()

  // Modo de ordenação dos gráficos
  const sortMode = getSortByValue();

  // Zoom ligado ou não
  const zoomMode = document.getElementById('zoom-switch').checked;
  console.log('Zoom', zoomMode)

  changeLoadingMessage('Construindo visualizações...');
  // console.log('dados usados:', sortValue, 'ordenado por: ', sortMode)

  // Elemento onde o chart será criado
  const domElem = document.createElement('div');
  // Limpa o horizon chart antigo
  d3.select('#horizon-wrapper').select('div').remove();
  // Renderiza o novo
  d3.select('#horizon-wrapper').node().append(domElem);

  const horizon = HorizonTSChart()(domElem)
    .data(horizonData.units) // Dataframe
    .width(window.innerWidth - 45) // Largura total, 100% da tela - 40px padding e margin - 5 scroll
    .height(100 * uniqueSh4.length) // Altura total: 100px * quantidade de charts
    .series('sh4_codigo') // Indicador do titulo de cada chart
    .ts('data') // Indicador da data do dado
    .val(sortValue) // Indicador do valor do chart
    .useUtc(false)
    .horizonBands(overlap) // Quantidade de overlaps 
    .enableZoom(zoomMode) // Zoom ativado ou não
    .transitionDuration([1]) // Duração das tranformações do gráfico
    .seriesComparator((a, b) => compareSeriesBy(a, b, horizonData, sortMode))  // Ordem dos charts 
    .interpolationCurve(d3.curveBasis) // curveBasis, curveLinear, curveStep
    .seriesLabelFormatter((label) => {
      // Total de cada series
      const totalValue = horizonData.findTotalValueOf(label, sortValue);
      return label + ' - Total: ' +
        ((sortValue == 'fob') ? 'U$ ' + formatValues(totalValue) : formatValues(totalValue) + ' kg');
    })
    .tooltipContent(({ series, val, ts, points: [{ sh4_descricao, fob, peso }] }) => {
      ts = new Date(ts);
      if (val != 0)
        return `<b>${series}</b> - ${sh4_descricao.length < 40 ? sh4_descricao : (sh4_descricao.substring(0, 40) + '...')}
        <br>
        Data: ${fixMonth(ts.getMonth() + 1)}/${ts.getFullYear()}
        <br>
        Valor FOB: U$ ${formatValues(fob)}
        <br>
        Peso Líquido: ${formatValues(peso)} kg`

      else
        return ` <b>${series}</b> - ${sh4_descricao.length < 40 ? sh4_descricao : (sh4_descricao.substring(0, 40) + '...')}
        <br>
        Data: ${fixMonth(ts.getMonth() + 1)}/${ts.getFullYear()}
        <br>
        Nenhum dado registrado neste período!`
    })
    .onClick(async (data) => {
      /* 
         false - primeiro click
         true - segundo click
      */
      const click = await JSON.parse(localStorage.getItem('horizonclick'));
      // console.log(click);

      click == '1' ? horizonFirstClick(horizon, data) : horizonSecondClick(horizon, data);
    })
    .onHover(async ({ series, val, ts, points: [{ num_regs }] }) => {
      ts = new Date(ts);
      const year = ts.getFullYear();
      const month = ts.getMonth() + 1;

      // Atualiza modal da data clicada
      $('#click-end').html(fixMonth(month) + '/' + year);

      // Atualiza a borda do mes atual
      $('.calendar-square').each(function () { $(this).removeClass('calendar-square-bordered') });
      $(`.calendar-month[month-index='${month - 1}'] .calendar-square`).addClass('calendar-square-bordered');

      // Se for ano diferente do exibido, refaz a query
      // if ($('#calendar-title-wrapper').html().split('Ano ')[1] == year) return;

      $('#calendar-title-wrapper').html('SH4 ' + series + ' - Ano ' + year);
      // const filter = await JSON.parse(localStorage.getItem('filter'));
      // const response = await fetch('https://mighty-taiga-07455.herokuapp.com/num-regs', {
      //   method: 'POST',
      //   headers: {
      //     Accept: 'application/json',
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     products: [series],
      //     beginPeriod: year + '-01',
      //     endPeriod: year + '-12',
      //     cities: filter.cities
      //   })
      // });
      // const data = await response.json();

      let numRegs = horizonData.countRegs(series, year);
      let sum = 0;
      numRegs.forEach(n => sum += n);

      // console.log(numRegs);

      let numRegsValues = [];
      numRegs.forEach(d => { if (d != 0) numRegsValues.push(d) });
      // let numRegs = data.map(e => e['NUM_REG']);
      // let sum = 0;
      // numRegs.forEach(n => sum += n);

      // numRegs.sort(function (a, b) {
      //   return a - b;
      // });

      // Função de cores é calculada pela mediana
      const f = d3.scaleLinear()
        .domain([d3.min(numRegsValues), median(numRegsValues), d3.max(numRegsValues)])
        .range(['yellow', '#FF6D00', 'red'])

      for (let i = 0; i < 12; i++) {
        // const result = data.findIndex(e => e['CO_MES'] - 1 == i);
        // let color = '';
        // let value = '';

        // if (result != -1) { value = data[result]['NUM_REG']; color = f(value); }
        // else { value = 0; color = 'white'; }

        const value = numRegs[i];
        const color = numRegs[i] == 0 ? 'white' : f(numRegs[i]);

        $(`.calendar-month[month-index='${i}'] .calendar-square-color`)
          .css('background-color', color)
        $(`.calendar-month[month-index='${i}'] .calendar-square-text`)
          .html(value);
      }

      // unblurElement('#calendar-wrapper');
    });

  // Muda o numero de bandas dinamicamente
  $('#overlap-slider').off();
  $('#overlap-slider').on('input', function () {
    showHorizonLoader('#horizon-wrapper');

    setTimeout(async () => {
      // Número de bands
      const bandNumber = $(this).val().toString();
      $('#overlap-label').html("Layers: " + bandNumber);
      // Re-renderiza o gráfico
      await horizon
        .horizonBands(bandNumber)
      // .transitionDuration([1]);

      await hideHorizonLoader('#horizon-wrapper');
    }, 100)
  });

  // Controla o zoom
  $('#zoom-switch').off();
  $('#zoom-switch').on('change', function () {
    if (this.checked) horizon.enableZoom(true);
    else horizon.enableZoom(false);
  })

  // Muda a escala do HorizonChart unitariamente
  $('#unit-scale-radio').off();
  $('#unit-scale-radio').on('change', function () {
    showHorizonLoader('#horizon-wrapper');

    setTimeout(async () => {
      await horizon
        .yExtent(undefined)
        // .seriesLabelFormatter(label => {
        //   const totalValue = horizonData.findTotalValueOf(label, sortValue);
        //   return label + ' - Total: ' +
        //     ((sortValue == 'fob') ? 'U$ ' + formatValues(totalValue) : formatValues(totalValue) + ' kg');
        // })
        .transitionDuration([1]);
      await hideHorizonLoader('#horizon-wrapper');
    }, 100)
  });

  // Muda a escala do HorizonChart para global
  $('#global-scale-radio').off();
  $('#global-scale-radio').on('change', function () {
    showHorizonLoader('#horizon-wrapper');

    // Valor máximo de todos os dados será utilizado como escala
    const maxValue = d3.max(uniqueSh4.map(sh4 => horizonData.findMaxValueOf(sh4, sortValue)));

    setTimeout(async () => {
      await horizon
        .yExtent(maxValue)
        // .seriesLabelFormatter(label => label + ' - Escala: ' + formatValues(maxValue))
        .transitionDuration([1]);
      await hideHorizonLoader('#horizon-wrapper');
    }, 100);
  });

  // Muda a ordenação do gráfico dinamicamente por fob
  $('#fob-sort-radio').off();
  $('#fob-sort-radio').on('change', function () {
    showHorizonLoader('#horizon-wrapper');

    setTimeout(async () => {
      await horizon
        .seriesComparator((a, b) => compareSeriesBy(a, b, horizonData, 'fob'))
        .transitionDuration([1]);
      hideHorizonLoader('#horizon-wrapper');
    }, 100);

  });

  // Muda a ordenação do gráfico dinamicamente por peso
  $('#peso-sort-radio').off();
  $('#peso-sort-radio').on('change', function () {
    showHorizonLoader('#horizon-wrapper');

    setTimeout(async () => {
      await horizon
        .seriesComparator((a, b) => compareSeriesBy(a, b, horizonData, 'peso'))
        .transitionDuration([1]);
      hideHorizonLoader('#horizon-wrapper');
    }, 100);
  });

  // Muda a ordenação do gráfico para descendente
  $('#sort-dec').off();
  $('#sort-dec').on('click', async function () {
    showHorizonLoader('#horizon-wrapper');

    setTimeout(async () => {
      await horizon
        .seriesComparator((a, b) => compareSeriesBy(a, b, horizonData, getSortByValue()))
        .transitionDuration([1]);
      hideHorizonLoader('#horizon-wrapper');
    }, 10);
  });

  // Muda a ordenação do gráfico para ascendente
  $('#sort-asc').off();
  $('#sort-asc').on('click', async function () {
    await showHorizonLoader('#horizon-wrapper');

    setTimeout(async () => {
      await horizon
        .seriesComparator((a, b) => compareSeriesBy(b, a, horizonData, getSortByValue()))
        .transitionDuration([1]);
      hideHorizonLoader('#horizon-wrapper');
    }, 10);
  });
}

// Função auxiliar para ordenar os charts de acordo com o modo escolhido (mode = 'fob' | 'peso')
function compareSeriesBy(a, b, df, mode) {
  const aTotal = df.findTotalValueOf(a, mode);
  const bTotal = df.findTotalValueOf(b, mode);

  if (aTotal <= bTotal) return 1;
  else return -1;
}

// Trata click inicial no horizonChart
async function horizonFirstClick(chart, data) {
  await localStorage.setItem('horizonclick', '2');
  await localStorage.setItem('horizonclickdata', JSON.stringify(data));

  // Mostra o alerta auxiliar
  showClickAlert(new Date(data.ts));

  // Adiciona blur nas series
  $('.horizon-series').each(function () {
    if (!$(this).children('span').html().startsWith(data.series)) {
      $(this).addClass('blured');
    }
  })

}

// Trata click final no horizonChart
async function horizonSecondClick(chart, data1) {
  await localStorage.setItem('horizonclick', '1');

  // Esconde o alerta auxiliar
  hideClickAlert();

  const data2 = await JSON.parse(localStorage.getItem('horizonclickdata'));

  // Constrói o modal, do menor 'ts' ao maior
  data1.ts < data2.ts ? showHorizonModal(data1, data2) : showHorizonModal(data2, data1)

  // Remove o blur das series
  $('.horizon-series').each(function () { $(this).removeClass('blured'); });
}



// Abre o aviso de clique no HorizonChart
function showClickAlert(ts) {
  $('body').prepend(`
  <div class="alert alert-success alert-dismissible shadow-lg fade show border border-5 border-success" role="alert" id="modal-click">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
    class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" role="img" aria-label="Warning:">
    <path
      d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </svg>
  <span> Clique novamente para escolher um período de tempo! </span> <br><br>
  Período selecionado: <span id="click-begin"> ${fixMonth((ts.getMonth() + 1)) + '/' + ts.getFullYear()} </span> - <span id="click-end"> </span>
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>
  `);

  // Fechar pelo botão
  $('#modal-click').on('closed.bs.alert', () => {
    hideClickAlert();
  })
}

// Fecha o aviso de clique no HorizonChart
export async function hideClickAlert() {
  const node = document.querySelector('#modal-click')
  const alert = bootstrap.Alert.getOrCreateInstance(node);
  alert.close();

  // Retorna ao estado de aguardo pelo primeiro click
  await localStorage.setItem('horizonclick', '1');

  // Remove o blur
  $('.horizon-series').each(function () { $(this).removeClass('blured'); });
}

















// export const parseDate = d3.timeParse('%m/%Y');

// Função para construir o Horizon Chart
// export function buildHorizon(dataRaw, ov) {

  //   // Estruturando os dados
  //   let horizonData = structureHorizonData(dataRaw)
  //   console.log('Final', horizonData)

  //   if (!horizonData) { alert('Nenhum dado foi encontrado!'); return };

  //   const overlap = ov;
  //   const extent = d3.extent(horizonData.dates);
  //   const extentAbs = extent[1].getYear() - extent[0].getYear() + 1;

  //   console.log('Periodo dos dados', extentAbs);

  //   const step = 100;

  //   const margin = ({ top: 30, right: 10, bottom: 0, left: 10 });

//   // const color = i => d3['schemeReds'][Math.max(3, overlap)][i + Math.max(0, 3 - overlap)]
//   const color = i => d3['schemeOrRd'][Math.max(3, overlap)][i + Math.max(0, 3 - overlap)]

//   const width = 150 * extentAbs;
//   const height = horizonData.series.length * (step + 1) + margin.top + margin.bottom;

//   // Valores eixo y
//   const x = d3.scaleUtc()
//     .domain(d3.extent(horizonData.dates))
//     .range([0, width])
//   // .range([0, 10000])

//   // Valores eixo x
//   const y = d3.scaleLinear()
//     .domain([0, d3.max(horizonData.series, d => d3.max(d.values))])
//     // .domain([0, 50000])
//     .range([0, -overlap * step])
//   // .range([0, 10000])

//   // Legenda do eixo
//   const xAxis = g => g
//     .attr('transform', `translate(0, ${ margin.top })`)
//     .call(d3.axisTop(x).ticks(width / 80).tickSizeOuter(0))
//     .call(g => g.selectAll('.tick').filter(d => x(d) < margin.left || x(d) >= width - margin.right).remove())
//     .call(g => g.select('.domain').remove())

//   const area = d3.area()
//     .curve(d3.curveBasis)
//     .defined(d => !isNaN(d))
//     .x((d, i) => { /* console.log(horizonData.dates[i]); */ return x(horizonData.dates[i]) })
//     .y0(0)
//     .y1(d => { /* console.log(y(d)); */ return y(d); })

//   // Balão com info
//   let tooltip = d3.select('#horizon-wrapper')
//     .append('div')
//     .attr('class', 'hidden tooltip');

//   const rule = d3.select('#horizon-wrapper')
//     .append('div')
//     .classed('rule', true)

//   const line = rule.append('div')
//     .classed('line', true)
//     .classed('hidden', true)

//   const svgHorizon = d3.create('svg')
//     .attr('viewBox', [0, 0, width, height])
//     .style('font', '10px sans-serif')
//     .style('height', height)
//     .style('width', width)
//     .on('mouseover', () => {
//       line.classed('hidden', false);
//     })
//     .on('mousemove', function () {
//       let mouseCoords = d3.mouse(d3.select('#horizon-wrapper').node()).map((coord) => parseInt(coord));
//       line.style('left', mouseCoords[0] + 'px');
//       // const e = document.elementFromPoint(mouseCoords[0] + window.innerWidth / 2, mouseCoords[1] + window.innerHeight / 2);
//       // console.log('?', d3.select(this).html());
//     })
//     .on('mouseout', () => {
//       line.classed('hidden', true);
//     })

//   const g = svgHorizon.append('g')
//     .selectAll('g')
//     .data(horizonData.series.map(d => Object.assign({
//       clipId: (Math.random() * 100).toFixed(2),
//       pathId: (Math.random() * 100).toFixed(2)
//     }, d)))
//     .join('g')
//     .attr('transform', (d, i) => `translate(0, ${ i * (step + 1) + margin.top})`);

//   g.append('clipPath')
//     .attr('id', d => d.clipId)
//     .append('rect')
//     .attr('width', width)
//     .attr('height', step)

//   g.append('defs').append('path')
//     .attr('id', d => d.pathId)
//     .attr('d', d => area(d.values))

//   g.append('g')
//     .attr('clip-path', d => 'url(http://localhost:8080#' + d.clipId + ')')
//     .selectAll('use')
//     .data(d => new Array(overlap).fill(d))
//     .join('use')
//     .attr('fill', (d, i) => color(i))
//     .attr('transform', (d, i) => `translate(0, ${(i + 1) * step})`)
//     .attr('href', d => '#' + d.pathId);

//   g.append('text')
//     .attr('x', 4)
//     // .attr('y', step / 2)
//     .attr('y', 1)
//     .attr('dy', '1.0em')
//     .text(d => d.name)
//     .classed('horizon-rowname', true)
//     .on('mouseover', function (d) { // Mostra a descrição do SH4
//       let mouseCoords = d3.mouse(d3.select('#horizon-wrapper').node()).map((coord) => {
//         return parseInt(coord);
//       });
//       tooltip.classed('hidden', false)
//         .attr('style', 'left:' + (mouseCoords[0] + 15) +
//           'px; top:' + (mouseCoords[1] - 35) + 'px')
//         .html(function () {
//           console.log('Hover', d)
//           return $('.option-sh4').filter(function () { return this.value == d.name }).text();
//         })
//     })
//     .on('mouseout', () => { // Esconde a descrição do SH4
//       tooltip.classed('hidden', true);
//     })
//     .on('click', (d) => {
//       const draggable = createDraggable(d);
//       $('body').append(draggable);
//     })

//   svgHorizon.append('g')
//     .call(xAxis);

//   d3.select('#horizon-wrapper').select('svg').remove();
//   d3.select('#horizon-wrapper').node().append(svgHorizon.node());
// }

// Função para estruturar os dados para o Horizon Chart
// function structureHorizonData(data) {
//   // Limites de tempo em que os dados se encontram
//   const yearInterval = d3.extent(data.map(d => d.ano));

//   // Não há dados
//   if (!yearInterval[0]) { d3.select('#horizon-container').select('svg').remove(); return null; }

//   // Intervalo de tempo absoluto dos dados
//   const interval = yearInterval[1] - yearInterval[0] + 1;
//   // console.log('Intervalo de tempo', yearInterval, ' - ', interval);

//   // Agrupa os dados por SH4
//   const groupedBySH4 = d3.nest()
//     .key(d => d.sh4)
//     .entries(data)
//     .sort((x, y) => d3.ascending(x.key, y.key));
//   console.log('Horizon Data Grouped - SH4', groupedBySH4);

//   // Vetor com os fobs de cada um dos sh4
//   let fobBySH4 = [];

//   // Para cada SH4 é preciso agrupar por anos
//   groupedBySH4.forEach(chartValues => {
//     // Agrupa por anos
//     const groupedByYear = d3.nest()
//       .key(d => d.ano)
//       .entries(chartValues.values)
//       .sort((x, y) => d3.ascending(x.key, y.key));
//     console.log('Horizon Data Grouped - Year', groupedByYear);

//     // Inicia o vetor onde serão colocados os dados
//     let fobsByYear = new Array(interval * 12);
//     fobsByYear = fobsByYear.fill(0);

//     // Fob total do produto
//     let fobTotal = 0;

//     // Para cada ano
//     groupedByYear.forEach(year => {

//       // Posição cronológica do ano
//       const yearIndex = year.values[0].ano - yearInterval[0];
//       // console.log('Ano: ', year.key, ' - Index: ', yearIndex);

//       // Somando o valor FOB em seu intervalo de tempo adequado
//       year.values.forEach(value => {
//         const monthIndex = value.mes;
//         fobsByYear[(yearIndex * 12) + monthIndex - 1] += parseInt(value.fob);
//         fobTotal += parseInt(value.fob);
//         // console.log('Adicionei ', value.fob, ' no mes ', monthIndex, ' do ano ', yearIndex);
//       })
//     })

//     // console.log('Valores ', fobsByYear);

//     // Salva os fobs de todos os anos para o sh4 atual
//     fobBySH4.push({ key: chartValues.key, values: fobsByYear, totalValue: fobTotal });
//   })


//   // Agora, é necessário montar o dataframe final com as datas e fobs
//   console.log('Todos Fobs', fobBySH4);

//   let dates = new Array(interval * 12);
//   for (let y = 0; y < interval; y++) {
//     for (let m = 0; m < 12; m++) {
//       // Construindo as datas
//       dates[(y * 12) + m] = parseDate((m + 1).toString() + '/' + (y + yearInterval[0]).toString())
//     }
//   }
//   // console.log('Datas', dates);

//   // Data frame final
//   const finalData = {
//     dates,
//     series: fobBySH4.map(sh4 => {
//       // const baseline = sh4.values[0]; // Primeiro valor
//       // const baseline = d3.max(sh4.values); // Maior valor
//       // const baseline = d3.min(sh4.values); // Menor valor
//       return {
//         name: sh4.key,
//         values: sh4.values,
//         totalValue: sh4.totalValue
//         // values: sh4.values.map(value => { /*console.log(value);*/ return Math.log(value / baseline) }) // Normalizar?
//       }
//       // Ordenando por valor total
//     }).sort((a, b) => (b.totalValue > a.totalValue) ? 1 : ((a.totalValue > b.totalValue) ? -1 : 0))
//   };


//   console.log('Final Data', finalData);

//   return finalData;
// }