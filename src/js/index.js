import "@babel/polyfill";
import { preLoad, startLoading, finishLoading } from './extra.js'
import { drawMap } from "./map.js";
import { buildFilters } from "./filter.js";
import { createBandSlider } from "./horizon.js";

// Pré coisas
preLoad();

// Mapa
drawMap();

// Filtros
buildFilters();

createBandSlider();

finishLoading();