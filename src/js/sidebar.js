import { closeSidebar, createDraggable, fixMonth } from "./extra";
import { setFilter } from "./filter";

export function handleSidebarExcel() {
  console.log('1')
}

export function handleSidebarRead() {
  closeSidebar();
  readNote();
}

export function handleSidebarSave() {
  closeSidebar();
  saveNote();
}

export function handleSidebarList() {
  closeSidebar();

  const modal1 = bootstrap.Modal.getOrCreateInstance(document.getElementById('list-note-modal'));
  modal1.show();
}










export function handleLogout() {

}





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

  const data = await JSON.parse(localStorage.getItem('queryData'));

  // data['REGISTER_DATE'] = new Date(data['REGISTER_DATE'].substring(0, data['REGISTER_DATE'].length - 1));
  data['REGISTER_DATE'] = new Date(data['REGISTER_DATE']);

  const year = data['REGISTER_DATE'].getFullYear();
  const month = data['REGISTER_DATE'].getMonth() + 1;
  const day = data['REGISTER_DATE'].getDate();
  const hour = data['REGISTER_DATE'].getHours();
  const minute = data['REGISTER_DATE'].getMinutes();
  const dateStr = `${fixMonth(day)}/${fixMonth(month)}/${year} - ${fixMonth(hour)}:${fixMonth(minute)}`;

  $('#read-note-modal-title').val(data['TITLE']);
  $('#read-note-modal-text').val(data['TEXTO']);
  $('#read-note-ts-modal').html('Cadastrada em: ' + dateStr);

  $('#read-note-modal').css('display', 'block');
  createDraggable('#read-note-modal');
}


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

  $('#save-note-modal').css('display', 'block');
  createDraggable('#save-note-modal');
  let now = new Date(Date.now());
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const seconds = now.getSeconds();
  const dateStr = `${fixMonth(day)}/${fixMonth(month)}/${year} - ${hour}:${fixMonth(minute)}`;
  // console.log(now)

  now = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + seconds;
  // console.log(now)

  $('#save-note-ts-modal').html(dateStr);
  $('#save-note-modal .modal-footer .btn-success').on('click', async () => {
    const title = $('#save-note-modal-title').val();
    const text = $('#save-note-modal-text').val();

    const { filter, map } = await saveQuery();
    if (filter == null) return 'explodiu'

    // console.log({ filter, map, note: { title, text }, now })
    const response = await fetch('https://mighty-taiga-07455.herokuapp.com/addnote', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter, map, note: { title, text }, now })
    });
    // const data = await response.json();

    $('#save-note-modal .btn-close').trigger('click');
    $('#warning-modal-text').html('A anotação foi salva com sucesso!');
    const modal = new bootstrap.Modal(document.getElementById('modal-nodata-found'));
    modal.show();
  })
}


export async function listNotes() {
  const response = await fetch('https://mighty-taiga-07455.herokuapp.com/getnotes', {
    method: 'POST',
  });
  const notes = await response.json();

  notes.forEach(d => {
    d['REGISTER_DATE'] = new Date(d['REGISTER_DATE'].substring(0, d['REGISTER_DATE'].length - 1));

    const year = d['REGISTER_DATE'].getFullYear();
    const month = d['REGISTER_DATE'].getMonth() + 1;
    const day = d['REGISTER_DATE'].getDate();
    const hour = d['REGISTER_DATE'].getHours();
    const minute = d['REGISTER_DATE'].getMinutes();
    const dateStr = `${fixMonth(day)}/${fixMonth(month)}/${year} - ${fixMonth(hour)}:${fixMonth(minute)}`;

    $('#list-note-modal-body').append(`
    <div class="list-group-item list-group-item-action" id="${d['ID']}" aria-current="true">
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1" id="note-list-title">${d['TITLE']}</h5>
        <small id="note-list-date">${dateStr}</small>
      </div>
      <p class="mb-1">${d['TEXTO']}</p>
      <small class="redo-search" style="color: blue;">Refazer busca</small>
    </div>`)

    $(`#list-note-modal-body .list-group-item[id='${d['ID']}'] .redo-search`).on('click', async () => {
      const data = notes.filter(a => a['ID'] == d['ID']);
      console.log('data', data);

      await localStorage.setItem('savedQuery', true);
      await localStorage.setItem('queryData', JSON.stringify(d));
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
