import { readFile, handleFilter } from "./filter";
import { hideClickAlert } from "./horizon/horizon";
import { changeMapTitle, cleanPolygon } from "./map";
import { handleSidebarExcel, handleSidebarList, handleSidebarRead, handleSidebarSave, handleLogout, listNotes } from "./sidebar";

/** Função com processamentos iniciais */
export async function preLoad() {
  // Nome do usuário
  const data = await JSON.parse(localStorage.getItem('session'));
  $('#sidebar-username').html(data.name);

  // Divisão do mapa
  await localStorage.setItem('mapDivision', 'country');

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

  // Listeners de mudança de mapa
  $('#country-maptype-radio').on('change', async () => {
    hideInput('continent');
    showInput('country');
    if (!$('#see-continent-modal').hasClass('hidden'))
      $('#see-country-modal').removeClass('hidden');

    $('#see-continent-modal').addClass('hidden');
  });

  $('#continent-maptype-radio').on('change', async () => {
    hideInput('country');
    showInput('continent');
    if (!$('#see-country-modal').hasClass('hidden'))
      $('#see-continent-modal').removeClass('hidden');

    $('#see-country-modal').addClass('hidden');

  });

  // Construindo os select2
  $('#input-sh4').select2({ placeholder: 'Escolha os SH4s!', allowClear: true });
  $('#input-city').select2({
    placeholder: 'Escolhas as cidades!', allowClear: true,
    sorter: data => data.sort((a, b) => a.title.localeCompare(b.title))
  });
  $('#input-country').select2({
    placeholder: 'Escolha os paises!', allowClear: true
  });
  $('#input-continent').select2({
    placeholder: 'Escolha os continentes!', allowClear: true,
    sorter: data => data.sort((a, b) => a.index > b.index)
  });

  createDraggable("#see-cities-modal");
  createDraggable("#see-sh4-modal");
  createDraggable("#see-country-modal");
  createDraggable("#see-continent-modal");

  // Listeners para abrir os modals com os conteúdos de cada um dos filtros
  $("#see-cities-icon").click(function () {
    $("#see-cities-modal").removeClass('hidden');
  });
  $("#see-sh4-icon").click(function () {
    $("#see-sh4-modal").removeClass('hidden');
  });
  $("#see-country-icon").click(function () {
    $("#see-country-modal").removeClass('hidden');
  });
  $("#see-continent-icon").click(function () {
    $("#see-continent-modal").removeClass('hidden');
  });


  // Listeners dos botões de fechar os modals do filtro
  $("#see-cities-modal .btn-close").click(function () {
    $("#see-cities-modal").addClass('hidden');
  });
  $("#see-sh4-modal .btn-close").click(function () {
    $("#see-sh4-modal").addClass('hidden');
  });
  $("#see-country-modal .btn-close").click(function () {
    $("#see-country-modal").addClass('hidden');
  });
  $("#see-continent-modal .btn-close").click(function () {
    $("#see-continent-modal").addClass('hidden');
  });

  // Atualiza os modals de quais elementos estão selecionados
  $("#input-city").on('change', function () {
    $("#see-cities-modal .modal-body").html('<table class="table table-bordered table-hover"><tbody></tbody></table>');
    const cidades = $(this).select2('data');
    cidades.map(d => d.id).indexOf('0') != -1 ?
      $("#see-cities-modal .modal-body tbody").append(`
      <tr> <td scope="row"> Todas as cidades </td> </tr>
    `) :
      cidades.forEach((d) => {
        $("#see-cities-modal .modal-body tbody").append(`
        <tr> <td scope="row"> ${d.text} </td> </tr>
      `)
      })
  });

  $("#input-sh4").on('change', function () {
    $("#see-sh4-modal .modal-body").html('<table class="table table-bordered table-hover"><tbody></tbody></table>');
    const sh4 = $(this).select2('data');
    sh4.map(d => d.id).indexOf('0') != -1 ?
      $("#see-sh4-modal .modal-body tbody").append(`
    <tr> <td scope="row"> Todos os produtos </td> </tr>
  `) :
      sh4.forEach((d) => {
        $("#see-sh4-modal .modal-body tbody").append(`
      <tr> <td scope="row"> ${d.text} </td> </tr>
      `)
      })
  });

  $("#input-country").on('change', function () {
    $("#see-country-modal .modal-body").html('<table class="table table-bordered table-hover"><tbody></tbody></table>');
    const paises = $(this).select2('data');
    paises.map(d => d.id).indexOf('0') != -1 ?
      $("#see-country-modal .modal-body tbody").append(`
    <tr> <td scope="row"> Todos os países </td> </tr>
  `) :
      paises.forEach((d) => {
        $("#see-country-modal .modal-body tbody").append(`
      <tr> <td scope="row"> ${d.text} </td> </tr>
      `)
      })
  });

  $("#input-continent").on('change', function () {
    $("#see-continent-modal .modal-body").html('<table class="table table-bordered table-hover"><tbody></tbody></table>');
    const continentes = $(this).select2('data');
    continentes.map(d => d.id).indexOf('0') != -1 ?
      $("#see-continent-modal .modal-body tbody").append(`
    <tr> <td scope="row"> Todos os continentes </td> </tr>
  `) :
      continentes.forEach((d) => {
        $("#see-continent-modal .modal-body tbody").append(`
        <tr> <td scope="row"> ${d.text} </td> </tr>
      `)
      })

  });

  // Esconde o input de continentes, que está escondido por padrão
  hideInput('continent');

  // 'Esc' fecha aviso
  $(document).keydown(function (e) {
    if (e.keyCode === 27) {
      // console.log('esc')
      hideClickAlert();
    }
  });

  // Mostra um ponto vermelho no botão de filtragem, sinalizando que a filtragem atual pode ser atualizada
  $('#filter-container').on('change', async function () {
    $('#filter-button span').removeClass('hidden');
  });

  // Listener de leitura de arquivo com lista de cidades para o filtro
  $('#read-input-city').on('change', (e) => { readFile(e); $('#read-input-city').val(''); });
  // Listener de leitura de arquivo com lista de sh4s para o filtro
  $('#read-input-sh4').on('change', (e) => { readFile(e); $('#read-input-sh4').val(''); });
  // Listener de leitura de arquivo com lista de paises para o filtro
  $('#read-input-country').on('change', (e) => { readFile(e); $('#read-input-country').val(''); });
  // Listener de leitura de arquivo com lista de continentes para o filtro
  $('#read-input-continent').on('change', (e) => { readFile(e); $('#read-input-continent').val(''); });

  // Mostra as notas
  $('#list-note-modal').on('show.bs.modal', listNotes);

  // Quando fechar o modal de lista de anotações
  $('#list-note-modal').on('hidden.bs.modal', () => {
    $('#list-note-modal-body').html('');
  });

  // Download do arquivo selecionado
  $('#download-button').on('click', () => {
    let choosen = $('#download-files :selected').val();
    $(`#download-${choosen}`)[0].click();
  })

  // Quando selecionar a opção global em um input do filtro, desseleciona todas as outras
  $('.select2-flag').on('change', function () {
    const selected = $(this).select2('data').map(opt => opt.id);
    // console.log(selected, selected.indexOf('0'))
    if (selected.indexOf('0') != -1) {
      $(this).val('0').trigger('change.select2');
    }
  })
}

/** Inicia a tela de carregamento */
export function startLoading() {
  // $('.wrapper').addClass('hidden');
  $('.hard-loader-wrapper').fadeIn('fast');
}

/** Fecha a tela de carregamento */
export function finishLoading() {
  $('.hard-loader-wrapper').fadeOut(() => {
    // $('.wrapper').removeClass('hidden');
  });
}

/** Esconde um input de países ou continentes no filtro
 * 
 * @param {('country'|'continent')} inputName qual input deseja esconder
 */
export function hideInput(inputName) {
  $(`#wrapper-input-${inputName}`).addClass('hidden');
  $(`#wrapper-input-${inputName} span`).addClass('hidden');
  $(`#wrapper-input-${inputName} svg`).addClass('hidden');
  $(`#label-${inputName}`).addClass('hidden');
}

/** Mostra um input de países ou continentes no filtro
 * 
 * @param {('country'|'continent')} inputName qual input deseja mostrar
 */
export function showInput(inputName) {
  $(`#wrapper-input-${inputName}`).removeClass('hidden');
  $(`#wrapper-input-${inputName} span`).removeClass('hidden');
  $(`#wrapper-input-${inputName} svg`).removeClass('hidden');
  $(`#label-${inputName}`).removeClass('hidden');
}

/** Muda a mensagem da tela de carregamento
 * 
 * @param {string} message mensagem a ser mostrada
 */
export function changeLoadingMessage(message) {
  $('.loader-message').html(message);
}

/** Transforma um modal em draggable
 * 
 * @param {('.class'|'#id')} elem
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

/** Formata um número com virgulas a cada 3 casas
 * 
 * @param {number} num número a ser formatado
 * @returns {string}
 */
export function formatValues(num) {
  let numAsString = num.toString().replace(/\D/g, '');
  let characters = numAsString.split('').reverse();

  let parts = [];
  for (let i = 0; i < characters.length; i += 3) {
    let part = characters.slice(i, i + 3).reverse().join("");
    parts.unshift(part);
  }
  return parts.join(",");
}

/** Retira a formatação de um número 
 * 
 * @param {string} num número (string) que deve perder a formatação
 * @returns {number}
 */
export function unformatValues(num) {
  let numNoCommas = num.toString().replaceAll(',', '');
  return parseInt(numNoCommas);
}

/** Formata adiciona um 0 na frente de um numero de 1 a 9
 * 
 * @param {number} month numero de 1 a 9
 * @returns {string}
 */
export function fixMonth(month) {
  return month <= 9 ? '0' + month.toString() : month;
}

/** Limita a data de `input-date0`, baseado no valor de `input-date1` */
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

/** Compara duas datas no formato string `YYYY-MM`
 * 
 * @param {string} d0 `YYYY-MM`
 * @param {string} d1 `YYYY-MM`
 * @returns {boolean} `True` - date0 > date1 | `False` - date0 <= date1
 */
export function compareDates(d0, d1) {
  // console.log(d0, d1)
  const date0 = new Date(d0.substring(0, 4), d0.substring(5));
  const date1 = new Date(d1.substring(0, 4), d1.substring(5));

  return date0.getTime() > date1.getTime();
}

/** Recupera o tipo de dado que se deseja utilizar como unidade principal
 * 
 * @returns {('fob'|'peso')}
 */
export async function getSortValue() {
  const filter = await JSON.parse(localStorage.getItem('filter'));
  // console.log(filter)
  return filter['sortValue'];
}

/** Recupera o tipo de dados na qual se deve ordenar o horizonChart
 * 
 * @returns {('fob'|'peso')}
 */
export function getSortByValue() {
  return $('input[name=sort-radio]:checked', '#horizonsort-wrapper').val();
}

/** Recupera a ordem que os dados devem ser ordenados no horizonChart
 * 
 * @returns {('asc'|'dec')}
 */
export function getSortOrder() {
  return $('input[name=sortorder-radio]:checked', '#horizonsort-wrapper').val();
}

/** Recupera o tipo de escala utilizado para construir o horizonChart
 * 
 * @returns {('unit'|'global')}
 */
export function getScaleByValue() {
  return $('input[name=scale-radio]:checked', '#horizonscale-wrapper').val();
}

/** Aplica efeito de blur em um seletor css
 * 
 * @param {('.class'|'#id')} elem
 */
export function blurElement(elem) {
  $(elem).addClass('blured');
}

/** Remove efeito de blur de um seletor css
 * 
 * @param {('.class'|'#id')} elem
 */
export function unblurElement(elem) {
  $(elem).removeClass('blured');
}

/** Insere blur em um elemento e mostra seu loader (irmão)
 * 
 * @param {('.class'|'#id')} elem
 */
export function showBluredLoader(elem) {
  $(`${elem}`).addClass('blured');
  $(`${elem} ~ .soft-loader-wrapper`).removeClass('hidden');
  $(`${elem} ~ .soft-loader-wrapper`).addClass('show');
}

/** Retira o blur de um elemento e esconde seu loader (irmão)
 * 
 * @param {('.class'|'#id')} elem
 */
export function hideBluredLoader(elem) {
  $(`${elem} ~ .soft-loader-wrapper`).removeClass('show');
  $(`${elem} ~ .soft-loader-wrapper`).addClass('hidden');
  $(`${elem}`).removeClass('blured');
}

/** Remove todas as options selecionadas de um elemento Select2
 * 
 * @param {('.class'|'#id')} elem selector do elemento `Select2` a ser limpo
 */
export function clearSelect2Input(elem) {
  $(elem).val(null).trigger('change.select2');
}

/** Calcula a mediana de um array
 * 
 * @param {number[]} values valores para se calcular a mediana
 * @returns {number} mediana
 */
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

/** Fecha a sidebar */
export function closeSidebar() {
  $('#close-sidebar-button').trigger('click');
}

/** Limpa completamente a interface do Dashboard */
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