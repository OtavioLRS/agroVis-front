import { buildCalendar } from './calendar.js';
import { startLoading, finishLoading, changeLoadingMessage, getSortValue, getSortByValue, cleanDashboard, clearSelect2Input, createDraggable, fixMonth } from './extra.js'
import { buildHorizon } from './horizon/horizon.js';
import { updateMap } from './map.js';

// Função principal para a construção dos filtros
export async function buildFilters() {
  // Requisição para buscar os SH4s presentes no banco
  // await fetch('https://mighty-taiga-07455.herokuapp.com/produtos', {
  await fetch('http://127.0.0.1:5000/produtos', {
    // await fetch('https://agrovis-back-flask.herokuapp.com/produtos', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(response => {
      // console.log('SH4', response);

      // Opção padrão com todos os produtos
      $('#input-sh4').append($('<option value=0>Todos os produtos</option>'));

      response.forEach((product) => {
        const option = $('<option></option>');
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

      // Continentes
      const continents = [
        { id: 105, name: 'América Central e Caribe' },
        { id: 107, name: 'América do Norte' },
        { id: 48, name: 'América do Sul' },
        { id: 51, name: 'África' },
        { id: 39, name: 'Ásia (Exclusive Oriente Médio)' },
        { id: 112, name: 'Europa' },
        { id: 61, name: 'Oceania' },
        { id: 41, name: 'Oriente Médio' },
      ]

      $('#input-continent').append($('<option value=0 index=0>Todos os continentes</option>'));
      continents.forEach((c, i) => {
        const option = $('<option></option>')
        option.attr({ "value": c.id });
        option.attr({ "index": i + 1 });
        option.text(c.name);
        option.addClass("option-continent");

        $('#input-continent').append(option);
      })

      $('#input-continent').val('0').trigger('change.select2');
    })
    .then(() => { finishLoading() });
}

// Realiza a construção das visualizações com base no filtro
export async function handleFilter() {
  // Fecha o(s) modal(is) de anotações
  $('#save-note-modal .btn-close').trigger('click');
  $('#read-note-modal .btn-close').trigger('click');

  const cities = $('#input-city').select2('data');
  const products = $('#input-sh4').select2('data');
  const continents = $('#input-continent').select2('data');
  const date0 = $('#input-date0').val();
  const date1 = $('#input-date1').val();

  if (products.length == 0) { // Nenhum produto foi selecionado, aborda
    alert('Por favor, selecione pelo menos um SH4!');
    return;
  }
  if (cities.length == 0) { // Nenhum produto foi selecionado, aborda
    alert('Por favor, selecione pelo menos uma cidade!');
    return;
  }
  if (continents.length == 0) { // Nenhum continente foi selecionado, aborda
    alert('Por favor, selecione pelo menos um continente!');
    return;
  }

  startLoading();

  // Se for query salva, habilita visualização de anotação, senão desativa
  let savedQuery = await JSON.parse(localStorage.getItem('savedQuery'));
  if (savedQuery) $('#sidebar-item-read').removeClass('disabled');
  else $('#sidebar-item-read').addClass('disabled');

  // Fez uma query, habilita opção de salva-la
  $('#sidebar-item-save').removeClass('disabled');

  // Remove o aviso de atualização de busca
  $('#filter-button span').addClass('hidden');

  // cleanDashboard();
  changeLoadingMessage('Buscando dados...')

  const filterHorizon = {
    cities: [],
    products: [],
    continents: [],
    beginPeriod: null,
    endPeriod: null
  }

  const filterMap = {
    cities: [],
    products: [],
    continents: [],
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

  // Adicionando continentes no filtro
  for (const e of continents) {
    // Todos os continentes selecionadas, não é necessário filtro
    if (e.id == '0') {
      filterHorizon.continents = [];
      filterMap.continents = [];
      break;
    }

    // Caso normal, apenas adiciona continente escolhido
    else {
      filterHorizon.continents.push(e.id);
      filterMap.continents.push(e.id);
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
        continents - lista de continentes, [] = todos
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
      // console.log('Produtos com dados', filterMap.products);

      // Utilizar 'FOB' ou 'PESO'
      filterMap.sortValue = $('input[name=datatype-radio]:checked', '#container-datatype').val();

      // Seta o filterMap no localStorage, para ser acessado pelo mapa
      await localStorage.setItem('filter', JSON.stringify(filterMap));

      // Atualiza os dados do mapa
      await updateMap();

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
    // console.log(ids)
  }
}


// Preenche o filtro com base em um objeto recebido por parametro
export async function setFilter(data) {
  console.log(data)

  // Input de SH4
  clearSelect2Input('#input-sh4');
  $('#input-sh4').val(data['PRODUCTS'].split(';'));
  $('#input-sh4').trigger('change');

  // Input de cidades
  clearSelect2Input('#input-city');
  $('#input-city').val(data['CITIES'].split(';'));
  $('#input-city').trigger('change');


  // Input de data inicial e final
  const date1 = new Date(data['BEGIN_PERIOD'])
  const date2 = new Date(data['END_PERIOD'])
  $('#input-date0').val(date1.getFullYear() + '-' + fixMonth(date1.getMonth() + 1))
  $('#input-date1').val(date2.getFullYear() + '-' + fixMonth(date2.getMonth() + 1))

  console.log($('#input-date0').val())
  console.log($('#input-date1').val())

  // Tipo de dado base
  $('#' + data['SORT_VALUE'] + '-datatype-radio').prop('checked', true);

  // Esconde o modal de lista de anotações
  const modal = bootstrap.Modal.getInstance(document.querySelector('#list-note-modal'))
  modal.hide();

  // Realiza a query
  handleFilter();

  // Número de classes selecionadas no mapa
  $('#input-classnumber').val(data['NUM_CLASS']);

  // $(`#mainmap-container option[label='${data['MAP_SH4']}']`).attr('selected', 'selected');
}