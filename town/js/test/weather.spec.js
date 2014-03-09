/// <reference path="../lib/jasmine-2.0.0/jasmine.js" />

define(['Squire', 'compass', 'weather'], function(Squire, compass, Weather){
	describe("weather", function () {

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

				var result = weather.getRainFromNeighbors(0);

				expect(result).toEqual(0);
			});

			it("should calculate positive rain if there is a neighbor with wind blowing towards", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.NORTH);
				weather.addNeighboringWeather(compass.SOUTH, neighbor);

				var result = weather.getRainFromNeighbors(0);

				expect(result).toBeGreaterThan(0);
			});

			it("should calculate positive rain if there is a neighbor with wind blowing towards and a neighbor blowing away", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.NORTH);
				weather.addNeighboringWeather(compass.SOUTH, neighbor, 0);
				var neighbor2 = new Weather('unit-test-neighbor');
				neighbor2.rainSources[0] = 10;
				neighbor2.windDirection(compass.NORTH);
				weather.addNeighboringWeather(compass.NORTH, neighbor2);

				var result = weather.getRainFromNeighbors(0);

				expect(result).toBeGreaterThan(0);
			});

		});

		describe("getRainSourcePercentage", function () {

			it("should calculate 0 rain for neighbor with available rain source and wind blowing directly away", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.NORTH);

				var result = weather.getRainSourcePercentage(compass.NORTH, neighbor, 0);

				expect(result).toEqual(0);
			});

			it("should calculate positive rain for neighbor with available rain source and wind blowing directly towards N-S", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.SOUTH);

				var result = weather.getRainSourcePercentage(compass.NORTH, neighbor, 0);

				expect(result).toEqual(10 * Weather.RAINFACTOR.d180);
			});

			it("should calculate positive rain for neighbor with available rain source and wind blowing directly towards E-W", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.WEST);

				var result = weather.getRainSourcePercentage(compass.EAST, neighbor, 0);

				expect(result).toEqual(10 * Weather.RAINFACTOR.d180);
			});

			it("should calculate positive rain for neighbor with available rain source and and wind blowing diagonally towards", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.SOUTH);

				var result = weather.getRainSourcePercentage(compass.NORTHEAST, neighbor, 0);

				expect(result).toEqual(10 * Weather.RAINFACTOR.d135);
			});

			it("should calculate positive rain for neighbor with available rain source and and wind blowing directly perpendicularly", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.SOUTH);

				var result = weather.getRainSourcePercentage(compass.EAST, neighbor, 0);

				expect(result).toEqual(10 * Weather.RAINFACTOR.d90);
			});

			it("should calculate 0 rain for neighbor with empty rain source and and wind blowing directly towards", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 0;
				neighbor.windDirection(compass.SOUTH);

				var result = weather.getRainSourcePercentage(compass.NORTH, neighbor, 0);

				expect(result).toEqual(0);
			});

			it("should calculate 0 rain for neighbor with available rain source and and wind blowing diagonally away", function () {
				var weather = new Weather('unit-test');
				var neighbor = new Weather('unit-test-neighbor');
				neighbor.rainSources[0] = 10;
				neighbor.windDirection(compass.SOUTH);

				var result = weather.getRainSourcePercentage(compass.SOUTHEAST, neighbor, 0);

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
				neighbor.rainSources[1] = neighbor.currentRainSource;
				neighbor.rainSources[0] = neighbor.currentRainSource;
				weather.addNeighboringWeather(compass.WEST, neighbor, 0);
				return weather;
			}

			it("should retain soil moisture if there is no evaporation, rain, or consumption", function () {
				var startingPotentialRain = 5;
				var startingSoilMoisture = 4;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);
				
				var remainingAmount = weather.onTick(1, false, 0, 0);  // no consumption or evaporation

				expect(remainingAmount).toEqual(0);
				expect(weather.soilMoisture()).toEqual(startingSoilMoisture);
			});

			it("should have evapotranspiration that is added to the rain source without reducing soilMoisture", function () {
				var startingPotentialRain = 5;
				var startingSoilMoisture = 4;
				var expectedEvaporation = 2;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);
				weather.rainSources[0] = 0;

				var remainingAmount = weather.onTick(1, false, 0, expectedEvaporation);

				expect(remainingAmount).toEqual(0);
				expect(weather.soilMoisture()).toEqual(startingSoilMoisture);
				expect(weather.currentRainSource).toEqual(startingPotentialRain + expectedEvaporation);
			});

			it("should add evaporated water to the current rain source", function () {
				var startingPotentialRain = 5;
				var startingSoilMoisture = 4;
				var expectedEvaporation = 2;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);

				var remainingAmount = weather.onTick(1, false, 0, expectedEvaporation);

				expect(remainingAmount).toEqual(0);
				expect(weather.currentRainSource).toEqual(startingPotentialRain + expectedEvaporation);
			});

			// - these two tests are for the infiltration before evaporation order
			//it("should not lose soil moisture to evaporation even if there is no rain or consumption", function () {
			//    var startingPotentialRain = 5;
			//    var startingSoilMoisture = 4;
			//    var expectedEvaporation = 2;
			//    var weather = getWeatherWithRainSource(startingPotentialRain);
			//    weather.soilMoisture(startingSoilMoisture);

			//    var remainingAmount = weather.onTick(false, 0, expectedEvaporation);

			//    expect(remainingAmount).toEqual(0);
			//    expect(weather.soilMoisture()).toEqual(startingSoilMoisture);
			//});

			// - this method means we are only getting evaporation on rain days
			//it("should add evaporated water to the current rain source", function () {
			//    var startingPotentialRain = 5;
			//    var startingSoilMoisture = 4;
			//    var expectedEvaporation = 2;
			//    var weather = getWeatherWithRainSource(startingPotentialRain);
			//    weather.soilMoisture(startingSoilMoisture);

			//    var remainingAmount = weather.onTick(false, 0, expectedEvaporation);

			//    expect(remainingAmount).toEqual(0);
			//    expect(weather.currentRainSource).toEqual(startingPotentialRain + expectedEvaporation);
			//});

			it("should provide enough water for plant consumption if there is enough soil moisture and no rain or evaporation", function () {
				var startingPotentialRain = 5;
				var startingSoilMoisture = 4;
				var expectedPlantConsumption = 2;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);

				var remainingAmount = weather.onTick(1, false, expectedPlantConsumption, 0);

				expect(remainingAmount).toEqual(0);
				expect(weather.waterForPlantConsumption).toEqual(expectedPlantConsumption);
			});

			it("should have less soil moisture left after providing water for plants if there is no rain or evaporation", function () {
				var startingPotentialRain = 5;
				var startingSoilMoisture = 4;
				var expectedPlantConsumption = 2;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);

				var remainingAmount = weather.onTick(1, false, expectedPlantConsumption, 0);

				expect(remainingAmount).toEqual(0);
				expect(weather.soilMoisture()).toEqual(startingSoilMoisture - expectedPlantConsumption);
			});

			it("should use the rain source on rainy days and overflow if there is no consumption, evaporation, or infiltration", function () {
				var startingPotentialRain = 5;
				var startingSoilMoisture = 0;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.maximumSoilMoisture = 0;
				weather.maximumEvaporationOnWetDay = 0;
				weather.soilMoisture(startingSoilMoisture);

				var remainingAmount = weather.onTick(1, true, 0, 0);  // no consumption or evaporation

				expect(remainingAmount).toEqual(5);
				expect(weather.currentRainSource).toEqual(0);
			});

			it("should use combined rain and soil moisture to water plants", function () {
				var startingPotentialRain = 2;
				var startingSoilMoisture = 2;
				var expectedPlantConsumption = 4;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);

				var remainingAmount = weather.onTick(1, true, expectedPlantConsumption, 0);  // no consumption or evaporation

				expect(remainingAmount).toEqual(0);
				expect(weather.waterForPlantConsumption).toEqual(expectedPlantConsumption);
			});

			it("should increase soil moisture on rainy day from infiltration if not full and no evaporation or consumption", function () {
				var startingPotentialRain = 2;
				var startingSoilMoisture = 2;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);
				weather.maximumEvaporationOnWetDay = 0;

				var remainingAmount = weather.onTick(1, true, 0, 0);  // no consumption or evaporation

				expect(remainingAmount).toEqual(0);
				expect(weather.soilMoisture()).toEqual(startingSoilMoisture + startingPotentialRain);
			});

			it("should provide enough water for plant consumption when it rains and doesn't have starting soil moisture", function () {
				var startingPotentialRain = 4;
				var startingSoilMoisture = 0;
				var expectedPlantConsumption = 4;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);

				var remainingAmount = weather.onTick(1, true, expectedPlantConsumption, 0);  // no evaporation

				expect(remainingAmount).toEqual(0);
				expect(weather.waterForPlantConsumption).toEqual(expectedPlantConsumption);
			});

			it("should have no evaporation on a rainy day if plants consume it all", function () {
				var startingPotentialRain = 4;
				var startingSoilMoisture = 0;
				var expectedPlantConsumption = 4;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);

				var remainingAmount = weather.onTick(1, true, expectedPlantConsumption, 0);  // no evaporation

				expect(remainingAmount).toEqual(0);
				expect(weather.currentRainSource).toEqual(0);
			});

			it("should produce new potential rain on a rainy day due to evaporation", function () {
				var startingPotentialRain = 10;
				var startingSoilMoisture = 5;
				var weather = getWeatherWithRainSource(startingPotentialRain);
				weather.soilMoisture(startingSoilMoisture);
				weather.maximumSoilMoisture = startingSoilMoisture;
				weather.maximumEvaporationOnWetDay = 10;

				var remainingAmount = weather.onTick(1, true, 0, 0);  // no plant consumption, dry day evaporation doesn't matter

				expect(remainingAmount).toEqual(0);
				expect(weather.currentRainSource).toEqual(10);
			});

			it("should start with a huge amount of water if it is a water tile", function () {
				var startingPotentialRain = 10;
				var startingSoilMoisture = 5;
				var weather = getWeatherWithRainSource(startingPotentialRain, true);
				weather.soilMoisture(startingSoilMoisture);
				weather.maximumSoilMoisture = startingSoilMoisture;
				weather.maximumEvaporationOnWetDay = 10;

				var remainingAmount = weather.onTick(1, true, 0, 0);  // no plant consumption, dry day evaporation doesn't matter

				expect(remainingAmount).toEqual(0);
				expect(weather.currentRainSource).toEqual(10);
			});

		});

	});
});