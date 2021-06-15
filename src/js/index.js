import "@babel/polyfill";
import { preLoad, startLoading, changeLoadingMessage, finishLoading } from './extra.js'
import { drawMainMap, drawAuxMap } from "./map.js";
import { buildFilters } from "./filter.js";

// Pré coisas
changeLoadingMessage('Realizando pré-processamentos...')
preLoad();

// Mapa
changeLoadingMessage('Desenhando o mapa...')
drawMainMap();
drawAuxMap('#auxmap-container1');
drawAuxMap('#auxmap-container2');

// Filtros
changeLoadingMessage('Construindo os filtros...')
buildFilters();

finishLoading();