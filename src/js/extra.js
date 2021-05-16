// Exibe a tela de carregamento
export function startLoading() {
  $('.wrapper').addClass('hidden');
  $('.loader-wrapper').fadeIn('fast');
}

// Encerra a tela de carregamento
export function finishLoading() {
  $('.loader-wrapper').fadeOut(() => {
    $('.wrapper').removeClass('hidden');
  });
}

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