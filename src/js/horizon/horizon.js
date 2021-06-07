import { finishLoading, formatValues } from '../extra';
import HorizonTSChart from 'horizon-timeseries-chart';

export const parseDate = d3.timeParse('%m/%Y');

// Constroi o horizon chart
export function buildHorizon(df, bands, sort) {
  if (df.units.length == 0) {
    alert('Nenhum dado foi encontrado!');
    d3.select('#horizon-wrapper').select('div').remove();
    return
  };

  const domElem = document.createElement('div');

  // Contando quantos SH4s diferentes foram recuperados
  const sh4Num = new Set();
  for (let i of df.units)
    sh4Num.add(i.sh4_codigo);
  const count = sh4Num.size;

  const horizon = HorizonTSChart()(domElem) // Elemento onde o chart será criado
    .data(df.units) // Dataframe
    .height(100 * count) // Altura total: 100px * quantidade de charts
    .series('sh4_codigo') // Indicador do titulo de cada chart
    .ts('data') // Indicador da data do dado
    .val('fob') // Indicador do valor do chart
    .useUtc(true)
    .horizonBands(bands)
    .transitionDuration([1]) // Duração das tranformações do gráfico
    .seriesComparator((a, b) => { // Ordem dos charts
      const aTotal = df.findTotalValueOf(a, sort);
      const bTotal = df.findTotalValueOf(b, sort);
      // console.log(aTotal, bTotal);

      if (aTotal <= bTotal) return 1;
      else return -1;
    })
    // .interpolationCurve(d3.curveStep) // curveBasis, curveLinear, curveStep
    // .positiveColors(['lightblue', 'midnightBlue']) // Cores, minimo duas, intermediarias são interpoladas
    // .enableZoom(true) // Zoom
    // .seriesComparator((a, b) => {  // Forma de ordenação dos charts
    //   console.log('a', a)
    //   console.log('b', b)
    //   return 
    // })
    // .yAggregation(vals => vals.reduce((a, b) => a + b))  // Soma valores iguais
    // .tooltipContent(({ series, ts, val, points: [{ sh4_descricao, peso }] }) =>
    //   series + ' - ' + sh4_descricao + '\nData: ' +
    //   new Date(ts).toLocaleDateString().substring(3) + '\nValor FOB: U$ ' +
    //   formatValues(val) + '\nPeso Líquido: ' +
    //   formatValues(peso) + ' kg'
    // )
    .tooltipContent(({ series, ts, val, points: [{ fob, sh4_descricao, peso }] }) =>
      ` <b>${series}</b> - ${sh4_descricao}
    <br>
    Data: ${new Date(ts).toLocaleDateString().substring(3)}
    <br>
    Valor FOB: U$ ${formatValues(val)}
    <br>
    Peso Líquido: ${formatValues(peso)} kg
  `)

  // Limpa o horizon chart antigo
  d3.select('#horizon-wrapper').select('div').remove();
  // Renderiza o novo
  d3.select('#horizon-wrapper').node().append(domElem);

  // Muda o numero de bandas dinamicamente
  $('#overlap-slider').on('input', function () {
    // Número de bands
    const bandNumber = $(this).val().toString();
    // Re-renderiza o gráfico
    horizon.horizonBands(bandNumber);
  });

  // Muda a ordenação do gráfico dinamicamente por fob
  $('#fob-radio').on('change', function () {
    horizon.seriesComparator((a, b) => compareBy(a, b, df, 'fob'))
  });

  // Muda a ordenação do gráfico dinamicamente por peso
  $('#peso-radio').on('change', function () {
    horizon.seriesComparator((a, b) => compareBy(a, b, df, 'peso'))
  });
}

// Função auxiliar para ordenar os charts de acordo com o modo escolhido (mode = 'fob' | 'peso')
function compareBy(a, b, df, mode) {
  const aTotal = df.findTotalValueOf(a, mode);
  const bTotal = df.findTotalValueOf(b, mode);

  if (aTotal <= bTotal) return 1;
  else return -1;
}





















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
//     .attr('transform', `translate(0,${margin.top})`)
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
//     .attr('transform', (d, i) => `translate(0,${i * (step + 1) + margin.top})`);

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
//     .attr('transform', (d, i) => `translate(0,${(i + 1) * step})`)
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