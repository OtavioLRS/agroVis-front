import "@babel/polyfill";
import { preLoad, startLoading, finishLoading } from './extra.js'
import { drawMap } from "./map.js";
import { buildFilters } from "./filter.js";
import { createBandSlider } from "./horizon/horizon.js";

// Pré coisas
preLoad();

// Mapa
drawMap();

// Filtros
buildFilters();

finishLoading();