import "@babel/polyfill";
import { preLoad, startLoading, changeLoadingMessage, finishLoading } from './extra.js'
import { drawMainMap, getCitiesNames } from "./map.js";
import { drawMundiMap } from "./mundi.js";
import { buildFilters, handleFilter } from "./filter.js";
import { buildCalendar } from "./calendar.js";
import { validateLoginInHome } from "./loginFunctions";

// Verifica login
validateLoginInHome();

// Pré processamentos
changeLoadingMessage('Realizando pré-processamentos...')
preLoad();

// Mapa
changeLoadingMessage('Desenhando o mapa...')
drawMainMap().then(getCitiesNames);
drawMundiMap();

// Filtros
changeLoadingMessage('Construindo os filtros...')
buildFilters();

buildCalendar();

// finishLoading();