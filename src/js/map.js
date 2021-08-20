import { finishLoading, formatValues, changeLoadingMessage, getSortValue, cleanDashboard } from "./extra";

// Desenha o mapa
export async function drawMainMap() {
  // const height = window.innerHeight * 0.5 * 0.9 - 30;
  // const width = window.innerWidth * 0.6 * 0.5 - 10;
  // const width = window.innerWidth * 0.6 * 0.6;

  // Container do mapa
  let svg = d3.select('#mainmap-container')
    .append('svg') // insere um SVG para o mapa
    .attr('id', 'map-svg')
    .attr('height', '90%')
    .attr('width', '100%');

  const { height, width } = svg.node().getBoundingClientRect();
  console.log(height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#mainmap-container')
    .append('div')
    .attr('class', 'hidden tooltip');

  // Requisita o geoJSON da API do IBGE
  const mapData = await d3.json('http://servicodados.ibge.gov.br/api/v2/malhas/35?resolucao=5&qualidade=4&formato=application/vnd.geo+json');
  console.log('Mapa', mapData, width, height)

  // Projecao
  const projection = d3.geoMercator()
    // .fitSize([width, height], mapData);
    .fitExtent([[5, 25], [width, height - 5]], mapData);

  // Path
  const path = d3.geoPath()
    .projection(projection);

  // Aplica os shapes no SVG
  svg.selectAll('.city')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('class', 'city')
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
  await fetch('http://localhost:3333/municipios', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json()
      .then(response => {
        console.log('Cidades', response)

        // Aproveita para construir o input de cidades (opção padrão com todas as cidades)
        // $('#input-city').append($('<option value=0>Todas as cidades</option>'));
        $('#input-city').append($('<option value=0>Todas as cidades</option>'));

        response.forEach((city) => {
          // Para cada cidade, busca o shape equivalente pela classe, e atualiza o HTML interno com seu nome
          $('#' + city.CO_MUN_GEO.toString()).text(city.NO_MUN_MIN);

          // Adiciona a cidade no input de cidades
          let option = $('<option></option>').attr({ "value": city.CO_MUN_GEO });
          option.text(city.NO_MUN_MIN);
          $('#input-city').append(option);
        });
        // Seleciona a opção default com todas as cidades
        $('#input-city').val('0');
        $('#input-city').trigger('change');
        // Remove o aviso que foi exibido com o trigger de change
        $('#filter-button span').addClass('hidden');
      }));
}

// Atualiza os dados do mapa com base em um filtro presente no 'localStorage', e
//  em um produto recebido por parametro 'selected'
export async function updateMap(selected) {
  /*
    Recupera o filtro de dados do mapa
 
    filterAux =
        cities - lista de cidades, [] = todas 
        products - lista de produtos que possuem dados
        beginPeriod - data inicial
        endPeriod - data final
        sortValue - dado utilizado como padrão (peso ou valor fob)
 
    OBS: produtos sem nenhum dado não podem ser selecionados para exibição no mapa
  */
  const filterAux = await JSON.parse(localStorage.getItem('filter'));

  /*
    Recupera o filtro de dados do mapa
 
    filter =
      cities - lista de cidades, [] = todas 
      products - produto a ser exibido, UNITARIO (recebido por parametro)
      beginPeriod - data inicial
      endPeriod - data final
      sortValue - dado utilizado como padrão (peso ou valor fob)
  */
  const filter = {
    cities: filterAux.cities,
    products: [selected],
    beginPeriod: filterAux.beginPeriod,
    endPeriod: filterAux.endPeriod,
    sortValue: filterAux.sortValue == 'fob' ? 'VL_FOB' : 'KG_LIQUIDO'
  }

  changeLoadingMessage('Atualizando o mapa...');

  // Atualizando o input de alternância de produtos, recebe o produto que está selecionado no momento
  updateMapSh4Input(selected);

  // Realiza a query do filtro inserido
  const response = await fetch('http://localhost:3333/mapdata', {
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
  console.log('Map Data', mapData);

  // Função de calculo de cores
  const colors = createFrequencyScale(mapData, filter.sortValue);

  // Preenche o mapa com os dados recebidos
  updateMapData(mapData, colors, filter.sortValue);


  $('#input-classnumber').on('change', function () {
    // Função de calculo de cores
    const colors = createFrequencyScale(mapData, filter.sortValue);

    // Preenche o mapa com os dados recebidos
    updateMapData(mapData, colors, filter.sortValue);
  });
}

// Atualiza o input de produtos que podem ser exibidos no mapa
async function updateMapSh4Input(selectedSh4) {
  // Recupera o filtro para realizar a query dos dados do mapa
  const filter = await JSON.parse(localStorage.getItem('filter'));

  // Ordenando os produtos para facilitar a visibilidade
  filter.products.sort((a, b) => a - b);

  // Limpa o input de produtos anterior e constrói um novo
  $('#input-sh4-map-container').html('');
  const input = $('<select type="text" class="form-select" id="input-sh4-map" style="width: 100%; height: 100%;"></select>');
  $('#input-sh4-map-container').append(input);

  // Populando o input de produtos
  filter.products.forEach(d => {
    const option = $('<option></option>');
    option.attr({ "value": d });
    option.attr({ "label": d });
    option.addClass("option-sh4");
    option.text(d);
    $('#input-sh4-map').append(option);
  });
  // Selecionando o primeiro produto escolhido
  $(`#mainmap-container option[label='${selectedSh4}']`).attr('selected', 'selected');
  input.select2();

  // Ao trocar a opção selecionada no input ...
  input.on('change', () => {
    const newProduct = $('option:selected', '#input-sh4-map ').val();
    console.log('Novo produto selecionado', newProduct);
    // ... o mapa é atualizado
    updateMap(parseInt(newProduct));
  })
}

// Atualiza os dados do mapa
export async function updateMapData(mapData, colors, sortValue) {
  try {
    // Atualiza o título do mapa
    changeMapTitle(mapData[0]['SH4'] + ' - ' + mapData[0]['NO_SH4_POR']);

    // Limpa todas as cidades
    $('.city-active').each(function () {
      cleanCity($(this));
    })

    // Preenche cada shape de cidade com os dados referentes
    mapData.forEach(d => {
      fillCity(d, colors[0](d[sortValue]), colors[1](d[sortValue]));
    })
  }

  catch (err) {
    // Nenhum dado foi encontrado para os filtros
    const modal = new bootstrap.Modal(document.getElementById('modal-nodata-found'));
    modal.toggle();

    cleanDashboard();

    finishLoading();
  }
}

// Atualiza o título do mapa
export function changeMapTitle(title) {
  const sh4 = title.split(' - ')[0];
  $('#maptitle-container').html(title);
  // console.log($(`.label:contains(${sh4})`)[0]);
  // $(`.label:contains(${sh4})`)[0].parentElement.focus();
}

// Cria uma função para calcular a cor do mapa de uma cidade
function createFrequencyScale(data, dataType) {
  const numClasses = $('#input-classnumber').val();
  console.log(numClasses);

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
  data = Array.from(new Set(data.map(d => d[dataType])));
  data = data.sort(function (a, b) {
    return a - b;
  });

  console.log('Dados ordenados', dataType, data);


  // Intervalo entre as classes
  const gap = Math.ceil(data.length / numClasses);
  console.log('gap', gap)

  let classes = new Array(numClasses - 1);

  // classes[classes.length - 1] = data.length - 1; // Ultimo indice
  // classes[0] = 0; // Ultimo indice
  // Encontra os limites dos intervalos
  for (let i = 0; i < classes.length; i++) {
    classes[i] = (i + 1) * gap;
    console.log(classes[i]);
  }


  console.log('classes index', classes)
  classes.forEach((c, i) => {
    classes[i] = data[c];
  })
  console.log('classes valor', classes)
  console.log('cores valor', hexColors[numClasses])

  // Cria função para as cores
  const colors = d3.scaleThreshold()
    // const colors = d3.scaleLinear()
    .domain(classes) // Classes por mediana
    // .domain([0, d3.max(data.map(d => d[dataType]))]) // Classes absolutas de mesmo tamanho
    // .domain([d3.min(data.map(d => d[dataType])), d3.max(data.map(d => d[dataType]))])
    .range(hexColors[numClasses]);

  const index = d3.scaleThreshold()
    // const index = d3.scaleLinear()
    .domain(classes) // Classes por mediana
    // .domain([0, d3.max(data.map(d => d[dataType]))]) // Classes absolutas de mesmo tamanho
    .range(Array.from(Array(classes.length + 1).keys()))

  // Legenda antiga
  // printScaleLegendSVG(0, d3.max(data.map(d => d[dataType])), hexColors[numClasses]);

  // Legenda nova
  printScaleLegend(hexColors[numClasses]);

  return [colors, index];
}

// Desenha a legenda do mapa
function printScaleLegend(colorScheme) {
  // Remove legenda antiga e adiciona o container da nova
  $('#map-legend').remove();
  d3.select('#mainmap-container').append('div').attr('id', 'map-legend');

  colorScheme.forEach((c, i) => {
    addLegendTick(c, i);
  })
}

// Adiciona uma nova classe para a legenda
function addLegendTick(color, index) {
  d3.select('#map-legend')
    .append('div')
    .attr('class', 'legend-tick legend-tick-clicked')
    .style('background-color', color)
    .attr('color-index', index) // Identifica a cor
    .on('click', (a, b, elem) => {
      // const colorIndex = elem[0].getAttribute('color-index');
      // Primeiro, adiciona ou remove a classe que sinaliza que está selecionado
      $(elem[0]).toggleClass("legend-tick-clicked");

      // Depois verifica se está selecionado
      if ($(elem[0]).hasClass("legend-tick-clicked")) {
        // Deve-se colorir as cidades associadas
        console.log('ta clicado, mostra')
        $(`.city[color-index='${index}']`).each(function (x, e) { $(e).css('fill', color) });
      }
      // Senão, fica branco
      else {
        console.log('nao ta clicado, branco')
        $(`.city[color-index='${index}']`).each(function (x, e) { $(e).css('fill', 'white') });
      }
    })
}

// Recebe um elemento jquery referente ao desenho de uma cidade, e limpa seus dados
export function cleanCity(element) {
  // Deseleciona a cidade
  element.removeClass('city-active');
  // Limpa o texto dela, deixando somente o nome da cidade
  element.text(element.text().split(' <br>')[0]);
  // Limpa a cor 
  element.css('fill', '');
  element.attr('color-index', '-1');
}

// Recebe um dataframe referente aos dados de uma cidade, e atualiza suas propriedades no mapa
function fillCity(data, color, index) {
  let cod = '#' + data['CO_MUN'].toString();

  $(cod).text(`${data['NO_MUN_MIN']} 
  <br>
  Valor FOB: U$ ${formatValues(data['VL_FOB'])}
  <br>
  Peso Líquido: ${formatValues(data['KG_LIQUIDO'])} kg`);

  $(cod).addClass('city-active');

  $(cod).css('fill', color);

  $(cod).attr('color-index', index);
}
































function printScaleLegendSVG(min, max, colorScheme) {
  const colors = d3.scaleQuantize()
    .domain([0, colorScheme.length])
    .range(colorScheme)

  $('#map-legend').remove();
  const svg = d3.select('#map-svg').append('g').attr('id', 'map-legend');

  console.log(colors.range())
  const bars = svg.selectAll("tick")
    .data(colors.range())
    .enter().append("rect")
    .attr("class", "legend-tick")
    .attr("x", (d, i) => { console.log("x", d, i); return i * 25 })
    .attr("y", 0)
    .attr("height", 20)
    .attr("width", 25)
    .style("fill", (d, i) => colors(i))
    .on("mousemove", function (d, i) {
      $('.city').each(function (x, elem) { $(elem).css('fill', colorScheme[$(elem).attr('color-index')]) })
      $(`.city[color-index='${i}']`).each(function (x, elem) { $(elem).css('fill', 'lightgreen') })
    })
    .on("mouseout", (d, i) => $('.city').each(function (x, elem) { $(elem).css('fill', colorScheme[$(elem).attr('color-index')]) }))

  // svg.select('#map-legend').attr("transform", "translate([10, 50])")
}