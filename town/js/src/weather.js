
define(['knockout', 'compass'],
    function (ko, compass) {
 
    function Weather(parentName) {
        var self = this;
        this.name = "[weather for " + parentName + "]";

        this.weatherSources = [];
        this.windDirection = ko.observable(compass.EAST);

        this.currentRainSource = 0;
        this.nextRainSource = 0;
        this.soilMoisture = ko.observable(0);
        this.waterForPlantConsumption = 0;
        this.averageRainfall = ko.observable(0);
        this.lastMonth = [];

        this.initialize = function (windDirection) {
            self.weatherSources = [];
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
        this.maximumEvaporationOnWetDay = 5;

        this.onTick = function (isRainDay, maxPlantConsumption, terrainEvaporationOnDryDay) {
            console.log("onTick(" + isRainDay + "," + maxPlantConsumption + "," + terrainEvaporationOnDryDay + ")");

            // clear current rain source, pull in new amounts
            self.currentRainSource = self.getRainFromNeighbors();

            console.log("onTick(" + isRainDay + "," + maxPlantConsumption + "," + terrainEvaporationOnDryDay + ") - currentrainSource=" + self.currentRainSource);

            // always start wih available soil moisture
            var availableWater = self.soilMoisture();

            // make it rain
            if (isRainDay) {
                availableWater += self.currentRainSource;
                self.currentRainSource = 0;
            }

            console.log("onTick(" + isRainDay + "," + maxPlantConsumption + "," + terrainEvaporationOnDryDay + ") - after rain - availableWater=" + availableWater);

            // calculate available plant consumption amount
            availableWater = self.updateWaterForPlantConsumption(availableWater, maxPlantConsumption);

            console.log("onTick(" + isRainDay + "," + maxPlantConsumption + "," + terrainEvaporationOnDryDay + ") - after plant - availableWater=" + availableWater);

            // apply evaporation
            var evaporationAmount = self.calculateEvaporation(availableWater, isRainDay, self.maximumEvaporationOnWetDay, terrainEvaporationOnDryDay);
            self.currentRainSource += evaporationAmount;
            availableWater -= evaporationAmount;
            
            console.log("onTick(" + isRainDay + "," + maxPlantConsumption + "," + terrainEvaporationOnDryDay + ") - after evap - availableWater=" + availableWater + ",evap=" + evaporationAmount);

            // calculate new soil moisture
            if (availableWater > self.maximumSoilMoisture) {
                self.soilMoisture(self.maximumSoilMoisture);
                availableWater = availableWater - self.maximumSoilMoisture;
            }
            else {
                self.soilMoisture(availableWater);
                availableWater = 0;
            }

            console.log("onTick(" + isRainDay + "," + maxPlantConsumption + "," + terrainEvaporationOnDryDay + ") - after soak - availableWater=" + availableWater);

            // extra water?
                      

            // set tomorrows rain sources
            self.nextRainSource = self.currentRainSource;

            // update average rainfall value
            self.updateAverageRainfall(isRainDay ? self.currentRainSource : 0);

            return availableWater;
        };

        this.getRainFromNeighbors = function () {
            var rainAmount = 0;
            for (var sourceIndex in self.weatherSources) {
                console.log("getting rain for " + self.weatherSources[sourceIndex].direction.name + " from neighbor " + self.weatherSources[sourceIndex].source.currentRainSource + " " + self.weatherSources[sourceIndex].source.windDirection().name);
                rainAmount += self.getRainSourcePercentage(self.weatherSources[sourceIndex].direction, self.weatherSources[sourceIndex].source)
            }
            return rainAmount;
        };

        this.getRainSourcePercentage = function (sourceDirection, source) {
            var diff = compass.compare(sourceDirection, source.windDirection());
            switch (diff) {
                case 4: // direct wind
                    return source.nextRainSource * Weather.RAINFACTOR.d180;
                case 3: // 45 degrees off direct
                case 5:
                    return source.nextRainSource * Weather.RAINFACTOR.d135;
                case 2: // 90 degrees off direct
                case 6:
                    return source.nextRainSource * Weather.RAINFACTOR.d90;
                case 1: // 135 degrees off direct
                case 7:
                    return source.nextRainSource * Weather.RAINFACTOR.d45;
                case 0: // opposed wind
                    return source.nextRainSource * Weather.RAINFACTOR.d0;
                default:
                    return 0;
            }
        };

        this.updateWaterForPlantConsumption = function (availableWater, maxPlantConsumption) {
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
        d135:    .15,
        d180:    .60,
        d225:    .15,
        d270:    .05,
        d315:    .00
    };
    
    Weather.prototype.calculateEvaporation = function (availableWater, isRainyDay, maxEvaporationOnRainyDay, maxEvaporationOnDryDay) {
        var maxEvaporation = isRainyDay ? maxEvaporationOnRainyDay : maxEvaporationOnDryDay;

        if (availableWater > maxEvaporation)
            return maxEvaporation;
        else 
            return availableWater;
    };

    return Weather;

});