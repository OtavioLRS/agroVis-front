import { finishLoading, formatValues, changeLoadingMessage, getSortValue, cleanDashboard } from "./extra";
import { cleanPolygon, createFrequencyScale, fillPolygon } from "./map";

// Desenha o mapa mundi
export async function drawMundiMapContries() {
  // Container do mapa
  let svg = d3.select('#mundi-container #mundimap-container')
    .append('svg') // insere um SVG para o mapa
    .attr('id', 'mundi-svg')
    .attr('height', '100%')
    .attr('width', '100%')
    .lower();

  const { height, width } = svg.node().getBoundingClientRect();
  // console.log(height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#mundi-container')
    .append('div')
    .attr('class', 'hidden tooltip-custom');

  // Requisita o geoJSON da API do IBGE
  // const file = 'wm'
  const file = 'paises-final'
  const mapData = await d3.json(`src/json/${file}.json`);
  // console.log('Mapa', mapData, width, height)

  // Projecao
  const projection = d3.geoNaturalEarth1()
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
    .attr('id', (shape) => shape.properties['id-pais'])
    .attr('bloco', (shape) => shape.properties.bloco[0])
    .attr('nome', (shape) => shape.properties.nome[0])
    .text((shape) => shape.properties.nome[0])
    .attr('d', path)
    // Mostra cidade no hover
    .on('mouseover', (d) => {
      // Mostra o nome da cidade
      tooltip.classed('hidden', false)
        .style("left", (d3.event.pageX + 30).toString() + "px")
        .style("top", (d3.event.pageY - 50).toString() + "px")
        .html(() => {
          // Exibe o nome do municipio selecionado
          return $('#' + d.properties['id-pais']).text();
        })
    })

    // Esconde titulo
    .on('mouseout', () => {
      tooltip.classed('hidden', true);
    })

  //Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.8, 10])
    .on('zoom', () => {
      svg.selectAll('path').attr('transform', d3.event.transform)
    });

  svg.call(zoom)

  $('#centralize-mundi-icon').on('click', function () {
    resetMap(svg, zoom);
  });
}

// Desenha o mapa mundi
export async function drawMundiMap() {
  // Container do mapa
  let svg = d3.select('#mundi-container #mundimap-container')
    .append('svg') // insere um SVG para o mapa
    .attr('id', 'mundi-svg')
    .attr('height', '100%')
    .attr('width', '100%')
    .lower();

  const { height, width } = svg.node().getBoundingClientRect();
  // console.log(height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#mundi-container')
    .append('div')
    .attr('class', 'hidden tooltip-custom');

  // Requisita o geoJSON da API do IBGE
  // const file = 'wm'
  const file = 'blocos-final-sembr'
  const mapData = await d3.json(`src/json/${file}.json`);
  // console.log('Mapa', mapData, width, height)

  // Projecao
  const projection = d3.geoNaturalEarth1()
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
    .attr('id', (shape) => shape.properties.id)
    .attr('bloco', (shape) => shape.properties.bloco[0])
    .text((shape) => shape.properties.bloco[0])
    .attr('d', path)
    // Mostra cidade no hover
    .on('mousemove', (d) => {
      // Mostra o nome da cidade
      tooltip.classed('hidden', false)
        .style("left", (d3.event.pageX + 30).toString() + "px")
        .style("top", (d3.event.pageY - 50).toString() + "px")
        .html(() => {
          // Exibe o nome do municipio selecionado
          return $('#' + d.properties.id).text();
        })
    })

    // Esconde titulo
    .on('mouseout', () => {
      tooltip.classed('hidden', true);
    })

  //Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.8, 10])
    .on('zoom', () => {
      svg.selectAll('path').attr('transform', d3.event.transform)
    });

  svg.call(zoom)

  $('#centralize-mundi-icon').on('click', function () {
    resetMap(svg, zoom);
  });
}

// Retorna o mapa para as dimensões originais
export function resetMap(svg, zoom) {
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);
}

// Atualiza os dados do mapa mundi
export async function updateMundiData(selected) {
  changeLoadingMessage('Atualizando o mapa mundi...');

  // Recupera o filtro para realizar a query dos dados do mapa
  const filter = await JSON.parse(localStorage.getItem('filter'));
  filter.products = selected == 0 ? filter.products : [selected];

  // Divisão por continente ou países
  // const division = 'continente'
  const division = 'pais'

  // Realiza a query do filtro inserido
  const response = await fetch(`http://127.0.0.1:5000/exportacao/mundi/${division}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter,
    })
  });
  const mundiData = await response.json();
  // console.log('Mundi Data'. mundiData);

  // Número de classes
  const numClasses = $('#input-classnumber-mundi').val()

  // Função de calculo de cores
  const colors = createFrequencyScale(mundiData, numClasses, filter.sortValue, 'mundimap-container');

  // Limpa todas os poligonos de continente
  $('#mundi-svg .polygon-active').each(function () {
    cleanPolygon($(this));
  })

  // Divide por continente ou pais
  // const block = 'CO_BLOCO';
  // const blockName = 'NO_BLOCO';
  const block = 'CO_PAIS';
  const blockName = 'NO_PAIS';

  // Preenche cada poligono de continente com os dados referentes
  mundiData.forEach(d => {
    fillPolygon(d, colors[0](d[filter.sortValue]), colors[1](d[filter.sortValue]), '#mundi-svg', block, blockName);
  })
}