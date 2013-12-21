/// <reference path="../lib/jasmine-2.0.0/jasmine.js" />

describe("weather", function () {

    var Weather, compass;
    beforeEach(function (done) {
        require(['Squire', 'compass'], function (Squire, compassSrc) {
            var squire = new Squire();
            compass = compassSrc;
            squire.require(['../src/weather'], function (weatherSrc) {
                Weather = weatherSrc;
                done();
            });
        });
    });

    describe("addNeighboringWeather", function () {

        it("should add neighbor to weather sources", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');

            weather.addNeighboringWeather(compass.NORTH, neighbor);

            expect(weather.weatherSources[0].source).toEqual(neighbor);
        });

        it("should capture correct direction for new neighbor", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');

            weather.addNeighboringWeather(compass.NORTH, neighbor);

            expect(weather.weatherSources[0].direction).toEqual(compass.NORTH);
        });

    });


    describe("getRainFromNeighbors", function () {

        it("should calculate 0 rain if here are no neighbors", function () {
            var weather = new Weather('unit-test');

            var result = weather.getRainFromNeighbors();

            expect(result).toEqual(0);
        });

        it("should calculate positive rain if there is a neighbor with wind blowing towards", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.NORTH);
            weather.addNeighboringWeather(compass.SOUTH, neighbor);

            var result = weather.getRainFromNeighbors();

            expect(result).toBeGreaterThan(0);
        });

        it("should calculate positive rain if there is a neighbor with wind blowing towards and a neighbor blowing away", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.NORTH);
            weather.addNeighboringWeather(compass.SOUTH, neighbor);
            var neighbor2 = new Weather('unit-test-neighbor');
            neighbor2.nextRainSource = 10;
            neighbor2.windDirection(compass.NORTH);
            weather.addNeighboringWeather(compass.NORTH, neighbor2);

            var result = weather.getRainFromNeighbors();

            expect(result).toBeGreaterThan(0);
        });

    });

    describe("getRainSourcePercentage", function () {

        it("should calculate 0 rain for neighbor with available rain source and wind blowing directly away", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.NORTH);

            var result = weather.getRainSourcePercentage(compass.NORTH, neighbor);

            expect(result).toEqual(0);
        });

        it("should calculate positive rain for neighbor with available rain source and wind blowing directly towards N-S", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.SOUTH);

            var result = weather.getRainSourcePercentage(compass.NORTH, neighbor);

            expect(result).toEqual(10 * Weather.RAINFACTOR.d180);
        });

        it("should calculate positive rain for neighbor with available rain source and wind blowing directly towards E-W", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.WEST);

            var result = weather.getRainSourcePercentage(compass.EAST, neighbor);

            expect(result).toEqual(10 * Weather.RAINFACTOR.d180);
        });

        it("should calculate positive rain for neighbor with available rain source and and wind blowing diagonally towards", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.SOUTH);

            var result = weather.getRainSourcePercentage(compass.NORTHEAST, neighbor);

            expect(result).toEqual(10 * Weather.RAINFACTOR.d135);
        });

        it("should calculate positive rain for neighbor with available rain source and and wind blowing directly perpendicularly", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.SOUTH);

            var result = weather.getRainSourcePercentage(compass.EAST, neighbor);

            expect(result).toEqual(10 * Weather.RAINFACTOR.d90);
        });

        it("should calculate 0 rain for neighbor with empty rain source and and wind blowing directly towards", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 0;
            neighbor.windDirection(compass.SOUTH);

            var result = weather.getRainSourcePercentage(compass.NORTH, neighbor);

            expect(result).toEqual(0);
        });

        it("should calculate 0 rain for neighbor with available rain source and and wind blowing diagonally away", function () {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.nextRainSource = 10;
            neighbor.windDirection(compass.SOUTH);

            var result = weather.getRainSourcePercentage(compass.SOUTHEAST, neighbor);

            expect(result).toEqual(0);
        });

    });

    describe("updateWaterForPlantConsumption", function () {

        it("should maximize plant consumption amount if there is more available water than the max consumption", function () {
            var weather = new Weather();
            
            weather.updateWaterForPlantConsumption(10, 5);

            expect(weather.waterForPlantConsumption).toEqual(5);
        });

        it("should return remaining water if there is more available water than the max consumption", function () {
            var weather = new Weather();

            var result = weather.updateWaterForPlantConsumption(10, 5);

            expect(result).toEqual(10 - 5);
        });

        it("should return no water if there is less available water than the max consumption", function () {
            var weather = new Weather();

            var result = weather.updateWaterForPlantConsumption(4, 5);

            expect(result).toEqual(0);
        });

        it("should set aside all of the available water when there is less than the max consumption", function () {
            var weather = new Weather();

            var result = weather.updateWaterForPlantConsumption(4, 5);

            expect(weather.waterForPlantConsumption).toEqual(4);
        });

    });

    describe("updateAverageRainfall", function () {

        it("should be 0 if there has been no rainfall in the last month", function () {
            var weather = new Weather();
            for (var i = 0; i < 30; i++)
                weather.lastMonth.push(0);

            weather.updateAverageRainfall(0);

            expect(weather.averageRainfall()).toEqual(0);
        });

        it("should be averaged from the past 29 days plus today", function () {
            var weather = new Weather();
            for (var i = 0; i < 30; i++)
                weather.lastMonth.push(0);

            weather.updateAverageRainfall(5);

            expect(weather.averageRainfall()).toEqual(5/30);
        });

        it("should not take into account more than the past 30 days", function () {
            var weather = new Weather();
            weather.lastMonth.push(100);
            for (var i = 0; i < 30; i++)
                weather.lastMonth.push(0);

            weather.updateAverageRainfall(5);

            expect(weather.averageRainfall()).toEqual(5 / 30);
        });

    });

    describe("onTick", function () {

        function getWeatherWithRainSource(amountOfRain) {
            var weather = new Weather('unit-test');
            var neighbor = new Weather('unit-test-neighbor');
            neighbor.windDirection(compass.EAST);
            neighbor.currentRainSource = amountOfRain / Weather.RAINFACTOR.d180;
            neighbor.nextRainSource = neighbor.currentRainSource;
            weather.addNeighboringWeather(compass.WEST, neighbor);
            return weather;
        }

        it("should retain soil moisture if there is no evaporation, rain, or consumption", function () {
            var startingPotentialRain = 5;
            var startingSoilMoisture = 4;
            var weather = getWeatherWithRainSource(startingPotentialRain);
            weather.soilMoisture(startingSoilMoisture);
            
            var remainingAmount = weather.onTick(false, 0, 0);  // no consumption or evaporation

            expect(remainingAmount).toEqual(0);
            expect(weather.soilMoisture()).toEqual(startingSoilMoisture);
        });

        it("should lose soil moisture to evaporation if there is no rain or consumption", function () {
            var startingPotentialRain = 5;
            var startingSoilMoisture = 4;
            var expectedEvaporation = 2;
            var weather = getWeatherWithRainSource(startingPotentialRain);
            weather.soilMoisture(startingSoilMoisture);

            var remainingAmount = weather.onTick(false, 0, expectedEvaporation);

            expect(remainingAmount).toEqual(0);
            expect(weather.soilMoisture()).toEqual(startingSoilMoisture - expectedEvaporation);
        });

        it("should add evaporated water to the current rain source", function () {
            var startingPotentialRain = 5;
            var startingSoilMoisture = 4;
            var expectedEvaporation = 2;
            var weather = getWeatherWithRainSource(startingPotentialRain);
            weather.soilMoisture(startingSoilMoisture);

            var remainingAmount = weather.onTick(false, 0, expectedEvaporation);

            expect(remainingAmount).toEqual(0);
            expect(weather.currentRainSource).toEqual(startingPotentialRain + expectedEvaporation);
        });

        it("should provide enough water for plant consumption if there is enough soil moisture and no rain or evaporation", function () {
            var startingPotentialRain = 5;
            var startingSoilMoisture = 4;
            var expectedPlantConsumption = 2;
            var weather = getWeatherWithRainSource(startingPotentialRain);
            weather.soilMoisture(startingSoilMoisture);

            var remainingAmount = weather.onTick(false, expectedPlantConsumption, 0);

            expect(remainingAmount).toEqual(0);
            expect(waterForPlantConsumption).toEqual(expectedPlantConsumption);
        });

        it("should have less soil moisture left after providing water for plants if there is no rain or evaporation", function () {
            var startingPotentialRain = 5;
            var startingSoilMoisture = 4;
            var expectedPlantConsumption = 2;
            var weather = getWeatherWithRainSource(startingPotentialRain);
            weather.soilMoisture(startingSoilMoisture);

            var remainingAmount = weather.onTick(false, expectedPlantConsumption, 0);

            expect(remainingAmount).toEqual(0);
            expect(weather.soilMoisture()).toEqual(startingSoilMoisture - expectedPlantConsumption);
        });

    });

});