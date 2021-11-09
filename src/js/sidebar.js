import { closeSidebar, createDraggable, fixMonth } from "./extra";
import { setFilter } from "./filter";

export function handleSidebarExcel() {
  console.log('1')
}

// Ação do botão de ler anotação
export function handleSidebarRead() {
  closeSidebar();
  readNote();
}

// Ação do botão de salvar anotação
export function handleSidebarSave() {
  closeSidebar();
  saveNote();
}

// Ação do botão de abrir lista de anotações
export function handleSidebarList() {
  closeSidebar();

  const modal1 = bootstrap.Modal.getOrCreateInstance(document.getElementById('list-note-modal'));
  modal1.show();
}


// Ação do botão de logout
export async function handleLogout() {
  await localStorage.removeItem('session');

  document.getElementById('logout-link').click();
}









// Mostra o modal com dados da anotação atual
export async function readNote() {
  // Fecha o modal de ler anotação
  $('#read-note-modal .btn-close').on('click', () => {
    $('#read-note-modal-title').val('');
    $('#read-note-modal-text').val('');
    $('#read-note-ts-modal').val('');
    $('#read-note-modal').css('top', '30%')
    $('#read-note-modal').css('bottom', '40%')
    $('#read-note-modal').css('left', '30%')
    $('#read-note-modal').css('right', '30%')
    $('#read-note-modal').css('display', 'none');
    $('#read-note-modal .modal-footer .btn-success').off();
  });

  // Informação da query
  const data = await JSON.parse(localStorage.getItem('queryData'));

  // Formatando a data de registro da anotação em uma string simplificada
  data['REGISTER_DATE'] = new Date(data['REGISTER_DATE']);
  const year = data['REGISTER_DATE'].getFullYear();
  const month = data['REGISTER_DATE'].getMonth() + 1;
  const day = data['REGISTER_DATE'].getDate();
  const hour = data['REGISTER_DATE'].getHours();
  const minute = data['REGISTER_DATE'].getMinutes();
  const dateStr = `${fixMonth(day)}/${fixMonth(month)}/${year} - ${fixMonth(hour)}:${fixMonth(minute)}`;

  // Atualiza titulo, texto e data da anotação no modal
  $('#read-note-modal-title').val(data['TITLE']);
  $('#read-note-modal-text').val(data['TEXTO']);
  $('#read-note-ts-modal').html('Cadastrada em: ' + dateStr);

  // Mostra o modal com os dados
  $('#read-note-modal').css('display', 'block');
  createDraggable('#read-note-modal');
}

// Mostra o modal para salvar um anotação
export function saveNote() {
  // Fecha o modal de salvar anotações
  $('#save-note-modal .btn-close').on('click', () => {
    $('#save-note-modal-title').val('');
    $('#save-note-modal-text').val('');
    $('#save-note-modal').css('top', '30%')
    $('#save-note-modal').css('bottom', '40%')
    $('#save-note-modal').css('left', '30%')
    $('#save-note-modal').css('right', '30%')
    $('#save-note-modal').css('display', 'none');
    $('#save-note-modal .modal-footer .btn-success').off();
  });

  // Insere data de inicio do processo de salvamento no modal
  $('#save-note-ts-modal').html(new Date(Date.now()));

  // Mostra o modal de salvamento de anotação
  $('#save-note-modal').css('display', 'block');
  createDraggable('#save-note-modal');

  // Listener para finalizar o processo de salvamento da anotação
  $('#save-note-modal .modal-footer .btn-success').on('click', async () => {
    // Recupera o titulo e a descrição da anotação inseridas pelo usuário
    const title = $('#save-note-modal-title').val();
    const text = $('#save-note-modal-text').val();

    // Salva o 'state' da query atual para reprodução futura
    const { filter, map } = await saveQuery();

    // console.log({ filter, map, note: { title, text }, now })
    // const response = await fetch('https://mighty-taiga-07455.herokuapp.com/addnote', {
    // const response = await fetch('https://agrovis-back-flask.herokuapp.com/anotacoes', {
    const response = await fetch('http://127.0.0.1:5000/anotacoes', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter, map, note: { title, text } })
    });

    // Fecha o modal de salvamento, e exibe um aviso de processo concluído
    $('#save-note-modal .btn-close').trigger('click');
    $('#warning-modal-text').html('A anotação foi salva com sucesso!');
    const modal = new bootstrap.Modal(document.getElementById('modal-nodata-found'));
    modal.show();
  })
}

// Mostra o modal com a lista de anotações disponíveis
export async function listNotes() {
  // Recupera a lista de anotações
  // const response = await fetch('https://mighty-taiga-07455.herokuapp.com/getnotes', {
  // const response = await fetch('https://agrovis-back-flask.herokuapp.com/anotacoes', {
  const response = await fetch('http://127.0.0.1:5000/anotacoes', {
    method: 'GET',
  });
  const notes = await response.json();

  // Para cada anotação
  notes.forEach(d => {
    // Formata a data
    let fixDate = new Date(d['REGISTER_DATE']);
    fixDate.setHours(fixDate.getHours() + 3);
    d['REGISTER_DATE'] = fixDate;

    const year = d['REGISTER_DATE'].getFullYear();
    const month = d['REGISTER_DATE'].getMonth() + 1;
    const day = d['REGISTER_DATE'].getDate();
    const hour = d['REGISTER_DATE'].getHours();
    const minute = d['REGISTER_DATE'].getMinutes();
    const dateStr = `${fixMonth(day)}/${fixMonth(month)}/${year} - ${fixMonth(hour)}:${fixMonth(minute)}`;

    // Insere a anotação no modal
    $('#list-note-modal-body').append(`
    <div class="list-group-item list-group-item-action" id="${d['ID']}" aria-current="true">
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1" id="note-list-title">${d['TITLE']}</h5>
        <small id="note-list-date">${dateStr}</small>
      </div>
      <p class="mb-1">${d['TEXTO']}</p>
      <small class="redo-search" style="color: blue;">Refazer busca</small>
    </div>`)

    // Adiciona o listener para reprodução das anotações
    $(`#list-note-modal-body .list-group-item[id='${d['ID']}'] .redo-search`).on('click', async () => {
      const data = notes.filter(a => a['ID'] == d['ID']);

      // Sinaliza que a aplicação está reproduzindo uma anotação
      await localStorage.setItem('savedQuery', true);
      await localStorage.setItem('queryData', JSON.stringify(d));

      // Preenche o filtro com os dados da anotação escolhida e a reproduz
      setFilter(data[0]);
    })
  })
}

// Salva a query atual do usuário
async function saveQuery() {
  let filterAux = await JSON.parse(localStorage.getItem('filter'));
  if (filterAux == null) return null;

  const filter = {
    cities: filterAux.cities.length == 0 ? '0' : filterAux.cities.join(';'),
    products: filterAux.length == 0 ? '0' : filterAux.products.join(';'),
    beginPeriod: filterAux.beginPeriod + '-15',
    endPeriod: filterAux.endPeriod + '-15',
    sortValue: filterAux.sortValue
  }

  // console.log(filter);
  let map = {
    sh4: $('#select2-input-sh4-map-container').html(),
    numClasses: $('#input-classnumber').val()
  }
  // console.log(map);

  return { filter, map };
}
