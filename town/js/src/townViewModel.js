/// <reference path="../lib/knockout-2.3.0.js" />
/// <reference path="../lib/require.js" />

define(['knockout', 'configuration', 'terrain', 'compass', 'tile'],
    function (ko, config, terrain, compass, Tile) {

    function TownViewModel(width, height) {
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
                self.speed(config.TICKTIME);
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
                tile.onTick(self.mapAge());
            });
        }

        this.onClick = function (data, evt) {
            //console.log(evt);

            var bounding = evt.toElement.getBoundingClientRect();
            var doc = document.documentElement;
            var leftScroll = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
            var topScroll = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);

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

        this.onSwirly = function () {
            // windy wind!
            var topHalf = self.height / 2;
            var leftHalf = self.width / 2;

            forEachTile(function (tile, x, y) {
                if(y < topHalf && x > y && self.width - x > y)
                    tile.weather.windDirection(compass.EAST);
                else if (y > topHalf && x > self.height - y && self.width - x > self.height - y)
                    tile.weather.windDirection(compass.WEST);
                else if (x < leftHalf && y > x && self.height - y > x)
                    tile.weather.windDirection(compass.NORTH);
                else
                    tile.weather.windDirection(compass.SOUTH);
            });
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

        this.generateMap = function () {
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

                    self.tiles[h][w] = new Tile(w, h, .4, avg, [terrain.WATER, terrain.DIRT, terrain.DIRT /*, terrain.GRASS */]);
                    //console.log("Added tile " + w + "," + h);
                }
            }
        };

        this.generateWindDirection = function () {
            var globalWindDir = Math.floor(Math.random() * 8);
            self.globalWindDirection(compass.raw[globalWindDir]);

            this.applyWindGlobally();
        };

        this.applyWindGlobally = function () {
            forEachTile(function (tile, x, y) {
                tile.weather.windDirection(self.globalWindDirection());
            });
        };

        this.initialize = function () {
            self.setState("initializing", "Initializing map...");

            // generate global starting values
            if (!self.globalWindDirection()) {
                self.generateWindDirection();
            }

            // generate tiles
            if (!self.tiles) {
                self.setState("initializing", "Generating tiles...");
                self.generateMap();
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

                tile.initialize(self.globalWindDirection());
            });

            self.mapReadyForDisplay(true);

            self.setState("initializing", "Aging the map...");

            var originalGrowTicks = config.TREEGROWTICKS;
            config.TREEGROWTICKS = 1; // increased growth during initialization
            var initializeInterval = setInterval(function () {
                if (self.mapAge() < config.INITIALTICK) {
                    self.onTick();
                }
                else {
                    clearInterval(initializeInterval);
                    self.setState("ready", "Ready to go.");
                    config.TREEGROWTICKS = originalGrowTicks;
                }
            }, 3);

        };
    }

    return TownViewModel;
});

