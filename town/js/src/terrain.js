
define([], function () {

    var terrain = {
        WATER: { index: 0, symbol: '~', variants: 1, class: 'terrain-water', isWater: true, evaporation: 5 /* 5 inches/month */ },
        SAND: { index: 1, symbol: '-', variants: 1, class: 'terrain-sand' },
        DIRT: { index: 2, symbol: '=', variants: 3, class: 'terrain-dirt', canTransitionToGrass: true },
        DRYGRASS: { index: 4, symbol: '/', variants: 4, class: 'terrain-drygrass', canTransitionToGrass: true, evaporation: .25 },
        GRASS: { index: 5, symbol: '/', variants: 4, class: 'terrain-grass', supportsTrees: true, evaporation: .5 },
        ROCK: { index: 6, symbol: '+', variants: 1, class: 'terrain-rock' },
        SWAMP: { index: 7, symbol: ';', variants: 1, class: 'terrain-swamp' },
        FOREST: { index: 8, symbol: 'P', variants: 1, class: 'terrain-forest' },
        JUNGLE: { index: 9, symbol: 'Y', variants: 1, class: 'terrain-jungle' }
    };

    return terrain;

});