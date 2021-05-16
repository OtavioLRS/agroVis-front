import "@babel/polyfill";
import { startLoading, finishLoading } from './extra.js'
import { drawMap } from "./map.js";
import { buildFilters } from "./filter.js";
import { drawTable, } from "./table.js";
import { createBandSlider } from "./horizon.js";
// import { buildHorizon } from "./horizon.js";

// Mapa
drawMap();

// Tabela
drawTable();

// Filtros
buildFilters();


createBandSlider();

finishLoading();