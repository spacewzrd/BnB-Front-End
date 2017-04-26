(function() {
	app.factory('userFactory', ['$http', function($http) {
		var userFactory = {};

		userFactory.getSelf = function() {
			return $http.get('/api/users/self/');
		};

		userFactory.getMyListings = function() {
			return $http.get('/api/users/self/listings/');
		};

		userFactory.getMe = function() {
			return $http.get('/api/auth/me/');
		};

		userFactory.getListings = function() {
			return $http.get('/api/listings/');
		};

		userFactory.logIn = function(user) {
			return $http.post('api/auth/login/', user);
		};

		userFactory.activate = function(user) {
			return $http.post('/api/auth/activate/', user);
		};

		userFactory.logOut = function() {
			return $http.post('/accounts/logout/');
		};

		userFactory.register = function(user) {
			return $http.post('/api/auth/register/', user);
		};

		userFactory.changeUsername = function(user) {
			return $http.post('/api/auth/username/', user);
		};

		userFactory.changePassword = function(user) {
			return $http.post('/api/auth/password/', user);
		};

		return userFactory;
	}]);

	// Contrllers
	app.controller('UserController', ['$scope', '$cookies', 'userFactory', function($scope, $cookies, userFactory) {
		$scope.user = {
			isAuthenticated: false
		};
		userFactory.getSelf()
			.then(function(response) {
				$scope.user = response.data;
				$scope.user.isAuthenticated = true;
				console.log($scope.user);
			}, function(error) {
				if (error.status == 403) {
					$scope.user.isAuthenticated = false;
				} else {
					console.log(error);
				}
			});
	}]);

	app.controller('LoginController', ['$scope', 'userFactory', '$window', function($scope, userFactory, $window) {
		$scope.loginfo = {};
		$scope.login = function() {
			console.log($scope.loginfo);
			userFactory.logIn($scope.loginfo)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					console.log($scope.status);
				});
		};
	}]);

	app.controller('LogOutController', ['$scope', '$cookies', 'userFactory', '$window', function($scope, $cookies, userFactory, $window) {
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

	app.controller('RegisterController', ['$scope', 'userFactory', '$window', function($scope, userFactory, $window) {
		$(".checkbox-register").click(function(evt) {
			evt.stopImmediatePropagation();
			evt.stopPropagation();
			evt.preventDefault();
			console.log(this);
			$(this).toggleClass('checkbox-checked')
		});
		$scope.registerInfo = {};
		$scope.register = function(isValid) {
			console.log($scope.registerInfo);
			if (isValid) {
				userFactory.register($scope.registerInfo)
					.then(function(response) {
						console.log(response);
						$window.location.href = 'accounts/login';
					}, function(error) {
						$scope.error = error;
						console.log(error);
					});
			}
		};
	}]);

	app.controller('ChangeController', ['$scope', '$cookies', 'userFactory', '$http', '$q', '$timeout', function($scope, $cookies, userFactory, $http, $q, $timeout) {

		// parser to make all pictures uploaded the same size
		// will need to move so it can be used by other pages and DRY
		$scope.resizeImage = function ( file, base64_object ) {
		var deferred = $q.defer();
		var url = URL.createObjectURL(file);// creates url for file object.
		Jimp.read(url)
		.then(function (item) {
			item
			.resize(300, Jimp.AUTO)// width of 300px, auto-adjusted height
			.quality(100)//drops the image quality to 100%
			.getBase64(file.type, function (err, newBase64) {
				if (err) {throw err;}
				var bytes = Math.round((3/4)*newBase64.length);
				base64_object.filetype = file.type;
				base64_object.filesize = bytes;
				base64_object.base64 = newBase64.slice(23);
				console.log(newBase64.slice(23));
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
	    $("div.pictures").addClass('is-dragover');
			$("p.add-img-txt").addClass('is-dragover-txt');
	  })
	  .on('dragleave dragend drop', function() {
	    $("div.pictures").removeClass('is-dragover');
			$("p.add-img-txt").removeClass('is-dragover-txt');
	  })
	  .on('drop', function(e) {
			e.stopPropagation();
			$scope.droppedFiles = e.originalEvent.dataTransfer.files[0];
	    droppedFiles = e.originalEvent.dataTransfer.files;
			console.log(droppedFiles[0]);
			var reader  = new FileReader();

			reader.addEventListener("load", function () {
				// console.log(reader.result);
				const result = reader.result.slice(23)
				$scope.pushdrop(result);
			});

			if (droppedFiles) {
				reader.readAsDataURL(droppedFiles[0]);
			}

	  });

		$scope.pushdrop = function (base64) {
			$scope.file = {
				base64: base64,
				filename: $scope.droppedFiles.name,
				filetype: $scope.droppedFiles.type,
				filesize: $scope.droppedFiles.size
			}
			console.log($scope.file);
			$scope.patch_avatar();
		};

		// $scope.file = {
		//
		// };


		$scope.patch_obj = {};
		$scope.states = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
			'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
			'WY').split(' ');

		userFactory.getSelf()
			.then(function(response) {
				$scope.id = response.data.id;
				$scope.user = response.data;

				$scope.patch = function(attr) {
					$scope.attrib = attr;
					var obj = {};
					obj[attr] = $scope.user[attr];
					console.log('send', obj, attr);
					$http.patch('/api/users/self/', obj)
						.then(function(response) {
							$scope.thisowner = response.data;
							// set helper txt to true if attr matches input name
							if ($scope.attrib == 'firstName' || $scope.attrib == 'lastName') {
								$scope.nameSubmit = true;
							}else if ($scope.attrib == 'email') {
								$scope.emailSubmit = true;
							}else if ($scope.attrib == 'phone') {
								$scope.phoneSubmit = true;
							}
							else if ($scope.attrib == 'streetAddress' || $scope.attrib == 'streetAddress2' || $scope.attrib == 'city' || $scope.attrib == 'state' ||  $scope.attrib == 'postalCode') {
								$scope.addressSubmit = true;
							}
							// then turn off helper txt after a couple seconds
							$timeout(function() {
			          $scope.nameSubmit = false;
								$scope.emailSubmit = false;
								$scope.phoneSubmit = false;
								$scope.addressSubmit = false;
			        }, 2000);

							console.log(response);
						}, function(error) {
							console.log(error);
							$scope.nameSubmit = false;
						});
				}
			}, function(error) {
				$scope.status = error;
				console.log($scope.status);
			});

		$scope.username = {};
		$scope.first_name = '';
		$scope.last_name = '';
		$scope.changeUsername = function() {
			console.log($scope.username);
			userFactory.changeUsername($scope.username)
				.then(function(response) {
					console.log(response);
				}, function(error) {
					$scope.status = error;
					console.log($scope.status);
				});
		};

		$scope.password = {};
		$scope.passwordChanged = false;
		// u.has_usable_password()
		$scope.changePassword = function() {
			console.log($scope.password);
			userFactory.changePassword($scope.password)
				.then(function(response) {
					console.log(response);
					$scope.passwordChanged = true;
				}, function(error) {
					$scope.passwordChanged = false;
					$scope.status = error;
					console.log($scope.status);
				});
		};

		// manage avatar
		$scope.savepic = function() {
			$scope.avatar_obj = {
				avatar: $scope.file.base64,
			}
		}

		var defer = $q.defer();
		defer.promise
			.then(function() {
				$scope.avatarSaving = true;
				$scope.savepic();
			})

			.then(function() {
				console.log($scope.file);
				let test_obj = {
					avatar:  $scope.file.base64,
				}
				$http.patch('/api/users/self/', test_obj)
					.then(function(response) {
						console.log(response);
						$scope.avatarSaving = false;
						$scope.avatarChanged = true;
						$timeout(function() {
		          $scope.avatarChanged = false;
		        }, 3000);

					}, function(error) {
						console.log(error);
						$scope.avatarChanged = false;
						$scope.avatarSaving = false;
					});
			})
		$scope.patch_avatar = function() {
			defer.resolve();
		}
	}]);

	app.controller('MyhomesController', ['$scope', 'userFactory', function($scope, userFactory) {
		$scope.gridview = true;
		// gets all listings
		userFactory.getMyListings()
			.then(function(response) {
				$scope.listings = response.data
				console.log($scope.listings);
			}, function(error) {
				$scope.status = error;
				console.log($scope.status);
			});
	}]);

	// components
	app.component('logIn', {
		templateUrl: STATIC_URL + '/js/components/loginComponents/login.html',
		controller: 'LoginController'
	});

	app.component('logOut', {
		templateUrl: STATIC_URL + '/js/components/loginComponents/logout.html',
	});

	app.component('register', {
		templateUrl: STATIC_URL + '/js/components/loginComponents/register.html',
		controller: 'RegisterController'
	});

	app.component('changeUsername', {
		templateUrl: STATIC_URL + '/js/components/loginComponents/changeUsername.html',
		controller: 'ChangeController'
	});

	app.component('changePassword', {
		templateUrl: STATIC_URL + '/js/components/loginComponents/changePassword.html',
		controller: 'ChangeController'
	});
})();
