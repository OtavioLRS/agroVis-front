import "@babel/polyfill";
import { preLoad, startLoading, changeLoadingMessage, finishLoading } from './extra.js'
import { drawMainMap, getCitiesNames } from "./map.js";
import { drawMundiMap, drawMundiMapContries } from "./mundi.js";
import { buildFilters, handleFilter } from "./filter.js";
import { validateLoginInHome } from "./loginFunctions";

// Verifica login
validateLoginInHome();

// Pré processamentos
changeLoadingMessage('Realizando pré-processamentos...')
preLoad();

// Mapa
changeLoadingMessage('Desenhando o mapa...')
drawMainMap().then(getCitiesNames);
// drawMundiMap();
drawMundiMapContries();

// Filtros
changeLoadingMessage('Construindo os filtros...')
buildFilters();

// finishLoading();