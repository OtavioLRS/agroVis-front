import "@babel/polyfill";
import { preLoad, startLoading, finishLoading, changeLoadingMessage } from './extra.js'
import { drawMap } from "./map.js";
import { buildFilters } from "./filter.js";

// Pré coisas
changeLoadingMessage('Realizando pré-processamentos...')
preLoad();

// Mapa
changeLoadingMessage('Desenhando o mapa...')
drawMap();

// Filtros
changeLoadingMessage('Construindo os filtros...')
buildFilters();

finishLoading();