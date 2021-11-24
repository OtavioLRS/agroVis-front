import { readFile, handleFilter } from "./filter";
import { hideClickAlert } from "./horizon/horizon";
import { changeMapTitle, cleanPolygon } from "./map";
import { handleSidebarExcel, handleSidebarList, handleSidebarRead, handleSidebarSave, handleLogout, listNotes } from "./sidebar";

/*
  Função com processamentos iniciais
*/
export async function preLoad() {
  // Nome do usuário
  const data = await JSON.parse(localStorage.getItem('session'));
  $('#sidebar-username').html(data.name);

  // Funções da sidebar
  $('#sidebar-item-excel').on("click", handleSidebarExcel);
  $('#sidebar-item-save').on("click", handleSidebarSave);
  $('#sidebar-item-list').on("click", handleSidebarList);
  $('#sidebar-item-read').on("click", handleSidebarRead);
  $('#sidebar-item-logout').on("click", handleLogout);

  // Listener do botão Filtrar
  $('#filter-button').click(async () => {
    await localStorage.setItem('savedQuery', false);
    handleFilter();
  });

  // Limite de datas no input do filtro
  $('#input-date1').on("input", limitDate0);

  // Criando o slider de numero de bandas
  $('#overlap-slider').on("input", function () {
    const bandNumber = $(this).val().toString();

    $('#overlap-label').html("Layers: " + bandNumber);
  });

  // Construindo os select2
  $('#input-sh4').select2({ placeholder: 'Escolha os SH4s!', allowClear: true });
  $('#input-city').select2({
    placeholder: 'Escolhas as cidades!', allowClear: true,
    sorter: data => data.sort((a, b) => a.title.localeCompare(b.title))
  });
  $('#input-continent').select2({
    placeholder: 'Escolha os continentes!', allowClear: true,
    sorter: data => data.sort((a, b) => a.index > b.index)
  });

  // 'Esc' fecha aviso
  $(document).keydown(function (e) {
    if (e.keyCode === 27) {
      console.log('esc')
      hideClickAlert();
    }
  });

  // Mostra um ponto vermelho no botão de filtragem, sinalizando que a filtragem atual pode ser atualizada
  $('#filter-container').on('change', async function () {
    $('#filter-button span').removeClass('hidden');
  });

  // Listener de leitura de arquivo com lista de cidades para o filtro
  $('#read-cities-input').on('change', (e) => {
    readFile(e);
    $('#read-cities-input').val('');
  })

  // Listener de leitura de arquivo com lista de sh4s para o filtro
  $('#read-sh4-input').on('change', (e) => {
    readFile(e);
    $('#read-sh4-input').val('');
  })

  // Mostra as notas
  $('#list-note-modal').on('show.bs.modal', listNotes);

  // Quando fechar o modal de lista de anotações
  $('#list-note-modal').on('hidden.bs.modal', () => {
    $('#list-note-modal-body').html('');
  });

  // Quando selecionar a opção global em um input do filtro, desseleciona todas as outras
  $('.select2-flag').on('change', function () {
    const selected = $(this).select2('data').map(opt => opt.id);
    // console.log(selected, selected.indexOf('0'))
    if (selected.indexOf('0') != -1) {
      $(this).val('0').trigger('change.select2')
    }
  })
}

/*
  Inicia a tela de carregamento
*/
export function startLoading() {
  // $('.wrapper').addClass('hidden');
  $('.hard-loader-wrapper').fadeIn('fast');
}

/*
  Fecha a tela de carregamento
*/
export function finishLoading() {
  $('.hard-loader-wrapper').fadeOut(() => {
    // $('.wrapper').removeClass('hidden');
  });
}

/*
  Muda a mensagem da tela de carregamento
*/
export function changeLoadingMessage(message) {
  $('.loader-message').html(message);
  // $('.sr-only').html(message);
}

/*
  Transforma o modal em draggable
*/
export function createDraggable(elem) {
  let posX1 = 0, posY1 = 0, posX0 = 0, poxY0 = 0;
  $(elem + ' .modal-header').on('mousedown', dragMouseDown)

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // Posição inicial
    posX0 = e.clientX;
    poxY0 = e.clientY;
    // Quanto soltar o mouse, para o movimento
    document.onmouseup = closeDragElement;
    // Quando mover, atualiza
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    posX1 = posX0 - e.clientX;
    posY1 = poxY0 - e.clientY;
    posX0 = e.clientX;
    poxY0 = e.clientY;
    // set the element's new position:
    $(elem)[0].style.top = ($(elem)[0].offsetTop - posY1) + "px";
    $(elem)[0].style.left = ($(elem)[0].offsetLeft - posX1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }

  // return div;
}

/*
  Formata o valor com virgulas a cada 3 espaços
*/
export function formatValues(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/*
  Formata um mês adicionando 0 a ele
*/
export function fixMonth(x) {
  return x <= 9 ? '0' + x.toString() : x;
}

/*
  Limita a data de 'input-date0', baseado no valor de 'input-date1'
  'input-date0' - input com a data inicial 
  'input-date1' - input com a data final
*/
export function limitDate0() {
  // Data limite é retirada do 'input-date1'
  let fim = $('#input-date1').val();
  // Limita a data do 'input-date0' para a data limite 'fim'
  $('#input-date0').attr('max', fim);

  // Caso o valor de 'input-date0' for maior que a data limite,
  if (compareDates($('#input-date0').val(), fim))
    // valor é atualizado para data limite
    $('#input-date0').val(fim)
}

/* 
  Compara datas no formato string 'YYYY-MM'
  True - date0 > date1 
  False - date0 <= date1
*/
export function compareDates(d0, d1) {
  console.log(d0, d1)
  const date0 = new Date(d0.substring(0, 4), d0.substring(5));
  const date1 = new Date(d1.substring(0, 4), d1.substring(5));

  return date0.getTime() > date1.getTime();
}

/* 
  Recupera o tipo de dado que se deseja utilizar como unidade principal
  'peso' ou 'fob'
*/
export async function getSortValue() {
  const filter = await JSON.parse(localStorage.getItem('filter'));
  // console.log(filter)
  return filter['sortValue'];
}

/* 
  Recupera o tipo de dados na qual se deve ordenar o horizonChart
  'peso' ou 'fob'
*/
export function getSortByValue() {
  return $('input[name=sort-radio]:checked', '#horizonsort-wrapper').val();
}

/* 
  Recupera a ordem que os dados devem ser ordenados no horizonChart
  'asc' ou 'dec'
*/
export function getSortOrder() {
  return $('input[name=sortorder-radio]:checked', '#horizonsort-wrapper').val();
}

/* 
  Recupera o tipo de escala utilizado para construir o gráfico
  Individual ou Global
*/
export function getScaleByValue() {
  return $('input[name=scale-radio]:checked', '#horizonscale-wrapper').val()
}

// Aplica efeito de blur em um elemento HTML
export function blurElement(elem) {
  $(elem).addClass('blured');
}

// Remove efeito de blur em um elemento HTML
export function unblurElement(elem) {
  $(elem).removeClass('blured');
}

// Exibe o loader e insere blur em um elemento
export function showBluredLoader(elem) {
  $(`${elem}`).addClass('blured');
  $(`${elem} ~ .soft-loader-wrapper`).removeClass('hidden');
  $(`${elem} ~ .soft-loader-wrapper`).addClass('show');
}

// Esconde o loader e retira o blur de um elemento
export function hideBluredLoader(elem) {
  $(`${elem} ~ .soft-loader-wrapper`).removeClass('show');
  $(`${elem} ~ .soft-loader-wrapper`).addClass('hidden');
  $(`${elem}`).removeClass('blured');
}

// Limpa completamente a interface do Dashboard
export function cleanDashboard() {
  // Deleta o Horizon Chart anterior
  d3.select('#horizon-wrapper').select('div').remove();
  // Limpa o mapa
  $('.polygon-active').each(function () {
    cleanPolygon($(this));
  });
  // Retira o titulo do mapa
  changeMapTitle('---');
  // Limpa o input de escolha de produto exibido no mapa
  $('#input-sh4-map-container').html('');

  // Limpa a legenda do mapa
  $('.map-legend').html('');

  // Limpa o calendário
  $('#calendar-title-wrapper').html('');
  $('.calendar-square-color').css('background-color', 'white');
  $('.calendar-square-text').html('');
  $('.calendar-square').each(function () { $(this).removeClass('calendar-square-bordered') });

  // Nenhuma query feita, desabilita opção de salvamento de query
  $('#sidebar-item-save').addClass('disabled');
}

// Remove todas as options selecionadas de um elemento Select2
export function clearSelect2Input(path) {
  $(path).val(null);
  $(path).trigger('change');
}

// Calcular mediana de um array
export function median(values) {
  if (values.length === 0) return 0;

  values.sort(function (a, b) {
    return a - b;
  });

  let half = Math.floor(values.length / 2);

  if (values.length % 2)
    return values[half];

  return (values[half - 1] + values[half]) / 2.0;
}

// Fechar a sidebar
export function closeSidebar() {
  $('#close-sidebar-button').trigger('click');
}