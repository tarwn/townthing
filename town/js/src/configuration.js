/// <reference path="../lib/require.js" />

define(function () {

    var config = {
        INITIALTICK: 200,
        TICKTIME: 100,
        TREEGROWINTERVAL: 10,
        TREEGROWTICKS: 4,
        TREESEEDTICKS: 15

        /* actual tile width if we assume tree canopies are ~15ft would be 45+ft
            and if we wanted to do buildings we would need this scale, so
            maybe we need a world view and a zoomed in view? 
    
            options: 
            -   make trees representative and tiles much larger, like 1 mile       
            -   make trees accurate-ish and tiles ~50ft (quarter acre)
        */
    };

    config.getMonthsFromTicks = function (ticks) {
        return ticks / 30;
    };

    config.getTicksFromMonths = function (months) {
        return months * 30;
    };

    config.getTicksFromDays = function (days) {
        return days;
    };

    return config;

});