import "@babel/polyfill";
import { preLoad, startLoading, changeLoadingMessage, finishLoading } from './extra.js'
import { drawMainMap, getCitiesNames } from "./map.js";
import { buildFilters, handleFilter } from "./filter.js";
import { hideClickAlert } from "./horizon/horizon.js";
import { buildCalendar } from "./calendar.js";

// Pré coisas
changeLoadingMessage('Realizando pré-processamentos...')
preLoad();

// Mapa
changeLoadingMessage('Desenhando o mapa...')
drawMainMap().then(getCitiesNames);

// Filtros
changeLoadingMessage('Construindo os filtros...')
buildFilters();

buildCalendar();

// finishLoading();

// async () => await fetch('').then(handleFilter).then(finishLoading)