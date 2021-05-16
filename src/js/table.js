// Headers da tabela
export const headerTitles = [
  "Ano",
  "Mês",
  "Cod. do Município",
  "Nome do Município",
  "Pais de destino",
  "SH4",
  "Descrição",
  "Valor FOB (U$)"
]

// Função para desenhar a tabela com os dados
export function drawTable() {

  const h2 = window.innerHeight
  const w2 = window.innerWidth

  let table = d3.select('#table-container')
    .append('table')
    .attr('height', '100%')
    .attr('width', '100%')
    .append('tbody');

  table.append('thead')
    .append('tr')
    .selectAll('th')
    .data(headerTitles)
    .enter()
    .append('th')
    .text((headerTitle) => {
      return headerTitle;
    })

  table.append('tbody')
}

// Função para atualizar os dados da tabela
export function printTableData(data) {
  // let table = d3.select('#table-container').select('tbody');

  // // Remove dados antigos
  // table.select('tbody').remove();

  // // Adicionando na tabela
  // let rows = table.append('tbody').selectAll('tr')
  //   .data(data).enter()
  //   .append('tr');
  // // Reservado em memória um 'table row' para cada tupla de 'data'

  // rows.selectAll('td')
  //   // Em cada uma das 'table row', reserva-se local para uma 'cell'
  //   .data((keyData) => {
  //     return headerTitles.map((key) => {
  //       return { 'attribute': key, 'value': keyData[key] };
  //     });
  //   }).enter()
  //   .append('td')
  //   // Coluna onde fica a 'cell'
  //   .attr('data-th', (cell) => {
  //     return cell.attribute;
  //   })
  //   // Valor da 'cell'
  //   .text((cell) => {
  //     return cell.value;
  //   });



  const tbodyParent = document.getElementsByTagName('tbody')[0];
  let tbody = tbodyParent.getElementsByTagName('tbody')[0];

  // Remove dados antigos
  tbody.innerHTML = '';

  for (const dataRow of data) {

    setTimeout(() => {

      // Cria a linha
      let row = document.createElement('tr');

      // Cria e adiciona o Ano
      let cell = document.createElement('td');
      cell.setAttribute('data-th', "Ano");
      cell.innerHTML = dataRow["Ano"];
      row.appendChild(cell);
      // Cria e adiciona o Mês
      cell = document.createElement('td');
      cell.setAttribute('data-th', "Mês");
      cell.innerHTML = dataRow["Mês"];
      row.appendChild(cell);
      // Cria e adiciona o Cod. do Município
      cell = document.createElement('td');
      cell.setAttribute('data-th', "Cod. do Município");
      cell.innerHTML = dataRow["Cod. do Município"];
      row.appendChild(cell);
      // Cria e adiciona o Nome do Município
      cell = document.createElement('td');
      cell.setAttribute('data-th', "Nome do Município");
      cell.innerHTML = dataRow["Nome do Município"];
      row.appendChild(cell);
      // Cria e adiciona o Pais de destino
      cell = document.createElement('td');
      cell.setAttribute('data-th', "Pais de destino");
      cell.innerHTML = dataRow["Pais de destino"];
      row.appendChild(cell);
      // Cria e adiciona o SH4
      cell = document.createElement('td');
      cell.setAttribute('data-th', "SH4");
      cell.innerHTML = dataRow["SH4"];
      row.appendChild(cell);
      // Cria e adiciona o Descrição
      cell = document.createElement('td');
      cell.setAttribute('data-th', "Descrição");
      cell.innerHTML = dataRow["Descrição"];
      row.appendChild(cell);
      // Cria e adiciona o Valor FOB (U$)
      cell = document.createElement('td');
      cell.setAttribute('data-th', "Valor FOB (U$)");
      cell.innerHTML = dataRow["Valor FOB (U$)"];
      row.appendChild(cell);

      // Adiciona a linha ao corpo
      tbody.appendChild(row);
    }, 1000);


  }
}