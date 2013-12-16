/// <reference path="../lib/knockout-2.3.0.js" />

var town = town || {};

town.config = {
    INITIALTICK: 200,
    TICKTIME: 100,
    TREEGROWINTERVAL: 10,
    TREEGROWTICKS: 4,
    TREESEEDTICKS: 15
};

town.TownViewModel = function (width, height) {
    var self = this;
    this.width = width;
    this.height = height;
    this.state = ko.observable("uninitialized");
    this.stateDescription = ko.observable("Uninitialized");
    this.mapAge = ko.observable(0);
    this.tiles = null;
    this.mapReadyForDisplay = ko.observable(false);
    this.showRainfall = ko.observable(false);
    this.globalWindDirection = ko.observable(null);

    this.activeSelection = ko.observable(null);

    // tick method
    this.speed = ko.observable(0);

    this.flipSpeed = function () {
        if (self.speed() == 0)
            self.speed(town.config.TICKTIME);
        else
            self.speed(0);

        if (self._intervalHandle != null)
            clearInterval(self._intervalHandle);

        if (self.speed() > 0)
            self._intervalHandle = setInterval(self.onTick, self.speed());
    };

    this.onTick = function () {
        self.mapAge(self.mapAge() + 1);

        // this can't be good for performance...recalculating whole rain map every 10 ticks
        if (self.mapAge() % 10) {
            self.recalculateRainRate();
        }

        forEachTile(function (tile, x, y) {
            tile.onTick();
        });
    }

    this.onClick = function (data, evt) {
        //console.log(evt);
        
        var bounding = evt.toElement.getBoundingClientRect();
        var doc = document.documentElement;
        var leftScroll = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
        var topScroll = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

        self.activeSelection({
            element: evt.toElement,
            name: evt.toElement.getAttribute('data-name'),
            description: evt.toElement.getAttribute('data-desc'),
            x: bounding.left + leftScroll,
            y: bounding.top + topScroll,
            width: evt.toElement.clientWidth,
            height: evt.toElement.clientHeight            
        });
    };

    this.onDeClick = function (data, evt) {
        self.activeSelection(null);
    };

    function forEachTile(method) {
        for (var tileY in self.tiles) {
            for (var tileX in self.tiles[tileY]) {
                method(self.tiles[tileY][tileX], parseInt(tileX), parseInt(tileY));
            }
        }
    }

    this.setState = function (state, message) {
        console.log("status change - " + state + " - " + message);
        self.state(state);
        self.stateDescription(message);
    };

    this.recalculateRainRate = function(){
        for (var i = 0; i < 6; i++) {
            forEachTile(function (tile, x, y) {
                tile.initializeRainRate();
            });
        }
    };

    this.initialize = function () {
        self.setState("initializing", "Initializing map...");

        // generate tiles
        if (!self.tiles) {
            self.setState("initializing", "Generating tiles...");
            self.tiles = new Array(self.height);
            var max = 0, min = 0;
            for (var h = 0; h < self.height; h++) {
                self.tiles[h] = new Array(self.width);
                for (var w = 0; w < self.width; w++) {
                    var avg = 2;
                    if (w > 0 && h > 0)
                        avg = (self.tiles[h - 1][w].terrainValue + self.tiles[h][w - 1].terrainValue) / 2;
                    else if (w > 0)
                        avg = self.tiles[h][w - 1].terrainValue;
                    else if (h > 0)
                        avg = self.tiles[h - 1][w].terrainValue;

                    self.tiles[h][w] = new town.Tile(w, h, .4, avg, [town.Terrain.WATER, town.Terrain.DIRT, town.Terrain.DIRT /*, town.Terrain.GRASS */]);
                    //console.log("Added tile " + w + "," + h);
                }
            }
        }

        // assign neighbors on each tile
        self.setState("initializing", "Connecting tiles...");
        forEachTile(function (tile, x, y) {
            if (x > 0)
                tile.neighborWest = self.tiles[y][x - 1];
            if (x < self.width - 1)
                tile.neighborEast = self.tiles[y][x + 1];
            if (y > 0)
                tile.neighborNorth = self.tiles[y - 1][x];
            if (y < self.height - 1)
                tile.neighborSouth = self.tiles[y + 1][x];

            tile.initialize();
        });

        self.mapReadyForDisplay(true);

        self.setState("initializing", "Producing weather...");
        // assign wind direction - currently global
        if (!self.globalWindDirection()) {
            var globalWindDir = Math.floor(Math.random() * 8);
            self.globalWindDirection(town.compass.raw[globalWindDir]);
        }
        forEachTile(function (tile, x, y) {
            tile.weather.windDirection(self.globalWindDirection());
        });
        
        //and now use wind to push rainfall around the map, starting w/ water tiles
        //  going to build up rain potential in each tile based on amount it generates
        // let's try brute force
        self.recalculateRainRate();

        self.setState("initializing", "Aging the map...");
        
        var originalGrowTicks = town.config.TREEGROWTICKS;
        town.config.TREEGROWTICKS = 1; // increased growth during initialization
        var initializeInterval = setInterval(function () {
            if (self.mapAge() < town.config.INITIALTICK) {
                self.onTick();
            }
            else {
                clearInterval(initializeInterval);
                self.setState("ready", "Ready to go.");
                town.config.TREEGROWTICKS = originalGrowTicks;
            }
        }, 3);

    };
}

town.Tile = function (x, y, maximumChange, averageSurroundings, availableTerrain) {
    var self = this;
    this.name = "[tile " + x + "," + y + "]";
    this.x = x;
    this.y = y;

    // terrain
    var minTerrainIndex = 0;
    var maxTerrainIndex = availableTerrain.length - 1;
    this.terrainValue = Math.random() * maximumChange * 2 - maximumChange + averageSurroundings;
    if (this.terrainValue < minTerrainIndex)
        this.terrainValue = minTerrainIndex;
    if (this.terrainValue > maxTerrainIndex)
        this.terrainValue = maxTerrainIndex;

    self.terrain = ko.observable();
    self.terrainVariantNumber = ko.observable();

    this.setTerrain = function (terrain) {
        self.terrainAge = 0;
        self.terrain(terrain);
        self.terrainVariantNumber(Math.floor(Math.random() * terrain.variants));
    };

    this.setTerrain(availableTerrain[Math.round(this.terrainValue)]);

    this.terrainClassVariant = ko.computed(function () {
        return this.terrain().class + ' ' + this.terrain().class + '-' + this.terrainVariantNumber();
    }, this);

    // weather
    this.weather = new town.Weather(this.name);

    // toString
    this.toString = ko.computed(function () {
        return "[tile " + self.x + "," + self.y + " rain=" + this.weather.averageRainfall() + ", windDir=" + this.weather.windDirection().name + "]";
    }, this);

    // subtiles - references objects that use the space of each subtile
    this.subtiles = new Array(9);
    // trees are a specific set of references for display purposes - each on takes one subtile
    this.trees = ko.observableArray([]); //

    this.initialize = function () {
        if (self.terrain().isWater) {
            //console.log(self.name + " water check");
            if ((!self.neighborWest || self.neighborWest.terrain().isWater)
                && (!self.neighborEast || self.neighborEast.terrain().isWater)
                && (!self.neighborNorth || self.neighborNorth.terrain().isWater)
                && (!self.neighborSouth || self.neighborSouth.terrain().isWater)) {
                // add depth
                //console.log(self.name + " water check - depth");
                self.terrainVariantNumber(1);
            }
            else {
                self.terrainVariantNumber(0);
            }
        }
    };

    this.initializeRainRate = function () {
        // the goal is to get 30-60in/year for forests
        // and ~60 for water tiles - used lake charles in louisiana for this figure
        // not going to include seasonal variance yet, that factor can be added later along w/ seasonal seeding/growth
        // the goal is to create a method that simulates reasonable rainfall amounts without actually modelling
        //  evaporation rates, humidity, cloud cycles, etc

        self.weather.resetRainSources();
        self.weather.addLocalEvaporationAsRainSource(self.getWaterSourceAmount());

        // how much do I receive via wind from neighbors, using a multiplier based on their rainfall and wind direction
        //  made up numbers, will test to see what they end up doing
        var isDirect = true,
            directNeighbor = null,
            indirectNeighbors = [];

        switch (self.weather.windDirection().index) {
            case town.compass.NORTH.index:
                directNeighbor = self.neighborSouth;
                indirectNeighbors = [self.neighborEast, self.neighborWest ]
                break;
            case town.compass.NORTHEAST.index:
                isDirect = false;
                indirectNeighbors = [self.neighborSouth, self.neighborWest]
                break;
            case town.compass.EAST.index:
                directNeighbor = self.neighborWest;
                indirectNeighbors = [self.neighborNorth, self.neighborSouth]
                break;
            case town.compass.SOUTHEAST.index:
                isDirect = false;
                indirectNeighbors = [self.neighborNorth, self.neighborWest]
                break;
            case town.compass.SOUTH.index:
                directNeighbor = self.neighborNorth;
                indirectNeighbors = [self.neighborEast, self.neighborWest]
                break;
            case town.compass.SOUTHWEST.index:
                isDirect = false;
                indirectNeighbors = [self.neighborNorth, self.neighborEast]
                break;
            case town.compass.WEST.index:
                directNeighbor = self.neighborEast;
                indirectNeighbors = [self.neighborNorth, self.neighborSouth]
                break;
            case town.compass.NORTHWEST.index:
                isDirect = false;
                indirectNeighbors = [self.neighborSouth, self.neighborEast]
                break;
            default:
                // you've invented a new compass direction, no rainfall for you
                return;
        }

        if (isDirect) {
            // all of the rain from direct path of wind - add up the sources unless they're off the map
            if (directNeighbor) 
                self.weather.addDirectRainSource(directNeighbor.weather, .8);

            if (indirectNeighbors[0])
                self.weather.addDirectRainSource(indirectNeighbors[0].weather, .1);

            if (indirectNeighbors[1])
                self.weather.addDirectRainSource(indirectNeighbors[1].weather, .1);
        }
        else {
            if (indirectNeighbors[0])
                self.weather.addDirectRainSource(indirectNeighbors[0].weather, .5);

            if (indirectNeighbors[1])
                self.weather.addDirectRainSource(indirectNeighbors[1].weather, .5);
        }

        //console.log(self.name + " calculating rainfall - final amount = " + rainfallAmount);
        self.weather.calculateAverageRainfall();
    };

    this.getWaterSourceAmount = function () {
        return (self.terrain().evaporation || 0)
            + self.trees().length * town.Tree.evaporation;
    };

    this.plantTree = function (sourceName, x, y, size) {
        size = size || 0;
        //console.log(self.name + ' planting new tree at ' + x + ',' + y + ' for ' + sourceName);

        // we're assuming anything that got this far knew what it was doing and 
        //  won't mind us failing if it told us to plant something in a neighbor 
        //  that wasn't there

        if ((x < 0 || x > 2) && (y < 0 || y > 2)) {
            return false;
        }
        else if (x < 0) {
            if (self.neighborWest)
                self.neighborWest.plantTree(sourceName, 2, y, size);
        }
        else if (x > 2) {
            if (self.neighborEast)
                return self.neighborEast.plantTree(sourceName, 0, y, size);
        }
        else if (y < 0) {
            if (self.neighborNorth)
                return self.neighborNorth.plantTree(sourceName, x, 2, size);
        }
        else if (y > 2) {
            if (self.neighborSouth)
                return self.neighborSouth.plantTree(sourceName, x, 0, size);
        }
        else {
            var tree = new town.Tree(self.name, x, y, size);
            self.trees.push(tree);
            self.subtiles[x + y * 3] = tree;
            //console.log(self.name + ' planted new tree ' + tree.name + ' for ' + sourceName);
        }
    };

    this.canSupportGrass = function () {
        return this.weather.averageRainfall() >= town.Ecology.MinimumWaterForGrass;
    };

    this.canSupportAdditionalTrees = function () {
        return this.terrain().supportsTrees
            && this.weather.averageRainfall() >= town.Ecology.MinimumWaterForTrees
            && this.weather.averageRainfall() <= town.Ecology.MaximumWaterForTrees
            && this.weather.averageRainfall() >= town.Ecology.WaterRequiredPerTree * (self.trees().length + 1);
    };

    this.canSupportTreeIn = function (subtileX, subtileY) {
        //console.log(self.name + ' checking if I can grow tree in ' + subtileX + ',' + subtileY);

        // not going to allow diagonal neighbor cross-tile growth right now
        if ((subtileX < 0 || subtileX > 2) && (subtileY < 0 || subtileY > 2))
            return false;

        // check neighbor if outside borders
        if (subtileX < 0) {
            if (self.neighborWest)
                return self.neighborWest.canSupportTreeIn(2, subtileY);
            else
                return false;
        }

        if (subtileX > 2) {
            if (self.neighborEast)
                return self.neighborEast.canSupportTreeIn(0, subtileY);
            else
                return false;
        }

        if (subtileY < 0) {
            if (self.neighborNorth)
                return self.neighborNorth.canSupportTreeIn(subtileX, 2);
            else
                return false;
        }


        if (subtileY > 2) {
            if (self.neighborSouth)
                return self.neighborSouth.canSupportTreeIn(subtileX, 0);
            else
                return false;
        }

        // otherwise the check is for inside this tile
        if (!self.canSupportAdditionalTrees())
            return false;

        if (self.subtiles[subtileX + subtileY * 3] != null)
            return false;

        // will it border a terrain type change that we would like to leave tree free?
        if (subtileX == 0) {
            if (self.neighborWest && !self.neighborWest.terrain().supportsTrees)
                return false;
        }
        else if (subtileX == 2) {
            if (self.neighborEast && !self.neighborEast.terrain().supportsTrees)
                return false;
        }

        if (subtileY == 0) {
            if (self.neighborNorth && !self.neighborNorth.terrain().supportsTrees)
                return false;
        }
        else if (subtileY == 2) {
            if (self.neighborSouth && !self.neighborSouth.terrain().supportsTrees)
                return false;
        }

        return true;
    };

    this.onTick = function () {

        self.terrainAge++;
        if (self.terrainAge > 10) {
            // terrain is old enough to transition

            if (self.terrain().canTransitionToGrass && self.canSupportGrass()) {

                // evaluate neighbors for grass
                if ((self.neighborNorth && self.neighborNorth.terrain().index == town.Terrain.GRASS.index && self.neighborNorth.terrainAge > 10)
                    || (self.neighborEast && self.neighborEast.terrain().index == town.Terrain.GRASS.index && self.neighborEast.terrainAge > 10)
                    || (self.neighborSouth && self.neighborSouth.terrain().index == town.Terrain.GRASS.index && self.neighborSouth.terrainAge > 10)
                    || (self.neighborWest && self.neighborWest.terrain().index == town.Terrain.GRASS.index && self.neighborWest.terrainAge > 10)
                    || Math.random() * 1 < .05) {
                    self.setTerrain(town.Terrain.GRASS);
                }
            }
            else if (self.terrain().index == town.Terrain.GRASS.index && !self.canSupportGrass()) {
                self.setTerrain(town.Terrain.DIRT);
            }

            if (self.terrainAge % 20 == 0 && self.canSupportAdditionalTrees() && self.trees().length == 0) {
                if (Math.random() * 1 < .1)
                    self.plantTree(self.name, 1, 1, 100);
            }

        }

        self.onGrowTrees();
    };

    this.onGrowTrees = function () {
        for (var subtileIndex in self.subtiles) {
            if (!self.subtiles[subtileIndex] || !(self.subtiles[subtileIndex] instanceof town.Tree))
                continue;

            var tree = self.subtiles[subtileIndex];
            tree.onTick(function () {
                // grab preshuffled arrays so growth will look somewhat chaotic
                var scanX = town.utility.shuffledArrays[self.x % 5];
                var scanY = town.utility.shuffledArrays[self.y % 5];

                for (var xi in scanX) {
                    for (var yi in scanY) {
                        treeX = tree.x + scanX[xi];
                        treeY = tree.y + scanY[yi];
                        if (self.canSupportTreeIn(treeX, treeY)) {
                            self.plantTree(tree.name, treeX, treeY, 0);
                            return;
                        }
                    }
                }
            });
        }
    };
};

town.Tree = function (parentName, x, y, size) {
    var self = this;
    this.x = x;
    this.y = y;
    this.name = "[tree " + x + "," + y + " in " + parentName + "]";
    this.size = ko.observable(size);
    this.ticks = Math.random() * town.config.TREESEEDTICKS;
    this.classVariant = parseInt(Math.random() * 4); //hacky index for image tile selection to create variety

    // toString
    this.toString = ko.computed(function () {
        return self.name;
    }, this);

    this.onTick = function (onReadyToSeed) {
        this.ticks++;
        if (self.size() < 100 && this.ticks >= town.config.TREEGROWTICKS) {
            self.size(self.size() + town.config.TREEGROWINTERVAL);
            this.ticks = 0;
        }
        else {
            if (self.ticks >= town.config.TREESEEDTICKS) {
                var spread = onReadyToSeed();

                // growth slows down due to not being able to spread on last try
                if (!spread)
                    self.ticks = -1 * town.config.TREESEEDTICKS;
                else
                    self.ticks = 0;
            }
        }
    };
};
town.Tree.evaporation = .5;

town.Weather = function (parentName) {
    var self = this;
    this.name = "[weather for " + parentName + "]";
        
    this.averageRainfall = ko.observable(0);
    this.windDirection = ko.observable(town.compass.EAST);

    // track direct rain source amount
    this.rainSources = new Array(MAX_WIND_RAIN_DISTANCE);

    // if I get around to modeling windspeed/flow then that should
    //  be used to calculate max distance and have AVG_RAIN_DISTANCE replaced
    //  with average distance traveled between rainstorms
    var AVG_RAIN_DISTANCE = 5;
    var MAX_WIND_RAIN_DISTANCE = 8;
    var PROBABILITY_OF_RAIN = [ .05, .05, .1, .1, .2, .3, .1, .05, .05 ]

    this.resetRainSources = function () {
        this.rainSources = new Array(MAX_WIND_RAIN_DISTANCE);
    };

    this.addLocalEvaporationAsRainSource = function (evaporation) {
        // evaporation is per month, rain frequency is per distance
        //  let's assume it's also per month for now
        if (this.rainSources[0])
            self.rainSources[0] += evaporation * AVG_RAIN_DISTANCE; // amount of rain available for a given rainy day
        else
            self.rainSources[0] = evaporation * AVG_RAIN_DISTANCE;
    };

    this.addDirectRainSource = function (weather, percentImpact) {
        // rainfall travels up to a certain distance before falling
        //  we'll calculate as if most of it travels directly with wind and
        //  a small part disperses to sides, thus the percentImpact

        for (var sourceDistanceIndex = 0; sourceDistanceIndex < weather.rainSources.length; sourceDistanceIndex++) {
            if (sourceDistanceIndex < MAX_WIND_RAIN_DISTANCE && weather.rainSources[sourceDistanceIndex]) {
                if (self.rainSources[sourceDistanceIndex + 1]) {
                    self.rainSources[sourceDistanceIndex + 1] += weather.rainSources[sourceDistanceIndex] * percentImpact;
                }
                else {
                    self.rainSources[sourceDistanceIndex + 1] = weather.rainSources[sourceDistanceIndex] * percentImpact;
                }
            }
        }
    };

    this.calculateAverageRainfall = function () {

        // on average, precipitation travels RAIN_FREQUENCY tiles before falling, so let's average sources
        var total = 0;
        var max = 0;
        for (var distanceIndex in self.rainSources) {
            total += self.rainSources[distanceIndex] * PROBABILITY_OF_RAIN[distanceIndex];
            if (max < self.rainSources[distanceIndex])
                max = self.rainSources[distanceIndex];
        }

        if (total > max)
            total = max;

        // round to something readable/useful
        total = Math.round(total * 20) / 20;

        self.averageRainfall(total);
    };
};

town.Terrain = {
    WATER:  { index: 0, symbol: '~', variants: 1, class: 'terrain-water', isWater: true, evaporation: 5 /* 5 inches/month */ },
    SAND:   { index: 1, symbol: '-', variants: 1, class: 'terrain-sand' },
    DIRT:   { index: 2, symbol: '=', variants: 3, class: 'terrain-dirt', canTransitionToGrass: true },
    GRASS:  { index: 3, symbol: '/', variants: 4, class: 'terrain-grass', supportsTrees: true, evaporation: .5 },
    ROCK:   { index: 4, symbol: '+', variants: 1, class: 'terrain-rock' },
    SWAMP:  { index: 5, symbol: ';', variants: 1, class: 'terrain-swamp' },
    FOREST: { index: 6, symbol: 'P', variants: 1, class: 'terrain-forest' },
    JUNGLE: { index: 7, symbol: 'Y', variants: 1, class: 'terrain-jungle' },
};

town.Ecology = {
    MinimumWaterForGrass: 1,
    MinimumWaterForTrees: 2,
    MaximumWaterForTrees: 5,
    WaterRequiredPerTree: .5
}

town.compass = {
    NORTH:      { index: 0, name: "North" },
    NORTHEAST:  { index: 1, name: "Northeast" },
    EAST:       { index: 2, name: "East" },
    SOUTHEAST:  { index: 3, name: "Southeast" },
    SOUTH:      { index: 4, name: "South" },
    SOUTHWEST:  { index: 5, name: "Southwest" },
    WEST:       { index: 6, name: "West" },
    NORTHWEST:  { index: 7, name: "Northwest" },
};
town.compass.raw = [ town.compass.NORTH, town.compass.NORTHEAST, town.compass.EAST, town.compass.SOUTHEAST,
                    town.compass.SOUTH, town.compass.SOUTHWEST, town.compass.WEST, town.compass.NORTHWEST ];

town.utility = town.utility || [];

// some preshuffled arrays
town.utility.shuffledArrays = [
    [-1, 0, 1],
    [-1, 1, 0],
    [0, -1, 1],
    [0, 1, -1],
    [1, -1, 0],
    [1, 0, -1]
];