/*
  Função com processamentos iniciais
*/
export function preLoad() {
  // Limitamento de datas no input do filtro
  $('#input-date1').on("input", limitDate0);

  // Criando o slider de numero de bandas
  $('#overlap-slider').on("input", function () {
    const bandNumber = $(this).val().toString();

    $('#overlap-label').html("Bandas: " + bandNumber);
  });
}

/*
  Inicia a tela de carregamento
*/
export function startLoading() {
  $('.wrapper').addClass('hidden');
  $('.loader-wrapper').fadeIn('fast');
}

/*
  Fecha a tela de carregamento
*/
export function finishLoading() {
  $('.loader-wrapper').fadeOut(() => {
    $('.wrapper').removeClass('hidden');
  });
}

/*
  Muda a mensagem da tela de carregamento
*/
export function changeLoadingMessage(message) {
  $('.loader-message').html(message);
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



export function getSortByValue() {
  return $('input[name=sort]:checked', '#horizonsort-wrapper').val()
}


export function showHorizonLoader() {
  $('#loader-small').removeClass('hidden')
  $('#loader-small').addClass('show')
}

export function hideHorizonLoader() {
  $('#loader-small').removeClass('show')
  $('#loader-small').addClass('hidden')
}
