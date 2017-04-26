(function() {
	// Factory we will need at some point
	app.factory('listingFactory', ['$http', function($http) {
		var listingFactory = {};
		listingFactory.getListing = function() {
			return $http.get('/api/listings/' + $scope.listingId);
		};
		listingFactory.getAmenities = function() {
			return $http.get('/api/reference/amenities/');
		};
		listingFactory.getTimes = function() {
			return $http.get('/api/reference/checkinout-times/');
		};
		listingFactory.getPropertyTypes = function() {
			return $http.get('/api/reference/property-types/');
		};
		listingFactory.getMe = function() {
			return $http.get('/api/auth/me/');
		};

		return listingFactory;
	}]);
	// Filters
	app.filter('startFrom', function() {
		return function(input, start) {
			if (input) {
				start = +start; //parse to int
				return input.slice(start);
			}
			return [];
		}
	});
	// Controllers
	app.controller('listingController', ['$scope', '$routeParams', '$window', 'listingFactory', '$http', '$timeout', '$q', function( $scope, $routeParams, $window, listingFactory, $http, $timeout, $q) {

		$('.modal').modal();

		$scope.startedit = function (event, reader, file, fileList, fileObjs, object) {
			if ($(".loader").length) {
				return;
			}else {
				$(".add-pic").html("<div class='loader'>Loading...</div>");
			}
    	console.log(fileObjs);
			console.log("started");
   	};

		$scope.onloadedit = function (Event, FileObjects, FileList) {
			FileObjects.forEach(function (file) {
				console.log(file);
				$scope.picUpload(file);
				$(".loader").remove();
			});
			// console.log($scope.files);
		}

		// parser to make all pictures uploaded the same size
		// will need to move so it can be used by other pages ex: edit listing
		$scope.resizeImage = function ( file, base64_object ) {
		// file is an instance of File constructor.
		// base64_object is an object that contains compiled base64 image data from file.
		var deferred = $q.defer();
		var url = URL.createObjectURL(file);// creates url for file object.
		Jimp.read(url)
		.then(function (item) {
			item
			.resize(1280, Jimp.AUTO)// width of 1280px, auto-adjusted height
			.quality(100)//drops the image quality to 100%
			.getBase64(file.type, function (err, newBase64) {
				if (err) {throw err;}
				var bytes = Math.round((3/4)*newBase64.length);
				base64_object.filetype = file.type;
				base64_object.filesize = bytes;
				base64_object.base64 = newBase64.slice(23);
				// Note that base64 in this package doesn't contain "data:image/jpeg;base64," part,
				// while base64 string from Jimp does.
				deferred.resolve(base64_object);
			});
		})
		.catch(function (err) {
			return console.log(err);// error handling
		});
		return deferred.promise;
	};

		// used for creating drag and drop
		var droppedFiles = false;
	  $("div.pictures").on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
	    e.preventDefault();
	    e.stopPropagation();
	  })
	  .on('dragover dragenter', function() {
	    $("div.add-pic").addClass('is-dragover');
			$("p.add-img-txt").addClass('is-dragover-txt');
	  })
	  .on('dragleave dragend drop', function() {
	    $("div.add-pic").removeClass('is-dragover');
			$("p.add-img-txt").removeClass('is-dragover-txt');
	  })
	  .on('drop', function(e) {
	    droppedFiles = e.originalEvent.dataTransfer.files;
			$scope.droppedFiles = e.originalEvent.dataTransfer.files;

			function readAndPreview(file) {
				var reader  = new FileReader();

				reader.addEventListener("load", function () {
					const result = reader.result.slice(23)
					$scope.pushdrop(result, file);
					console.log(this);
				});

				reader.readAsDataURL(file);
			}

			if (droppedFiles) {
		    [].forEach.call(droppedFiles, readAndPreview);
				$scope.files = [];
		  }
	  });

		$scope.pushdrop = function (result, file) {
			console.log(file);
			let dropfile = {
				base64: result,
				filename: file.name,
				filetype: file.type,
				filesize: file.size
			}
			console.log(dropfile);
			$scope.files.push(dropfile);
			console.log($scope.files);
			$scope.picUpload(dropfile);
		};

		// Variables for the Carousel in the Listing Details Page
		$scope.myInterval = 3000;
		$scope.noWrapSlides = false;
		$scope.active = 0;
		// Initialize options for the states dropdown
		$scope.states = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
			'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
			'WY').split(' ');
		// get times
		listingFactory.getTimes()
			.then(function(response) {
				$scope.times = response.data;
				console.log($scope.times);
			});

		// get types
		listingFactory.getPropertyTypes()
			.then(function(response) {
				$scope.Ptypes = response.data;
				console.log($scope.Ptypes);
			});

		// sets rooms/guests/bathrooms
		$scope.rooms = 0;
		$scope.guests = 0;
		$scope.bathrooms = 0;

		// get id of listing
		let pathname = $window.location.pathname;
		let split_pathname = pathname.split("/");
		$scope.listingId = split_pathname[2];
		$scope.selectedAmenities = [];

		// get listing info
		$http.get('/api/listings/' + $scope.listingId)
			.then(function(response) {
				$scope.listing = response.data;
				let listing = response.data
				console.log(listing);
				let owner = $scope.listing.owner;
				$scope.selectedAmenities = listing.amenities.map(function(a) {
					return a.name;
				})
				updateAmenities();
			}, function(error) {
				console.log(error);
			});
			
		// get owner of listing info(mainly to display name)
		function getowner(owner) {
				$http.get(owner)
					.then(function(response) {
						$scope.thisowner = response.data;
						console.log(response);
					}, function(error) {
						console.log(error);
					});
			}
			// patch listing info
		$scope.patch_name = function() {
			$scope.new_name = $("#name_patch").val();
			$scope.new_obj = {
				name: $scope.new_name,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					$scope.thisowner = response.data;
					console.log(response);
					$scope.nameChange = true;
					$timeout(function() {
						$scope.nameChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.nameChange = true;
				});
		}
		$scope.updateAddressFromGooglePlaces = function(place){
			var k = {};
			console.log('place', place);
			var geo = place.geometry.location.toJSON();
			place.address_components.forEach(function(e, i){
				k[e.types[0]] = e;
			});

			var obj = {
				'formatted_address' : place.formatted_address,
				'street_address' : k.route ? ((k.street_number?(k.street_number.short_name + ' '):'') + k.route.long_name) : '',
				'locality' : k.locality.short_name,
				'region' : k.administrative_area_level_1.short_name,
				'postal_code' : k.postal_code ? k.postal_code.long_name : '',
				'country' : k.country.short_name,
				'location' : [ geo.lng, geo.lat ]
			}
			obj.location_name = obj.locality + ", " + obj.region + ', ' + obj.country;
			console.log(obj);
			$http.patch('/api/listings/' + $scope.listingId + '/', obj)
				.then(function(response) {
					$scope.listing = response.data;
					console.log(response);
					$scope.addressChange = true;
					$timeout(function() {
						$scope.addressChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.addressChange = false;
				});
		}
		$scope.patch_address = function() {
			$scope.new_obj = {
				street_address: $scope.listing.street_address,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.addressChange = true;
					$timeout(function() {
						$scope.addressChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.addressChange = false;
				});
		}
		$scope.patch_address2 = function() {
			$scope.new_obj = {
				street_address_2: $scope.listing.street_address_2,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.address2Change = true;
					$timeout(function() {
						$scope.address2Change = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.address2Change = false;
				});
		}
		$scope.patch_locality = function() {
			$scope.new_obj = {
				locality: $scope.listing.locality,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.cityChange = true;
					$timeout(function() {
						$scope.cityChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.cityChange = false;
				});
		}
		$scope.patch_region = function() {
			$scope.new_obj = {
				region: $scope.listing.region,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.stateChange = true;
					$timeout(function() {
						$scope.stateChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.stateChange = false;
				});
		}
		$scope.patch_postal_code = function() {
			$scope.new_obj = {
				postal_code: $scope.listing.postal_code,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.zipChange = true;
					$timeout(function() {
						$scope.zipChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.zipChange = false;
				});
		}
		$scope.patch_property_type = function() {
			$scope.new_obj = {
				property_type: $scope.listing.property_type,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.typeChange = true;
					$timeout(function() {
						$scope.typeChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.typeChange = false;
				});
		}
		$scope.patch_bedrooms = function() {
			$scope.new_obj = {
				num_bedrooms: $scope.listing.num_bedrooms,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.roomChange = true;
					$timeout(function() {
						$scope.roomChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.roomChange = false;
				});
		}
		$scope.patch_guests = function() {
			$scope.new_obj = {
				num_guests: $scope.listing.num_guests,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.guestChange = true;
					$timeout(function() {
						$scope.guestChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.guestChange = false;
				});
		}
		$scope.patch_bathrooms = function() {
			$scope.new_obj = {
				num_bathrooms: $scope.listing.num_bathrooms,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.bathChange = true;
					$timeout(function() {
						$scope.bathChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.bathChange = false;
				});
		}
		$scope.patch_cancel_policy = function() {
			$scope.new_obj = {
				cancel_policy: $scope.listing.cancel_policy,
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
					$scope.policyChange = true;
					$timeout(function() {
						$scope.policyChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.policyChange = false;
				});
		}
		$scope.patch_summary = function() {
			$scope.new_summary = $("#summary_patch").val();
			$scope.new_obj = {
				summary: $scope.new_summary,
				amenities: [],
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
				.then(function(response) {
					$scope.thisowner = response.data;
					console.log(response);
					$scope.descriptChange = true;
					$timeout(function() {
						$scope.descriptChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.descriptChange = false;
				});
		}
		$scope.patch_checkinmin = function() {
			$scope.new_checkinmin = $("#checkinmin_patch").val();
			$scope.checkinmin_obj = {
				checkin_time_min: $scope.new_checkinmin,
			};
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.checkinmin_obj)
				.then(function(response) {
					console.log(response);
					$scope.minChange = true;
					$timeout(function() {
						$scope.minChange = false;
					}, 2000);
				}, function(error) {
					console.log($scope.checkinmin_obj);
					console.log(error);
					$scope.minChange = false;
				});
		}
		$scope.patch_checkinmax = function() {
			$scope.new_checkinmax = $("#checkinmax_patch").val();
			$scope.checkinmax_obj = {
				checkin_time_max: $scope.new_checkinmax,
			};
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.checkinmax_obj)
				.then(function(response) {
					$scope.thisowner = response.data;
					console.log(response);
					$scope.maxChange = true;
					$timeout(function() {
						$scope.maxChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.maxChange = false;
				});
		}
		$scope.checkout_patch2 = function() {
			$scope.new_checkout = $("#checkout_patch").val();
			$scope.checkout_obj = {
				checkout_time: $scope.new_checkout,
			};
			$http.patch('/api/listings/' + $scope.listingId + '/', $scope.checkout_obj)
				.then(function(response) {
					$scope.thisowner = response.data;
					console.log(response);
					$scope.outChange = true;
					$timeout(function() {
						$scope.outChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.outChange = false;
				});
		}

			// this patches the amenities on edit listing
		$scope.toggleAmenity = function(name) {
			$scope.aname = name;
			let idx = $scope.selectedAmenities.indexOf(name);
			if (idx > -1) {
				$scope.selectedAmenities.splice(idx, 1);
			} else {
				$scope.selectedAmenities.push(name);
			}
			// PATCH
			let obj = {
				'amenities': $scope.selectedAmenities.map(function(a) {
					return {
						name: a,
						group: null
					}
				})
			}
			$http.patch('/api/listings/' + $scope.listingId + '/', obj)
				.then(function(response) {
					console.log(response);
					$scope.aChange = true;
					$timeout(function() {
						$scope.aChange = false;
					}, 2000);
				}, function(error) {
					console.log(error);
					$scope.aChange = false;
				});
		}
		listingFactory.getAmenities()
			.then(function(response) {
				$scope.amenities = response.data;
			});

		function updateAmenities() {
			$scope.selected_amenities = [];
			$scope.selected_amenities = $scope.listing.amenities;
			$scope.selected_amenities_obj = {
				amenities: $scope.selected_amenities,
			};
		}
		$scope.patch_price = function() {
				$scope.new_price = $("#price_patch").val();
				$scope.new_obj = {
					base_price: $scope.new_price,
				}
				$http.patch('/api/listings/' + $scope.listingId + '/', $scope.new_obj)
					.then(function(response) {
						console.log(response);
						$scope.priceChange = true;
						$timeout(function() {
							$scope.priceChange = false;
						}, 2000);
					}, function(error) {
						console.log(error);
						$scope.priceChange = false;
					});
			}

			// pic upload for edit listing
		$scope.file = [];
		$scope.picUpload = function(file) {
			console.log(file);
			$scope.file = file;
			console.log($scope.file);
			let new_obj = {
				caption: $scope.caption,
				image: "data:image/jpeg;base64," + file.base64,
			}
			console.log(new_obj);
			$http.post('/api/listings/' + $scope.listingId + '/photos/', new_obj)
				.then(function(response) {
					// $window.location.reload();
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
		$scope.caption_patch = function($event, photo) {
			console.log(photo);
			let cap = angular.element($event.currentTarget).val();
			let new_caption = {
				caption: cap,
			}
			console.log(new_caption);
			$http.patch('/api/listings/' + $scope.listingId + '/photos/' + photo.id + '/', new_caption)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
		$scope.caption_patch_main = function($event) {
			let id = $scope.listing.photos[0].id;
			let cap = angular.element($event.currentTarget).val();
			let new_caption = {
				caption: cap,
			}
			console.log(new_caption);
			$http.patch('/api/listings/' + $scope.listingId + '/photos/' + id + '/', new_caption)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
		$scope.remove_photo = function(photo) {
			console.log("In make main method", photo);
			// Grab the photo from the photos array
			var i = $scope.listing.photos.indexOf(photo);
			if (i != -1) {
				console.log("Item removed", photo);
				$scope.listing.photos.splice(i, 1);
			}
			// Remove it from the DB
			$scope.deletePicture(photo);
			// update all the position values
			let j = 0;
			let len = $scope.listing.photos.length;
			for (j; j < len; j++) {
				$scope.listing.photos[j].position = j;
			}
			console.log("Photos after repositioning", $scope.listing.photos);
			// patch the photos
			$scope.patchAllPictures();
		};
		$scope.deletePicture = function(photo) {
			$http.delete('/api/listings/' + $scope.listing.id + '/photos/' + photo.id + '/')
				.then(function(response) {
					console.log("Photo deleted successfully", response);
				}, function(error) {
					console.log(error);
				});
		};
		$scope.make_main = function(photo) {
			console.log("In make main method", photo);
			// Grab the photo from the photos array
			var i = $scope.listing.photos.indexOf(photo);
			if (i != -1) {
				console.log("Item removed", photo);
				$scope.listing.photos.splice(i, 1);
			}
			// Add it to the beginning of the array
			$scope.listing.photos.unshift(photo);
			// update all the position values
			let j = 0;
			let len = $scope.listing.photos.length;
			for (j; j < len; j++) {
				$scope.listing.photos[j].position = j;
			}
			console.log("Photos after repositioning", $scope.listing.photos);
			// patch the photos
			$scope.patchAllPictures();
		};
		$scope.patchAllPictures = function() {
			if ($scope.listing.photos && $scope.listing.photos.length > 0) {
				// iterate thru the photos and patch them
				var i = 0;
				var num = $scope.listing.photos.length;
				for (i; i < num; i++) {
					// get the picture
					var pic = {
						id: $scope.listing.photos[i].id,
						caption: $scope.listing.photos[i].caption,
						position: $scope.listing.photos[i].position
					}
					console.log("Patching Photos", pic);
					// patch them
					$http.patch('/api/listings/' + $scope.listing.id + '/photos/' + pic.id + '/', pic)
						.then(function(response) {
							console.log("Photo Update Success:", response);
						}, function(error) {
							console.log(error);
						});
				}
			}
		};
		// end patches
		// delete listing
		$scope.delete = function() {
			console.log("DELETED");
			$http.delete('/api/listings/' + $scope.listingId)
				.then(function(response) {
					window.location.href = "/homes/my";
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
	}]);
	app.controller('NewListingController', ['$scope', '$http', 'listingFactory', '$q', '$window', function($scope, $http, listingFactory, $q, $window) {
		$scope.initSelect = function() {
			$('select').material_select();
		}

			$scope.newstart = function () {
				$(".pictures").append("<h1 class='loader'>Loading</h1>");
			}

			$scope.onloadnew = function (Event, FileObjects, FileList) {
				$(".loader").remove();
				console.log("hey");
				console.log(Event);
				console.log(FileObjects);
				console.log(FileList);
				FileObjects.forEach(function (file) {
					console.log(file);
					$scope.uploadPicture(file);
				});
			}

			// parser to make all pictures uploaded the same size
			// will need to move so it can be used by other pages and DRY ex: edit listing
			$scope.resizeImage = function ( file, base64_object ) {
	    // file is an instance of File constructor.
	    // base64_object is an object that contains compiled base64 image data from file.
	    var deferred = $q.defer();
	    var url = URL.createObjectURL(file);// creates url for file object.
	    Jimp.read(url)
	    .then(function (item) {
	      item
	      .resize(1280, Jimp.AUTO)// width of 1280px, auto-adjusted height
	      .quality(100)//drops the image quality to 100%
	      .getBase64(file.type, function (err, newBase64) {
	        if (err) {throw err;}
	        var bytes = Math.round((3/4)*newBase64.length);
	        base64_object.filetype = file.type;
	        base64_object.filesize = bytes;
	        base64_object.base64 = newBase64.slice(23);
	        // Note that base64 in this package doesn't contain "data:image/jpeg;base64," part,
	        // while base64 string from Jimp does. It should be taken care of in back-end side.
	        deferred.resolve(base64_object);
	      });
	    })
	    .catch(function (err) {
	      return console.log(err);// error handling
	    });
	    return deferred.promise;
	  };

		// used for creating drag and drop new listing
		var droppedFiles = false;
	  $("div.pictures").on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
	    e.preventDefault();
	    e.stopPropagation();
	  })
	  .on('dragover dragenter', function() {
	    $("div.pic-list").addClass('is-dragover');
			$("p.add-img-txt").addClass('is-dragover-txt');
	  })
	  .on('dragleave dragend drop', function() {
	    $("div.pic-list").removeClass('is-dragover');
			$("p.add-img-txt").removeClass('is-dragover-txt');
	  })
	  .on('drop', function(e) {
	    droppedFiles = e.originalEvent.dataTransfer.files;
			$scope.droppedFile = e.originalEvent.dataTransfer.files[0];
			// console.log($scope.droppedFile);
			function readAndPreview(file) {
				var reader  = new FileReader();

				reader.addEventListener("load", function () {
					const result = reader.result.slice(23)
					$scope.pushdrop(result, file);
					console.log(this);
				});

				reader.readAsDataURL(file);
			}


			if (droppedFiles) {
				[].forEach.call(droppedFiles, readAndPreview);
				$scope.files = [];
			}
	  });

		$scope.pushdrop = function (result, file) {
			let dropfile = {
				base64: result,
				filename: $scope.droppedFile.name,
				filetype: $scope.droppedFile.type,
				filesize: $scope.droppedFile.size
			}
			console.log(dropfile);
			$scope.files.push(dropfile);
			console.log($scope.files);
			$scope.uploadPicture(dropfile);
		};

		// Clear out message
		$scope.isPublishSuccessful = false;
		// get amenities
		listingFactory.getAmenities()
			.then(function(response) {
				$scope.amenities = response.data;
			});
		// for new listing
		$scope.selected_amenities = [];
		$scope.isclicked = function(event, amenity) {
				let classChecker = event.target.className;
				if (classChecker == "tick") {
					var i = $scope.selected_amenities.length;
					while (i--) {
						if (amenity == $scope.selected_amenities[i].name) {
							console.log(amenity);
							$scope.selected_amenities.splice(i, 1);
							console.log($scope.selected_amenities);
						}
					}
				} else if (classChecker != "active") {
					let obj = {
						name: amenity
					}
					$scope.selected_amenities.push(obj);
					console.log($scope.selected_amenities);
				} else {
					null;
				}
			}
			// end amenities
			// get times
		$scope.initSelect = function () {
			console.log("this is the init");
			$('select').material_select();
		}
		listingFactory.getTimes()
			.then(function(response) {
				$scope.times = response.data;
				console.log($scope.times);
				// $scope.initSelect();
				$('select').material_select();
			});

		// end times
		// get types
		listingFactory.getPropertyTypes()
			.then(function(response) {
				$scope.Ptypes = response.data;
				console.log($scope.Ptypes);
			});
		// end types
		// sets rooms/guests/bathrooms
		$scope.rooms = 0;
		$scope.guests = 0;
		$scope.bathrooms = 0;
		// sets States
		$scope.states = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
			'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
			'WY').split(' ');
		//sets new listing obj
		$scope.listing = {
			//owner: "http://localhost:8000/api/users/1/",
			amenities: $scope.selected_amenities,
			currency: "USD",
			num_bedrooms: $scope.rooms,
			num_guests: $scope.guests,
			num_bathrooms: $scope.bathrooms,
			property_type: "House"
		};
		$scope.clicked_radio = function() {
			console.log($scope.listing);
		}

		$scope.updateAddressFromGooglePlaces = function(place){
			var k = {};
			console.log('place', place);
			var geo = place.geometry.location.toJSON();
			place.address_components.forEach(function(e, i){
				k[e.types[0]] = e;
			});

			var o = $scope.listing;

			o.formatted_address = place.formatted_address;
			o.street_address = k.route ? ((k.street_number?(k.street_number.short_name + ' '):'') + k.route.long_name) : '';
			o.locality = k.locality.short_name;
			o.region = k.administrative_area_level_1.short_name;
			o.postal_code =  k.postal_code ? k.postal_code.long_name : '';
			o.country = k.country.short_name;
			o.location = [ geo.lng, geo.lat ];
			o.location_name = o.locality + ", " + o.region + ', ' + o.country;
		}
		var createDefer = $q.defer();
		createDefer.promise
			.then(function() {
				console.log($scope.listing);
				// Add location name
				$http.post('/api/listings/', $scope.listing)
					.then(function(response) {
						$scope.thisowner = response.data;
						$scope.listing.id = response.data.id;
						listingFactory.getMe()
							.then(function(response) {
								$scope.id = response.data.id;
								$scope.maketrue = {
									isOwner: true,
								}
								$http.patch('/api/users/' + $scope.id + '/', $scope.maketrue)
									.then(function(response) {
										$scope.thisowner = response.data;
										console.log(response);
									}, function(error) {
										console.log(error);
									});
							}, function(error) {
								console.log(error);
							});
						console.log(response);
					}, function(error) {
						console.log(error);
					});
			});
		$scope.patchListing = function() {
			console.log("In the new Patch Function");
			console.log("Patch the listing next");
			$http.patch('/api/listings/' + $scope.listing.id + '/', $scope.listing)
				.then(function(response) {
					console.log("New Patch Function Success:", response);
					$scope.listing.id = response.data.id;
				}, function(error) {
					console.log(error);
				});
		};
		$scope.create_listing = function($event) {
			// if (!$scope.isStepValid($scope.currentStep))
			// {
			// 	alert('invalid');
			// 	return;
			// }
			console.log("in create listing function");
			try {
				if ($scope.isListingCreate()) {
					console.log("Need to create");
					// Create Call
					createDefer.resolve();
				} else {
					console.log("Need to patch/Publish");
					// Handle update. Patch.
					$scope.patchListing();
				}
			} catch (err) {}
		}
		$scope.publish_listing = function() {
			try {
				$scope.create_listing();
				$scope.isPublishSuccessful = true;
				console.log("Publish Done!");
			} catch (err) {
				console.log(err);
				$scope.isPublishSuccessful = false;
			}
		};
		$scope.update_listing = function() {
				updateDefer.resolve();
			}
			// Functions to test if it is a listing create or listing update.
		$scope.isListingCreate = function() {
			return $scope.listing.id ? false : true;
		};
		// Lets keep track of the current step
		$scope.currentStep = 1;
		$scope.goToStep1 = function() {
			// Return if already in Step 1
			if ($scope.currentStep === 1) return;
			// Set Current Step
			$scope.currentStep = 1;
			//Update the CSS to underline, etc.
			$(".step-div-1").toggleClass('step-underlined')
			$(".step-div-2").toggleClass('step-underlined')
		};
		$scope.goToStep2 = function() {
			// Return if already in Step 2
			if ($scope.currentStep === 2) return;
			// Check if Step 1 is valid. If not, disable the link to Step 2
			if (!$scope.isStepValid(1)) return;
			// if Step 1 is valid. Lets go ahead and save the listing now.
			$scope.create_listing();
			// Once the listing is saved, now change the currentStep to 2. To Do: Update the state of the listing
			$scope.currentStep = 2;
			// Change the css, etc. & show Step 2 div
			$window.scrollTo(0, 0);
			$(".step-div-1").toggleClass('step-underlined')
			$(".step-div-2").toggleClass('step-underlined')
		};
		$scope.isStepValid = function(stepNum) {
				// Assume that step is Valid
				var isValid = true;
				// Now Check if the ng-invalid is set on any of the required fields in the step
				$('input,textarea,select')
					.filter('[required]:visible')
					.filter('[step="' + stepNum + '"]').each(function() {
						// If any of these have a error. invalidate step 1
						if ($(this).hasClass("ng-invalid") || $(this).hasClass("ng-invalid-required")) {
							isValid = false;
							return false;
						}
					});
				return isValid;
			}



		$scope.loadStart = function (FileReader) {
			$scope.loader = true;
			console.log("load start");
			console.log(FileReader);
		};

		$scope.loadEnd = function () {
			console.log("load ends");
			// $scope.loader = false;
		}
			// Let's handle some pictures here
		$scope.listing.photos = [];
		// Lets handle the event from the file loader
		$scope.uploadPicture = function(file) {
			// Add the picture to the $scope.listing.photos array.
			// The newly uploaded file is in this - $scope.file
			// A picture needs to be a JS object with caption, image, & position
			// Add the new picture to the end of the array. We will worry about reorder later
			if (file) {
				console.log("Received File Upload");
				console.log(file);
				// $scope.file.caption = $scope.file.caption ? $scope.file.caption : "";
				// make sure that $scope.listing.photos exists otherwise create one
				var newPic = {
					caption: $scope.caption,
					image: "data:image/jpeg;base64," + file.base64,
				};
				// lets now upload it to the server.
				var listingPhotos = $scope.listing.photos;
				$http.post('/api/listings/' + $scope.listing.id + '/photos/', newPic)
					.then(function(response) {
						console.log(newPic);
						console.log("Photo upload Success:", response);
						$scope.file = null;
						// Create photo js object
						var pic = {
							id: response.data.id,
							caption: response.data.caption,
							image: response.data.image,
							position: response.data.position
						};
						// Add to local array
						listingPhotos.push(pic);
					}, function(error) {
						console.log(newPic);
						console.log(error);
					});
				console.log("Current state of the Listing Photos", $scope.listing.photos);
			}
			else {
				console.log("no");
			}
		};
		$scope.remove_photo = function(photo) {
			console.log("In make main method", photo);
			// Grab the photo from the photos array
			var i = $scope.listing.photos.indexOf(photo);
			if (i != -1) {
				console.log("Item removed", photo);
				$scope.listing.photos.splice(i, 1);
			}
			// Remove it from the DB
			$scope.deletePicture(photo);
			// update all the position values
			let j = 0;
			let len = $scope.listing.photos.length;
			for (j; j < len; j++) {
				$scope.listing.photos[j].position = j;
			}
			console.log("Photos after repositioning", $scope.listing.photos);
			// patch the photos
			$scope.patchAllPictures();
		};
		$scope.deletePicture = function(photo) {
			$http.delete('/api/listings/' + $scope.listing.id + '/photos/' + photo.id + '/')
				.then(function(response) {
					console.log("Photo deleted successfully", response);
				}, function(error) {
					console.log(error);
				});
		};
		$scope.make_main = function(photo) {
			console.log("In make main method", photo);
			// Grab the photo from the photos array
			var i = $scope.listing.photos.indexOf(photo);
			if (i != -1) {
				console.log("Item removed", photo);
				$scope.listing.photos.splice(i, 1);
			}
			// Add it to the beginning of the array
			$scope.listing.photos.unshift(photo);
			// update all the position values
			let j = 0;
			let len = $scope.listing.photos.length;
			for (j; j < len; j++) {
				$scope.listing.photos[j].position = j;
			}
			console.log("Photos after repositioning", $scope.listing.photos);
			// patch the photos
			$scope.patchAllPictures();
		};
		$scope.patchAllPictures = function() {
			if ($scope.listing.photos && $scope.listing.photos.length > 0) {
				// iterate thru the photos and patch them
				var i = 0;
				var num = $scope.listing.photos.length;
				for (i; i < num; i++) {
					// get the picture
					var pic = {
						id: $scope.listing.photos[i].id,
						caption: $scope.listing.photos[i].caption,
						position: $scope.listing.photos[i].position
					}
					console.log("Patching Photos", pic);
					// patch them
					$http.patch('/api/listings/' + $scope.listing.id + '/photos/' + pic.id + '/', pic)
						.then(function(response) {
							console.log("Photo Update Success:", response);
						}, function(error) {
							console.log(error);
						});
				}
			}
		};
		$scope.patch_property_type = function() {
			$scope.new_obj = {
				property_type: $scope.listing.property_type,
			}
			$http.patch('/api/listings/' + $scope.listing.id + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
		$scope.patch_bedrooms = function() {
			$scope.new_obj = {
				num_bedrooms: $scope.listing.num_bedrooms,
			}
			$http.patch('/api/listings/' + $scope.listing.id + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
		$scope.patch_guests = function() {
			$scope.new_obj = {
				num_guests: $scope.listing.num_guests,
			}
			$http.patch('/api/listings/' + $scope.listing.id + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
		$scope.patch_bathrooms = function() {
			$scope.new_obj = {
				num_bathrooms: $scope.listing.num_bathrooms,
			}
			$http.patch('/api/listings/' + $scope.listing.id + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
		$scope.patch_cancel_policy = function() {
			$scope.new_obj = {
				cancel_policy: $scope.listing.cancel_policy,
			}
			$http.patch('/api/listings/' + $scope.listing.id + '/', $scope.new_obj)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log(error);
				});
		}
	}]);
})(); //end closure
