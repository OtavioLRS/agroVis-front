import { closeSidebar } from "./extra";
import { saveNote } from "./filter"

export function handleSidebarExcel() {
  console.log('1')
}


export function handleSidebarSave() {
  closeSidebar();
  saveNote();
}


export function handleSidebarList() {
  closeSidebar();

  const modal = new bootstrap.Modal(document.getElementById('list-note-modal'));
  modal.show();
}


export function handleSidebarRead() {
  console.log('4')
}







export function handleLogout() {

}