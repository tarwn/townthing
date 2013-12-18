
define(['knockout', 'configuration'],
    function (ko, config) {

    function Tree(parentName, x, y, size) {
        var self = this;
        this.x = x;
        this.y = y;
        this.name = "[tree " + x + "," + y + " in " + parentName + "]";
        this.size = ko.observable(size);
        this.ticks = Math.random() * config.TREESEEDTICKS;
        this.tickWithoutSufficientWater = 0;

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

        // toString
        this.toString = ko.computed(function () {
            return self.name;
        }, this);

        this.onTick = function (onReadyToSeed) {
            self.updateTreeType(Tree.Type.HEALTHY);
            this.tickWithoutSufficientWater = 0;
            this.ticks++;
            if (self.size() < 100 && this.ticks >= config.TREEGROWTICKS) {
                self.size(self.size() + config.TREEGROWINTERVAL);
                this.ticks = 0;
            }
            else {
                if (self.ticks >= config.TREESEEDTICKS) {
                    var spread = onReadyToSeed();

                    // growth slows down due to not being able to spread on last try
                    if (!spread)
                        self.ticks = -1 * config.TREESEEDTICKS;
                    else
                        self.ticks = 0;
                }
            }
        };

        this.onDrought = function (onTreeDied) {
            this.tickWithoutSufficientWater++;

            if (this.tickWithoutSufficientWater > 40) {
                // dead
                //console.log(self.name + " is suffering from drought");
                onTreeDied();
            }
            else if (this.tickWithoutSufficientWater > 20) {
                // dying
                self.updateTreeType(Tree.Type.DEAD);
            }
            else if (this.tickWithoutSufficientWater > 5) {
                // drying out
                self.updateTreeType(Tree.Type.DRY);
            }
        };
    };

    Tree.evaporation = .5;

    Tree.Type = {
        HEALTHY: { index: 0, variants: 4, class: 'terrain-tree' },
        DRY: { index: 1, variants: 4, class: 'terrain-drytree' },
        DEAD: { index: 2, variants: 2, class: 'terrain-deadtree' }
    };

    return Tree;
});