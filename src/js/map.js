import { formatValues, changeLoadingMessage, getSortValue, showBluredLoader, hideBluredLoader, unformatValues } from "./extra";
import { updateMundiData } from "./mundi";

/** Desenha o mapa de São Paulo */
export async function drawMainMap() {
  $('#mainmap-container').html(`
    <div id="input-sh4-map-container"></div>
    <div id="centralize-container" title="Centralizar o mapa">
      <i class="bi bi-pin-map-fill" id="centralize-map-icon"></i>
    </div>`);

  // Container do mapa
  let svg = d3.select('#map-container #mainmap-container')
    .append('svg') // SVG para o mapa
    .attr('id', 'map-svg')
    .attr('height', '100%')
    .attr('width', '100%')
    .lower();

  // Dimensões do mapa
  const { height, width } = svg.node().getBoundingClientRect();
  // console.log('Dimensões', height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#map-container #mainmap-container')
    .append('div')
    .attr('class', 'hidden tooltip-custom');

  // Requisita o geoJSON da API do IBGE
  const mapData = await d3.json('https://servicodados.ibge.gov.br/api/v2/malhas/35?resolucao=5&qualidade=4&formato=application/vnd.geo+json');
  // console.log('Mapa', mapData)

  // Projeção
  const projection = d3.geoMercator()
    // .fitSize([width, height], mapData);
    .fitExtent([[5, 25], [width, height - 5]], mapData);

  // Path
  const path = d3.geoPath()
    .projection(projection);

  // Aplica os shapes no SVG
  svg.selectAll('.polygon')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('class', 'polygon')
    .attr('id', shape => shape.properties.codarea) // Define o id do shape como o código de sua cidade
    .attr('d', path)
    .on('mousemove', function (d) { // Mostra nome da cidade no hover
      // Mostra o nome da cidade
      tooltip.classed('hidden', false)
        .style("left", (d3.event.pageX + 30).toString() + "px")
        .style("top", (d3.event.pageY - 50).toString() + "px")
        .html(() => $('#' + d.properties.codarea).text()) // Nome do municipio a ser exibido no hover
    })
    // Esconde titulo
    .on('mouseout', () => tooltip.classed('hidden', true))
    // Trata o clique na cidade
    .on('click', (clickedShape) => {

    })

  //Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.8, 10])
    .on('zoom', () => {
      svg.selectAll('path').attr('transform', d3.event.transform)
    });
  svg.call(zoom)

  // Listener de reset de Zoom
  $('#centralize-map-icon').on('click', () => { resetMap(svg, zoom); });
  return fetch('');
}

/** Reseta um mapa para seu zoom original
 * 
 * @param {object} svg svg com o mapa
 * @param {object} zoom `d3.zoom`
 */
export function resetMap(svg, zoom) {
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);
}

/** Recupera os nomes das cidades do banco e constrói o input de cidades do filtro */
export async function getCitiesNames() {

  // Requisição para recuperar os dados dos municípios
  // await fetch('https://mighty-taiga-07455.herokuapp.com/municipios', {
  await fetch('https://agrovis-back-flask.herokuapp.com/cidades', {
    // await fetch('http://127.0.0.1:5000/cidades', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(response => {
      // console.log('Cidades', response)

      // Aproveita para construir o input de cidades (opção padrão com todas as cidades)
      $('#input-city').append($('<option value=0 title="1">Todas as cidades</option>'));

      response.forEach((city) => {
        // Para cada cidade, busca o polygono equivalente e atualiza o HTML interno
        $('#' + city.CO_MUN_GEO.toString()).text(city.NO_MUN_MIN);

        // Adiciona a cidade no input de cidades
        let option = $('<option></option>');
        option.attr({ "value": city.CO_MUN_GEO });
        option.text(city.NO_MUN_MIN);
        option.attr({ "title": city.NO_MUN_MIN })
        $('#input-city').append(option);
      });
      // Seleciona a opção default com todas as cidades
      $('#input-city').val('0').trigger('change');
      // Remove o aviso que foi exibido com o trigger de change
      $('#filter-button span').addClass('hidden');
    });
}

/** Atualiza os dados do mapa com base em um filtro presente no `localStorage`.
 * Se tiver um SH4 selecionado, busca só esse SH4, senão, busca todos os SH4s com dados (total).
 * @param {number} selected sh4 selecionado no mapa, `0` para todos
 * 
 */
export async function updateMap(selected) {
  await showBluredLoader('#mainmap-container');
  await showBluredLoader('#mundimap-container');

  // Preenche o mapa de São Paulo
  await updateMapData(selected);
  await hideBluredLoader('#mainmap-container')

  // Preenche o mapa mundi
  await updateMundiData(selected);
  await hideBluredLoader('#mundimap-container');
}

/** Atualiza os dados do mapa de São Paulo
 * 
 * @param {number} selected sh4 selecionado no mapa, `0` utilizará o total de todos os sh4s
 * @param {object[]} colorFunctions escalas customizadas para as classes do mapa `(opcional)`
 */
export async function updateMapData(selected, colorFunctions = []) {
  changeLoadingMessage('Atualizando o mapa...');

  // Recupera o filtro para realizar a query dos dados do mapa
  const filter = await JSON.parse(localStorage.getItem('filter'));
  filter.products = selected == 0 ? filter.products : [selected];

  // Realiza a query do filtro inserido
  // const response = await fetch('http://127.0.0.1:5000/exportacao/mapa', {
  const response = await fetch('https://agrovis-back-flask.herokuapp.com/exportacao/mapa', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter,
    })
  });
  const mapData = await response.json();
  // console.log('Map Data', mapData);

  /** Número de classes */
  const numClasses = $('#input-classnumber-map').val();

  /** Escalas relacionadas as cores
   * 
   * [0] - escala das cores 
   * 
   * [1] - escala dos indexes das cores
   */
  let colors;
  if (colorFunctions.length == 0) {
    colors = createFrequencyScale(mapData, numClasses, filter.sortValue);
    changeConfigClasses(colors[0], 'mainmap-container');
  }

  else {
    colors = colorFunctions;
  }

  // Atualiza o título do mapa
  if (selected == 0) {
    changeMapTitle('Total de todos os SH4s');
    // Foca no topo do HorizonChart
    $('#horizon-container .horizon-series')[0].scrollIntoView();
  }
  else {
    changeMapTitle(mapData[0]['SH4'] + ' - ' + mapData[0]['NO_SH4_POR']);
    // Foca na serie correspondente do HorizonChart
    $(`#horizon-container .label:contains(" ${mapData[0]['SH4']} - ")`).parent()[0].scrollIntoView();
  }

  // Limpa todas os poligonos de cidade
  $('#map-svg .polygon-active').each(function () {
    cleanPolygon($(this));
  })

  // Preenche cada poligono de cidade com os dados referentes
  mapData.forEach(d => {
    fillPolygon(d, colors[0](d[filter.sortValue]), colors[1](d[filter.sortValue]), '#map-svg', 'CO_MUN', 'NO_MUN_MIN');
  })

  // Legenda nova
  printScaleLegend(colors[0], 'mainmap-container');

  // Atualizar os campos de classes quando mudar o número de classes
  $('#input-classnumber-map').off('change');
  $('#input-classnumber-map').on('change', async () => {
    const numClasses = parseInt($('#input-classnumber-map').val());
    let colorFunctions = createFrequencyScale(mapData, numClasses, filter.sortValue);
    changeConfigClasses(colorFunctions[0], 'mainmap-container');
  });

  // Atualizar o mapa quando clicar em salvar
  $('#config-mainmap').off('click');
  $('#config-mainmap').on('click', async () => {
    const numClasses = parseInt($('#input-classnumber-map').val());
    let colorFunctions = createCustomFrequencyScale('main', numClasses);

    await showBluredLoader('#mainmap-container');
    await updateMapData(selected, colorFunctions);
    await hideBluredLoader('#mainmap-container')
  });
}

/** Atualiza o input de produtos que podem ser exibidos no mapa */
export async function updateMapSh4Input() {
  // Recupera o filtro para realizar a query dos dados do mapa
  const filter = await JSON.parse(localStorage.getItem('filter'));

  // Ordenando os produtos para facilitar a visibilidade
  filter.products.sort((a, b) => a - b);

  // Limpa o input de produtos anterior e constrói um novo
  $('#input-sh4-map-container').html('');
  const input = $('<select type="text" class="form-select" id="input-sh4-map"></select>');
  $('#input-sh4-map-container').append(input);

  // Populando o input de produtos
  input.append(`<option value=0 label='Total' class='option-sh4'>Total</option>`);

  filter.products.forEach(d => {
    const option = $('<option></option>');
    option.attr({ "value": d });
    option.attr({ "label": d });
    option.addClass("option-sh4");
    option.text(d);
    input.append(option);
  });

  input.select2({ sorter: data => data.sort((a, b) => a.value > b.value) });
  input.val(0).trigger('change.select2');

  // Ao trocar a opção selecionada no input ...
  const sh4Change = async () => {
    const newProduct = $('option:selected', '#input-sh4-map').val();
    // console.log('Novo produto selecionado', newProduct);
    // ... o mapa é atualizado
    await updateMap(parseInt(newProduct));
  };

  input.off('change', sh4Change);
  input.on('change', sh4Change);
}

/** Atualiza o título do mapa
 * 
 * @param {string} title novo titulo
 */
export function changeMapTitle(title) {
  const sh4 = title.split(' - ')[0];
  $('#maptitle-container').html(title);
}

/** Cria uma escala de cores com valores customizados, baseada nos inputs do usuário
 * 
 * @param {('main'|'mundi')} parent indica de qual mapa se referem as classes
 * @param {number} numClasses número de classes
 * @returns {[object,object]}
 */
export function createCustomFrequencyScale(parent, numClasses) {
  /** Retirado de: https://colorbrewer2.org/#type=sequential&scheme=YlOrRd */
  const hexColors = [
    [], [],
    ["#ffeda0", "#f03b20"],
    ["#ffeda0", "#feb24c", "#f03b20"],
    ["#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"],
    ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"],
    ["#ffffb2", "#fed976", "#feb24c", "#fd8d3c", "#f03b20", "#bd0026"],
    ["#ffffb2", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026"],
    ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026"],
    ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#bd0026", "#800026"]
  ];

  let values = getClassLimitsFromConfigModal(parent);

  // Cria escala com as cores
  const colors = d3.scaleThreshold()
    .domain(values) // Classes absolutas de mesmo tamanho 10
    .range(hexColors[numClasses]);
  // Cria escala com os indices das cores
  const index = d3.scaleThreshold()
    .domain(values) // Classes absolutas de mesmo tamanho
    .range([...Array(numClasses).keys()]);

  return [colors, index];
}

/** Extrai os dados de um modal de configuração e retorna uma lista com os limites das classes
 * 
 * @param {('main'|'mundi')} whichModal qual modal deseja retirar os dados
 * @returns {number[]} valores dos limites das classes
 */
export function getClassLimitsFromConfigModal(whichModal) {
  let parentElem = whichModal == 'main' ? $('#classlimits-map table') : $('#classlimits-mundi table');
  let values = [];
  parentElem.children().each(function (i, child) {
    values.push(unformatValues($(child).find(`#limit-sup-${i}`).val()) + 1)
  });

  return values;
}

/** Cria uma escala de cores com valores calculados em intervalos iguais
 * 
 * @param {object[]} data lista de elementos com os dados
 * @param {number} numClasses numero de classes que serão criadas
 * @param {('VL_FOB'|'KG_LIQUIDO')} dataType dimensão utilizada para calcular as escalas
 * @returns 
 */
export function createFrequencyScale(data, numClasses, dataType) {
  /** Retirado de: https://colorbrewer2.org/#type=sequential&scheme=YlOrRd */
  const hexColors = [
    [], [],
    ["#ffeda0", "#f03b20"],
    ["#ffeda0", "#feb24c", "#f03b20"],
    ["#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"],
    ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"],
    ["#ffffb2", "#fed976", "#feb24c", "#fd8d3c", "#f03b20", "#bd0026"],
    ["#ffffb2", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026"],
    ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026"],
    ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#bd0026", "#800026"]
  ];

  // Ordena, removendo repetidos
  data = Array.from(new Set(data.map(d => parseInt(d[dataType]))));
  data = data.sort((a, b) => a - b);
  // console.log('Dados ordenados', dataType, data);

  /** Intervalo entre as classes */
  const gap = Math.ceil(data.length / numClasses);
  /** Limites das classes */
  let classes = new Array(numClasses - 1);

  // classes[classes.length - 1] = data.length - 1; // Ultimo indice
  // classes[0] = 0; // Ultimo indice
  // Encontra os limites dos intervalos
  for (let i = 0; i < classes.length; i++) classes[i] = (i + 1) * gap;
  classes.forEach((c, i) => classes[i] = data[c])

  // Cria função para as cores
  // const colors = d3.scaleThreshold()
  const colors = d3.scaleQuantize()
    // const colors = d3.scaleLinear()
    // .domain(classes) // Classes por mediana
    .domain([0, d3.max(data)]) // Classes absolutas de mesmo tamanho
    // .domain([d3.min(data.map(d => d[dataType])), d3.max(data.map(d => d[dataType]))])
    .range(hexColors[numClasses]);

  // Cria função para os index das cores
  // const index = d3.scaleThreshold()
  const index = d3.scaleQuantize()
    // const index = d3.scaleLinear()
    // .domain(classes) // Classes por mediana
    .domain([0, d3.max(data)]) // Classes absolutas de mesmo tamanho
    .range(Array.from(Array(classes.length + 1).keys()))

  return [colors, index];
}

/** Desenha a legenda referente à um mapa
 * @param {object} colors f(x) das cores
 * @param {('mainmap-container'|'mundimap-container')} parent indicador de qual mapa a legenda se refere
 */
export async function printScaleLegend(colors, parent) {
  let colorScheme = colors.range();

  // Esconde as tooltips antes de deletar os elementos
  $('[data-bs-toggle="tooltip"]').tooltip('hide');

  // Remove legenda antiga e adiciona o container da nova
  $(`#${parent}-legend`).remove();
  d3.select(`#${parent}`).append('div').attr('id', `${parent}-legend`).attr('class', 'map-legend');

  // Adiciona a legenda
  colorScheme.forEach((c, i) => addLegendTick(colors, c, i, parent));

  // Hover com os intervalos da legenda em cada `tick`
  let buttons = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  buttons.map(function (e) { let ttp = new bootstrap.Tooltip(e); return ttp; })
}

/** Adiciona uma nova classe em uma legenda
 * 
 * @param {object} fColors escala de cores
 * @param {string} color Identifica a cor da classe
 * @param {number} index Identifica a index da classe/cor
 * @param {('mainmap-container'|'mundimap-container')} parent indicador de qual mapa a legenda se refere
 */
function addLegendTick(fColors, color, index, parent) {
  d3.select(`#${parent}-legend`)
    .append('div')
    .attr('class', () => {
      // O 'tick' só será clicado se houverem polígonos daquela classe
      let count = $(`#${parent} .polygon[color-index='${index}']`).length;
      if (count != 0) return 'legend-tick legend-tick-clicked';
      else return 'legend-tick';
    })
    .style('background-color', color)
    .attr('color-index', index) // Identifica a cor
    .attr('data-bs-toggle', 'tooltip')
    .attr('data-bs-placement', 'bottom')
    .attr('data-trigger', 'hover')
    .attr('title', () => { // Intervalo de valores da classe
      let [v1, v2] = fColors.invertExtent(color)
      v1 = v1 == undefined ? 0 : v1;
      v1 = formatValues(Math.trunc(v1));
      v2 = formatValues(Math.trunc(v2));
      return `${v1} - ${v2}`;
    })
    .on('click', (_, __, elem) => {
      // Primeiro, adiciona ou remove a classe que sinaliza que está selecionado
      $(elem[0]).toggleClass("legend-tick-clicked");

      // Depois verifica se está selecionado
      if ($(elem[0]).hasClass("legend-tick-clicked")) {
        // Deve-se colorir as cidades associadas
        $(`#${parent} .polygon[color-index='${index}']`).each(function (_, e) { $(e).css('fill', color) });
      }
      // Senão, fica branco
      else {
        $(`#${parent} .polygon[color-index='${index}']`).each(function (_, e) { $(e).css('fill', 'white') });
      }
    })
    .on('mouseenter', () => {
      // Se der hover em um tick da legenda, deixa os poligonos desse tick sem cor
      $(`#${parent} .polygon[color-index='${index}']`).each(function (_, e) { $(e).addClass('polygon-legend-active') });
    })
    .on('mouseout', () => {
      // Quando sair do hover, volta as cores originais
      $(`#${parent} .polygon[color-index='${index}']`).each(function (_, e) { $(e).removeClass('polygon-legend-active') });
    })
}

/** Atualiza o modal de configuração de classes
 * 
 * @param {object} colors f(x) das cores
 * @param {('mainmap-container'|'mundimap-container')} parent indicador de qual mapa as classes se referem
 */
export async function changeConfigClasses(colors, parent) {
  // Limpa as classes da seção de configuração
  let colorScheme = colors.range();
  const unit = await getSortValue();
  let p = parent == 'mainmap-container' ? $('#classlimits-map') : $('#classlimits-mundi');
  p.html(`<table id='classlist-table-${parent}'></table>`);
  p = $(`#classlist-table-${parent}`);

  let [_, maxValue] = colors.invertExtent(colorScheme[colorScheme.length - 1]);
  maxValue = Math.trunc(maxValue);

  // Adiciona as classes na configuração
  for (let i = 0; i < colorScheme.length - 1; i++) {
    let c = colorScheme[i];
    let [v1, v2] = colors.invertExtent(c)
    v1 = v1 == undefined || v1 == '0' ? '0' : formatValues(Math.trunc(v1) + 1);
    v2 = formatValues(Math.trunc(v2));
    addClassLimit(p, c, [v1, v2], [false, true], unit, i, maxValue, colorScheme.length - 1);
  }
  // Ultima linha não deve ser editavel
  let c = colorScheme[colorScheme.length - 1];
  let [v1, v2] = colors.invertExtent(c)
  v1 = formatValues(Math.trunc(v1) + 1);
  v2 = formatValues(Math.trunc(v2));
  addClassLimit(p, c, [v1, v2], [false, false], unit, colorScheme.length - 1, maxValue, colorScheme.length - 1);

  // Iterando pelas <tr>
  p.children().each((i, child) => {
    let infLim = $(child).find(`#limit-inf-${i}`); // Limite inferior de uma linha
    let supLim = $(child).find(`#limit-sup-${i}`); // Limite superior de uma linha

    // Quando o usuário alterar um limite superior...
    $(supLim).on('change', () => {
      let curValue = unformatValues(supLim.val());
      let [nextLimit, _, __] = getNextLimit(p, 'sup', i);
      // ... seta o proximo limite inferior
      nextLimit.val(formatValues(curValue + 1));

      // Em seguida, verifica se não há incorência nos intervalos anteriores e posteriores
      updatePrevClassLimit(p, $(supLim), 'sup', i);
      updateNextClassLimit(p, $(supLim), 'sup', i);
    })

    // Previnindo que os valores fiquem menores que seu mínimo ou maiores que seu máximo permitido
    $(supLim).on('change', function () {
      if (unformatValues($(this).val()) < $(this).attr('min') || $(this).val() == '') $(this).val(formatValues($(this).attr('min')));
      if (unformatValues($(this).val()) > $(this).attr('max') || $(this).val() == '') $(this).val(formatValues($(this).attr('max')));
    });
    $(infLim).on('change', function () {
      if (unformatValues($(this).val()) < $(this).attr('min') || $(this).val() == '') $(this).val(formatValues($(this).attr('min')));
      if (unformatValues($(this).val()) > $(this).attr('max') || $(this).val() == '') $(this).val(formatValues($(this).attr('max')));
    });
  })
}

/** Atualiza o limite anterior de um determinado limite atual
 * 
 * @param {object} parent elemento jquery com a tabela pai dos limites
 * @param {object} current elemento jquery do limite atual
 * @param {('sup'|'inf')} sup_inf indica se o elemento atual é limite superior ou inferior
 * @param {number} index linha do elemento atual
 */
function updatePrevClassLimit(parent, current, sup_inf, index) {
  let [prevLimit, prevLimitS_P, prevLimitIndex] = getPrevLimit(parent, sup_inf, index);
  if (!$(prevLimit)[0]) return;
  let value = unformatValues(current.val());

  // console.log('estou no ', sup_inf, index)
  // console.log('antes é o ', prevLimitS_P, prevLimitIndex)

  try {
    let prevLimitValue = unformatValues(prevLimit.val());

    let newValue = value - 1;
    if (newValue < prevLimit.attr('min')) newValue = prevLimit.attr('min');
    else if (newValue > prevLimit.attr('max')) newValue = prevLimit.attr('max');

    if (value <= prevLimitValue || isNaN(prevLimitValue)) {
      prevLimit.val(formatValues(newValue)).trigger('change');
      updatePrevClassLimit(parent, prevLimit, prevLimitS_P, prevLimitIndex);
    }
  }
  catch (e) { return; }
}

/** Atualiza o limite posterior à um determinado limite atual
 * 
 * @param {object} parent elemento jquery com a tabela pai dos limites
 * @param {object} current elemento jquery do limite atual
 * @param {('sup'|'inf')} sup_inf indica se o elemento atual é limite superior ou inferior
 * @param {number} index linha do elemento atual
 */
function updateNextClassLimit(parent, current, sup_inf, index) {
  let [nextLimit, nextLimitS_P, nextLimitIndex] = getNextLimit(parent, sup_inf, index);
  if (!$(nextLimit)[0]) return;
  let value = unformatValues(current.val());

  // console.log('estou no ', sup_inf, index)
  // console.log('depois é o ', nextLimitS_P, nextLimitIndex)

  try {
    let nextLimitValue = unformatValues(nextLimit.val());

    let newValue = value + 1;
    if (newValue < nextLimit.attr('min')) newValue = nextLimit.attr('min');
    else if (newValue > nextLimit.attr('max')) newValue = nextLimit.attr('max');

    if (value >= nextLimitValue || isNaN(nextLimitValue) || nextLimitValue == value + 1) {
      nextLimit.val(formatValues(newValue)).trigger('change');
      updateNextClassLimit(parent, nextLimit, nextLimitS_P, nextLimitIndex);
    }
  }
  catch (e) { return; }
}

/** Encontra o limite anterior à um determinado elemento inicial
 * 
 * @param {object} parent elemento jquery com a tabela pai dos limites
 * @param {('sup'|'inf')} sup_inf indica se o elemento atual é limite superior ou inferior
 * @param {number} index linha do elemento atual
 * @returns {[object, ('sup'|'inf'), number]} elemento jquery, sup_or_inf, index do elemento encontrado
 */
function getPrevLimit(parent, sup_inf, index) {
  let supOrInf = sup_inf == 'sup' ? 'inf' : 'sup'; // Se é superior, o anterior é o inferior e viceversa
  let i = sup_inf == 'sup' ? index : index - 1; // Se é superior, o index do anterior é index, senão é index-1

  let elem = parent.find(`#limit-${supOrInf}-${i}`); // Encontra o elemento anterior
  return [elem, supOrInf, i];
}

/** Encontra o limite posterior à um determinado elemento inicial
 * 
 * @param {object} parent elemento jquery com a tabela pai dos limites
 * @param {('sup'|'inf')} sup_inf indica se o elemento atual é limite superior ou inferior
 * @param {number} index linha do elemento atual
 * @returns {[object, ('sup'|'inf'), number]} elemento jquery, sup_or_inf, index do elemento encontrado
 */
function getNextLimit(parent, sup_inf, index) {
  let supOrInf = sup_inf == 'sup' ? 'inf' : 'sup'; // Se é superior, o proximo é o inferior e viceversa
  let i = sup_inf == 'sup' ? index + 1 : index; // Se é superior, o index do proximo é index+1, senão é index

  let elem = parent.find(`#limit-${supOrInf}-${i}`); // Encontro o proximo elemento
  return [elem, supOrInf, i];
}

/** Adiciona uma classe/linha na tela de configurações de classes
 * 
 * @param {('classlimits-map'|'classlimits-mundi')} parent elemento pai da lista de classes
 * @param {string} color cor referente a classe em HEX
 * @param {[number,number]} values lista com os dois valores referentes aos limites da classe
 * @param {[boolean, boolean]} actives lista com flags referentes a se os valores dos limites da linha são editaveis ou não
 * @param {('fob'|'peso')} unit unidade de medida dos limites
 * @param {number} index index de qual linha os inputs pertencem
 * @param {number} maxValue maximo valor daquela escala
 * @param {number} maxIndex index maximo de cada campo, para calcular os index reversos
 */
export function addClassLimit(parent, color, values, actives, unit, index, maxValue, maxIndex) {
  let input1, input2;
  let min = 2 * index;
  let inverseIndex = (2 * maxIndex) - min;
  let max = maxValue - inverseIndex;
  // console.log('linha ', min, ' - max ', maxIndex, ' deveria ser ', (2 * maxIndex) - min, (2 * maxIndex) - min - 1)

  let min1, min2, max1, max2;
  if (index == 0) {
    min1 = 0; max1 = 0;
    min2 = min + 1; max2 = max; // Default
  }
  else if (index == maxIndex) {
    min1 = min; max1 = max - 1; // Default
    min2 = maxValue; max2 = maxValue;
  }
  else {
    min1 = min; max1 = max - 1; min2 = min + 1; max2 = max; // Default
  }

  input1 = actives[0] == true ?
    $(`<input value="${values[0]}" id="limit-inf-${index}" min="${min1}" max="${max1}" type="tel"/>`) :
    $(`<input disabled value="${values[0]}" id="limit-inf-${index}" min="${min1}" max="${max1}" type="tel"/>`);

  input2 = actives[1] == true ?
    $(`<input value="${values[1]}" id="limit-sup-${index}" min="${min2}" max="${max2}" type="tel"/>`) :
    $(`<input disabled value="${values[1]}" id="limit-sup-${index}" min="${min2}" max="${max2}" type="tel"/>`);

  input1.on('input', function () { this.value = formatValues(this.value) })
  input2.on('input', function () { this.value = formatValues(this.value) })

  let row1 = $(`<td></td>`);
  let row2 = $(`<td></td>`);

  let elem = $(`
  <tr class='classlimits-row'>
    <td class='legend-tick' style='background-color: ${color};'></td>
  </tr>`)

  if (unit == 'VL_FOB') {
    row1.append(`U$ `);
    row1.append(input1);
    // row2.append(`U$ `);
    row2.append(input2);

  } else {
    row1.append(input1);
    // row1.append(` kg`);
    row2.append(input2);
    row2.append(` kg`);
  }

  elem.append(row1)
  elem.append('<span> ~ </span>')
  elem.append(row2)

  parent.append(elem);
}

/** Recebe um elemento jquery de um poligono, e limpa seus dados
 * 
 * @param {object} element $('poligono')
 */
export function cleanPolygon(element) {
  // Deseleciona a cidade
  element.removeClass('polygon-active');
  // Limpa o texto dela, deixando somente o nome da cidade
  element.text(element.text().split(' <br>')[0]);
  // Limpa a cor 
  element.css('fill', '');
  // Limpa o index de cor
  element.attr('color-index', '-1');
}

/** Adiciona dados à um determinado polígono de um determinado mapa
 * 
 * @param {object} data dados a serem preenchidos no poligono
 * @param {string} color cor em HEX do poligono
 * @param {number} index index da cor
 * @param {('#map-svg'|'#mundi-svg')} parent identificador de qual svg o poligono pertence
 * @param {string} id atributo do dataframe referente ao código do poligono
 * @param {string} text atributo do dataframe referente ao 'nome' do poligono
 */
export function fillPolygon(data, color, index, parent, id, text) {
  // Seletor do poligono -  - id do poligono
  let cod = parent + ' #' + data[id].toString();

  $(cod).text(`
  ${data[text]} <br>
  Valor FOB: U$ ${formatValues(data['VL_FOB'])} <br>
  Peso Líquido: ${formatValues(data['KG_LIQUIDO'])} kg`);

  // Poligono possui dados
  $(cod).addClass('polygon-active');
  // Colore o poligono
  $(cod).css('fill', color);
  // Index da cor para seletores futuros
  $(cod).attr('color-index', index);
}