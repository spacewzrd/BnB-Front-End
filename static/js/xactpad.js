(function() {
	app.factory('bnbFactory', ['$http', function($http) {
		var bnbFactory = {};
		var searchApiEndpoint = '/api/search/' + SEARCH_INDEX_NAME_LISTING + '/_search';

		bnbFactory.search = function(data) {
			var qs = JSON.stringify(data);
			return $http.get(searchApiEndpoint, {
				params: {
					source: qs
				}
			});
		};

		bnbFactory.getLocations = function() {
			var data = {
				"size": 0,
				"aggs" : {
					"locations" : {
						"terms" : { "field" : "location_name.keyword" }
					}
				}
			};
			console.log('getLocations!!');
			var qs = JSON.stringify(data);
			return $http.get(searchApiEndpoint, {
				params: {
					source: qs
				}
			});
		};

		return bnbFactory;
	}])
})();

(function() {
	var app = angular.module('xactpad', ['autocomplete', 'ngCookies', 'ngRoute', 'angular.filter', 'naif.base64', 'ui.bootstrap', 'ngAnimate']);

	app.config(['$httpProvider', '$routeProvider', '$animateProvider', '$locationProvider', function($httpProvider, $routeProvider, $animateProvider, $locationProvider) {
		$httpProvider.defaults.headers.patch = {
				'Content-Type': 'application/json;charset=utf-8'
			}
			// gets csrf token
		$httpProvider.defaults.headers.common["X-CSRFToken"] = window.csrf_token;
		$animateProvider.classNameFilter(/^(?:(?!ng-animate-disabled).)*$/);

		// $locationProvider.html5Mode(true);
		$locationProvider.html5Mode({
			enabled: true,
			requireBase: false
		});

	}]);

	// Directives
	app.directive('repeatDone', function() {
	 return function(scope, element, attrs) {
			 if (scope.$last) { // all are rendered
					 scope.$eval(attrs.repeatDone);
			 }
	 }
	});

	app.directive("showPopover", function() {
		return {
			restrict: "A",
			link: function(scope, elem, attrs) {
				$(elem).popover({
					html: true
				});
			}
		};
	});

	// Controllers
	app.controller('BaseController', ['$scope', '$http', '$route', '$routeParams', '$location', '$window', function($scope, $http, LocationRetriever, $route, $routeParams, $location, $window) {

	}]);

	app.controller('HomeController', ['$scope', 'userFactory', function($scope, userFactory) {
		// this is for the background-color switch on homepage
		$(window).scroll(function() {
			var scroll = $(window).scrollTop();
			if (scroll >= 500) {
				$(".nav").addClass("nav-background");
			} else {
				$(".nav").removeClass("nav-background");
			}
		});



	}]);

	app.controller('NavController', ['$scope', 'userFactory', '$window', '$location', function($scope, userFactory, $window, $location) {
		$(".dropdown-button").dropdown();
		`$('.button-collapse').sideNav({
      menuWidth: 300, // Default is 300
      edge: 'right', // Choose the horizontal origin
      closeOnClick: true, // Closes side-nav on <a> clicks, useful for Angular/Meteor
      draggable: true // Choose whether you can drag to open on touch screens
    }
  	);`
		// rotates nav caret
		$('.crossRotate').on('click', function(){
		  $(this).toggleClass('active');
		});

		$scope.user = {
			isAuthenticated: false
		};
		userFactory.getSelf()
			.then(function(response) {
				$scope.user = response.data;
				$scope.user.isAuthenticated = true;
			}, function(error) {
				if (error.status == 403) {
					$scope.user.isAuthenticated = false;
				} else {
					console.log(error);
				}
				let path = window.location.pathname;
				$scope.myUrl = $location.path();
				if (path == '/register' && $scope.user.isAuthenticated == false) {
					console.log("register works");
				}
				else if (path == '/' && $scope.user.isAuthenticated == false) {
					console.log("home works");
				}
				else if (path == '/accounts/login/' && $scope.user.isAuthenticated == false) {
					console.log("login works");
				}
				else {
					$window.location.href = '/accounts/login/';
				}
			});



		$scope.logOut = function() {
			userFactory.logOut()
				.then(function(response) {
					console.log(response);
					$window.location.href = '/';
				}, function(error) {
					$scope.status = error;
					console.log($scope.status);
				});
		};
	}]);


	app.controller('SearchFormController', ['$scope', function($scope) {
		var nowTemp = new Date();
		var now = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);

		var checkin = $('#dpd1').datepicker({
			onRender: function(date) {
				return date.valueOf() < now.valueOf() ? 'disabled' : '';
			}
		}).on('changeDate', function(ev) {
			if (ev.date.valueOf() > checkout.date.valueOf()) {
				var newDate = new Date(ev.date)
				newDate.setDate(newDate.getDate() + 1);
				checkout.setValue(newDate);
			}
			checkin.hide();
			$('#dpd2')[0].focus();
		}).data('datepicker');
		var checkout = $('#dpd2').datepicker({
			onRender: function(date) {
				return date.valueOf() <= checkin.date.valueOf() ? 'disabled' : '';
			}
		}).on('changeDate', function(ev) {
			checkout.hide();
		}).data('datepicker');
		$scope.guests = [{
			name: '1',
			value: 1
		}, {
			name: '2',
			value: 2
		}];
		$scope.selectedItem;
		$scope.guestsFun = function(item) {
			$scope.selectedItem = item;
		}

	}]);

	app.controller('SearchController', ['$scope', 'bnbFactory', 'listingFactory', function($scope, bnbFactory, listingFactory) {
		$('.crossRotate').on('click', function(){
		  $(this).toggleClass('active');
		});

		$scope.results = [];
		$scope.gridview = false;
		$scope.property_type = '';
		$scope.selectedAmenitites = [];
		$scope.location = null;

		$scope.checkAmenity = function(event) {
			let classChecker = event.target.className;
			if (classChecker == "amenity-checkbox-tick") {

				var i = $scope.selectedAmenitites.length;

				while (i--) {
					if (this.amenity == $scope.selectedAmenitites[i].name) {
						$scope.selectedAmenitites.splice(i, 1);
					}
				}
			} else if (classChecker != "active") {
				let obj = {
					name: this.amenity
				}
				$scope.selectedAmenitites.push(obj);
			} else {
				null;
			}
		}

		$scope.initGoogleLocationSearch = function() {
			var options = {
				types: ['(cities)'],
				componentRestrictions: {
					country: "us"
				}
			};

			var input = document.getElementById('locationTextField');
			var autocomplete = new google.maps.places.Autocomplete(input, options);

			google.maps.event.addListener(autocomplete, 'place_changed', function() {
				var place = autocomplete.getPlace();
				var geo = place.geometry.location.toJSON();
				console.log('got-location', geo)
				$scope.location = [ geo.lng, geo.lat ];
			});
		}
		$scope.doSearch = function() {
			console.log('am', $scope.selectedAmenitites);
			var filters = [];
			if ($scope.property_type)
				filters.push({
					"match": {
						"property_type": $scope.property_type
					}
				});

			// HACK: We should do this the angular way.
			$('.amenity-checkbox-tick:visible').each(function() {
				filters.push({
					"match": {
						"amenities.name": $(this).data('name')
					}
				});
			});

			if ($scope.location)
			{
				filters.push({
					geo_distance : {
						distance: '100km',
						location: $scope.location
					}
				})
			}

			// { "match": { "num_beds": 1 }}
			var data = {
				"query": {
					"bool": {
						"must": filters
					}
				}
			}
			console.log(data);
			bnbFactory.search(data)
				.then(function(resp) {
					$scope.results = $(resp.data.hits.hits).map(function() {

							return this._source;
						})
					console.log($scope.results);
						// $scope.results = resp.data.hits;
				}, function(error) {
					console.log(error);
				});
		};

		listingFactory.getPropertyTypes()
			.then(function(response) {
				$scope.propertyTypes = response.data;
			});

		listingFactory.getAmenities()
			.then(function(response) {
				$scope.amenities = response.data;
			});
		$scope.initGoogleLocationSearch();
		$scope.doSearch();
	}]);


	app.controller('SimpleSearchController', ['$scope', 'bnbFactory', '$window', function($scope, bnbFactory, $window) {
		$scope.result = null;
		$scope.numGuests = 0;
		$scope.selectedLocation = null;
		$scope.doSearch = function() {
			console.log('loc', $scope.location_name);
			var filters = [];
			if ($scope.selectedLocation)
				filters.push({
					"match": {
						"location_name": $scope.selectedLocation
					}
				});
			if ($scope.numGuests)
				filters.push({
					"range": {
						"num_guests": {
							"gte": $scope.numGuests
						}
					}
				});

			// { "match": { "num_beds": 1 }}
			var data = {
				"query": {
					"bool": {
						"must": filters
					}
				}
			}
			console.log(data);
			bnbFactory.search(data)
				.then(function(resp) {
					$scope.results = $(resp.data.hits.hits).map(function() {

							return this._source;
						})
					console.log($scope.results);
						// $scope.results = resp.data.hits;
				}, function(error) {
					console.log(error);
				});
			}
		// TODO - fix this...
		window._hackScope = $scope;
	}]);

	app.controller('MiniSearchController', ['$scope', 'bnbFactory', '$window', function($scope, bnbFactory, $window) {
		$scope.locations = [];
		$scope.numGuests = 2;
		$scope.selectedLocation = null;
		bnbFactory.getLocations()
			.then(function(response){
				$scope.locations = response.data.aggregations.locations.buckets.map(function(item){
					return item.key;
				});
				console.log('locs', $scope.locations);
			});
		 $scope.onSelect = function ($item, $model, $label) {
		 	$scope.selectedLocation = $item;
		    $scope.$item = $item;
		    $scope.$model = $model;
		    $scope.$label = $label;
		};
		$scope.doSearch = function() {
			var $outerScope = window._hackScope;
			$outerScope.selectedLocation = $scope.selectedLocation;
			$outerScope.numGuests = $scope.numGuests;
			$outerScope.doSearch();
		}

	}]);





	// Components
	app.component('navBar', {
		templateUrl: STATIC_URL + 'js/components/navbar.html',
	});

	app.component('navbarSecondary', {
		templateUrl: STATIC_URL + 'js/components/navbarSecondary.html',
	});

	app.component('navbarDark', {
		templateUrl: STATIC_URL + 'js/components/navbarDark.html',
	});

	app.component('searchForm', {
		templateUrl: STATIC_URL + '/js/components/searchform.html',
		controller: 'BaseController'
	});

	app.component('loginModal', {
		templateUrl: STATIC_URL + '/js/components/logInModal.html',
	});

	app.component('foot', {
		templateUrl: STATIC_URL + '/js/components/foot.html',
	});

	app.component('miniSearch', {
		templateUrl: STATIC_URL + 'js/components/miniSearch.html',
	});

})();
