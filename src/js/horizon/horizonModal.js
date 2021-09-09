import { fixMonth, formatValues } from "../extra";

export async function showHorizonModal(data1, data2) {
  const modal = new bootstrap.Modal(document.getElementById('modal-horizon'));

  console.log(data1)
  console.log(data2)

  const sh4 = data1.series;
  const date1 = new Date(data1.points[0].data);
  const date2 = new Date(data2.points[0].data);
  const [month1, month2] = [fixMonth(date1.getMonth() + 1), fixMonth(date2.getMonth() + 1)];
  const [year1, year2] = [date1.getFullYear().toString(), date2.getFullYear().toString()];

  const title = 'SH4 ' + data1.series + ' - ' + data1.points[0].sh4_descricao;
  const period = month1 + '/' + year1 + ' - ' + month2 + '/' + year2;

  $('#modal-horizon-title').html(title);
  $('#modal-horizon-period').html("Período: " + period);

  const response = await fetch('https://mighty-taiga-07455.herokuapp.com/sh4conversion', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sh4,
    })
  });

  const conversion = await response.json();
  console.log('conversão de códigos', conversion);

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
  </table><hr>`);

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

  // Construindo os gráficos
  // Recuperando possíveis cidades do filtro
  const auxFilter = await JSON.parse(localStorage.getItem('filter'));

  // Filtro da requisição 
  const reqFilter = {
    cities: auxFilter.cities,
    products: [sh4],
    beginPeriod: year1 + '-' + month1 + '-1',
    endPeriod: year2 + '-' + month2 + '-1',
  }

  const response2 = await fetch('https://mighty-taiga-07455.herokuapp.com/modaldata', {
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
  console.log('Dados gráfico', graphData);

  addBarChartToModal(graphData, 'VL_FOB');
  addBarChartToModal(graphData, 'KG_LIQUIDO');

  // Mostra o modal
  modal.show();

  // Limpa o modal depois de fecha-lo
  $('#modal-horizon').on('hidden.bs.modal', function (e) {
    clearHorizonModal();
  });

  // getNotes({ sh4, date1: `${year1}-${month1}-01`, date2: `${year2}-${month2}-01` });


  // $('#modal-horizon-notes-input-btn').off('click');
  // $('#modal-horizon-notes-input-btn').on('click', () => {
  //   const descricao = $('#modal-horizon-notes-input-text').val();
  //   const dataIni = year1 + '-' + month1 + '-01';
  //   const dataFim = year2 + '-' + month2 + '-01';

  //   addNote(sh4, dataIni, dataFim, descricao);
  // });
}

// quantidade por percentual no modal, no grafico de barra
// notas no periodo do grafico

async function getNotes(filter) {
  $('#modal-horizon-notes-input').append(``);

  const response = await fetch('https://mighty-taiga-07455.herokuapp.com/notes', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter
    })
  });
  const data = await response.json();

  console.log(data);

  data.forEach(d => {
    const date = new Date(d['DATA_REGISTRO']);
    const dateString = date.getDate() + '/' + fixMonth(date.getMonth() + 1) + '/' +
      + date.getFullYear() + ' - ' + date.getHours() + ':' + date.getMinutes();

    printNoteOnModal(dateString, d['NOTA']);
  });
}

async function printNoteOnModal(dateString, anotacao) {
  $('#modal-horizon-notes').append(`
  <div class="modal-horizon-note shadow">
    <p class="modal-horizon-note-title">Anotado em: ${dateString}</p>
    <textarea class="form-control" rows="2" disabled readonly>${anotacao}</textarea>
  </div>`);
}

async function addNote(sh4, dataIni, dataFim, anotacao) {
  await fetch('https://mighty-taiga-07455.herokuapp.com/addnote', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sh4,
      dataIni,
      dataFim,
      anotacao
    })
  });

  printNoteOnModal('Agora', anotacao);
  $('#modal-horizon-notes-input-text').val('');
}




function addBarChartToModal(data, dataType) {
  // Tooltip do hover
  const tooltip = d3.select("#modal-horizon-barchart").append("div").attr("class", "tooltip").style("display", "none");

  const margin = { top: 30, right: 30, bottom: 100, left: 60 };

  const width = 1140 - margin.left - margin.right;
  const height = 400;
  // Tamanho de cada barra, minimo 20, maximo 100
  const barSizeRatio = (width / data.length);
  const barSize = barSizeRatio >= 20 ? (barSizeRatio > 100 ? 100 : barSizeRatio) : 20;

  // Valor máximo do barChart
  const maxValue = d3.sum(data.map(d => d[dataType]));

  // SVG
  const svg = d3.select('#modal-horizon-barchart')
    .append("svg")
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

      tooltip.style("left", (d3.event.pageX + 50).toString() + "px")
        .style("top", (d3.event.pageY - 70).toString() + "px")
        .style("display", "inline-block")
        .html(`${d['NO_MUN_MIN']} 
        <br> 
        Porcentagem: ${(d[dataType] / maxValue) * 100} % 
        <br>
        Valor: ${dataType == 'VL_FOB' ? 'U$' + formatValues(d[dataType]) : 'U$' + formatValues(d[dataType] + ' kg')}`);
    })
    .on("mouseout", function (d) { tooltip.style("display", "none"); });

  // Eixo Y
  const y = d3.scaleLinear()
    .range([height, 0])
    .domain([0, d3.max(data.map(d => d[dataType] / maxValue)) * 1.1]);
  // Adicionando eixo Y no gráfico
  svg.append("g")
    .attr("class", "modal-y-axis")
    .call(d3.axisLeft(y));

  // Bars
  svg.append("g")
    .attr("class", "modal-bars")
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d['NO_MUN_MIN']))
    .attr("y", (d) => y(d[dataType] / maxValue))
    .attr("width", x.bandwidth())
    .attr("height", d => (height - y(d[dataType] / maxValue)))
    .attr("fill", "#198754")
    .on("mousemove", function (d) {
      tooltip.style("left", (d3.event.pageX + 50).toString() + "px")
        .style("top", (d3.event.pageY - 70).toString() + "px")
        .style("display", "inline-block")
        .html(`${d['NO_MUN_MIN']} 
        <br> 
        Porcentagem: ${(d[dataType] / maxValue) * 100} % 
        <br>
        Valor: ${dataType == 'VL_FOB' ? 'U$ ' + formatValues(d[dataType]) : formatValues(d[dataType] + ' kg')}`);
    })
    .on("mouseout", function (d) { tooltip.style("display", "none"); });


  const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];

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

  function zoomed(event) {
    x.range([margin.left, width - margin.right].map(d => event.transform.applyX(d)));
    svg.selectAll(".modal-bars rect").attr("x", d => x(d['NO_MUN_MIN'])).attr("width", x.bandwidth())
    svg.selectAll(".modal-x-axis").call(xAxis);
  }




}





function clearHorizonModal() {
  $('#modal-horizon-title').html('');
  $('#modal-horizon-period').html('');
  $('#modal-horizon-barchart').html('');
  $('#modal-horizon-conversion').html('');
}












































