import { changeLoadingMessage, showBluredLoader, hideBluredLoader } from "./extra";
import { cleanPolygon, createFrequencyScale, fillPolygon, printScaleLegend, changeConfigClasses, createCustomFrequencyScale, } from "./map";

/** Desenha o mapa mundi dividido por países */
export async function drawMundiMapCountries() {
  // Atualiza o titulo
  $('#mundititle-container').html('Exportação por países');

  $('#mundimap-container').html(`
    <div id="centralize-container" title="Centralizar o mapa">
      <i class="bi bi-pin-map-fill" id="centralize-mundi-icon"></i>
    </div>`);

  // Container do mapa
  let svg = d3.select('#mundi-container #mundimap-container')
    .append('svg') // SVG para o mapa
    .attr('id', 'mundi-svg')
    .attr('height', '100%')
    .attr('width', '100%')
    .lower();

  // Dimensões do mapa
  const { height, width } = svg.node().getBoundingClientRect();
  // console.log('Dimensões', height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#mundi-container')
    .append('div')
    .attr('class', 'hidden tooltip-custom');

  // Abre o geoJSON correspondente
  const mapData = await d3.json(`src/json/paises.json`);
  // console.log('Mapa', mapData)

  // Projeção
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
    .on('mouseover', (d) => { // Mostra o nome do território no hover
      tooltip.classed('hidden', false)
        .style("left", (d3.event.pageX + 30).toString() + "px")
        .style("top", (d3.event.pageY - 50).toString() + "px")
        .html(() => $('#' + d.properties['id-pais']).text())
    })
    // Esconde titulo
    .on('mouseout', () => tooltip.classed('hidden', true))

  //Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.8, 10])
    .on('zoom', () => {
      svg.selectAll('path').attr('transform', d3.event.transform)
    });
  svg.call(zoom)
  // Listener de reset de Zoom
  $('#centralize-mundi-icon').on('click', () => { resetMap(svg, zoom); });
}

/** Desenha o mapa mundi dividido por continentes */
export async function drawMundiMap() {
  // Atualiza o titulo
  $('#mundititle-container').html('Exportação por continentes');

  $('#mundimap-container').html(`
    <div id="centralize-container" title="Centralizar o mapa">
      <i class="bi bi-pin-map-fill" id="centralize-mundi-icon"></i>
    </div>`);

  // Container do mapa
  let svg = d3.select('#mundi-container #mundimap-container')
    .append('svg') // SVG para o mapa
    .attr('id', 'mundi-svg')
    .attr('height', '100%')
    .attr('width', '100%')
    .lower();

  // Dimensões do mapa
  const { height, width } = svg.node().getBoundingClientRect();
  // console.log('Dimensões', height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#mundi-container')
    .append('div')
    .attr('class', 'hidden tooltip-custom');

  // Abre o geoJSON correspondente
  const mapData = await d3.json(`src/json/continentes.json`);
  // console.log('Mapa', mapData)

  // Projeção
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
    .on('mousemove', (d) => { // Mostra o nome do território no hover
      tooltip.classed('hidden', false)
        .style("left", (d3.event.pageX + 30).toString() + "px")
        .style("top", (d3.event.pageY - 50).toString() + "px")
        .html(() => $('#' + d.properties.id).text())
    })
    // Esconde titulo
    .on('mouseout', () => tooltip.classed('hidden', true))

  //Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.8, 10])
    .on('zoom', () => {
      svg.selectAll('path').attr('transform', d3.event.transform)
    });
  svg.call(zoom)
  // Listener de reset de Zoom
  $('#centralize-mundi-icon').on('click', () => { resetMap(svg, zoom); });
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

/** Atualiza os dados do mapa mundi
 * 
 * @param {number} selected sh4 selecionado no mapa, `0` utilizará o total de todos os sh4s
 * @param {object[]} colorFunctions escalas customizadas para as classes do mapa `(opcional)`
 */
export async function updateMundiData(selected, colorFunctions = []) {
  changeLoadingMessage('Atualizando o mapa mundi...');

  // Recupera o filtro para realizar a query dos dados do mapa
  const filter = await JSON.parse(localStorage.getItem('filter'));
  filter.products = selected == 0 ? filter.products : [selected];

  // Divisão por continente ou países
  const division = filter.mapDivision == 'country' ? 'pais' : 'continente'

  // Realiza a query do filtro inserido
  const response = await fetch(`https://agrovis-back-flask.herokuapp.com/exportacao/mundi/${division}`, {
    // const response = await fetch(`http://127.0.0.1:5000/exportacao/mundi/${division}`, {
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

  /** Número de classes */
  const numClasses = $('#input-classnumber-mundi').val()

  /** Escalas relacionadas as cores
 * 
 * [0] - escala das cores 
 * 
 * [1] - escala dos indexes das cores
 */
  let colors;
  if (colorFunctions.length == 0) {
    colors = createFrequencyScale(mundiData, numClasses, filter.sortValue);
    changeConfigClasses(colors[0], 'mundimap-container');
  }

  else {
    colors = colorFunctions;
  }

  // Limpa todas os poligonos de continente
  $('#mundi-svg .polygon-active').each(function () {
    cleanPolygon($(this));
  })

  /** Coluna do dataframe referente ao código dos terriórios */
  const block = filter.mapDivision == 'country' ? 'CO_PAIS' : 'CO_BLOCO';
  /** Coluna do dataframe referente ao nome dos terriórios */
  const blockName = filter.mapDivision == 'country' ? 'NO_PAIS' : 'NO_BLOCO';

  // Preenche cada poligono de continente com os dados referentes
  mundiData.forEach(d => {
    fillPolygon(d, colors[0](d[filter.sortValue]), colors[1](d[filter.sortValue]), '#mundi-svg', block, blockName);
  })

  // Legenda nova
  printScaleLegend(colors[0], 'mundimap-container');

  // Atualizar os campos de classes quando mudar o número de classes
  $('#input-classnumber-mundi').off('change');
  $('#input-classnumber-mundi').on('change', async function () {
    const numClasses = parseInt($('#input-classnumber-mundi').val());
    let colorFunctions = createFrequencyScale(mundiData, numClasses, filter.sortValue);
    changeConfigClasses(colorFunctions[0], 'mundimap-container');
  });

  // Atualizar o mapa quando clicar em salvar
  $('#config-mundi').off('click');
  $('#config-mundi').on('click', async function () {
    const numClasses = parseInt($('#input-classnumber-mundi').val());
    let colorFunctions = createCustomFrequencyScale('mundi', numClasses);

    await showBluredLoader('#mundimap-container');
    await updateMundiData(selected, colorFunctions);
    await hideBluredLoader('#mundimap-container')
  });
}