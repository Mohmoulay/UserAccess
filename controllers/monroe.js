///////////////////////////////////////////////////////////////////////////////
/////////////////////////// statusExperimentCtrl //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

angular.module("monroe")
    .constant("myExperimentsURLa", "https://scheduler.monroe-system.eu/v1/users/")
	.constant("myExperimentsURLb", "/experiments")
    .constant("newExperimentURL", "https://scheduler.monroe-system.eu/v1/experiments")
	.constant("AuthURL", "https://scheduler.monroe-system.eu/v1/backend/auth")
	.constant("DeleteExperimentURL", "https://scheduler.monroe-system.eu/v1/experiments/")
	.constant("ExperimentSchedulesURL", "https://scheduler.monroe-system.eu/v1/schedules/")
    .controller("statusExperimentCtrl", function($scope, $http, $location,
											myExperimentsURLa, myExperimentsURLb,
											newExperimentURL,
											AuthURL, DeleteExperimentURL, 
											ExperimentSchedulesURL) {
	$scope.userID = -1;
	$scope.userName = new String;
	$scope.data = {};
    $scope.selectedExperiment = {}; // Contains executions{}, experiment{} and schedules{} (detailed schedule, not the abbreviated from the experiments listing). Schedules{} is "scheduleid":{schedule_data}
	$scope.selectedExperiment.schedules = [];
	$scope.hideCompleted = false;
	
	$scope.selectedExperiment.executions = {};
	$scope.ResetExecutionCounters = function(executions) {
		executions.total = 0;
		executions.stopped = 0;
		executions.finished = 0;
		executions.canceled = 0;
		executions.aborted = 0;
		executions.failed = 0;
		executions.defined = 0;
		executions.deployed = 0;
		executions.started = 0;
		executions.remaining = 0;
	}
	$scope.ResetExecutionCounters($scope.selectedExperiment.executions);
	
	$scope.TimestampToString = function(timestamp) {
		return (new Date((new Date(timestamp * 1000)).toUTCString())).toString();
	}
	
	$scope.IsExperimentCompleted = function(schedules) {
		var res = true;
		for (var itSchedule in schedules) {
			res = ((schedules[itSchedule].status == "stopped") || (schedules[itSchedule].status == "finished"));
			if (!res)
				break;
		}
		return res;
	}
		
	$scope.GetExperimentByID = function(experiments, id) {
		for (var it in experiments) {
			var exp = experiments[it];
			if (exp.id == id)
				return exp;
		}
		return undefined;
	}
	
	// Get the user ID.
	$scope.GetUserID = function($scope) {
        $http.get(AuthURL, {withCredentials: true})
            .success(function (data) {
                if (data.verified == "SUCCESS") {
                    $scope.userID = data.user.id;
					$scope.userName = data.user.name;
					console.log($scope.userName, $scope.userID);
					$scope.listExperiments();
				}
			});
	}
	$scope.GetUserID($scope);

	// Show all the experiments of this user.
	$scope.listExperiments = function() {
		var userURL = myExperimentsURLa + $scope.userID + myExperimentsURLb;
		$http.get(userURL, {withCredentials: true})
			.success(function(data) {
				$scope.data.experiments = data;
				for (var it in $scope.data.experiments) {
					var exp = $scope.data.experiments[it];
					exp.completed = $scope.IsExperimentCompleted(exp.schedules);
          exp.stoptime  = exp.options.until || exp.stop;
				}
			})
			.error(function(error) {
				$scope.data.error = error;
			});		
	}

	/*$scope.StatusCodeToText = function(code) {
		// When needed, do something more complex than just capitalizing...
		var table = {"defined": "Defined", "deployed": "Deployed", "started": "Started", "stopped": "Stopped", "canceled": "Canceled", "aborted": "Aborted", "failed": "Failed"};
		return table[code];
	}*/
	
	$scope.Capitalize = function(theString) {		
		if (angular.isString(theString))
			return theString[0].toLocaleUpperCase() + theString.slice(1);
	}
	
	$scope.CreateResultsURL = function(schedId) {
		return 'https://www.monroe-system.eu/user/' + schedId + '/';
	}
	
	$scope.CountExperimentSchedules = function(schedules, executions) {
		$scope.ResetExecutionCounters(executions);
		console.log("Schedules: ", schedules);
		for (var it in schedules) {
			var schedule = schedules[it];
			console.log("Status: ", schedule.status);
			++ executions.total;
			if (schedule.status == "stopped")
				++ executions.stopped;
			if (schedule.status == "finished")
				++ executions.finished;
			else if (schedule.status == "canceled")
				++ executions.canceled;
			else if (schedule.status == "aborted")
				++ executions.aborted;
			else if (schedule.status == "failed")
				++ executions.failed;
			else if (schedule.status == "defined")
				++ executions.defined;
			else if (schedule.status == "deployed")
				++ executions.deployed;
			else if (schedule.status == "started")
				++ executions.started;
		}
		executions.remaining = executions.total - executions.finished - executions.stopped - executions.canceled - executions.aborted - executions.failed;
	}
		
    // View the details of an experiment.
    $scope.viewExperiment = function() {
        $scope.selectedExperiment.experiment = this.item;		
		$scope.CountExperimentSchedules($scope.selectedExperiment.experiment.schedules, $scope.selectedExperiment.executions);
		$scope.selectedExperiment.schedules = [];
		
		// Get the full details of the experiment schedules.
		for (var it in $scope.selectedExperiment.experiment.schedules) {
			// "it" is the schedule id, we aren't interested in the values.
			var schedulesURL = ExperimentSchedulesURL + it;
			// Get the full details of the experiment schedules.
			$http.get(schedulesURL, {withCredentials: true})
				.success(function (data) {
					$scope.selectedExperiment.schedules.push(data);
				})
				.error(function (error) {
					console.log("Error: ", error);
				});
		}
    }
	
	// Deletes a completed experiment or cancels and deletes an incomplete one.
	$scope.DeleteExperiment = function(experiment, event) {
		console.log('Deleting experiment ' + experiment.id + ' "' + experiment.name + '"');
		if (confirm('Do you want to cancel and/or delete experiment ' + experiment.id + '?\n"' + experiment.name + '"')) {
			var deleteUrl = DeleteExperimentURL + experiment.id;
			console.log("DeleteURL: ", deleteUrl);

			$http.delete(deleteUrl, {withCredentials: true})
				.success(function(data) {
					console.log("Experiment deleted: ", data);
					$scope.listExperiments();	// Call from success for Angular to notice the changes.
					delete $scope.selectedExperiment.experiment;
					delete $scope.selectedExperiment.schedules;
					$scope.ResetExecutionCounters($scope.selectedExperiment.executions);
				})
				.error(function(error) {
					console.log("Error deleting experiment: ", error);
				});
		}

		event.stopPropagation(); // Stop the event before reaching the list controller that would try to show a non-existent experiment.		
	}
});


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// indexCtrl /////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

angular.module("monroe")
    .constant("AuthURL", "https://scheduler.monroe-system.eu/v1/backend/auth")
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
  
  
///////////////////////////////////////////////////////////////////////////////
/////////////////////////// newExperimentCtrl /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

angular.module("monroe")
    .constant("newExperimentURL", "https://scheduler.monroe-system.eu/v1/experiments")
    .constant("checkScheduleURL", "https://scheduler.monroe-system.eu/v1/schedules/find")
    .controller("newExperimentCtrl", function($scope, $http, $location,
										newExperimentURL,
										checkScheduleURL) {
    $scope.experiment = new Object();
    $scope.experiment.nodeCount = 1;
    $scope.experiment.duration = 300;
    $scope.experiment.nodeType = "type:deployed";
    $scope.experiment.countryFilterAny = true;
    $scope.experiment.countryFilter = [];
    $scope.experiment.useInterface1 = true;
    $scope.experiment.useInterface2 = true;
    $scope.experiment.useInterface3 = true;
    $scope.experiment.interfacesCount = 0;
    $scope.experiment.activeQuota = 1048576;
    $scope.experiment.totalActiveQuota = $scope.experiment.activeQuota; //0;
    $scope.experiment.resultsQuota = 0;
    $scope.experiment.showSuccessPanel = false;
    $scope.experiment.showFailurePanel = false;
	$scope.experiment.checkAvailabilityStart = "";
	$scope.experiment.checkAvailabilityStop = "";
	$scope.experiment.checkAvailabilityMaxNodes = "";
	$scope.experiment.checkAvailabilitySlotEnd = "";
	$scope.experiment.checkAvailabilityStartTimestamp = 0;
	$scope.experiment.checkAvailabilityShow = false;

    // This turn-around is needed to avoid a date string with milliseconds, which can't be later parsed automatically.    
	$scope.experiment.startDate = new Date( (new Date()).toUTCString() );
	$scope.experiment.startASAP = false;

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
		experiment.checkAvailabilityShow = false;
    }
	$scope.UpdateConfirmStartDate($scope.experiment); // Execute call at app start.

    $scope.UpdateRepeatUntil = function (experiment) {
		if ( (experiment.repeatUntil != null) && (experiment.repeatUntil != undefined) )
            experiment.untilParsed = experiment.repeatUntil.toString();
		else
			experiment.untilParsed = "--/--/--- --:--:--";
		//experiment.checkAvailabilityShow = false;
    }

    TimestampToString = function(timestamp) {
		return (new Date(timestamp * 1000)).toUTCString(); // toLocaleString() / toUTCString()
	}
	
	$scope.UseProposedSchedule = function(experiment) {
		experiment.startDate = new Date( (new Date(experiment.checkAvailabilityStartTimestamp)).toUTCString() );
		$scope.UpdateConfirmStartDate(experiment);
	}
	
    /************* Check schedule **********/
    $scope.checkSchedule = function(experiment) {
    	// Add options.nodes="xxx" if the user specifies them, so the check takes the node requirements into account.
    	var request = new Object;
    	var anumber;
    	
    	anumber = Number(experiment.nodeCount);
    	if (isFinite(anumber))    request.nodecount = anumber;
    	anumber = Number(experiment.duration);
    	if (isFinite(anumber))    request.duration = anumber;
		if (experiment.startASAP) {
			request.start = 0;
		}
		else {
    	    anumber = Number(experiment.startDate) / 1000|0;
    	    if (isFinite(anumber))    request.start = anumber;		
		}
    	PrepareNodeFilters(experiment, request);
		request.nodes = experiment.specificNodes;
		   	
    	console.log("Enviando: ", request);
    	$http.get(checkScheduleURL, {withCredentials: true, params: request})
    	    .success(function(data) {
    	    	console.log("Got: ", data);
    	    	if (data.length == 1) {
					experiment.checkAvailabilityStartTimestamp = data[0].start * 1000;
					experiment.checkAvailabilityStart = 'Available slot starting at "' + TimestampToString(data[0].start) + '".';
					experiment.checkAvailabilityStop = 'Finishing at "' + TimestampToString(data[0].stop) + '".';
					experiment.checkAvailabilityMaxNodes = 'The experiment could use up to ' + data[0].max_nodecount + ' nodes.';
					experiment.checkAvailabilitySlotEnd = 'The experiment may be delayed or the slot extended until "' + TimestampToString(data[0].max_stop) + '".';
				}
    	    	else {
					experiment.checkAvailabilityStartTimestamp = 0;
    	    	    experiment.checkAvailabilityStart = "Impossible to satisfy the requirements.";
				}
    	    })
    	    .error(function(error) {
    	    	experiment.checkAvailabilityStartTimestamp = 0;
    	    	experiment.checkAvailabilityStart = "Impossible to contact the scheduler.";
				experiment.checkAvailabilitySlotEnd = error.message;
    	    })
			experiment.checkAvailabilityShow = true;
    }
    
    /******* Track parameters *******/
    $scope.InterfacesCount = function(experiment) {
		// Modified to send quota per interface, not total.
        //experiment.interfacesCount = experiment.useInterface1 + experiment.useInterface2 + experiment.useInterface3;
        //experiment.totalActiveQuota = experiment.activeQuota * experiment.interfacesCount;
		experiment.totalActiveQuota = experiment.activeQuota;
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
			
			if (res) {
				res = (experiment.repeatUntil != null) && (experiment.repeatUntil != undefined) && isFinite(Number(experiment.repeatUntil));
				if (!res)
					window.alert("If recurrence is selected, a valid ending date must be provided.");
			}
    	}
    	
    	return res
    }
    
	/************* New Experiment **********/
    $scope.newExperiment = function(experiment) {
    	if (!verifyExperiment(experiment))
    	    return;
    	    
    	var request = new Object;
        var anumber;
    	
    	request.name = experiment.name;
    	request.script = experiment.script;
    	anumber = Number(experiment.nodeCount);
    	if (isFinite(anumber))    request.nodecount = anumber; 	
		if (experiment.startASAP) {
			request.start = 0;
		}
		else {
    	    anumber = Number(experiment.startDate) / 1000|0;
    	    if (isFinite(anumber))    request.start = anumber;		
		}
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
    	    request.options["traffic"] = anumber;
    	
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
    	    anumber = Number(experiment.repeatUntil) / 1000|0;
    	    if (isFinite(anumber))    request.options["until"] = anumber;
        }
        
        request.options["nodes"] = experiment.specificNodes;
		request.options["storage"] = 100*1024*1024;	// TODO
        
        request.options = JSON.stringify(request.options);
        
    	
    	//// Deployment options
    	//request.deployment_options = new Object;
    	//request.deployment_options["restart"] = 1;
        
        console.log(request);
        $http.post(newExperimentURL, request, {withCredentials: true})
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
    }
    
});


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// resourcesCtrl /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

angular.module("monroe")
	.constant("AuthURL", "https://scheduler.monroe-system.eu/v1/backend/auth")
	.constant("ResourcesURL", "https://scheduler.monroe-system.eu/v1/resources/")
    .controller("resourcesCtrl", function($scope, $http, $location,
									ResourcesURL, AuthURL) {
	$scope.userID = -1;
    $scope.selectedNode = {};
	$scope.nodes = [];

	$scope.refresh = function($scope) {
		window.location.reload(true);
	}
	setTimeout($scope.refresh, 30000);
	
	$scope.TimestampToString = function(timestamp) {
		return (new Date((new Date(timestamp * 1000)).toUTCString())).toString();
	}
	
	// Get the user ID.
	$scope.GetUserID = function($scope) {
        $http.get(AuthURL, {withCredentials: true})
            .success(function (data) {
                if (data.verified == "SUCCESS") {
                    $scope.userID = data.user.id;
					$scope.userName = data.user.name;
					console.log($scope.userName, $scope.userID);
					$scope.listNodes();
				}
			});
	}
	$scope.GetUserID($scope);

	// Show all the nodes in the inventory.
	$scope.listNodes = function() {
		$http.get(ResourcesURL, {withCredentials: true})
			.success(function(data) {
				$scope.nodes = data;
				for (var it in $scope.nodes) {
					var node = $scope.nodes[it];
					node.type = node.type;
				}
			})
			.error(function(error) {
				$scope.data.error = error;
			});		
	}

	$scope.Capitalize = function(theString) {		
		if (angular.isString(theString))
			return theString[0].toLocaleUpperCase() + theString.slice(1);
	}
});
