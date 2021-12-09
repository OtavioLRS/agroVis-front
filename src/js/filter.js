import { startLoading, finishLoading, changeLoadingMessage, cleanDashboard, clearSelect2Input, fixMonth } from './extra.js'
import { buildHorizon } from './horizon/horizon.js';
import { updateMap, updateMapSh4Input } from './map.js';
import { drawMundiMap, drawMundiMapCountries } from './mundi.js';

/** Constrói os inputs do filtro */
export async function buildFilters() {
  // Opções padrões com todas as opções dos filtros
  $('#input-sh4').append($('<option value=0>Todos os produtos</option>'));
  $('#input-country').append($('<option value=0>Todos os países</option>'));
  $('#input-continent').append($('<option value=0 index=0>Todos os continentes</option>'));

  // Requisição para buscar os SH4s
  // await fetch('https://mighty-taiga-07455.herokuapp.com/produtos', {
  // await fetch('https://agrovis-back-flask.herokuapp.com/produtos', {
  const response = await fetch('http://127.0.0.1:5000/produtos', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });
  const products = await response.json();
  // console.log('SH4', products);

  // SH4s
  products.forEach((product) => {
    const option = $('<option></option>');
    option.attr({ "value": product.CO_SH4 });
    option.text(product.CO_SH4 + " - " + product.NO_SH4_POR);
    option.attr({ "label": product.CO_SH4 });
    option.addClass("option-sh4");

    $('#input-sh4').append(option);
  });

  // Países
  d3.dsv(';', 'src/json/paises.csv', (d) => {
    let cod = d['CO_PAIS'];
    let name = d['NO_PAIS'];
    const option = $('<option></option>')
    option.attr({ "value": cod });
    option.text(name);

    $('#input-country').append(option);
  });

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
  ];

  continents.forEach((c, i) => {
    const option = $('<option></option>')
    option.attr({ "value": c.id });
    option.attr({ "index": i + 1 });
    option.text(c.name);
    option.addClass("option-continent");

    $('#input-continent').append(option);
  });

  // Seleciona as opções defaults nos inputs
  $('#input-sh4').val('0').trigger('change.select2');
  $('#input-country').val('0').trigger('change.select2');
  $('#input-continent').val('0').trigger('change.select2');

  // Remove o aviso que foi exibido com o trigger de change
  $('#filter-button span').addClass('hidden');
}

/** Lê um arquivo CSV para preencher um input do filtro (cidade, sh4, pais ou continente)
 * 
 * @param {event} event evento referente ao click em um input de arquivo
 */
export function readFile(event) {
  /** Identifica origem do arquivo */
  const sourceElem = event.currentTarget
  // console.log('Ler arquivo de', sourceElem.id)

  /** Input a ser preenchido com os dados do CSV */
  const fileModel = `#${sourceElem.id.split('read-')[1]}`;
  // console.log('Input a ser preenchido', fileModel);

  /** Arquivo CSV */
  const file = sourceElem.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = (e) => {
    let rows = e.target.result.split('\n');
    let ids = [];

    // Limpa o input para depois preenche-lo com os novos inputs
    clearSelect2Input(fileModel);

    // Para cada linha do CSV, pega o elemento da primeira coluna, que deve ser um código de um elemento
    for (let i = 1; i < rows.length - 1; i++) {
      let id = rows[i].split(';')[0];
      ids.push(id);
    }

    // Adiciona os ids dos elementos ao input
    $(fileModel).val(ids).trigger('change.select2');
    // console.log('Selecionar códigos', ids)
  }
}

/** Inicia o processo principal de atualização do dashboard */
export async function handleFilter() {
  // Fecha o(s) modal(is) de anotações
  $('#save-note-modal .btn-close').trigger('click');
  $('#read-note-modal .btn-close').trigger('click');

  const cities = $('#input-city').select2('data');
  const products = $('#input-sh4').select2('data');
  const countries = $('#input-country').select2('data');
  const continents = $('#input-continent').select2('data');
  const date0 = $('#input-date0').val();
  const date1 = $('#input-date1').val();
  /** 'country' ou 'continent' */
  const mapDivision = $('input[name=maptype-radio]:checked', '#container-maptype').val();
  /** 'fob' ou 'peso' */
  const sortValue = $('input[name=datatype-radio]:checked', '#container-datatype').val();

  // Divisão do mapa
  let curMapDivision = await localStorage.getItem('mapDivision');

  // Nenhum produto foi selecionado, aborda
  if (products.length == 0) { alert('Por favor, selecione pelo menos um SH4!'); return; }
  // Nenhum produto foi selecionado, aborda
  if (cities.length == 0) { alert('Por favor, selecione pelo menos uma cidade!'); return; }
  // Nenhum paise foi selecionado, aborda
  if (mapDivision == 'country') { if (countries.length == 0) { alert('Por favor, selecione pelo menos um país!'); return; } }
  // Nenhum continente foi selecionado, aborda
  else { if (continents.length == 0) { alert('Por favor, selecione pelo menos um continente!'); return; } }

  startLoading();

  // Se divisão atual for diferente da nova divisão, redesenha o mapa
  if (curMapDivision != mapDivision) {
    await localStorage.setItem('mapDivision', mapDivision);
    mapDivision == 'country' ? drawMundiMapCountries() : drawMundiMap();
  }

  // Se for query salva, habilita visualização de anotação, senão desativa
  let savedQuery = await JSON.parse(localStorage.getItem('savedQuery'));
  if (savedQuery) $('#sidebar-item-read').removeClass('disabled');
  else $('#sidebar-item-read').addClass('disabled');

  // Fez uma query, habilita opção de salva-la
  $('#sidebar-item-save').removeClass('disabled');

  // Remove o aviso de atualização de busca
  $('#filter-button span').addClass('hidden');

  changeLoadingMessage('Buscando dados...');

  const filterHorizon = {
    cities: [],
    products: [],
    countries: [],
    continents: [],
    beginPeriod: null,
    endPeriod: null,
    mapDivision: null,
  }

  const filterMap = {
    cities: [],
    products: [],
    countries: [],
    continents: [],
    beginPeriod: null,
    endPeriod: null,
    sortValue: null,
    mapDivision: null,
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

  // Adicionando paises no filtro
  for (const e of countries) {
    // Todos os paises selecionadas, não é necessário filtro
    if (e.id == '0') {
      filterHorizon.countries = [];
      filterMap.countries = [];
      break;
    }

    // Caso normal, apenas adiciona pais escolhido
    else {
      filterHorizon.countries.push(e.id);
      filterMap.countries.push(e.id);
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
  // Divisão do destinos, por pais ou por continentes
  filterHorizon.mapDivision = mapDivision;
  filterMap.mapDivision = mapDivision;
  // FOB ou Peso sendo utilizado como medida
  filterMap.sortValue = sortValue == 'fob' ? 'VL_FOB' : 'KG_LIQUIDO';


  // Filtro foi construído, agora serão feitos os processamentos:
  try {
    // Constroi o HorizonChart
    await buildHorizon(filterHorizon);

    // Espera 100 ms para construção do HorizonChart
    setTimeout(async () => {
      // Lista de produtos com dados (label = uma série do HorizonChart / um produto)
      const products = document.getElementsByClassName('label');
      // Adiciona os produtos com dados no filtro de dados do mapa (filterMap)
      for (const d of products) { filterMap.products.push(parseInt(d.innerHTML.split(' - ')[0])); }
      // console.log('Produtos com dados', filterMap.products);

      // Seta o filterMap no localStorage
      await localStorage.setItem('filter', JSON.stringify(filterMap));

      // Atualizando o input de alternância de produtos
      await updateMapSh4Input();

      // Atualiza os dados do mapa
      await updateMap(0);

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
}