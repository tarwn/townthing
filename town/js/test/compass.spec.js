/// <reference path="../lib/jasmine-2.0.0/jasmine.js" />

define(['compass'], function(compass){
	describe("compass", function () {

		describe("compare", function () {

			it("should return equivalent of 315 degrees for other similar diagonal direction S-SE", function () {
				var result = compass.compare(compass.SOUTH, compass.SOUTHEAST);

				expect(result).toEqual(7);
			});

			it("should return equivalent of 315 degrees for other similar diagonal direction NW-W", function () {
				var result = compass.compare(compass.NORTHWEST, compass.WEST);

				expect(result).toEqual(7);
			});

			it("should return equivalent of 270 degrees for other perpendicular direction S-E", function () {
				var result = compass.compare(compass.SOUTH, compass.EAST);

				expect(result).toEqual(6);
			});

			it("should return equivalent of 215 degrees for other opposing diagonal direction S-NE", function () {
				var result = compass.compare(compass.SOUTH, compass.NORTHEAST);

				expect(result).toEqual(5);
			});


			it("should return equivalent of 180 degrees for opposing direction N-S", function () {
				var result = compass.compare(compass.SOUTH, compass.NORTH);
					
				expect(result).toEqual(4);
			});

			it("should return equivalent of 180 degrees for opposing direction NE-SW", function () {
				var result = compass.compare(compass.NORTHEAST, compass.SOUTHWEST);

				expect(result).toEqual(4);
			});

			it("should return equivalent of 135 degrees for opposing diagonal direction S-NW", function () {
				var result = compass.compare(compass.SOUTH, compass.NORTHWEST);

				expect(result).toEqual(3);
			});

			it("should return equivalent of 90 degrees for perpendicular direction S-W", function () {
				var result = compass.compare(compass.SOUTH, compass.WEST);

				expect(result).toEqual(2);
			});

			it("should return equivalent of 45 degrees for similar diagonal direction S-SW", function () {
				var result = compass.compare(compass.SOUTH, compass.SOUTHWEST);

				expect(result).toEqual(1);
			});

			it("should return equivalent of 0 degrees for same direction S-S", function () {
				var result = compass.compare(compass.SOUTH, compass.SOUTH);

				expect(result).toEqual(0);
			});


		});

	});
});