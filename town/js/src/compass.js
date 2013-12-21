
define([], function () {

    var compass = {
        NORTH: { index: 0, name: "North" },
        NORTHEAST: { index: 1, name: "Northeast" },
        EAST: { index: 2, name: "East" },
        SOUTHEAST: { index: 3, name: "Southeast" },
        SOUTH: { index: 4, name: "South" },
        SOUTHWEST: { index: 5, name: "Southwest" },
        WEST: { index: 6, name: "West" },
        NORTHWEST: { index: 7, name: "Northwest" }
    };
    compass.raw = [compass.NORTH, compass.NORTHEAST, compass.EAST, compass.SOUTHEAST,
                   compass.SOUTH, compass.SOUTHWEST, compass.WEST, compass.NORTHWEST];

    compass.compare = function (direction, otherDirection) {
        return Math.abs(direction.index - (otherDirection.index + 8)) % 8;
    };
    
    return compass;
});