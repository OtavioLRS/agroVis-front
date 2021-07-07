import { finishLoading, formatValues, changeLoadingMessage, getSortValue, cleanDashboard } from "./extra";

// Desenha o mapa
export async function drawMainMap() {
  const height = window.innerHeight * 0.5 * 0.9 - 30;
  const width = window.innerWidth * 0.6 - 10;
  // const width = window.innerWidth * 0.6 * 0.6;

  // Container do mapa
  let svg = d3.select('#mainmap-container')
    .append('svg') // insere um SVG para o mapa
    .attr('height', '100%')
    .attr('width', '100%');

  // Div para os hovers com os titulos
  let tooltip = d3.select('#mainmap-container')
    .append('div')
    .attr('class', 'hidden tooltip');

  // Requisita o geoJSON da API do IBGE
  const mapData = await d3.json('http://servicodados.ibge.gov.br/api/v2/malhas/35?resolucao=5&qualidade=4&formato=application/vnd.geo+json');
  console.log('Mapa', mapData, width, height)

  // Projecao
  const projection = d3.geoMercator()
    .fitSize([width, height], mapData);
  // .fitExtent([[10, 10], [width, height]], mapData);

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
    .on('mouseover', function (d) {
      // Posição do mouse
      let mouseCoords = d3.mouse(svg.node()).map((coord) => {
        return parseInt(coord);
      });
      // Mostra o nome da cidade
      tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouseCoords[0] + 15) +
          'px; top:' + (mouseCoords[1] - 35) + 'px')
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
    .scaleExtent([1, 10])
    .on('zoom', () => {
      svg.selectAll('path').attr('transform', d3.event.transform)
    });

  svg.call(zoom)

  // $('#centralize-map-icon').on('click', function () {
  //   console.log('cliquei')
  //   svg.selectAll('path').fitExtent([[10, 10], [width, height]], mapData)
  // })

  return fetch('');
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
        $('#input-city').append($('<option value=0 selected>Todas as cidades</option>'));

        response.forEach((city) => {
          // Para cada cidade, busca o shape equivalente pela classe, e atualiza o HTML interno com seu nome
          $('#' + city.CO_MUN_GEO.toString()).text(city.NO_MUN_MIN);

          // Adiciona a cidade no input de cidades
          let option = $('<option></option>').attr({ "value": city.CO_MUN_GEO });
          option.text(city.NO_MUN_MIN);
          $('#input-city').append(option);
        });
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
  */
  const filter = {
    cities: filterAux.cities,
    products: [selected],
    beginPeriod: filterAux.beginPeriod,
    endPeriod: filterAux.endPeriod
  }

  changeLoadingMessage('Atualizando o mapa...');

  // Atualizando o input de alternância de produtos, recebe o produto que está selecionado no momento
  updateMapSh4Input(selected);

  // Realiza a query do filtro inserido
  const response = await fetch('http://localhost:3333/map_query', {
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

  // Preenche o mapa com os dados recebidos
  updateMapData(mapData);
}

// Atualiza o input de produtos que podem ser exibidos no mapa
async function updateMapSh4Input(selected) {
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
  $(`#mainmap-container option[label='${selected}']`).attr('selected', 'selected');
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
export async function updateMapData(mapData) {
  try {
    // Atualiza o título do mapa
    changeMapTitle(mapData[0]['SH4'] + ' - ' + mapData[0]['NO_SH4_POR']);

    // Limpa todas as cidades
    $('.city-active').each(function () {
      cleanCity($(this));
    })

    // Função de calculo de cores
    const colors = createFrequencyScale(mapData, getSortValue() == 'fob' ? 'VL_FOB' : 'KG_LIQUIDO')

    // Preenche cada shape de cidade com os dados referentes
    mapData.forEach(d => {
      fillCity(d, colors(d[getSortValue() == 'fob' ? 'VL_FOB' : 'KG_LIQUIDO']));
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
  let colors = d3.scaleSequential()
    .domain([0, d3.max(data.map(d => d[dataType]))])
    .interpolator(d3.interpolateYlOrRd);

  return colors;
}

// Recebe um elemento jquery referente ao desenho de uma cidade, e limpa seus dados
export function cleanCity(element) {
  // Deseleciona a cidade
  element.removeClass('city-active');
  // Limpa o texto dela, deixando somente o nome da cidade
  element.text(element.text().split(' <br>')[0]);
  // Limpa a cor 
  element.css('fill', '');
}

// Recebe um dataframe referente aos dados de uma cidade, e atualiza suas propriedades no mapa
function fillCity(data, color) {
  let cod = '#' + data['CO_MUN'].toString();

  $(cod).text(`${data['NO_MUN_MIN']} 
  <br>
  Valor FOB: U$ ${formatValues(data['VL_FOB'])}
  <br>
  Peso Líquido: ${formatValues(data['KG_LIQUIDO'])} kg`);

  $(cod).addClass('city-active');

  $(cod).css('fill', color);
}