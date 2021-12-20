import { changeLoadingMessage, formatValues, getSortByValue, showBluredLoader, hideBluredLoader, fixMonth, median, getSortOrder, compareDates, } from '../extra';
import HorizonTSChart from 'horizon-timeseries-chart';
import { HorizonUnit, HorizonData } from './horizonClasses';
import { showHorizonModal } from './horizonModal';

/** Constroi o horizon chart
 * 
 * @param {object} filter 
 */
export async function buildHorizon(filter) {
  // Primeiro click no HorizonChart
  await localStorage.setItem('horizonclick', '1');

  // Requisição dos dados do HorizonChart 
  // const response = await fetch('https://mighty-taiga-07455.herokuapp.com/horizondata', {
  const response = await fetch('https://agrovis-back-flask.herokuapp.com/exportacao/horizon', {
    // const response = await fetch('http://127.0.0.1:5000/exportacao/horizon', {
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

  // Se der exception, significa que não encontou nenhum dado
  const resultVerifier = rawData[0]['CO_MUN'];

  // Dataframe de dados do Horizon Chart
  const horizonData = new HorizonData();

  // Preenchendo o dataframe
  horizonData.addArray(rawData.map(d => new HorizonUnit(
    new Date(d["CO_ANO"], d["CO_MES"] - 1, 1),
    d["SH4"],
    d["NO_SH4_POR"],
    d["VL_FOB"],
    d["KG_LIQUIDO"],
    d["NUM_REGS"])
  ));
  // console.log('Horizon Data', horizonData);

  /**
   * Neste ponto, a primeira requisição recuperou apenas SH4s que possuiam ALGUM dado.
   * Deste modo, agora esses SH4s são isolados, e são procurados dados auxiliares APENAS DELES.
   */

  // SH4s unicos
  const uniqueSh4 = horizonData.uniqueValues('sh4_codigo');

  // Filtro de produtos dos dados auxiliares, contém somente SH4s com dados
  filter.products = uniqueSh4;

  // console.log('Filtro antes de arrumar', filter);
  // Se inicio e fim forem do mesmo ano, adiciona o ano completo no período
  if (filter.beginPeriod.split('-')[0] == filter.endPeriod.split('-')[0])
    [filter.beginPeriod, filter.endPeriod] = expandDate(filter.beginPeriod);
  // console.log('Filtro depois de arrumar', filter);

  // Dados auxiliares do HorizonChart
  // const responseAux = await fetch('https://mighty-taiga-07455.herokuapp.com/horizondata-aux', {
  // const responseAux = await fetch('http://127.0.0.1:5000/exportacao/horizon/aux', {
  const responseAux = await fetch('https://agrovis-back-flask.herokuapp.com/exportacao/horizon/aux', {
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

  // Adicionando dados auxiliares
  horizonData.addArray(rawAuxData.map(d => new HorizonUnit(
    new Date(d["CO_ANO"], d["CO_MES"] - 1, 1),
    d["SH4"],
    d["NO_SH4_POR"],
    d["VL_FOB"],
    d["KG_LIQUIDO"],
    d["NUM_REGS"])
  ));
  // console.log('Horizon Data Aux', horizonData);

  // Número de bandas dos gráficos
  const overlap = $('#overlap-slider').val();

  // Atributo que será exibido no gráfico
  const sortValue = $('input[name="datatype-radio"]:checked', '#container-datatype').val();

  // Zoom ligado ou não
  const zoomMode = document.getElementById('zoom-switch').checked;
  // console.log('Zoom', zoomMode)

  changeLoadingMessage('Construindo visualizações...');
  // console.log('dados usados:', sortValue, 'ordenado por: ', sortMode)

  // Elemento onde o chart será criado
  const domElem = document.createElement('div');
  // Limpa o horizon chart antigo
  d3.select('#horizon-wrapper').select('div').remove();
  // Renderiza o novo
  d3.select('#horizon-wrapper').node().append(domElem);

  // Dimensões do chart
  const { height, width } = d3.select('#horizon-wrapper').node().getBoundingClientRect();
  const pl = d3.select('#horizon-wrapper').style('padding-left').replace('px', '');
  const pr = d3.select('#horizon-wrapper').style('padding-right').replace('px', '');
  // console.log('padding-left', pl, 'padding-right', pr)

  let firstLimit = '';

  const horizon = HorizonTSChart()(domElem)
    .data(horizonData.units) // Dataframe
    .width(width - pl - pr - 10) // Largura total - paddings - scrollbar
    .height(80 * uniqueSh4.length) // Altura total: 100px * quantidade de charts
    .series('sh4_codigo') // Indicador do titulo de cada chart
    .ts('data') // Indicador da data do dado
    .val(sortValue) // Indicador do valor do chart
    .useUtc(false)
    .horizonBands(overlap) // Quantidade de layers 
    .enableZoom(zoomMode) // Zoom ativado ou não
    .transitionDuration([1]) // Duração das tranformações do gráfico
    .seriesComparator((a, b) => compareSeriesBy(a, b, horizonData, getSortByValue(), getSortOrder()))
    .interpolationCurve(d3.curveBasis) // curveBasis, curveLinear, curveStep
    .seriesLabelFormatter((label) => {
      // Total de cada series
      const totalValue = horizonData.findTotalValueOf(label, sortValue);
      return ' ' + label + ' - Total: ' +
        ((sortValue == 'fob') ? 'U$ ' + formatValues(totalValue) : formatValues(totalValue) + ' kg');
    })
    .tooltipContent(({ series, val, ts, points: [{ sh4_descricao, fob, peso }] }) => {
      ts = new Date(ts);
      if (fob != 0 || peso != 0)
        return `<b>${series}</b> - ${sh4_descricao.length < 40 ? sh4_descricao : (sh4_descricao.substring(0, 40) + '...')}
        <br>
        <b>Data: ${fixMonth(ts.getMonth() + 1)}/${ts.getFullYear()}</b>
        <br>
        Valor FOB: U$ ${formatValues(fob)}
        <br>
        Peso Líquido: ${formatValues(peso)} kg`

      else
        return ` <b>${series}</b> - ${sh4_descricao.length < 40 ? sh4_descricao : (sh4_descricao.substring(0, 40) + '...')}
        <br>
        <b>Data: ${fixMonth(ts.getMonth() + 1)}/${ts.getFullYear()}</b>
        <br>
        Nenhum dado registrado neste período!`
    })
    .onClick(async (data) => {
      const click = await JSON.parse(localStorage.getItem('horizonclick'));
      // console.log(click);

      if (click == '1') {
        let clickDate = new Date(data.ts);
        firstLimit = clickDate.getFullYear() + '-' + fixMonth((clickDate.getMonth() + 1));
        horizonFirstClick(data);
      } else {
        horizonSecondClick(data);
        firstLimit = '';
      };
    })
    .onHover(async ({ series, val, ts, points: [{ num_regs }] }) => {
      ts = new Date(ts);
      const year = ts.getFullYear();
      const month = ts.getMonth() + 1;

      // Atualiza modal da data clicada
      if (firstLimit != '') {
        let secondLimit = year + '-' + fixMonth(month);

        // Altera a ordem das datas para ficar um período válido
        if (compareDates(firstLimit, secondLimit)) {
          $('#click-begin').html(secondLimit.split('-')[1] + '/' + secondLimit.split('-')[0]);
          $('#click-end').html(firstLimit.split('-')[1] + '/' + firstLimit.split('-')[0]);
        } else {
          $('#click-begin').html(firstLimit.split('-')[1] + '/' + firstLimit.split('-')[0]);
          $('#click-end').html(secondLimit.split('-')[1] + '/' + secondLimit.split('-')[0]);
        }

      }

      // Atualiza a borda do mes atual
      $('.calendar-square').each(function () { $(this).removeClass('calendar-square-bordered') });
      $(`.calendar-month[month-index='${month - 1}'] .calendar-square`).addClass('calendar-square-bordered');

      // Atualiza o titulo do calendario
      $('#calendar-title-wrapper').html('<b>SH4 ' + series + ' - Ano ' + year + '</b>');

      let numRegs = horizonData.countRegs(series, year);
      let sum = 0;
      numRegs.forEach(n => sum += n);

      // console.log(numRegs);

      let numRegsValues = [];
      numRegs.forEach(d => { if (d != 0) numRegsValues.push(d) });

      // Função de cores é calculada pela mediana
      const f = d3.scaleLinear()
        .domain([d3.min(numRegsValues), median(numRegsValues), d3.max(numRegsValues)])
        .range(['yellow', '#FF6D00', 'red'])

      for (let i = 0; i < 12; i++) {
        const value = numRegs[i];
        const color = numRegs[i] == 0 ? 'white' : f(numRegs[i]);

        $(`.calendar-month[month-index='${i}'] .calendar-square-color`)
          .css('background-color', color)
        $(`.calendar-month[month-index='${i}'] .calendar-square-text`)
          .html('<b>' + value + '</b>');
      }
    });

  // Muda o numero de layers dinamicamente
  $('#overlap-slider').off();
  $('#overlap-slider').on('input', async function () {
    await showBluredLoader('#horizon-wrapper');

    setTimeout(async () => {
      // Número de bands
      const bandNumber = $(this).val().toString();
      $('#overlap-label').html("Layers: " + bandNumber);
      // Re-renderiza o gráfico
      horizon.horizonBands(bandNumber)

      await hideBluredLoader('#horizon-wrapper');
    }, 1)
  });

  // Controla o zoom
  $('#zoom-switch').off();
  $('#zoom-switch').on('change', function () {
    if (this.checked) horizon.enableZoom(true);
    else horizon.enableZoom(false);
  })

  // Muda a escala do HorizonChart unitariamente
  $('#unit-scale-radio').off();
  $('#unit-scale-radio').on('change', async () => {
    await showBluredLoader('#horizon-wrapper');

    setTimeout(async () => {
      horizon.yExtent(undefined)

      await hideBluredLoader('#horizon-wrapper');
    }, 1)
  });

  // Muda a escala do HorizonChart para global
  $('#global-scale-radio').off();
  $('#global-scale-radio').on('change', async () => {
    await showBluredLoader('#horizon-wrapper');

    // Valor máximo de todos os dados será utilizado como escala
    const maxValue = d3.max(uniqueSh4.map(sh4 => horizonData.findMaxValueOf(sh4, sortValue)));

    setTimeout(async () => {
      horizon.yExtent(maxValue)

      await hideBluredLoader('#horizon-wrapper');
    }, 1);
  });

  // Muda a ordenação do HorizonChart
  const sortListener = async () => {
    await showBluredLoader('#horizon-wrapper');

    setTimeout(async () => {
      horizon.seriesComparator((a, b) => compareSeriesBy(a, b, horizonData, getSortByValue(), getSortOrder()))

      await hideBluredLoader('#horizon-wrapper');
    }, 1);
  };

  $('#fob-sort-radio').on('click', () => sortListener());
  $('#peso-sort-radio').on('click', () => sortListener());
  $('#sort-dec').on('click', () => sortListener());
  $('#sort-asc').on('click', () => sortListener());
}

/** Função auxiliar para ordenar as series do `HorizonChart`
 * 
 * @param {string} a elemento 1 a ser comparado
 * @param {string} b elemento 2 a ser comparado
 * @param {object} df dataframe com os dados do `HorizonChart`
 * @param {('fob'|'peso')} mode ordenar por fob ou por peso
 * @param {('asc'|'dec')} order ordenar em ordem crescente ou decrescente
 */
function compareSeriesBy(a, b, df, mode, order) {
  const aTotal = df.findTotalValueOf(a, mode);
  const bTotal = df.findTotalValueOf(b, mode);

  // console.log(mode, order)
  if (order == 'dec')
    if (aTotal <= bTotal) return 1;
    else return -1;
  else
    if (aTotal >= bTotal) return 1;
    else return -1;
}

/** Trata o primeiro click no `HorizonChart`
 * 
 * @param {object} data dado relacionado ao `timestamp` onde foi clicado
 */
async function horizonFirstClick(data) {
  await localStorage.setItem('horizonclick', '2');
  await localStorage.setItem('horizonclickdata', JSON.stringify(data));

  // Mostra o alerta auxiliar
  showClickAlert(new Date(data.ts));

  // Adiciona blur nas series
  $('.horizon-series').each(function () {
    if (!$(this).children('span').html().startsWith(' ' + data.series)) {
      $(this).addClass('blured');
    }
  })

}

/** Trata o segundo click no `HorizonChart`
 * 
 * @param {object} data1 dado relacionado ao `timestamp` onde foi clicado
 */
async function horizonSecondClick(data1) {
  await localStorage.setItem('horizonclick', '1');

  // Esconde o alerta auxiliar
  hideClickAlert();

  const data2 = await JSON.parse(localStorage.getItem('horizonclickdata'));

  // Constrói o modal, do menor 'ts' ao maior
  data1.ts < data2.ts ? showHorizonModal(data1, data2) : showHorizonModal(data2, data1)

  // Remove o blur das series
  $('.horizon-series').each(function () { $(this).removeClass('blured'); });
}

/** Abre o aviso de click no HorizonChart
 * 
 * @param {number} ts timestamp do click inicial
 */
function showClickAlert(ts) {
  $('body').prepend(`
  <div class="alert alert-success alert-dismissible shadow-lg fade show border border-5 border-success" role="alert" id="modal-click">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"
      class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" role="img" aria-label="Warning:">
        <path
          d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
    </svg>
    <span> Clique novamente para escolher um período de tempo! </span> <br><br>
    Período selecionado: <b><span id="click-begin"> ${fixMonth((ts.getMonth() + 1)) + '/' + ts.getFullYear()} </span> - <span id="click-end"> ${fixMonth((ts.getMonth() + 1)) + '/' + ts.getFullYear()} </span></b>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>

    <div class="modal-footer">
      <button type="button" class="btn btn-success">Período completo</button>
    </div>
  </div>
  `);

  // Pega o período inteiro, sem precisar selecionar manualmente
  $('#modal-click .modal-footer button').on('click', () => { getFullPeriod(); });

  // Fechar pelo botão
  $('#modal-click').on('closed.bs.alert', () => {
    hideClickAlert();
  })
}

/** Fecha o aviso de click no HorizonChart */
export async function hideClickAlert() {
  const node = document.querySelector('#modal-click')
  const alert = bootstrap.Alert.getOrCreateInstance(node);
  alert.close();

  // Retorna ao estado de aguardo pelo primeiro click
  await localStorage.setItem('horizonclick', '1');

  // Remove o blur
  $('.horizon-series').each(function () { $(this).removeClass('blured'); });
}

/** Mostra o modal do HorizonChart para o período todo de uma series */
export async function getFullPeriod() {
  // Dataframes utilizados para construir o modal
  let data1 = await JSON.parse(localStorage.getItem('horizonclickdata'));
  let data2 = Object.assign({}, data1);
  // Filtro para retirar o intervalo total das datas
  let filter = await JSON.parse(localStorage.getItem('filter'));

  let [y1, m1] = filter['beginPeriod'].split('-');
  let [y2, m2] = filter['endPeriod'].split('-');

  data1.ts = new Date(y1, m1 - 1, 1)
  data2.ts = new Date(y2, m2 - 1, 1)

  // Esconde o alerta auxiliar
  hideClickAlert();

  // Mostra o modal do HorizonChart
  showHorizonModal(data1, data2);
}

/** Expande uma determinada data de um mês para o ano inteiro onde se encontra
 * 
 * @param {string} date `YYYY-MM`
 * @returns {string[]} [`YYYY-MM`ini, `YYYY-MM`fim]
 */
function expandDate(date) {
  // const m = parseInt(date.split('-')[1]);
  const y = parseInt(date.split('-')[0]);

  let begin = `${y}-01`;
  let end = `${y}-12`;

  return [begin, end];
}