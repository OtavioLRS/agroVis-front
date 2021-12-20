import { fixMonth, formatValues } from "../extra";

/** Mostra o modal do HorizonChart
 * 
 * @param {object} data1 dataframe referente ao limite inferior do intervalo escolhido
 * @param {object} data2 dataframe referente ao limite superior do intervalo escolhido
 */
export async function showHorizonModal(data1, data2) {
  // Mostra o modal "carregando"
  $('#horizon-modal-loading').removeClass('hidden');
  const modal = new bootstrap.Modal(document.getElementById('modal-horizon'));
  modal.show();

  const sh4 = data1.series;
  const date1 = new Date(data1.ts);
  const date2 = new Date(data2.ts);
  const [month1, month2] = [fixMonth(date1.getMonth() + 1), fixMonth(date2.getMonth() + 1)];
  const [year1, year2] = [date1.getFullYear().toString(), date2.getFullYear().toString()];

  const title = 'SH4 ' + data1.series + ' - ' + data1.points[0]["sh4_descricao"];
  const period = month1 + '/' + year1 + ' - ' + month2 + '/' + year2;

  $('#modal-horizon-title').html(title);
  $('#modal-horizon-period').html("Período: " + period);

  const auxFilter = await JSON.parse(localStorage.getItem('filter'));
  // Filtro da requisição 
  const reqFilter = {
    cities: auxFilter.cities,
    products: [sh4],
    beginPeriod: year1 + '-' + month1,
    endPeriod: year2 + '-' + month2,
  }

  // Requisição das conversões de SH4
  // const response = await fetch(`http://127.0.0.1:5000/codigos/${sh4}`, {
  const response = await fetch(`https://agrovis-back-flask.herokuapp.com/codigos/${sh4}`, {
    method: 'GET',
  });
  const conversion = await response.json();
  // console.log('conversão de códigos', conversion);

  // Requisição dos dados dos gráficos
  // const response2 = await fetch('http://127.0.0.1:5000/exportacao/horizon/modal', {
  const response2 = await fetch('https://agrovis-back-flask.herokuapp.com/exportacao/horizon/modal', {
    // const response2 = await fetch('https://mighty-taiga-07455.herokuapp.com/modaldata', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: reqFilter
    })
  });
  const graphData = await response2.json();
  // console.log('Dados gráfico', graphData);

  // Tabela de conversão de códigos
  $('#modal-horizon-conversion').append(`
  <hr>
  <h5>Conversão de códigos</h5>
  <table class="table table-bordered table-hover">
  <thead class="thead-dark">
  <tr>
  <th scope="col">Código SH6</th>
  <th scope="col">Descrição SH6</th>
  <th scope="col">Código NCM</th>
  <th scope="col">Descrição NCM</th>
  </tr>
  </thead>
  <tbody>
  
  </tbody>
  </table><hr>
  `);

  // Preenche a tabela de conversão de códigos
  for (let d of conversion) {
    $('#modal-horizon-conversion tbody').append(`
    <tr>
    <td scope="row"> ${d['CO_SH6']} </td>
    <td> ${d['NO_SH6_POR']} </td>
    <td> ${d['CO_NCM']} </td>
    <td> ${d['NO_NCM_POR']} </td>
    </tr>
    `);
  }

  // Constrói os gráficos
  addBarChartToModal(graphData, 'VL_FOB');
  addBarChartToModal(graphData, 'KG_LIQUIDO');

  // Esconde o loader
  $('#horizon-modal-loading').addClass('hidden')

  // Limpa o modal depois de fecha-lo
  $('#modal-horizon').on('hidden.bs.modal', function (e) {
    clearHorizonModal();
  });
}

// quantidade por percentual no modal, no grafico de barra

function addBarChartToModal(data, dataType) {
  // Tooltip do hover
  const tooltip = d3.select("#modal-horizon-barchart").append("div").attr("class", "tooltip-custom").style("display", "none");
  const divWrapper = d3.select("#modal-horizon-barchart").append("div").attr("class", "horizon-barchart-wrapper").attr("id", `horizon-barchart-wrapper-${dataType}`);
  const div = divWrapper.append("div").attr("class", "horizon-barchart").attr("id", `horizon-barchart-${dataType}`);
  div.append("h5").html(dataType == "VL_FOB" ? "&nbsp Valor FOB (U$)" : "&nbsp Peso líquido (kg)");
  const value = div.append("div").attr("class", "horizon-barchart-value hidden").attr("id", `horizon-barchart-value-${dataType}`);

  const margin = { top: 30, right: 30, bottom: 100, left: 60 };

  const width = 1140 - margin.left - margin.right;
  const height = 400;
  // Tamanho de cada barra, minimo 20, maximo 100
  const barSizeRatio = (width / data.length);
  const barSize = barSizeRatio >= 20 ? (barSizeRatio > 100 ? 100 : barSizeRatio) : 20;

  // Valor total do barChart
  const totalValue = d3.sum(data.map(d => d[dataType]));

  // SVG
  const svg = div.append("svg")
    .attr("height", height + margin.top + margin.bottom)
    .attr("width", (barSize * data.length * 1.2) + margin.left + margin.right)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  // Eixo X
  const x = d3.scaleBand()
    .range([0, (barSize * data.length * 1.2)])
    .domain(data.map(d => d['NO_MUN_MIN']))
    .padding(0.2)

  // Adicionando eixo X no gráfico
  svg.append("g")
    .attr("class", "modal-x-axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end")
    .on("mousemove", (cidade) => {
      const d = data.find(d => d['NO_MUN_MIN'] == cidade);
      const msg = `
      ${d['NO_MUN_MIN']} 
      <br> 
      Porcentagem: ${(d[dataType] / totalValue) * 100} % 
      <br>
      Valor: ${dataType == 'VL_FOB' ? `U$ ${formatValues(d[dataType])}` : `${formatValues(d[dataType])} kg`}`;

      // tooltip.style("left", (d3.event.pageX + 50).toString() + "px")
      //   .style("top", (d3.event.pageY - 70).toString() + "px")
      //   .style("display", "inline-block")
      //   .html(msg);

      value.html(msg);
      value.classed('hidden', false);
    })
    .on("mouseout", function (d) {
      // tooltip.style("display", "none");
      value.html('');
      value.classed('hidden', true);
    });

  // Eixo Y
  const y = d3.scaleLinear()
    .range([height, 0])
    .domain([0, d3.max(data.map(d => d[dataType] / totalValue)) * 1.1])
  // Adicionando eixo Y no gráfico
  svg.append("g")
    .attr("class", "modal-y-axis")
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  // Bars
  svg.append("g")
    .attr("class", "modal-bars")
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d['NO_MUN_MIN']))
    .attr("y", (d) => y(d[dataType] / totalValue))
    .attr("width", x.bandwidth())
    .attr("height", d => (height - y(d[dataType] / totalValue)))
    .attr("fill", "#198754")
    .on("mousemove", function (d) {
      const msg = `
      ${d['NO_MUN_MIN']} 
      <br> 
      Porcentagem: ${(d[dataType] / totalValue) * 100} % 
      <br>
      Valor: ${dataType == 'VL_FOB' ? `U$ ${formatValues(d[dataType])}` : `${formatValues(d[dataType])} kg`}`;

      // tooltip.style("left", (d3.event.pageX + 50).toString() + "px")
      //   .style("top", (d3.event.pageY - 70).toString() + "px")
      //   .style("display", "inline-block")
      //   .html(msg);

      value.html(msg);
      value.classed('hidden', false);
    })
    .on("mouseout", function () {
      // tooltip.style("display", "none");
      value.html('');
      value.classed('hidden', true);
    });


  // const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];

  // ZOOM

  // svg.call(d3.zoom()
  //   .scaleExtent([1, 8])
  //   // .translateExtent(extent)
  //   // .extent(extent)
  //   .on("zoom", function (e) {
  //     console.log(e)
  //     x.range([margin.left, width - margin.right].map(d => e.transform.applyX(d)));
  //     svg.selectAll(".modal-bars rect").attr("x", d => x(d['NO_MUN_MIN'])).attr("width", x.bandwidth())
  //     // svg.selectAll(".modal-x-axis").call(xAxis);
  //   }));

  // .on('zoom', () => {
  //   svg.selectAll('path').attr('transform', d3.event.transform)
  // });

  // function zoomed(event) {
  //   x.range([margin.left, width - margin.right].map(d => event.transform.applyX(d)));
  //   svg.selectAll(".modal-bars rect").attr("x", d => x(d['NO_MUN_MIN'])).attr("width", x.bandwidth())
  //   svg.selectAll(".modal-x-axis").call(xAxis);
  // }




}





/** Limpa o modal do HorizonChart */
function clearHorizonModal() {
  $('#modal-horizon-title').html('');
  $('#modal-horizon-period').html('');
  $('#modal-horizon-barchart').html('');
  $('#modal-horizon-conversion').html('');
}