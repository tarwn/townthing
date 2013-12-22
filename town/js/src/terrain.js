
define([], function () {

    var terrain = {
        WATER: { index: 0, symbol: '~', variants: 1, class: 'terrain-water', isWater: true, evaporation: 5 /* 4 = est from NOAA pan readings in colorado */ },
        //SAND: { index: 1, symbol: '-', variants: 1, class: 'terrain-sand' },
        DIRT: { index: 2, symbol: '=', variants: 3, class: 'terrain-dirt', canTransitionToGrass: true },
        DRYGRASS: { index: 4, symbol: '/', variants: 4, class: 'terrain-drygrass', waterRequired: .75, canTransitionToGrass: true, evaporation: 1.0 },
        // evapotranspiration - .2in/day + soil evap - http://aggie-horticulture.tamu.edu/archives/parsons/turf/publications/water.html = 6.0
        // water requirements - guestimated based on a 30in/year figure = 2.5
        // other sources seem to point to lower evapotranspiration than evaporation
        // still others support the higher number, saying trees are pulling deeper groundwater
        GRASS: { index: 5, symbol: '/', variants: 4, class: 'terrain-grass', waterRequired: 1.0, supportsTrees: true, evaporation: 1.0 },
        //ROCK: { index: 6, symbol: '+', variants: 1, class: 'terrain-rock' },
        //SWAMP: { index: 7, symbol: ';', variants: 1, class: 'terrain-swamp' },
        //FOREST: { index: 8, symbol: 'P', variants: 1, class: 'terrain-forest' },
        //JUNGLE: { index: 9, symbol: 'Y', variants: 1, class: 'terrain-jungle' }
    };

    return terrain;

});