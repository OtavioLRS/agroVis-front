// Função para desenhar os shapes do mapa
export function drawMap() {
  const h1 = window.innerHeight
  const w1 = window.innerWidth

  // Container do mapa
  let svg = d3.select('#map-container')
    .append('svg') // insere um SVG para o mapa
    .attr('height', '100%')
    .attr('width', '100%');

  // Div para os hovers com os titulos
  let tooltip = d3.select('#map-container')
    .append('div')
    .attr('class', 'hidden tooltip');

  // Projecao
  const projection = d3.geoMercator()
    .scale(1)
  // Path
  const path = d3.geoPath()
    .projection(projection)

  // Requisita o geoJSON da API do IBGE
  d3.json('http://servicodados.ibge.gov.br/api/v2/malhas/35?resolucao=5&qualidade=4&formato=application/vnd.geo+json').then((mapData) => {
    // d3.json('http://servicodados.ibge.gov.br/api/v3/malhas/estados/SP?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json').then((mapData) => {
    console.log('Mapa', mapData)

    // Limites do mapa
    let bounds = path.bounds(mapData)
    bounds = [[479.07309403150936, 250.35229148850092], [479.229239913039, 250.45685275177792]]
    console.log('Scale Bounds', bounds)
    const border = 0.95
    let scale = border / Math.max((bounds[1][0] - bounds[0][0]) / (w1 / 2), (bounds[1][1] - bounds[0][1]) / (h1 / 2));
    projection.scale(scale);

    bounds = d3.geoBounds(mapData)
    bounds = [[-53.1078, -25.31], [-44.1613, -19.7798]]
    console.log('Map Bounds', bounds)
    projection.center([(bounds[1][0] + bounds[0][0]) / 2, (bounds[1][1] + bounds[0][1]) / 2]);
    projection.translate([w1 / 4, h1 / 4]);

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
        let mouseCoords = d3.mouse(svg.node()).map((coord) => {
          return parseInt(coord);
        });
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
    // .on('click', (clickedShape) => {
    //   // Adiciona a cidade clicada ao filtro
    //   $('#city-filter').val(clickedShape.properties.codarea);
    //   $('#city-filter').select2().trigger('change');

    //   // Trata o filtro
    //   handleFilter();
    // })

    // Cor de fundo
    // .style('fill', 'green')
  })

  //Zoom
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .on('zoom', () => {
      // console.log(d3.event)
      svg.selectAll('path').attr('transform', d3.event.transform)
    });

  svg.call(zoom)

  // Recupera os nomes das cidades
  getCitiesData();
}

// Função para recuperar os nomes das cidades do banco
async function getCitiesData() {

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