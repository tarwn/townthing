
define(['knockout', 'compass'],
    function (ko, compass) {
 
    function Weather(parentName) {
        var self = this;
        this.name = "[weather for " + parentName + "]";

        this.averageRainfall = ko.observable(0);
        this.windDirection = ko.observable(compass.EAST);

        // hacky hacky, need a bette rplace for this
        this.averageRainfallAsRGB = function () {
            var nonBlue = Math.floor(200 - (self.averageRainfall() / 8) * 255);
            if (nonBlue < 0)
                nonBlue = 0;
            nonBlue = ('0' + nonBlue.toString(16)).slice(-2);
            var blue = Math.floor(255 - (self.averageRainfall() / 10) * 255);
            blue = ('0' + blue.toString(16)).slice(-2);
            return '#' + nonBlue + nonBlue + blue;
        };


        // track direct rain source amount
        this.rainSources = new Array(MAX_WIND_RAIN_DISTANCE);

        // if I get around to modeling windspeed/flow then that should
        //  be used to calculate max distance and have AVG_RAIN_DISTANCE replaced
        //  with average distance traveled between rainstorms
        var AVG_RAIN_FREQUENCY = 5;
        var MAX_WIND_RAIN_DISTANCE = 4;

        this.resetRainSources = function () {
            this.rainSources = new Array(MAX_WIND_RAIN_DISTANCE);
        };

        this.addLocalEvaporationAsRainSource = function (evaporation) {
            // evaporation is per month, rain frequency is per distance
            //  let's assume it's also per month for now
            if (this.rainSources[0])
                self.rainSources[0] += evaporation; // amount of rain available for a given rainy day
            else
                self.rainSources[0] = evaporation;
        };

        this.addDirectRainSource = function (weather, percentImpact) {
            // rainfall travels up to a certain distance before falling
            //  we'll calculate as if most of it travels directly with wind and
            //  a small part disperses to sides, thus the percentImpact

            for (var sourceDistanceIndex = 0; sourceDistanceIndex < weather.rainSources.length; sourceDistanceIndex++) {
                if (sourceDistanceIndex < MAX_WIND_RAIN_DISTANCE && weather.rainSources[sourceDistanceIndex]) {
                    if (self.rainSources[sourceDistanceIndex + 1]) {
                        self.rainSources[sourceDistanceIndex + 1] += weather.rainSources[sourceDistanceIndex] * percentImpact;
                    }
                    else {
                        self.rainSources[sourceDistanceIndex + 1] = weather.rainSources[sourceDistanceIndex] * percentImpact;
                    }
                }
            }
        };

        this.calculateAverageRainfall = function () {

            // you receive a percentage of rain from tiles within MAX_WIND_RAIN_DISTANCE distance
            var total = 0;
            var max = 0;
            for (var distanceIndex in self.rainSources) {
                total += self.rainSources[distanceIndex] * 1 / MAX_WIND_RAIN_DISTANCE;
            }

            // round to something readable/useful
            total = Math.round(total * 20) / 20;

            self.averageRainfall(total);
        };
    };

    return Weather;

});