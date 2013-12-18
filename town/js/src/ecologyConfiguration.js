
define([], function () {

    var ecology = {
        MinimumWaterForDirt: .5,
        MinimumWaterForDryGrass: .75,
        MinimumWaterForGrass: 1.25,
        MinimumWaterForTrees: 2,
        MaximumWaterForTrees: 5,
        WaterRequiredPerTree: .375  // first tree at minimum is free, each additional uses slot up to max water
    };

    return ecology;

});