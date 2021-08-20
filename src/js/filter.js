import { buildCalendar } from './calendar.js';
import { startLoading, finishLoading, changeLoadingMessage, getSortValue, getSortByValue, cleanDashboard, clearSelect2Input, createDraggable, fixMonth } from './extra.js'
import { buildHorizon } from './horizon/horizon.js';
import { updateMap } from './map.js';

// Função principal para a construção dos filtros
export async function buildFilters() {
  // Requisição para buscar os SH4s presentes no banco
  await fetch('http://localhost:3333/produtos', {
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
    });

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
  cleanDashboard();
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

      finishLoading();
    }, 100);
  }

  catch (err) {
    // Nenhum dado foi encontrado para os filtros
    $('#warning-modal-text').html('Nenhum dado foi encontrado!');
    const modal = new bootstrap.Modal(document.getElementById('modal-nodata-found'));
    modal.toggle();

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
    const response = await fetch('http://localhost:3333/addnote', {
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
    modal.toggle();


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


export function listNotes() {
  // $('#list-note-modal').css('display', 'block');

  const modal = new bootstrap.Modal(document.getElementById('list-note-modal'));
  modal.toggle();
}