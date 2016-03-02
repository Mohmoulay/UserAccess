angular.module("monroe")
    .constant("myExperimentsUrl", "https://52.18.248.196:9099/v1/users/2/experiments")
    .constant("newExperimentUrl", "https://52.18.248.196:9099/v1/experiments")
    .controller("statusExperimentCtrl", function($scope, $http, $location,
                                                 myExperimentsUrl,
                                                 newExperimentUrl) {
    $scope.data = {};
    $scope.experimentSelected = {};

    /*
     * Get the list of my experiments
     */
    $http.get(myExperimentsUrl, {withCredentials: true})
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
    $scope.newExperiment = function(experiment) {

        var  my_experiment = angular.copy(experiment)

        console.log("Submitting experiment ...");

        my_experiment.nodetypes = "static";

        console.log(my_experiment);

        $http.post(newExperimentUrl, my_experiment, {withCredentials: true})
            .success(function(data) {
                $scope.data.orderId = data.id;
                console.log("Experiment submitted");
            })
            .error(function(error) {
                $scope.data.orderError = error;
                console.log(error);
            })
            .finally(function() {
                // $location.path("/complete");
            });

    }

});

angular.module("monroe")
    .constant("nodesUrl", "https://52.18.248.196:9099/v1/resources")
    .controller("nodesCtrl", function($scope, $http, $location, nodesUrl) {

    $scope.data = {};

    /*
     * Get the list of nodes
     */
    $http.get(nodesUrl, {withCredentials: true})
        .success(function(data) {
            $scope.data.nodes = data;
        })
        .error(function(error) {
            $scope.data.error = error;
        });
});

angular.module("monroe")
    .controller("LoginCtrl", function ($scope, $http) {  
        $scope.CheckCertificate = function() {
            return false;
            $http.get("https://52.18.248.196:9099/v1/backend/auth")
                .success(function(data) {
                    console.log(data);
                    if ( (data.verified == "SUCCESS") && (data.user.role == "user") )
                        console.log("¡Perfecto!");
                    else    
                        console.log("Error de certificado");
                })
                .error(function(error) {
                    console.log("Error: " + error);
                });
        
            return true;
        }
    });

  