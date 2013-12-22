
define(['knockout', 'compass'],
    function (ko, compass) {
 
    function Weather(parentName) {
        var self = this;
        this.name = "[weather for " + parentName + "]";

        this.weatherSources = [];
        this.windDirection = ko.observable(compass.EAST);

        this.rainSources = [];
        this.currentRainSource = 0;
        this.nextRainSource = 0;
        this.isWater = ko.observable(0);
        this.soilMoisture = ko.observable(0);
        this.waterForPlantConsumption = 0;
        this.averageRainfall = ko.observable(0);
        this.lastMonth = [];

        this.initialize = function (windDirection, isWaterTile) {
            self.weatherSources = [];
            if(isWaterTile != null)
                self.isWater(isWaterTile);

            if (self.isWater())
                self.maximumSoilMoisture = 0;

            self.rainSources[0] = 0;
        };

        this.addNeighboringWeather = function(directionOfNeighbor, weather) {
            self.weatherSources.push({
                direction: directionOfNeighbor,
                source: weather
            });
        };

        // hacky hacky, need a better place for this
        this.averageRainfallAsRGB = function () {
            var nonBlue = Math.floor(200 - (self.averageRainfall() / 8) * 255);
            if (nonBlue < 0)
                nonBlue = 0;
            nonBlue = ('0' + nonBlue.toString(16)).slice(-2);
            var blue = Math.floor(255 - (self.averageRainfall() / 10) * 255);
            blue = ('0' + blue.toString(16)).slice(-2);
            return '#' + nonBlue + nonBlue + blue;
        };
        
        // basing this off of numbers from https://aggie-horticulture.tamu.edu/earthkind/drought/drought-management-for-commercial-horticulture/so-what-constitutes-an-effective-rain-event/
        //  using loam figures (1.5-2.5in rain to wet 12in of soil) and 3ft depth and assuming best case timing:
        //  6 inches of rain
        this.maximumSoilMoisture = 6;
        // made this number up - need to research better into maximum evaporation valuues
        this.maximumEvaporationOnWetDay = 5;

        this.onTick = function (time, isRainDay, maxPlantConsumption, evapotranspiration) {

            var log = {
                name: self.name,
                isRainDay: isRainDay,
                maxPlantConsumption: maxPlantConsumption,
                evapotranspiration: evapotranspiration,
                maximumEvaporationOnWetDay: self.maximumEvaporationOnWetDay,
                startValues: {
                    soilMoisture: self.soilMoisture(),
                    averageRainfaal: self.averageRainfall(),
                    currentRainSource: self.currentRainSource
                },
                finalValues: {}
            };

            // clear current rain source, pull in new amounts
            self.rainSources[time] = self.getRainFromNeighbors(time - 1);
            var rainfall = 0;

            // always start wih available soil moisture
            var availableWater = 0;
            if (self.isWater())
                availableWater = 10000;
            else
                availableWater = self.soilMoisture();

            // make it rain
            if (isRainDay) {
                availableWater += self.rainSources[time] || 0;
                rainfall = self.rainSources[time];
                self.rainSources[time] = 0;
            }

            log.availableWaterAfterRain = availableWater;

            // calculate available plant consumption amount
            availableWater = self.updateWaterForPlantConsumption(availableWater, maxPlantConsumption);

            log.availableWaterAfterPlantConsumption = availableWater;
            log.waterForPlantConsumption = self.waterForPlantConsumption;

            // apply dry evaporation - doesn't affect water levels, this is transpiration from plants
            self.rainSources[time] += evapotranspiration;

            log.availableWaterAfterEvaporation = availableWater;
            log.evaporationAmount = evaporationAmount;

            // calculate new soil moisture
            if (availableWater > self.maximumSoilMoisture) {
                self.soilMoisture(self.maximumSoilMoisture);
                availableWater = availableWater - self.maximumSoilMoisture;
            }
            else {
                self.soilMoisture(availableWater);
                availableWater = 0;
            }

            log.availableWaterAfterInfiltration = availableWater;
            log.finalValues.SoilMoisture = self.soilMoisture();

            // apply wet evaporation
            if (isRainDay) {
                var evaporationAmount = self.calculateEvaporation(availableWater, self.maximumEvaporationOnWetDay);
                self.rainSources[time] += evaporationAmount;
                availableWater -= evaporationAmount;
            }

            log.finalValues.AvailableWater = availableWater;

            // extra water?
                      

            // set easy lookup value
            self.currentRainSource = self.rainSources[time];
            log.finalValues.RainSource = self.rainSources[time]

            // update average rainfall value
            self.updateAverageRainfall(rainfall);
            log.finalValues.AverageRainfall = self.averageRainfall();;

            //console.log(log);

            return availableWater;
        };

        this.getRainFromNeighbors = function (targetTime) {
            var rainAmount = 0;
            //rainAmount += .1 * (self.rainSources[targetTime] || 0)
            for (var sourceIndex in self.weatherSources) {
                //console.log("getting rain for " + self.weatherSources[sourceIndex].direction.name + " from neighbor " + self.weatherSources[sourceIndex].source.currentRainSource + " " + self.weatherSources[sourceIndex].source.windDirection().name);
                rainAmount += self.getRainSourcePercentage(self.weatherSources[sourceIndex].direction, self.weatherSources[sourceIndex].source, targetTime)
            }
            return rainAmount;
        };

        this.getRainSourcePercentage = function (sourceDirection, source, targetTime) {
            var diff = compass.compare(sourceDirection, source.windDirection());
            switch (diff) {
                case 4: // direct wind
                    return source.rainSources[targetTime] * Weather.RAINFACTOR.d180;
                case 3: // 45 degrees off direct
                case 5:
                    return source.rainSources[targetTime] * Weather.RAINFACTOR.d135;
                case 2: // 90 degrees off direct
                case 6:
                    return source.rainSources[targetTime] * Weather.RAINFACTOR.d90;
                case 1: // 135 degrees off direct
                case 7:
                    return source.rainSources[targetTime] * Weather.RAINFACTOR.d45;
                case 0: // opposed wind
                    return source.rainSources[targetTime] * Weather.RAINFACTOR.d0;
                default:
                    return 0;
            }
        };

        this.updateWaterForPlantConsumption =   function (availableWater, maxPlantConsumption) {
            if (maxPlantConsumption > availableWater) {
                self.waterForPlantConsumption = availableWater;
                return 0;
            }
            else {
                self.waterForPlantConsumption = maxPlantConsumption;
                return availableWater - maxPlantConsumption;
            }
        };

        this.updateAverageRainfall = function (amountOfRainfall) {
            self.lastMonth.push(amountOfRainfall);

            while (self.lastMonth.length > 30)
                self.lastMonth.shift();

            var subtotal = 0;
            for (var i = 0; i < self.lastMonth.length; i++) {
                subtotal += self.lastMonth[i];
            }
            self.averageRainfall(subtotal / self.lastMonth.length);
        };
    };

    Weather.RAINFACTOR = {
        d0:      .00,
        d45:     .00,
        d90:     .05,
        d135:    .10,
        d180:    .70,
        d225:    .10,
        d270:    .05,
        d315:    .00
    };
    
    Weather.prototype.calculateEvaporation = function (availableWater, maxEvaporationOnRainyDay) {
        if (availableWater > maxEvaporationOnRainyDay)
            return maxEvaporationOnRainyDay;
        else 
            return availableWater;
    };

    return Weather;

});