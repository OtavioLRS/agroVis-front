import { finishLoading, formatValues, changeLoadingMessage, getSortValue, cleanDashboard } from "./extra";

// Desenha o mapa mundi
export async function drawMundiMap() {
  // Container do mapa
  let svg = d3.select('#mundi-container #mundimap-container')
    .append('svg') // insere um SVG para o mapa
    .attr('id', 'mundi-svg')
    .attr('height', '100%')
    .attr('width', '100%')

  const { height, width } = svg.node().getBoundingClientRect();
  // console.log(height, width)

  // Div para os hovers com os titulos
  let tooltip = d3.select('#mundi-container')
    .append('div')
    .attr('class', 'hidden tooltip');

  // Requisita o geoJSON da API do IBGE
  // const file = 'blocos-bug'
  const file = 'blocos-final-sembr'
  const mapData = await d3.json(`src/json/${file}.json`);
  console.log('Mapa', mapData, width, height)

  // Projecao
  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height], mapData);
  // .fitExtent([[5, 25], [width, height - 5]], mapData);

  // Path
  const path = d3.geoPath()
    .projection(projection);

  // Aplica os shapes no SVG
  svg.selectAll('.city')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('class', 'city')
    .attr('id', (shape) => shape.properties.id)
    .attr('bloco', (shape) => shape.properties.bloco[0])
    .attr('d', path)
    // Mostra cidade no hover
    .on('mousemove', (d) => {
      // Mostra o nome da cidade
      tooltip.classed('hidden', false)
        .style("left", (d3.event.pageX + 30).toString() + "px")
        .style("top", (d3.event.pageY - 50).toString() + "px")
        .html(() => {
          // Exibe o nome do municipio selecionado
          return $('#' + d.properties.id).attr('bloco');
          // return $('#' + d.id).attr('bloco');
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

// Atualiza os dados do mapa mundi
export function updateMapMundi() {

}