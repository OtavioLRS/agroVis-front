import { changeMapTitle, cleanCity } from "./map";

/*
  Função com processamentos iniciais
*/
export function preLoad() {
  // Limitamento de datas no input do filtro
  $('#input-date1').on("input", limitDate0);

  // Criando o slider de numero de bandas
  $('#overlap-slider').on("input", function () {
    const bandNumber = $(this).val().toString();

    $('#overlap-label').html("Layers: " + bandNumber);
  });

  $('#input-sh4').select2();
  $('#input-city').select2();
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
  Cria uma div arrastavel com conteudo 'data'
*/
export function createDraggable(data) {
  let div = document.createElement('div');

  let posX1 = 0, posY1 = 0, posX0 = 0, poxY0 = 0;
  $(div).text($('.option-sh4').filter(function () { return this.value == data.name }).text())
    .addClass('draggable')
    .attr('id', 'draggable-' + data.name)
    .on('mousedown', dragMouseDown)
    .on('dblclick', function () { $(this).remove() });

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
    div.style.top = (div.offsetTop - posY1) + "px";
    div.style.left = (div.offsetLeft - posX1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }

  return div;
}

/*
  Formata o valor com virgulas a cada 3 espaços
*/
export function formatValues(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

// Recupera o tipo de escala utilizado para construir o gráfico
export function getScaleByValue() {
  return $('input[name=scale-radio]:checked', '#horizonscale-wrapper').val()
}

// Recupera o tipo de dado que se deseja construir o grafico
export function getSortByValue() {
  return $('input[name=sort-radio]:checked', '#horizonsort-wrapper').val()
}

// Recupera o tipo de dados na qual se deve ordenar o grafico
export function getSortValue() {
  return $('input[name=datatype-radio]:checked', '#container-datatype').val()
}

export function blurElement(elem) {
  $(elem).addClass('blured');
}

export function unblurElement(elem) {
  $(elem).removeClass('blured');
}

// Exibe o loader de ordenação do HorizonChart
export function showHorizonLoader(elem) {
  // blurElement(elem);
  $('#horizon-wrapper').addClass('blured');
  $('.soft-loader-wrapper').removeClass('hidden');
  $('.soft-loader-wrapper').addClass('show');
}

// Esconde o loader de ordenação do HorizonChart
export function hideHorizonLoader(elem) {
  $('.soft-loader-wrapper').removeClass('show');
  $('.soft-loader-wrapper').addClass('hidden');
  $('#horizon-wrapper').removeClass('blured');
  // unblurElement(elem);
}

// Limpa completamente a interface do Dashboard
export function cleanDashboard() {
  // Deleta o Horizon Chart anterior
  d3.select('#horizon-wrapper').select('div').remove();
  // Limpa o mapa
  $('.city-active').each(function () {
    cleanCity($(this));
  });
  // Retira o titulo do mapa
  changeMapTitle('---');
  // Limpa o input de escolha de produto exibido no mapa
  $('#input-sh4-map-container').html('');
}