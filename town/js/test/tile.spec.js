/// <reference path="../lib/jasmine-2.0.0/jasmine.js" />

describe("tile", function () {

    var Tile, compass, ko, terrain, ecology;
    beforeEach(function (done) {
        require(['knockout', 'Squire', 'compass', 'ecologyConfiguration', 'terrain', 'utility'], function (knockout, Squire, compassSrc, ecologySrc, terrainSrc, utilitySrc) {
            ko = knockout;
            compass = compassSrc;
            terrain = terrainSrc;
            ecology = ecologySrc;

            var squire = new Squire();
            squire.mock('weather', FakeWeather)
                  .mock('tree', FakeTree)
                  .require(['tile'], function (tileSrc) {
                      Tile = tileSrc;
                      done();
                  });
        });
    });

    describe("getEvaporationAmount", function () {

        it("should be 0 if there are no trees and the terrain doesn't have dry evaporation", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({});

            var result = tile.getEvaporationAmount();

            expect(result).toEqual(0);
        });

        it("should be the terrain's evaporation if there are no trees", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ evaporation: 123 });

            var result = tile.getEvaporationAmount();

            expect(result).toEqual(123);
        });

        it("should include tree evaporation and the terrain's evaporation", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ evaporation: 123 });
            tile.plantTree('unit-test', 0, 0, 100);
            FakeTree.evaporation = 10;

            var result = tile.getEvaporationAmount();

            expect(result).toEqual(123 + 10);
        });
    });

    describe("getPlantConsumptionAmount", function () {

        it("should be 0 when the terrain doesn't require any water and there are no trees", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({});

            var result = tile.getPlantConsumptionAmount();

            expect(result).toEqual(0);
        });

        it("should be the terrain's amount when there are no trees", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ waterRequired: 1.23 });

            var result = tile.getPlantConsumptionAmount();

            expect(result).toEqual(1.23);
        });

        it("should include the terrain and tree amounts when trees are present", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ waterRequired: 1.23 });
            tile.trees.push(new FakeTree());
            tile.trees.push(new FakeTree());

            var result = tile.getPlantConsumptionAmount();

            expect(result).toEqual(1.23 + 2 * ecology.WaterRequiredPerTree);
        });

    });

    describe("canSupportGrass", function () {

        it("should be able to support grass when there is enough soilMoisture available", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({});
            tile.weather.soilMoisture(ecology.MinimumWaterForGrass);

            var result = tile.canSupportGrass();

            expect(result).toBe(true);
        });

        it("should not be able to support grass when there is too little soilMoisture available", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({});
            tile.weather.soilMoisture(ecology.MinimumWaterForGrass / 2);

            var result = tile.canSupportGrass();

            expect(result).toBe(false);
        });

    });

    describe("canSupportDryGrass", function () {

        it("should be able to support dry grass when there is enough soilMoisture available", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({});
            tile.weather.soilMoisture(ecology.MinimumWaterForDryGrass);

            var result = tile.canSupportDryGrass();

            expect(result).toBe(true);
        });

        it("should not be able to support dry grass when there is too little soilMoisture available", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({});
            tile.weather.soilMoisture(ecology.MinimumWaterForDryGrass / 2);

            var result = tile.canSupportDryGrass();

            expect(result).toBe(false);
        });

    });

    describe("canSupportAdditionalTrees", function () {

        it("should not support a tree if current terrain doesn't support trees", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({});
            tile.weather.averageRainfall(ecology.WaterRequiredPerTree + 1.23);
            tile.weather.soilMoisture(1);

            var result = tile.canSupportAdditionalTrees();

            expect(result).toBe(false);
        });

        it("should support a tree if there is enough average rainfall for grass and new tree with no existing trees", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true, waterRequired: 1.23 });
            tile.weather.averageRainfall(ecology.WaterRequiredPerTree + 1.23);
            tile.weather.soilMoisture(1);

            var result = tile.canSupportAdditionalTrees();

            expect(result).toBe(true);
        });

        it("should not support a tree if there is not enough average rainfall for grass and new tree", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true, waterRequired: 1.23 });
            tile.weather.averageRainfall(ecology.WaterRequiredPerTree / 2 + 1.23);
            tile.weather.soilMoisture(1);

            var result = tile.canSupportAdditionalTrees();

            expect(result).toBe(false);
        });

        it("should support additional trees if there is enough average rainfall for grass, existing trees, and a new tree", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true, waterRequired: 1.23 });
            tile.trees.push(new FakeTree());
            tile.trees.push(new FakeTree());
            tile.weather.averageRainfall(3 * ecology.WaterRequiredPerTree + 1.23);
            tile.weather.soilMoisture(1);

            var result = tile.canSupportAdditionalTrees();

            expect(result).toBe(true);
        });

        it("should not support a tree if there is not enough average rainfall for existing ecology", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true, waterRequired: 1.23 });
            tile.trees.push(new FakeTree());
            tile.trees.push(new FakeTree());
            tile.weather.averageRainfall(1.23);
            tile.weather.soilMoisture(1);

            var result = tile.canSupportAdditionalTrees();

            expect(result).toBe(false);
        });

        it("should not support a tree if there is no available soilMoisture", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true });
            tile.weather.averageRainfall(ecology.WaterRequiredPerTree + ecology.MinimumWaterForGrass);
            tile.weather.soilMoisture(0);

            var result = tile.canSupportAdditionalTrees();

            expect(result).toBe(false);
        });

    });

    describe("onGrow", function () {

        it("should provide full amount of water to trees if available after watering the terrain", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true, waterRequired: 1.23 });
            var tree = new FakeTree();
            spyOn(tree, 'onTick');
            tile.trees.push(tree);

            var result = tile.onGrow(1.23 + ecology.WaterRequiredPerTree);

            expect(tree.onTick.calls.first().args[0]).toEqual(ecology.WaterRequiredPerTree);
        });

        it("should evenly split remainder of water if there is not enough left after watering the terrain", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true, waterRequired: 1.23 });
            var tree = new FakeTree();
            spyOn(tree, 'onTick');
            tile.trees.push(tree);
            tile.trees.push(new FakeTree());

            var result = tile.onGrow(1.23 + ecology.WaterRequiredPerTree);

            expect(tree.onTick.calls.first().args[0]).toEqual(ecology.WaterRequiredPerTree / 2);
        });

        it("should provide 0 water if there is none left after watering the terrain", function () {
            var tile = new Tile(0, 0, 0, 0, [{}]);
            tile.setTerrain({ supportsTrees: true, waterRequired: 1.23 });
            var tree = new FakeTree();
            spyOn(tree, 'onTick');
            tile.trees.push(tree);
            tile.trees.push(new FakeTree());

            var result = tile.onGrow(1.23);

            expect(tree.onTick.calls.first().args[0]).toEqual(0);
        });

    });

    function FakeWeather() {
        this.averageRainfall = ko.observable(0);
        this.soilMoisture = ko.observable(0);
        this.windDirection = ko.observable(compass.EAST);
    }

    function FakeTree() {
        this.onTick = function (waterAmount) { };
    }
    FakeTree.evaporation = 1;

});

