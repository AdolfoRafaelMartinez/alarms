'use strict';

(function() {
	// Plans Controller Spec
	describe('PlansController', function() {
		// Initialize global variables
		var PlansController,
			scope,
			$httpBackend,
			$stateParams,
			$location;

		// The $resource service augments the response object with methods for updating and deleting the resource.
		// If we were to use the standard toEqual matcher, our tests would fail because the test values would not match
		// the responses exactly. To solve the problem, we define a new toEqualData Jasmine matcher.
		// When the toEqualData matcher compares two objects, it takes only object properties into
		// account and ignores methods.
		beforeEach(function() {
			jasmine.addMatchers({
				toEqualData: function(util, customEqualityTesters) {
					return {
						compare: function(actual, expected) {
							return {
								pass: angular.equals(actual, expected)
							};
						}
					};
				}
			});
		});

		// Then we can start by loading the main application module
		beforeEach(module(ApplicationConfiguration.applicationModuleName));

		// The injector ignores leading and trailing underscores here (i.e. _$httpBackend_).
		// This allows us to inject a service but then attach it to a variable
		// with the same name as the service.
		beforeEach(inject(function($controller, $rootScope, _$location_, _$stateParams_, _$httpBackend_) {
			// Set a new global scope
			scope = $rootScope.$new();

			// Point global variables to injected services
			$stateParams = _$stateParams_;
			$httpBackend = _$httpBackend_;
			$location = _$location_;

			// Initialize the Plans controller.
			PlansController = $controller('PlansController', {
				$scope: scope
			});
		}));

		it('$scope.find() should create an array with at least one plan object fetched from XHR', inject(function(Plans) {
			// Create sample plan using the Plans service
			var samplePlan = new Plans({
				title: 'An Plan about MEAN',
				content: 'MEAN rocks!'
			});

			// Create a sample plans array that includes the new plan
			var samplePlans = [samplePlan];

			// Set GET response
			$httpBackend.expectGET('plans').respond(samplePlans);

			// Run controller functionality
			scope.find();
			$httpBackend.flush();

			// Test scope value
			expect(scope.plans).toEqualData(samplePlans);
		}));

		it('$scope.findOne() should create an array with one plan object fetched from XHR using a planId URL parameter', inject(function(Plans) {
			// Define a sample plan object
			var samplePlan = new Plans({
				title: 'An Plan about MEAN',
				content: 'MEAN rocks!'
			});

			// Set the URL parameter
			$stateParams.planId = '525a8422f6d0f87f0e407a33';

			// Set GET response
			$httpBackend.expectGET(/plans\/([0-9a-fA-F]{24})$/).respond(samplePlan);

			// Run controller functionality
			scope.findOne();
			$httpBackend.flush();

			// Test scope value
			expect(scope.plan).toEqualData(samplePlan);
		}));

		it('$scope.create() with valid form data should send a POST request with the form input values and then locate to new object URL', inject(function(Plans) {
			// Create a sample plan object
			var samplePlanPostData = new Plans({
				title: 'An Plan about MEAN',
				content: 'MEAN rocks!'
			});

			// Create a sample plan response
			var samplePlanResponse = new Plans({
				_id: '525cf20451979dea2c000001',
				title: 'An Plan about MEAN',
				content: 'MEAN rocks!'
			});

			// Fixture mock form input values
			scope.title = 'An Plan about MEAN';
			scope.content = 'MEAN rocks!';

			// Set POST response
			$httpBackend.expectPOST('plans', samplePlanPostData).respond(samplePlanResponse);

			// Run controller functionality
			scope.create();
			$httpBackend.flush();

			// Test form inputs are reset
			expect(scope.title).toEqual('');
			expect(scope.content).toEqual('');

			// Test URL redirection after the plan was created
			expect($location.path()).toBe('/plans/' + samplePlanResponse._id);
		}));

		it('$scope.update() should update a valid plan', inject(function(Plans) {
			// Define a sample plan put data
			var samplePlanPutData = new Plans({
				_id: '525cf20451979dea2c000001',
				title: 'An Plan about MEAN',
				content: 'MEAN Rocks!'
			});

			// Mock plan in scope
			scope.plan = samplePlanPutData;

			// Set PUT response
			$httpBackend.expectPUT(/plans\/([0-9a-fA-F]{24})$/).respond();

			// Run controller functionality
			scope.update();
			$httpBackend.flush();

			// Test URL location to new object
			expect($location.path()).toBe('/plans/' + samplePlanPutData._id);
		}));

		it('$scope.remove() should send a DELETE request with a valid planId and remove the plan from the scope', inject(function(Plans) {
			// Create new plan object
			var samplePlan = new Plans({
				_id: '525a8422f6d0f87f0e407a33'
			});

			// Create new plans array and include the plan
			scope.plans = [samplePlan];

			// Set expected DELETE response
			$httpBackend.expectDELETE(/plans\/([0-9a-fA-F]{24})$/).respond(204);

			// Run controller functionality
			scope.remove(samplePlan);
			$httpBackend.flush();

			// Test array after successful delete
			expect(scope.plans.length).toBe(0);
		}));
	});
}());
