angular.module("monroe")
    .constant("myExperimentsUrl", "http://localhost:5500/experiments")
    .constant("newExperimentUrl", "http://localhost:5500/experiments")
    .controller("statusExperimentCtrl", function($scope, $http, $location,
                                                 myExperimentsUrl,
                                                 newExperimentUrl) {
    $scope.data = {};
    $scope.experimentSelected = {};

    /*
     * Get the list of my experiments
     */
    $http.get(myExperimentsUrl)
        .success(function(data) {
            $scope.data.experiments = data;
        })
        .error(function(error) {
            $scope.data.error = error;
        });

    /*
     * View the details of a experiment
     */
    $scope.viewExperiment = function() {
        $scope.experimentSelected = this.item;
    }

    /*
     * Create a new experiment
     */
    $scope.newExperiment = function(experimentDetails) {

        $http.post(newExperimentUrl, experimentDetails)
            .success(function(data) {
                $scope.data.orderId = data.id;
            })
            .error(function(error) {
                $scope.data.orderError = error;
            })
            .finally(function() {
                $location.path("/complete");
            });

    }

});

angular.module("monroe")
    .constant("nodesUrl", "http://localhost:5500/nodes")
    .controller("nodesCtrl", function($scope, $http, $location, nodesUrl) {

    $scope.data = {};

    /*
     * Get the list of nodes
     */
    $http.get(nodesUrl)
        .success(function(data) {
            $scope.data.nodes = data;
        })
        .error(function(error) {
            $scope.data.error = error;
        });

});

