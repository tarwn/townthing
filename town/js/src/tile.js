
define(['knockout', 'ecologyConfiguration', 'terrain', 'compass', 'utility', 'tree', 'weather'],
    function (ko, ecology, terrain, compass, utility, Tree, Weather) {
    
    function Tile(x, y, maximumChange, averageSurroundings, availableTerrain) {
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
            self.terrainVariantNumber(Math.floor(Math.random() * terrain.variants || 0));
        };

        this.setTerrain(availableTerrain[Math.round(this.terrainValue)]);

        this.terrainClassVariant = ko.computed(function () {
            return this.terrain().class + ' ' + this.terrain().class + '-' + this.terrainVariantNumber();
        }, this);

        // weather
        this.weather = new Weather(this.name);

        // subtiles - references objects that use the space of each subtile
        this.subtiles = new Array(9);
        // trees are a specific set of references for display purposes - each on takes one subtile
        this.trees = ko.observableArray([]); //

        this.initialize = function (windDirection) {
            self.weather.initialize(windDirection, self.terrain().isWater);
            if (self.neighborNorth)
                self.weather.addNeighboringWeather(compass.NORTH, self.neighborNorth.weather);
            if (self.neighborEast)
                self.weather.addNeighboringWeather(compass.EAST, self.neighborEast.weather);
            if (self.neighborSouth)
                self.weather.addNeighboringWeather(compass.SOUTH, self.neighborSouth.weather);
            if (self.neighborWest)
                self.weather.addNeighboringWeather(compass.WEST, self.neighborWest.weather);

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

        
        this.getEvaporationAmount = function () {
            return (self.terrain().evaporation || 0)
                + self.trees().length * Tree.evaporation;
        };

        this.getPlantConsumptionAmount = function () {
            return (self.terrain().waterRequired || 0)
                + self.trees().length * ecology.WaterRequiredPerTree;
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
                var tree = new Tree(self.name, x, y, size);
                self.trees.push(tree);
                self.subtiles[x + y * 3] = tree;
                //console.log(self.name + ' planted new tree ' + tree.name + ' for ' + sourceName);
            }
        };

        this.removeTree = function (tree) {
            self.trees.remove(tree);

            while ((i = self.subtiles.indexOf(tree)) !== -1) {
                self.subtiles[i] = null;
            }

            delete tree;
        };

        this.canSupportGrass = function () {
            //return self.weather.soilMoisture() >= ecology.MinimumWaterForGrass;
            return self.weather.averageRainfall() >= ecology.MinimumWaterForGrass;
        };

        this.canSupportDryGrass = function () {
//            return self.weather.soilMoisture() >= ecology.MinimumWaterForDryGrass;
            return self.weather.averageRainfall() >= ecology.MinimumWaterForDryGrass;
        };

        this.canSupportAdditionalTrees = function () {
            var currentPlantRequirements = self.getPlantConsumptionAmount();

            return (self.terrain().supportsTrees || false)
                && self.weather.soilMoisture() > 0
                && self.weather.averageRainfall() >= currentPlantRequirements + ecology.WaterRequiredPerTree;
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

        this.onTick = function (time) {
            self.terrainAge++;

            // weather
            var isRainDay = time % 3 == 0;
            var waterForPlants = (self.terrain().waterRequired || 0) + ecology.WaterRequiredPerTree * self.trees().length;
            var overflow = self.weather.onTick(time, isRainDay, waterForPlants, self.getEvaporationAmount());

            //if(self.x == 3)
            //    console.log("Weather Update: (" + (isRainDay ? "Raining" : "Clear") + ") " + self.toString());

            // terrain transitions
            if (self.terrainAge > 10) {
                // terrain is old enough to transition
                var neighborHasGrass = function (n) { return n && n.terrain().index == terrain.GRASS.index && n.terrainAge > 10 };
                var neighborHasDryGrassOrBetter = function (n) { return n && (n.terrain().index == terrain.GRASS.index || n.terrain().index == terrain.DRYGRASS.index) && n.terrainAge > 10 };

                if (self.terrain().canTransitionToGrass && self.canSupportGrass() && self.terrain().index != terrain.GRASS.index) {

                    // evaluate neighbors for grass
                    if (neighborHasGrass(self.neighborNorth)
                        || neighborHasGrass(self.neighborEast)
                        || neighborHasGrass(self.neighborSouth)
                        || neighborHasGrass(self.neighborWest)
                        || Math.random() * 1 < .05) {
                        self.setTerrain(terrain.GRASS);
                    }
                }
                else if (self.terrain().canTransitionToGrass && self.canSupportDryGrass() && self.terrain().index != terrain.DRYGRASS.index) {
                    // evaluate neighbors for grass
                    if (neighborHasDryGrassOrBetter(self.neighborNorth)
                        || neighborHasDryGrassOrBetter(self.neighborEast)
                        || neighborHasDryGrassOrBetter(self.neighborSouth)
                        || neighborHasDryGrassOrBetter(self.neighborWest)
                        || Math.random() * 1 < .05) {
                        self.setTerrain(terrain.DRYGRASS);
                    }
                }
                else if (self.terrain().index == terrain.GRASS.index && !self.canSupportGrass()) {
                    self.setTerrain(terrain.DRYGRASS);
                }
                else if (self.terrain().index == terrain.DRYGRASS.index && !self.canSupportDryGrass()) {
                    self.setTerrain(terrain.DIRT);
                }

                // additional trees
                if (self.terrainAge % 20 == 0 && self.canSupportAdditionalTrees() && self.trees().length == 0) {
                    if (Math.random() * 1 < .1) {
                        self.plantTree(self.name, 1, 1, 10);
                    }
                }

            }

            // plant growth
            self.onGrow(time, self.weather.waterForPlantConsumption);
        };

        this.onGrow = function (time, waterForPlantConsumption) {
            var waterRemaining = waterForPlantConsumption;

            waterRemaining = waterRemaining - self.terrain().waterRequired;
            console.log("started with " + waterForPlantConsumption + " now have " + waterRemaining);
            if (waterRemaining < 0)
                waterRemaining = 0;

            var waterPerTree = waterRemaining / self.trees().length;
            for (var treeIndex in self.trees()) {
                self.trees()[treeIndex].onTick(time, waterPerTree,
                    /* onReadyToSeed */
                    function () {
                        var tree = self.trees()[treeIndex];
                        // grab preshuffled arrays so growth will look somewhat chaotic
                        var scanX = utility.shuffledArrays[self.x % 5];
                        var scanY = utility.shuffledArrays[self.y % 5];

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
                    },
                    /* onTreeDied */
                    function () {
                        //var tree = self.trees()[treeIndex];
                        //console.log(tree.name + " has died from drought");
                        //self.removeTree(tree);
                    });
            }
        };

        // toString
        this.toString = ko.computed(function () {
            return "[tile " + self.x + "," + self.y + " " + self.terrain().class + " AvgRain=" + this.weather.averageRainfall() + ", SoilM=" + this.weather.soilMoisture() + ", WindDir=" + this.weather.windDirection().name + ", BaseEvap=" + self.getEvaporationAmount() + ", RainSource=" + self.weather.currentRainSource + ", plantConsumption=" + self.weather.waterForPlantConsumption + ", rain=" + (self.weather.amountOfRain || 0) + "]";
        }, this);

    };

    return Tile;
});