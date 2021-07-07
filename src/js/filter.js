import { startLoading, finishLoading, changeLoadingMessage, getSortValue, getSortByValue, cleanDashboard } from './extra.js'
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
      $('#input-sh4').append($('<option value=0 selected>Todos os produtos</option>'));

      response.forEach((product) => {
        const option = $('<option></option>')
        option.attr({ "value": product.CO_SH4 });
        option.text(product.CO_SH4 + " - " + product.NO_SH4_POR);
        option.attr({ "label": product.CO_SH4 });
        option.addClass("option-sh4");

        $('#input-sh4').append(option);
      });
    });

  $('#filter-button').click(() => { handleFilter(); });
}

// Realiza a construção das visualizações com base no filtro
export async function handleFilter() {
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
    endPeriod: null
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

      // Seta o filterMap no localStorage, para ser acessado pelo mapa
      await localStorage.setItem('filter', JSON.stringify(filterMap));

      // Atualiza os dados do mapa - filterMap.products[0] -> primeiro produto a ser exibido no mapa
      await updateMap(filterMap.products[0]);

      finishLoading();
    }, 100);
  }

  catch (err) {
    // Nenhum dado foi encontrado para os filtros
    const modal = new bootstrap.Modal(document.getElementById('modal-nodata-found'));
    modal.toggle();

    cleanDashboard();

    finishLoading();
  }
}