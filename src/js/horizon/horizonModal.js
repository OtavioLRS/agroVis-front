export async function showHorizonModal(data1, data2) {
  const modal = new bootstrap.Modal(document.getElementById('modal-horizon'));

  console.log(data1)
  console.log(data2)

  const sh4 = data1.series;
  const date1 = new Date(data1.points[0].data);
  const date2 = new Date(data2.points[0].data);
  const [month1, month2] = [date1.getMonth() + 1, date2.getMonth() + 1];
  const [year1, year2] = [date1.getFullYear(), date2.getFullYear()];

  const title = 'SH4 ' + data1.series + ' - ' + data1.points[0].sh4_descricao;
  const period = month1.toString() + '/' + year1.toString() + ' - ' + month2.toString() + '/' + year2.toString();

  $('#modal-horizon-title').html(title);
  $('#modal-horizon-period').html(period);

  const response = await fetch('http://localhost:3333/sh4conversion', {
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
  $('#modal-horizon-body').append(`
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
</table>`);

  // Preenche a tabela de conversão de códigos
  for (let d of conversion) {
    $('#modal-horizon-body tbody').append(`
    <tr>
    <td scope="row"> ${d['CO_SH6']} </td>
    <td> ${d['NO_SH6_POR']} </td>
    <td> ${d['CO_NCM']} </td>
    <td> ${d['NO_NCM_POR']} </td>
    </tr>
    `);
  }

  // Mostra o modal
  modal.show();

  // Limpa o modal depois de fecha-lo
  $('#modal-horizon').on('hidden.bs.modal', function (e) {
    $('#modal-horizon-title').html('');
    $('#modal-horizon-period').html('');
    $('#modal-horizon-body').html('');
  });
}

// quantidade por percentual no modal, no grafico de barra
// inverter as ordens do modal
// notas no periodo do grafico
