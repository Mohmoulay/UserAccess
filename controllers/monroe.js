angular.module("monroe")
    .constant("myExperimentsURL", "https://52.18.248.196:9099/v1/users/2/experiments")
    .constant("newExperimentURL", "https://52.18.248.196:9099/v1/experiments")
    .controller("statusExperimentCtrl", function($scope, $http, $location,
                                                 myExperimentsURL,
                                                 newExperimentURL) {
    $scope.data = {};
    $scope.experimentSelected = {};

    /*
     * Get the list of my experiments
     */
    $http.get(myExperimentsURL, {withCredentials: true})
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

});

angular.module("monroe")
    .constant("nodesURL", "https://52.18.248.196:9099/v1/resources")
    .controller("nodesCtrl", function($scope, $http, $location, nodesURL) {

    $scope.data = {};

    /*
     * Get the list of nodes
     */
    $http.get(nodesURL, {withCredentials: true})
        .success(function(data) {
            $scope.data.nodes = data;
        })
        .error(function(error) {
            $scope.data.error = error;
        });
});

angular.module("monroe")
    .constant("AuthURL", "https://52.18.248.196:9099/v1/backend/auth")
    .controller("indexCtrl", function ($http, AuthURL) {
        $http.get(AuthURL, {withCredentials: true})
            .success(function (data) {
                if (data.verified == "SUCCESS") {
                    if (data.user.role == "user")
                        window.location.replace("StatusExperiment.html");
                    else if (data.user.role == "admin")
                        window.location.replace("AdminUser.html");
                }
                else
                    window.location.replace("NewUsers.html");
            })
            .error(function (error) {
                window.location.replace("ErrorServer.html");
            });
});
  
  
angular.module("monroe")
    .constant("newExperimentURL", "https://52.18.248.196:9099/v1/experiments")
    .constant("checkScheduleURL", "https://52.18.248.196:9099/v1/schedules/find")
    .controller("newExperimentCtrl", function($scope, $http, $location,
                                                 newExperimentURL,
                                                 checkScheduleURL) {
    $scope.experiment = new Object();
    $scope.experiment.nodeCount = 1;
    $scope.experiment.duration = 300;
    $scope.experiment.nodeType = "deployed";
    $scope.experiment.countryFilterAny = true;
    $scope.experiment.countryFilter = [];
    $scope.experiment.useInterface1 = false;
    $scope.experiment.useInterface2 = false;
    $scope.experiment.useInterface3 = false;
    $scope.experiment.interfacesCount = 0;
    $scope.experiment.activeQuota = 1048576;
    $scope.experiment.totalActiveQuota = 0;
    $scope.experiment.resultsQuota = 0;
    $scope.experiment.showSuccessPanel = false;
    $scope.experiment.showFailurePanel = false;

    // This turn-around is needed to avoid a date string with milliseconds, which can't be later parsed automatically.    
	$scope.experiment.startDate = new Date( (new Date()).toUTCString() );

    $scope.CheckCountryFilter = function(experiment) {
    	experiment.countryFilterAny = experiment.countryFilter == "";
    }

    $scope.SetCountryFilterAny = function(experiment) {
    	if (experiment.countryFilterAny)
    	    experiment.countryFilter = [];
    }
    
    PrepareNodeFilters = function(experiment, request) {
    	// Join countries in an OR:
    	request.nodetypes = experiment.countryFilter.join('|country:');
    	// Add node type with an AND (comma):
    	if (request.nodetypes != "")
    	    request.nodetypes = "country:" + request.nodetypes + "," + experiment.nodeType;
    	else
    	    request.nodetypes = experiment.nodeType;
    }

    $scope.UpdateConfirmStartDate = function (experiment) {
		if ( (experiment.startDate != null) && (experiment.startDate != undefined) )
            experiment.confirmStartDate = experiment.startDate.toString();
		else
			experiment.confirmStartDate = "--/--/--- --:--:--";
		//console.log("Cambiado. ConfirmStrtDate: ", experiment.confirmStartDate);
    }
	$scope.UpdateConfirmStartDate($scope.experiment); // Execute call at app start.


    /************* Check schedule **********/
    $scope.checkSchedule = function(experiment) {
    	// Add options.nodes="xxx" if the user specifies them, so the check takes the node requirements into account.
    	var request = new Object;
    	var anumber;
    	
    	anumber = Number(experiment.nodeCount);
    	if (isFinite(anumber))    request.nodecount = anumber;
    	anumber = Number(experiment.duration);
    	if (isFinite(anumber))    request.duration = anumber;
    	anumber = Number(experiment.startDate) / 1000|0;
    	if (isFinite(anumber))    request.start = anumber;
    	PrepareNodeFilters(experiment, request);
    	
    	console.log("Enviando: ", request);
    	$http.get(checkScheduleURL, {withCredentials: true, params: request})
    	    .success(function(data) {
    	    	console.log("Got: ", data);
    	    	if (data.length == 1)
    	    	    experiment.startParsed = 'Possible schedule starting at "' + data[0].start + '", finishing at "' + data[0].stop + 
    	    	                         '". The experiment could use up to ' + data[0].max_nodecount + ' nodes. The schedule could be delayed or extended until "' + data[0].max_stop + '".';
    	    	else
    	    	    experiment.startParsed = "Impossible to satisfy the requirements.";
    	    })
    	    .error(function(error) {
    	    	experiment.startParsed = "Impossible to consult the scheduler.";
    	    	console.log("Schedule imposible: " + error);
    	    })
    }
    
    /******* Track parmeters *******/
    $scope.InterfacesCount = function(experiment) {
        experiment.interfacesCount = experiment.useInterface1 + experiment.useInterface2 + experiment.useInterface3;
        experiment.totalActiveQuota = experiment.activeQuota * experiment.interfacesCount;
    }
    
    /******* Verify schedule validity *******/
    verifyExperiment = function(experiment) {
    	var res = true;
    	var anumber;
    	
    	if (experiment.recurrence) {
    		anumber = Number(experiment.period);
    		res = res && isFinite(anumber) && (anumber >= 3600);
    		if (!res)
    		    window.alert("If recurrence is selected, the minimum period must be at least 3600 seconds.");
    	}
    	
    	return res
    }
    
    $scope.newExperiment = function(experiment) {
    	if (!verifyExperiment(experiment))
    	    return;
    	    
    	var request = new Object;
        var anumber;
    	
    	request.name = experiment.name;
    	request.script = experiment.script;
    	anumber = Number(experiment.nodeCount);
    	if (isFinite(anumber))    request.nodecount = anumber;
    	
    	anumber = Number(experiment.startDate) / 1000|0;
    	if (isFinite(anumber))    request.start = anumber;
    	anumber = Number(experiment.duration);
    	if (isFinite(anumber) && ('start' in request))    request.stop = request.start + anumber;
    	  	
    	request.interfaces = "";
    	if ($scope.experiment.useInterface1)    request.interfaces += "iface1";
    	if (experiment.useInterface2)    request.interfaces += (request.interfaces == "") ? "iface2" : ",iface2";
    	if (experiment.useInterface3)    request.interfaces += (request.interfaces == "") ? "iface3" : ",iface3";
    	if (request.interfaces == "")            delete request.interfaces;
    	
    	PrepareNodeFilters(experiment, request);
    	
    	//// Options
    	request.options = {};
    	anumber = Number(experiment.totalActiveQuota);
    	if (isFinite(anumber))
    	{
    	    request.options["traffic_in"] = anumber;
    	    request.options["traffic_out"] = anumber;
    	}
    	
    	anumber = Number(experiment.resultsQuota);
    	if (isFinite(anumber))    request.options["resultsQuota"] = anumber;
    	//anumber = Number(experiment.deploymentQuota);
    	//if (isFinite(anumber))    request.options["deploymentQuota"] = anumber;
    	
    	request.options["shared"] = 0;
    	
    	if (experiment.recurrence)
    	{
    	    request.options["recurrence"] = 'simple';
    	    anumber = Number(experiment.period);
    	    if (isFinite(anumber))    request.options["period"] = anumber;
    	    anumber = Number(experiment.repeatUntil);
    	    if (isFinite(anumber))    request.options["until"] = anumber;
        }
        
        request.options["nodes"] = experiment.specificNodes;
        
        request.options = JSON.stringify(request.options);
        
    	
    	//// Deployment options
    	//request.deployment_options = new Object;
    	//request.deployment_options["restart"] = 1;
        
        console.log(request);
        /*$http.post(newExperimentURL, request, {withCredentials: true})
            .success(function(data) {
                console.log("Experiment submitted: ", data);
                experiment.schedID = data.experiment;
                experiment.schedNumScheds = data.intervals;
                experiment.schedNodes = data.nodecount;
                experiment.showSuccessPanel = true;
                experiment.showFailurePanel = false;
            })
            .error(function(error) {
                console.log("Error submitting experiment: ", error);
                experiment.schedMessage = error.message;
                experiment.showSuccessPanel = false;
                experiment.showFailurePanel = true;
            });
        */
        console.log("La fecha: ", experiment.startDate);
        var elTimestamp = Number(experiment.startDate) / 1000|0;
        console.log("El timestamp: ", elTimestamp);
        experiment.outputDate = experiment.startDate.toString();
    }
    
});
