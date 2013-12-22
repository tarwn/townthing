/// <reference path="../lib/jasmine-2.0.0/jasmine.js" />

describe("tree", function () {

    var ko, config, ecology, Tree;
    beforeEach(function (done) {
        require(['Squire', 'knockout', 'configuration', 'ecologyConfiguration'], function (Squire, knockout, configSrc, ecologySrc) {
            ko = knockout;
            config = configSrc;
            ecology = ecologySrc;

            var squire = new Squire();
            squire.require(['tree'], function (treeSrc) {
                Tree = treeSrc;
                done();
            });
        });
    });

    describe("onTick", function () {

        it("should grow when adequate water is provided", function () {
            var initialSize = 0;
            var tree = new Tree('unit-test', 0, 0, initialSize);

            for (var i = 0; i < config.TREEGROWTICKS; i++) {
                tree.onTick(i + 1, ecology.WaterRequiredPerTree, function () { }, function () { });
            }

            expect(tree.size()).toBeGreaterThan(initialSize);
        });

        it("should not grow when less than adequate water is provided", function () {
            var initialSize = 0;
            var tree = new Tree('unit-test', 0, 0, initialSize);

            for (var i = 0; i < config.TREEGROWTICKS; i++) {
                tree.onTick(i + 1, ecology.WaterRequiredPerTree / 2, function () { }, function () { });
            }

            expect(tree.size()).toEqual(initialSize);
        });

        it("should not grow when no water is provided", function () {
            var initialSize = 0;
            var tree = new Tree('unit-test', 0, 0, initialSize);

            for (var i = 0; i < config.TREEGROWTICKS; i++) {
                tree.onTick(i + 1, 0, function () { }, function () { });
            }

            expect(tree.size()).toEqual(initialSize);
        });

        it("should dry out when it has gone too long with insufficient water", function () {
            var initialSize = 0;
            var tree = new Tree('unit-test', 0, 0, initialSize);

            for (var i = 0; i < config.getTicksFromDays(Tree.DaysOnLimitedWaterBeforeDry) ; i++) {
                tree.onTick(i + 1, ecology.WaterRequiredPerTree / 2, function () { }, function () { });
            }

            expect(tree.terrainTreeType).toEqual(Tree.Type.DRY);
        });

        it("should dry out when it has gone too long with no water", function () {
            var initialSize = 0;
            var tree = new Tree('unit-test', 0, 0, initialSize);

            for (var i = 0; i < config.getTicksFromDays(Tree.DaysOnNoWaterBeforeDry) ; i++) {
                tree.onTick(i + 1, 0, function () { }, function () { });
            }

            expect(tree.terrainTreeType).toEqual(Tree.Type.DRY);
        });

        it("should re-grow after being dry for some time and receiving enough water", function () {
            var initialSize = 0;
            var tree = new Tree('unit-test', 0, 0, initialSize);

            var t = 1;
            for (var i = 0; i < config.getTicksFromDays(Tree.DaysOnNoWaterBeforeDry) ; i++) {
                tree.onTick(t, 0, function () { }, function () { });
                t++;
            }
            for (var i = 0; i < config.getTicksFromDays(Tree.DaysOnWaterBeforeHealthy) ; i++) {
                tree.onTick(t, ecology.WaterRequiredPerTree, function () { }, function () { });
                t++;
            }

            expect(tree.terrainTreeType).toEqual(Tree.Type.HEALTHY);
        });

        it("should die out when it has gone too long with insufficient water", function () {
            var initialSize = 0;
            var tree = new Tree('unit-test', 0, 0, initialSize);

            for (var i = 0; i < config.getTicksFromDays(Tree.DaysOnNoWaterBeforeDry + Tree.DaysOnLimitedWaterBeforeDead) ; i++) {
                tree.onTick(i + 1, 0, function () { }, function () { });
            }

            expect(tree.terrainTreeType).toEqual(Tree.Type.DEAD);
        });


        it("should seed some portion of the time after half grown", function () {
            var initialSize = 50;
            var tree = new Tree('unit-test', 0, 0, initialSize);
            tree.chanceToSeed = 1;
            var hasSeeded = false;

            for (var i = 0; i < 20; i++) {
                tree.onTick(i + 1, ecology.WaterRequiredPerTree, function () {
                    hasSeeded = true;
                }, function () {});
            }

            expect(hasSeeded).toBe(true);
        });
    });
});