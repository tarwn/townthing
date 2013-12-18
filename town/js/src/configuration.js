/// <reference path="../lib/require.js" />

define(function () {

    return {
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

});