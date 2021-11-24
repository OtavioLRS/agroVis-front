import { finishLoading, formatValues, changeLoadingMessage, getSortValue, cleanDashboard, showBluredLoader, hideBluredLoader } from "./extra";
import { updateMundiData } from "./mundi";

// Desenha o mapa
export async function drawMainMap() {
  // Container do mapa
  let svg = d3.select('#map-container #mainmap-container')
    .append('svg') // insere um SVG para o mapa
    .attr('id', 'map-svg')
    .attr('height', '100%')
    .attr('width', '100%')
    .lower();

  const { height, width } = svg.node().getBoundingClientRect();
  // console.log(height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#map-container #mainmap-container')
    .append('div')
    .attr('class', 'hidden tooltip-custom');

  // Requisita o geoJSON da API do IBGE
  const mapData = await d3.json('https://servicodados.ibge.gov.br/api/v2/malhas/35?resolucao=5&qualidade=4&formato=application/vnd.geo+json');
  // console.log('Mapa', mapData, width, height)

  // Projecao
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
    .attr('id', (shape) => {
      // Define o id do shape como o código de sua cidade
      return shape.properties.codarea;
    })
    .attr('d', path)
    // Mostra cidade no hover
    .on('mousemove', function (d) {
      // Mostra o nome da cidade
      tooltip.classed('hidden', false)
        .style("left", (d3.event.pageX + 30).toString() + "px")
        .style("top", (d3.event.pageY - 50).toString() + "px")
        .html(() => {
          // Exibe o nome do municipio selecionado
          return $('#' + d.properties.codarea).text();
        })
    })

    // Esconde titulo
    .on('mouseout', () => {
      tooltip.classed('hidden', true);
    })

    // Trata o clique na cidade
    .on('click', (clickedShape) => {
      // Adiciona a cidade clicada ao filtro
      // $('#city-filter').val(clickedShape.properties.codarea);
      // $('#city-filter').select2().trigger('change');

      //   // Trata o filtro
      //   handleFilter();
    })

  // Cor de fundo
  // .style('fill', 'green')

  //Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.8, 10])
    .on('zoom', () => {
      svg.selectAll('path').attr('transform', d3.event.transform)
    });

  svg.call(zoom)

  // $('#centralize-map-icon').on('click', function () {
  //   console.log('cliquei')
  //   svg.selectAll('path').fitExtent([[10, 10], [width, height]], mapData)
  // })

  $('#centralize-map-icon').on('click', function () {
    resetMap(svg, zoom);
  });
  return fetch('');
}

// Retorna o mapa para as dimensões originais
export function resetMap(svg, zoom) {
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);
}

// Recupera os nomes das cidades do banco e constrói o input de cidades do filtro
export async function getCitiesNames() {

  // Requisição para recuperar os dados dos municípios
  // await fetch('https://mighty-taiga-07455.herokuapp.com/municipios', {
  // await fetch('https://agrovis-back-flask.herokuapp.com/cidades', {
  await fetch('http://127.0.0.1:5000/cidades', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json()
      .then(response => {
        // console.log('Cidades', response)

        // Aproveita para construir o input de cidades (opção padrão com todas as cidades)
        // $('#input-city').append($('<option value=0>Todas as cidades</option>'));
        $('#input-city').append($('<option value=0 title="1">Todas as cidades</option>'));

        response.forEach((city) => {
          // Para cada cidade, busca o shape equivalente pela classe, e atualiza o HTML interno com seu nome
          $('#' + city.CO_MUN_GEO.toString()).text(city.NO_MUN_MIN);

          // Adiciona a cidade no input de cidades
          let option = $('<option></option>');
          option.attr({ "value": city.CO_MUN_GEO });
          option.text(city.NO_MUN_MIN);
          option.attr({ "title": city.NO_MUN_MIN })
          $('#input-city').append(option);
        });
        // Seleciona a opção default com todas as cidades
        $('#input-city').val('0');
        $('#input-city').trigger('change');
        // Remove o aviso que foi exibido com o trigger de change
        $('#filter-button span').addClass('hidden');
      }));
}

// Atualiza os dados do mapa com base em um filtro presente no 'localStorage'
// Se tiver um SH4 selecionado, busca só esse SH4, senão, busca todos os SH4s com dados (total)
export async function updateMap(selected) {
  // await showBluredLoader('#map-svg');
  await showBluredLoader('#mainmap-container');
  // await showBluredLoader('#mundi-svg');
  await showBluredLoader('#mundimap-container');

  // Preenche o mapa
  await updateMapData(selected);
  // await hideBluredLoader('#map-svg')
  await hideBluredLoader('#mainmap-container')

  // Preenche o mapa mundi
  await updateMundiData(selected);
  // await hideBluredLoader('#mundi-svg');
  await hideBluredLoader('#mundimap-container');

  // Quando mudar o numero de classes, atualiza
  $('#input-classnumber-map').off('change');
  $('#input-classnumber-map').on('change', async function () {
    await showBluredLoader('#mainmap-container');
    await updateMapData(selected);
    await hideBluredLoader('#mainmap-container')
  });

  $('#input-classnumber-mundi').off('change');
  $('#input-classnumber-mundi').on('change', async function () {
    await showBluredLoader('#mundimap-container');
    await updateMundiData(selected);
    await hideBluredLoader('#mundimap-container');
  });
}

// Atualiza os dados do mapa
export async function updateMapData(selected) {
  changeLoadingMessage('Atualizando o mapa...');

  // Recupera o filtro para realizar a query dos dados do mapa
  const filter = await JSON.parse(localStorage.getItem('filter'));
  filter.products = selected == 0 ? filter.products : [selected];

  // Realiza a query do filtro inserido
  const response = await fetch('http://127.0.0.1:5000/exportacao/mapa', {
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

  // Número de classes
  const numClasses = $('#input-classnumber-map').val();

  // Função de calculo de cores
  const colors = createFrequencyScale(mapData, numClasses, filter.sortValue, 'mainmap-container');

  // Atualiza o título do mapa
  if (selected == 0) changeMapTitle('Total de todos os SH4s');
  else changeMapTitle(mapData[0]['SH4'] + ' - ' + mapData[0]['NO_SH4_POR']);

  // Limpa todas os poligonos de cidade
  $('#map-svg .polygon-active').each(function () {
    cleanPolygon($(this));
  })

  // Preenche cada poligono de cidade com os dados referentes
  mapData.forEach(d => {
    fillPolygon(d, colors[0](d[filter.sortValue]), colors[1](d[filter.sortValue]), '#map-svg', 'CO_MUN', 'NO_MUN_MIN');
  })
}

// Atualiza o input de produtos que podem ser exibidos no mapa
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

// Atualiza o título do mapa
export function changeMapTitle(title) {
  const sh4 = title.split(' - ')[0];
  $('#maptitle-container').html(title);
  // console.log($(`.label:contains(${sh4})`)[0]);
  // $(`.label:contains(${sh4})`)[0].parentElement.focus();
}

// Cria uma função para calcular a cor do mapa de uma cidade
/*
  'mainmap-container' ou 'mundimap-container'
*/
export function createFrequencyScale(data, numClasses, dataType, parent) {
  /* Retirado de: https://colorbrewer2.org/#type=sequential&scheme=YlOrRd */
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
  data = data.sort(function (a, b) {
    return a - b;
  });

  // console.log('Dados ordenados', dataType, data);


  // Intervalo entre as classes
  const gap = Math.ceil(data.length / numClasses);

  let classes = new Array(numClasses - 1);

  // classes[classes.length - 1] = data.length - 1; // Ultimo indice
  // classes[0] = 0; // Ultimo indice
  // Encontra os limites dos intervalos
  for (let i = 0; i < classes.length; i++) {
    classes[i] = (i + 1) * gap;
  }

  classes.forEach((c, i) => {
    classes[i] = data[c];
  })

  // Cria função para as cores
  // const colors = d3.scaleThreshold()
  const colors = d3.scaleQuantize()
    // const colors = d3.scaleLinear()
    // .domain(classes) // Classes por mediana
    .domain([0, d3.max(data)]) // Classes absolutas de mesmo tamanho
    // .domain([d3.min(data.map(d => d[dataType])), d3.max(data.map(d => d[dataType]))])
    .range(hexColors[numClasses]);

  // const index = d3.scaleThreshold()
  const index = d3.scaleQuantize()
    // const index = d3.scaleLinear()
    // .domain(classes) // Classes por mediana
    .domain([0, d3.max(data)]) // Classes absolutas de mesmo tamanho
    .range(Array.from(Array(classes.length + 1).keys()))

  // Legenda nova
  printScaleLegend(hexColors[numClasses], colors, parent);

  let buttons = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  let sim = buttons.map(function (e) {
    let ttp = new bootstrap.Tooltip(e);
    // ttp.on('focus', null);
    return ttp;
  })

  return [colors, index];
}

// Desenha a legenda do mapa
async function printScaleLegend(colorScheme, colors, parent) {
  // Esconde as tooltips antes de deletar os elementos
  $('[data-bs-toggle="tooltip"]').tooltip('hide');

  // Remove legenda antiga e adiciona o container da nova
  $(`#${parent}-legend`).remove();
  d3.select(`#${parent}`).append('div').attr('id', `${parent}-legend`).attr('class', 'map-legend');

  // Limpa as classes da seção de configuração
  const unit = await getSortValue();
  let p = parent == 'mainmap-container' ? $('#classlimits-map') : $('#classlimits-mundi')
  p.html(`<table id='classlist-table-${parent}'></table>`);
  p = $(`#classlist-table-${parent}`);

  colorScheme.forEach((c, i) => {
    let [v1, v2] = colors.invertExtent(c)
    v1 = Math.trunc(v1)
    v2 = Math.trunc(v2)

    // Adiciona uma classe no botão de configurações
    addClassLimit(p, c, [v1, v2], [true, true], unit);

    // Adiciona a legenda
    addLegendTick(colors, c, i, parent);
  })
}

// Adiciona uma nova classe para a legenda
function addLegendTick(fColors, color, index, parent) {
  d3.select(`#${parent}-legend`)
    .append('div')
    .attr('class', 'legend-tick legend-tick-clicked')
    .style('background-color', color)
    .attr('color-index', index) // Identifica a cor
    .attr('data-bs-toggle', 'tooltip')
    .attr('data-bs-placement', 'bottom')
    .attr('data-trigger', 'hover')
    .attr('title', () => { // Intervalo de valores da classe
      let [v1, v2] = fColors.invertExtent(color)
      v1 = formatValues(Math.trunc(v1));
      v2 = formatValues(Math.trunc(v2));
      return `${v1} - ${v2}`;
    })
    .on('click', (a, b, elem) => {
      // Primeiro, adiciona ou remove a classe que sinaliza que está selecionado
      $(elem[0]).toggleClass("legend-tick-clicked");

      // Depois verifica se está selecionado
      if ($(elem[0]).hasClass("legend-tick-clicked")) {
        // Deve-se colorir as cidades associadas
        $(`#${parent} .polygon[color-index='${index}']`).each(function (x, e) { $(e).css('fill', color) });
      }
      // Senão, fica branco
      else {
        $(`#${parent} .polygon[color-index='${index}']`).each(function (x, e) { $(e).css('fill', 'white') });
      }
    })
    .on('mouseenter', () => {
      // Se der hover em um tick da legenda, deixa os poligonos desse tick sem cor
      $(`#${parent} .polygon[color-index='${index}']`).each(function (x, e) { $(e).addClass('polygon-legend-active') });
    })
    .on('mouseout', () => {
      // Quando sair do hover, volta as cores originais
      $(`#${parent} .polygon[color-index='${index}']`).each(function (x, e) { $(e).removeClass('polygon-legend-active') });
    })
}

// Recebe um elemento jquery referente ao desenho de um poligono, e limpa seus dados
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

// Recebe um dataframe referente aos dados de um poligono, e atualiza suas propriedades no mapa
// parent - '#mainmap-container ou #mundimap-container'
// id - atributo do dataframe referente ao código do poligono
// text - atributo do dataframe referente ao 'nome' do poligono
export function fillPolygon(data, color, index, parent, id, text) {
  // Seletor do poligono -  - id do poligono
  let cod = parent + ' #' + data[id].toString();

  $(cod).text(`${data[text]}
  <br>
  Valor FOB: U$ ${formatValues(data['VL_FOB'])}
  <br>
  Peso Líquido: ${formatValues(data['KG_LIQUIDO'])} kg`);

  // Poligono possui dados
  $(cod).addClass('polygon-active');
  // Colore o poligono
  $(cod).css('fill', color);
  // Index da cor para seletores futuros
  $(cod).attr('color-index', index);
}

// Adiciona uma classe a tela de configurações de classes
/*
  parent - elemento pai da lista de classes -> 'classlimits-map' ou 'classlimits-mundi'
  color - cor referente a classe em HEX
  values - lista com os dois valores referentes aos limites da classe
  actives - lista com flags referentes a se os valores dos limites são editaveis ou não
  unit - unidade de medida dos limites -> 'fob' ou 'peso'
*/
export function addClassLimit(parent, color, values, actives, unit) {
  console.log(parent, parent.attr('id'), color, values, actives, unit);

  let value1 = unit == 'VL_FOB' ? `U$ <span>${formatValues(values[0])}</span>` : `<span>${formatValues(values[1])}</span> Kg`;
  let value2 = unit == 'VL_FOB' ? `U$ <span>${formatValues(values[1])}</span>` : `<span>${formatValues(values[1])}</span> Kg`;

  let elem = `
  <tr class='classlimits-row'>
    <td class='legend-tick' style='background-color: ${color};'></td>
    <td>${value1}</td>
    <td>${value2}</td>
  </tr>
  `

  // console.log(elem)
  parent.append(elem);

}




























