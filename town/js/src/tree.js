
define(['knockout', 'configuration', 'ecologyConfiguration'],
    function (ko, config, ecology) {

    function Tree(parentName, x, y, size) {
        var self = this;
        this.x = x;
        this.y = y;
        this.name = "[tree " + x + "," + y + " in " + parentName + "]";
        this.size = ko.observable(size);
        
        this.ticksSinceLastGrowth = 0;
        this.lastSufficientWater = 0;
        this.lastAnyWater = 0;
        this.lastTime = 0;
        this.regrowth = 0;
        this.chanceToSeed = .1;

        this.terrainClassVariant = ko.observable('');
        this.terrainTreeType = null;

        this.updateTreeType = function (treeType) {
            if (self.terrainTreeType != treeType) {
                //console.log(self.name + ' is changing to type ' + treeType.class)
                self.terrainTreeType = treeType;
                var variant = Math.floor(Math.random() * treeType.variants);
                self.terrainClassVariant(treeType.class + '-' + variant);
            }
        };
        this.updateTreeType(Tree.Type.HEALTHY);

        this.getAmountOfWaterNeeded = function () {
            return ecology.WaterRequiredPerTree;
        };

        this.onTick = function (time, waterAmount, onReadyToSeed, onTreeDied) {
            self.lastTime = 0;
            if (self.terrainTreeType == Tree.Type.HEALTHY) {
                if (waterAmount >= self.getAmountOfWaterNeeded()) {
                    self.lastSufficientWater = time;
                    self.lastAnyWater = time;
                    self.ticksSinceLastGrowth++;

                    if (self.ticksSinceLastGrowth >= config.TREEGROWTICKS && self.size() < 100) {
                        self.size(self.size() + config.TREEGROWINTERVAL);
                        self.ticksSinceLastGrowth = 0;
                    }

                    if (self.size() > 50 && Math.random() < self.chanceToSeed) {
                        onReadyToSeed();
                    }
                }
                else if (waterAmount > 0) {
                    self.lastAnyWater = time;
                    if (time - self.lastSufficientWater >= Tree.DaysOnLimitedWaterBeforeDry) {
                        self.updateTreeType(Tree.Type.DRY);
                    }
                }
                else {
                    if (time - self.lastAnyWater >= Tree.DaysOnNoWaterBeforeDry) {
                        self.updateTreeType(Tree.Type.DRY);
                    }
                }
            }
            else if (self.terrainTreeType == Tree.Type.DRY) {
                if (waterAmount >= self.getAmountOfWaterNeeded()) {
                    self.lastSufficientWater = time;
                    self.lastAnyWater = time;
                    self.regrowth++;

                    if (self.regrowth >= Tree.DaysOnWaterBeforeHealthy) {
                        self.updateTreeType(Tree.Type.HEALTHY);
                        self.ticksSinceLastGrowth = 0;
                    }
                }
                else if (time - self.lastSufficientWater >= Tree.DaysOnLimitedWaterBeforeDead) {
                    self.updateTreeType(Tree.Type.DEAD);
                    onTreeDied();
                }
            }
            else {
                // it's dead, what is it supposed to do?
            }
        };
        
        // toString
        this.toString = ko.computed(function () {
            return self.name + " type=" + self.terrainTreeType.class + ", ticksSincelastgrowth=" + self.ticksSinceLastGrowth + " timeSinceSufficientWater=" + (self.lastTime - self.lastSufficientWater) + " timeSinceNoWater=" + (self.lastTime - self.lastAnyWater);
        }, this);
    };

    Tree.evaporation = .5;
    Tree.DaysOnLimitedWaterBeforeDry = 15;
    Tree.DaysOnNoWaterBeforeDry = 10;
    Tree.DaysOnWaterBeforeHealthy = 10;
    Tree.DaysOnLimitedWaterBeforeDead = 45;

    Tree.Type = {
        HEALTHY: { index: 0, variants: 4, class: 'terrain-tree' },
        DRY: { index: 1, variants: 4, class: 'terrain-drytree' },
        DEAD: { index: 2, variants: 2, class: 'terrain-deadtree' }
    };

    return Tree;
});