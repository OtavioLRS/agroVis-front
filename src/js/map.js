// Função para desenhar os shapes do mapa
export function drawMainMap() {
  const height = window.innerHeight * 0.5;
  const width = window.innerWidth * 0.6 * 0.6;

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
  d3.json('http://servicodados.ibge.gov.br/api/v2/malhas/35?resolucao=5&qualidade=4&formato=application/vnd.geo+json').then((mapData) => {
    console.log('Mapa', mapData, width, height)

    // Projecao
    const projection = d3.geoMercator()
      // .fitSize([width, height], mapData);
      .fitExtent([[10, 10], [width, height]], mapData);

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
    // .on('click', (clickedShape) => {
    //   // Adiciona a cidade clicada ao filtro
    //   $('#city-filter').val(clickedShape.properties.codarea);
    //   $('#city-filter').select2().trigger('change');

    //   // Trata o filtro
    //   handleFilter();
    // })

    // Cor de fundo
    // .style('fill', 'green')

    //Zoom
    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .on('zoom', () => {
        svg.selectAll('path').attr('transform', d3.event.transform)
      });

    svg.call(zoom)
  })

  // Recupera os nomes das cidades
  getCitiesData();
}

export function drawAuxMap(container) {
  const height = window.innerHeight * 0.25;
  const width = window.innerWidth * 0.6 * 0.4;

  // Container do mapa
  let svg = d3.select(container)
    .append('svg') // insere um SVG para o mapa
    .attr('height', '100%')
    .attr('width', '100%');

  // Requisita o geoJSON da API do IBGE
  d3.json('http://servicodados.ibge.gov.br/api/v2/malhas/35?resolucao=5&qualidade=4&formato=application/vnd.geo+json').then((mapData) => {
    console.log('Mapa', mapData, width, height)

    // Projecao
    const projection = d3.geoMercator()
      // .fitSize([width, height], mapData);
      .fitExtent([[10, 10], [width, height]], mapData);

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

    //Zoom
    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .on('zoom', () => {
        svg.selectAll('path').attr('transform', d3.event.transform)
      });

    svg.call(zoom)
  })
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











export function drawMapLeonardo() {
  // const height = window.innerHeight
  // const width = window.innerWidth
  const height = window.innerHeight
  const width = window.innerWidth


  // Container do mapa
  let svg = d3.select('body')
    .append('svg') // insere um SVG para o mapa
    .attr('height', height)
    .attr('width', width);

  // Div para os hovers com os titulos
  let tooltip = d3.select('body')
    .append('div')
    .attr('class', 'hidden tooltip');

  d3.json('../../src/js/usa.json').then((json) => {

    let geojson1 = topojson.feature(json, json.objects.counties)
    let geojson2 = topojson.feature(json, json.objects.states)
    let geojson3 = topojson.feature(json, json.objects.nation)

    // Projecao
    const projection = d3.geoAlbers()
      .fitExtent([[100, 100], [width, height]], geojson1);

    // Path
    const path = d3.geoPath()
      .projection(projection)

    console.log(json);

    // projection.scale(json.transform.scale);
    // projection.center(json.bbox);
    // projection.translate(json.transform.translate);

    svg.append('g')
      .selectAll("path")
      .data(geojson1.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr('class', 'azulao')
      .style('stroke', "gray")
      // .style('fill', () => getRandomColor())
      .style('fill', 'white')
      .style('stroke-width', .5)
      .attr('id', d => d.id)

      .on('mouseover', (d) => {
        let mouseCoords = d3.mouse(svg.node()).map(coord => parseInt(coord));
        tooltip.classed('hidden', false)
          .attr('style', 'left:' + (mouseCoords[0] + 15) +
            'px; top:' + (mouseCoords[1] - 35) + 'px')
          .html(() => {
            return ('Id: ' + d.id + '\nName: ' + d.properties.name);
          })

        $('#' + d.id).css('opacity', 0.3)
      })

      .on('mouseout', (d) => {
        tooltip.classed('hidden', true);
        $('#' + d.id).css('opacity', 1.0);
      })


    svg.append('g')
      .selectAll("path")
      .data(geojson2.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr('class', 'amarelao')
      // .style('stroke', 'red')
      .style('stroke', 'black')
      .style('fill-opacity', 0)
      .style('stroke-width', 1)

    // svg.append('g')
    //   .selectAll("path")
    //   .data(geojson3.features)
    //   .enter()
    //   .append("path")
    //   .attr("d", path)
    //   // .style('stroke', 'blue')
    //   .style('stroke', 'black')
    //   .style('fill-opacity', 0)
    //   .style('stroke-width', 1)


    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .on('zoom', () => {
        // console.log(d3.event)
        svg.selectAll('path').attr('transform', d3.event.transform)
      });

    svg.call(zoom)

  })
};



export function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}