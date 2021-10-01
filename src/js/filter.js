import { buildCalendar } from './calendar.js';
import { startLoading, finishLoading, changeLoadingMessage, getSortValue, getSortByValue, cleanDashboard, clearSelect2Input, createDraggable, fixMonth } from './extra.js'
import { buildHorizon } from './horizon/horizon.js';
import { updateMap } from './map.js';

// Função principal para a construção dos filtros
export async function buildFilters() {
  // Requisição para buscar os SH4s presentes no banco
  await fetch('https://mighty-taiga-07455.herokuapp.com/produtos', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(response => {
      console.log('SH4', response);

      // Opção padrão com todos os produtos
      $('#input-sh4').append($('<option value=0>Todos os produtos</option>'));

      response.forEach((product) => {
        const option = $('<option></option>')
        option.attr({ "value": product.CO_SH4 });
        option.text(product.CO_SH4 + " - " + product.NO_SH4_POR);
        option.attr({ "label": product.CO_SH4 });
        option.addClass("option-sh4");

        $('#input-sh4').append(option);
      });
      // Seleciona a opção default com todos os sh4s
      $('#input-sh4').val('0');
      $('#input-sh4').trigger('change');
      // Remove o aviso que foi exibido com o trigger de change
      $('#filter-button span').addClass('hidden');
    })
    .then(() => { finishLoading() });

  $('#filter-button').click(() => { handleFilter(); });
}

// Realiza a construção das visualizações com base no filtro
export async function handleFilter() {
  // Remove o aviso de atualização de busca
  $('#filter-button span').addClass('hidden');

  // Fecha o modal de anotações
  $('#save-note-modal .btn-close').trigger('click');

  const cities = $('#input-city').select2('data');
  const products = $('#input-sh4').select2('data');
  const date0 = $('#input-date0').val();
  const date1 = $('#input-date1').val();

  if (products.length == 0) { // Nenhum produto foi selecionado, aborda
    alert('Por favor, selecione um SH4!');
    return;
  }
  if (cities.length == 0) { // Nenhum produto foi selecionado, aborda
    alert('Por favor, selecione uma cidade!');
    return;
  }

  startLoading();
  // cleanDashboard();
  changeLoadingMessage('Buscando dados...')

  const filterHorizon = {
    cities: [],
    products: [],
    beginPeriod: null,
    endPeriod: null
  }

  const filterMap = {
    cities: [],
    products: [],
    beginPeriod: null,
    endPeriod: null,
    sortValue: null
  }

  // Adicionando cidades no filtro
  for (const c of cities) {
    // Todos os produtos selecionados, não é necessário filtro
    if (c.id == '0') {
      filterHorizon.cities = [];
      filterMap.cities = [];
      break;
    }

    // Caso normal, apenas adiciona cidade escolhida
    else {
      filterHorizon.cities.push(c.id);
      filterMap.cities.push(c.id);
    }
  }

  // Adicionando produtos no filtro
  for (const e of products) {
    // Todos as cidades selecionadas, não é necessário filtro
    if (e.id == '0') {
      filterHorizon.products = [];
      break;
    }

    // Caso normal, apenas adiciona produto escolhido
    else {
      filterHorizon.products.push(e.id);
    }
  }

  // Adicionando período de tempo no filtro
  filterHorizon.beginPeriod = date0;
  filterHorizon.endPeriod = date1;
  filterMap.beginPeriod = date0;
  filterMap.endPeriod = date1;

  // Filtro foi construído, agora serão feitos os processamentos:
  try {
    /*
      Constroi o HorizonChart
    
      filterHorizon =
        cities - lista de cidades, [] = todas 
        products - lista de produtos, [] = todos
        beginPeriod - data inicial
        endPeriod - data final
    */
    await buildHorizon(filterHorizon);

    // Espera 100 ms para construção do HorizonChart
    setTimeout(async () => {
      // Lista de produtos com dados (label = uma série do HorizonChart / um produto)
      const products = document.getElementsByClassName('label');
      // Adiciona os produtos com dados no filtro de dados do mapa (filterMap)
      for (const d of products) {
        filterMap.products.push(parseInt(d.innerHTML.split(' - ')[0]));
      }
      console.log('Produtos com dados', filterMap.products);

      // Utilizar 'FOB' ou 'PESO'
      filterMap.sortValue = $('input[name=datatype-radio]:checked', '#container-datatype').val();

      // Seta o filterMap no localStorage, para ser acessado pelo mapa
      await localStorage.setItem('filter', JSON.stringify(filterMap));

      // Atualiza os dados do mapa - filterMap.products[0] -> primeiro produto a ser exibido no mapa
      await updateMap(filterMap.products[0]);

      // await 

      finishLoading();
    }, 100);
  }

  catch (err) {
    // Nenhum dado foi encontrado para os filtros
    $('#warning-modal-text').html('Nenhum dado foi encontrado!');
    const modal = new bootstrap.Modal(document.getElementById('modal-nodata-found'));
    modal.show();

    cleanDashboard();
    localStorage.removeItem('filter');

    finishLoading();
  }
}






// Le um arquivo de cidades ou sh4's
export function readFile(event) {
  // Identifica origem do arquivo e completa o input de acordo
  const sourceElem = event.currentTarget
  console.log('Ler arquivo de:', sourceElem.id)
  const fileModel = (sourceElem.id == 'read-cities-input') ? '#input-city' : '#input-sh4';
  const file = sourceElem.files[0];

  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = (e) => {
    let rows = e.target.result.split('\n');
    let ids = [];

    clearSelect2Input(fileModel);

    for (let i = 1; i < rows.length - 1; i++) {
      let id = rows[i].split(';')[0];
      ids.push(id);
    }

    $(fileModel).val(ids);
    $(fileModel).trigger('change');
    console.log(ids)
  }
}


export function saveNote() {
  $('#save-note-modal').css('display', 'block')
  createDraggable();
  let now = new Date(Date.now());
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dateStr = `${fixMonth(day)}/${fixMonth(month)}/${year} - ${hour}:${fixMonth(minute)}`;

  console.log(now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0])
  now = now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0];

  $('#note-ts-modal').html(dateStr);
  $('#save-note-modal .modal-footer .btn-success').on('click', async () => {
    const title = $('#save-note-modal-title').val();
    const text = $('#save-note-modal-text').val();

    const { filter, map } = await saveQuery();
    if (filter == null) return 'explodiu'

    console.log({ filter, map, note: { title, text }, now })
    const response = await fetch('https://mighty-taiga-07455.herokuapp.com/addnote', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter, map, note: { title, text }, now })
    });
    const data = await response.json();

    $('#save-note-modal .btn-close').trigger('click');
    $('#warning-modal-text').html('A anotação foi salva com sucesso!');
    const modal = new bootstrap.Modal(document.getElementById('modal-nodata-found'));
    modal.show();


  })
}

// Salva a query atual do usuário
async function saveQuery() {
  let filterAux = await JSON.parse(localStorage.getItem('filter'));
  if (filterAux == null) return null;

  const filter = {
    cities: filterAux.cities.length == 0 ? '0' : filterAux.cities.join(';'),
    products: filterAux.length == 0 ? '0' : filterAux.products.join(';'),
    beginPeriod: filterAux.beginPeriod + '-01',
    endPeriod: filterAux.endPeriod + '-01',
    sortValue: filterAux.sortValue
  }

  console.log(filter);
  let map = {
    sh4: $('#select2-input-sh4-map-container').html(),
    numClasses: $('#input-classnumber').val()
  }
  console.log(map);

  // let horizon = {
  //   layers: 
  //   zoom:
  //   scale:
  //   orderType:
  //   orderBy:
  // }

  return { filter, map };
}


export async function listNotes() {
  const response = await fetch('https://mighty-taiga-07455.herokuapp.com/getnotes', {
    method: 'POST',
  });
  const notes = await response.json();

  console.log(notes);
  notes.forEach(d => {
    d['REGISTER_DATE'] = new Date(d['REGISTER_DATE'])
    console.log(d['REGISTER_DATE'].getDate())
    const year = d['REGISTER_DATE'].getFullYear();
    const month = d['REGISTER_DATE'].getMonth() + 1;
    const day = d['REGISTER_DATE'].getDate();
    const hour = d['REGISTER_DATE'].getHours();
    const minute = d['REGISTER_DATE'].getMinutes();
    const dateStr = `${fixMonth(day)}/${fixMonth(month)}/${year} - ${fixMonth(hour)}:${fixMonth(minute)}`;

    $('#list-note-modal-body').append(`
    <div class="list-group-item list-group-item-action" id="${d['ID']}" aria-current="true">
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1" id="note-list-title">${d['TITLE']}</h5>
        <small id="note-list-date">${dateStr}</small>
      </div>
      <p class="mb-1">${d['TEXTO']}</p>
      <small class="redo-search" style="color: blue;">Refazer busca</small>
    </div>`)

    $(`#list-note-modal-body .list-group-item[id='${d['ID']}'] .redo-search`).on('click', () => {
      const data = notes.filter(a => a['ID'] == d['ID'])
      // console.log(data)

      setFilter(data[0]);
    })
  })
}

async function setFilter(data) {
  console.log(data)

  clearSelect2Input('#input-sh4');
  $('#input-sh4').val(data['PRODUCTS'].split(';'));
  $('#input-sh4').trigger('change');

  clearSelect2Input('#input-city');
  $('#input-city').val(data['CITIES'].split(';'));
  $('#input-city').trigger('change');


  const date1 = new Date(data['BEGIN_PERIOD'])
  const date2 = new Date(data['END_PERIOD'])
  $('#input-date0').val(date1.getFullYear() + '-' + fixMonth(date1.getMonth() + 1))
  $('#input-date1').val(date2.getFullYear() + '-' + fixMonth(date2.getMonth() + 1))

  $('#' + data['SORT_VALUE'] + '-datatype-radio').prop('checked', true);

  const modal = bootstrap.Modal.getInstance(document.querySelector('#list-note-modal'))
  modal.hide();

  handleFilter();

  $('#input-classnumber').val(data['NUM_CLASS']);

  // $(`#mainmap-container option[label='${data['MAP_SH4']}']`).attr('selected', 'selected');

}