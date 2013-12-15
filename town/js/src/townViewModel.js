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

    this.initialize = function () {
        self.setState("initializing", "Initializing map...");

        // generate tiles
        if (!self.tiles) {
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

                    self.tiles[h][w] = new town.Tile(h, w, .4, avg, [town.Terrain.WATER, town.Terrain.DIRT, town.Terrain.GRASS]);
                    //console.log("Added tile " + w + "," + h);
                }
            }
        }

        self.setState("initializing", "Connecting tiles...");

        // assign neighbors on each tile
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

town.Tile = function (posH, posW, maximumChange, averageSurroundings, availableTerrain) {
    var self = this;
    var minTerrainIndex = 0;
    var maxTerrainIndex = availableTerrain.length - 1;
    this.terrainValue = Math.random() * maximumChange * 2 - maximumChange + averageSurroundings;
    if (this.terrainValue < minTerrainIndex)
        this.terrainValue = minTerrainIndex;
    if (this.terrainValue > maxTerrainIndex)
        this.terrainValue = maxTerrainIndex;

    this.name = "[tile " + posW + "," + posH + "]";
    this.x = posW;
    this.y = posH;
    this.terrain = ko.observable(availableTerrain[Math.round(this.terrainValue)]);
    this.terrain.variantNumber = ko.observable(Math.floor(Math.random() * this.terrain().variants));

    this.terrain.classVariant = ko.computed(function () {
        return this.terrain().class + ' ' + this.terrain().class + '-' + this.terrain.variantNumber();
    }, this);

    // subtiles references objects that impinge on each sub-index
    this.subtiles = new Array(9);
    // trees are a specific set of references for display purposes
    this.trees = ko.observableArray([]); //

    this.initialize = function () {
        if (self.terrain().supportsTrees) {
            if (Math.random() * 1 < .1)
                self.plantTree(self.name, 1, 1, 100);
        }
        else if (self.terrain().isWater) {
            //console.log(self.name + " water check");
            if ((!self.neighborWest || self.neighborWest.terrain().isWater)
                && (!self.neighborEast || self.neighborEast.terrain().isWater)
                && (!self.neighborNorth || self.neighborNorth.terrain().isWater)
                && (!self.neighborSouth || self.neighborSouth.terrain().isWater)) {
                // add depth
                //console.log(self.name + " water check - depth");
                self.terrain.variantNumber(1);
            }
            else {
                self.terrain.variantNumber(0);
            }
        }
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
        if (!self.terrain().supportsTrees)
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

town.Terrain = {
    WATER: { symbol: '~', variants: 1, class: 'terrain-water', isWater: true },
    SAND: { symbol: '-', variants: 1, class: 'terrain-sand' },
    DIRT: { symbol: '=', variants: 3, class: 'terrain-dirt' },
    GRASS: { symbol: '/', variants: 4, class: 'terrain-grass', supportsTrees: true },
    ROCK: { symbol: '+', variants: 1, class: 'terrain-rock' },
    SWAMP: { symbol: ';', variants: 1, class: 'terrain-swamp' },
    FOREST: { symbol: 'P', variants: 1, class: 'terrain-forest' },
    JUNGLE: { symbol: 'Y', variants: 1, class: 'terrain-jungle' },
};

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