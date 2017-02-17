///////////////////////////////////////////////////////////////////////////////
/////////////////////////// statusExperimentCtrl //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

angular.module("monroe")
    .constant("myExperimentsURLa", "https://scheduler.monroe-system.eu/v1/users/")
	.constant("myExperimentsURLb", "/experiments")
    .constant("newExperimentURL", "https://scheduler.monroe-system.eu/v1/experiments")
	.constant("AuthURL", "https://scheduler.monroe-system.eu/v1/backend/auth")
	.constant("DeleteExperimentURL", "https://scheduler.monroe-system.eu/v1/experiments/")
	.constant("ExperimentSchedulesURLa", "https://scheduler.monroe-system.eu/v1/experiments/")
	.constant("ExperimentSchedulesURLb", "/schedules")
    .controller("statusExperimentCtrl", function($scope, $http, $location,
											myExperimentsURLa, myExperimentsURLb,
											newExperimentURL,
											AuthURL, DeleteExperimentURL, 
											ExperimentSchedulesURLa, ExperimentSchedulesURLb) {
	$scope.userID = -1;
	$scope.userName = new String;
	$scope.data = {};
    $scope.selectedExperiment = {}; // Contains executions{}, experiment{} and schedules{} (detailed schedule, not the abbreviated from the experiments listing). Schedules{} is "scheduleid":{schedule_data}
	$scope.selectedExperiment.schedules = [];
	$scope.hideCompleted = false;
	$scope.hideOngoing = false;
	$scope.hideFailed = false;
	$scope.showHidden = false; // If false, show normal experiments. If true, ask the scheduler also for hidden experiments.
	
	$scope.EXPERIMENT_STATES = {
		ALL_DEFINED : {value: 4},
		ONGOING: {value: 1},
		FINISHED_OK: {value: 2},
		FINISHED_FAILED: {value: 3}
	};
	$scope.HasUnfinishedTasks = function(experiment) {
		return (experiment.state == $scope.EXPERIMENT_STATES.ALL_DEFINED) || (experiment.state == $scope.EXPERIMENT_STATES.ONGOING);
	}
	
	$scope.selectedExperiment.executions = {};
	$scope.ResetExecutionCounters = function(executions) {
		executions.total = 0;
		
		executions.defined = 0;	// Ongoing states
		executions.requested = 0;
		executions.deployed = 0;
		executions.delayed = 0;
		executions.started = 0;
		executions.restarted = 0;
		
		executions.finished = 0; // Final states
		executions.stopped = 0;
		executions.failed = 0;
		executions.canceled = 0;
		executions.aborted = 0;	
		
		executions.remaining = 0;
	}
	$scope.ResetExecutionCounters($scope.selectedExperiment.executions);
	
	$scope.TimestampToString = function(timestamp) {
		return (new Date((new Date(timestamp * 1000)).toUTCString())).toString();
	}
	
	$scope.GetExperimentState = function(experiment) {
		executions = {};
		$scope.CountExperimentSchedules(experiment, executions);
		if (executions.defined == executions.total)
			return $scope.EXPERIMENT_STATES.ALL_DEFINED;
		else if ( executions.remaining > 0 )
			return $scope.EXPERIMENT_STATES.ONGOING;
		else if ( (executions.failed + executions.canceled + executions.aborted) > 0 )
			return $scope.EXPERIMENT_STATES.FINISHED_FAILED;
		else
			return $scope.EXPERIMENT_STATES.FINISHED_OK;
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
					$scope.listExperiments();
				}
			});
	}
	$scope.GetUserID($scope);

	// Show all the experiments of this user.
	$scope.listExperiments = function() {
		var userURL = myExperimentsURLa + $scope.userID + myExperimentsURLb;
		if ($scope.showHidden)
			userURL = userURL + "?showHidden=true";
		$http.get(userURL, {withCredentials: true})
			.success(function(data) {
				$scope.data.experiments = data;
				for (var it in $scope.data.experiments) {
					var exp = $scope.data.experiments[it];
					exp.state = $scope.GetExperimentState(exp);
					exp.hideDetails = true;
					exp.executions = {};
					$scope.CountExperimentSchedules(exp, exp.executions);
				}
			})
			.error(function(error) {
				$scope.error = error;
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
	
	$scope.CountExperimentSchedules = function(experiment, executions) {
		var tmp;
		$scope.ResetExecutionCounters(executions);
		
		// Several states share prefixes and should be accumulated, e.g., "failed; no container" and "failed; node in maintenance".
		for (var state in experiment.summary) {
			if (state.startsWith("stopped"))
				executions.stopped = executions.stopped + experiment.summary[state];
			if (state.startsWith("finished"))
				executions.finished = executions.finished + experiment.summary[state];
			if (state.startsWith("failed"))
				executions.failed = executions.failed + experiment.summary[state];
			if (state.startsWith("canceled"))
				executions.canceled = executions.canceled + experiment.summary[state];
			if (state.startsWith("aborted"))
				executions.aborted = executions.aborted + experiment.summary[state];
			if (state.startsWith("defined"))
				executions.defined = executions.defined + experiment.summary[state];
			if (state.startsWith("requested"))
				executions.requested = executions.requested + experiment.summary[state];
			if (state.startsWith("deployed"))
				executions.deployed = executions.deployed + experiment.summary[state];
			if (state.startsWith("delayed"))
				executions.delayed = executions.delayed + experiment.summary[state];
			if (state.startsWith("started"))
				executions.started = executions.started + experiment.summary[state];
			if (state.startsWith("restarted"))
				executions.restarted = executions.restarted + experiment.summary[state];
		}

        executions.total = executions.stopped + executions.finished + executions.canceled + executions.aborted + executions.failed + 
							executions.defined + executions.requested + executions.deployed + executions.delayed + executions.started + 
							executions.restarted;
		executions.remaining = executions.total - executions.finished - executions.stopped - executions.canceled - executions.aborted - executions.failed;
	}
		
    // View the details of an experiment.
    $scope.viewExperiment = function() {
		var selectedExperiment = this.iExperiment;
        //$scope.selectedExperiment.experiment = this.iExperiment;		
		
		if (selectedExperiment.hideDetails) {
			selectedExperiment.hideDetails = false
			$scope.CountExperimentSchedules(selectedExperiment, selectedExperiment.executions);
			selectedExperiment.schedules = [];
			
			// Get the full details of the experiment schedules.
			var schedulesURL = ExperimentSchedulesURLa + selectedExperiment.id + ExperimentSchedulesURLb;
			$http.get(schedulesURL, {withCredentials: true})
				.success(function (data) {
					for (var it in data.schedules) {
						data.schedules[it].schedId = it;  // Add the scheduleId (key) to the object for later retrieval.
						selectedExperiment.schedules.push(data.schedules[it]);
					}
					selectedExperiment.options = data.options;
				})
				.error(function (error) {
					console.log("Error: ", error);
				});		
		}
		else {
			selectedExperiment.hideDetails = true;
		}
    }
	
	// Deletes a completed experiment or cancels and deletes an incomplete one.
	$scope.DeleteExperiment = function(experiment, event) {
		var action = (experiment.state == $scope.EXPERIMENT_STATES.ALL_DEFINED) ? "DELETE" : (experiment.state == $scope.EXPERIMENT_STATES.ONGOING) ? "CANCEL" : "REMOVE";
		if (confirm('Do you want to ' + action + ' experiment ' + experiment.id + '?\n"' + experiment.name + '"')) {
			var deleteUrl = DeleteExperimentURL + experiment.id;

			$http.delete(deleteUrl, {withCredentials: true})
				.success(function(data) {
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
	
	$scope.ShowHidden = function(event) {
		// event.target.checked should be equivalent to $scope.showHidden
		$scope.listExperiments(); // Call for Angular to reload the results.
		delete $scope.selectedExperiment.experiment;
		delete $scope.selectedExperiment.schedules;
		$scope.ResetExecutionCounters($scope.selectedExperiment.executions);
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
	.constant("sshServerURL", "tunnel.monroe-system.eu")
    .controller("newExperimentCtrl", function($scope, $http, $location,
										newExperimentURL, checkScheduleURL, sshServerURL) {
    $scope.experiment = new Object();
    $scope.experiment.nodeCount = 1;
    $scope.experiment.duration = 300;
    $scope.experiment.nodeType = "type:deployed";
    $scope.experiment.countryFilterAny = true;
    $scope.experiment.countryFilter = [];
    /*$scope.experiment.useInterface1 = true;
    $scope.experiment.useInterface2 = true;
    $scope.experiment.useInterface3 = true;
    $scope.experiment.interfacesCount = 0;*/
    $scope.experiment.activeQuota = 1048576;
	$scope.experiment.deploymentQuota = 128;
	$scope.experiment.additionalOptions = "";
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
	$scope.experiment.recurrence = false;
	$scope.experiment.requiresSSH = false;
	$scope.experiment.sshPublicKey = new String;
	
	ResetWarningPanels = function() {
		$scope.showWarningPublicSSHKeyMissing = false;
		$scope.showWarningSSHOnlyTesting = false;
		$scope.showWarningSSHNotRecurrence = false;
		$scope.showWarningNotJSONString = false;
		$scope.showWarningMinimumRecurrencePeriod = false;
		$scope.showWarningRecurrenceEndingTime = false;
		$scope.showWarningMaxStorageQuota = false;
	}
	ResetWarningPanels();

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
		if (experiment.specificNodes)
			request.nodes = experiment.specificNodes;
		   	
    	$http.get(checkScheduleURL, {withCredentials: true, params: request})
    	    .success(function(data) {
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
		
		ResetWarningPanels();
    	
    	if (experiment.recurrence) {
    		anumber = Number(experiment.period);
    		res = res && isFinite(anumber) && (anumber >= 3600);
    		if (!res)
    		    $scope.showWarningMinimumRecurrencePeriod = true;
			
			if (res) {
				res = (experiment.repeatUntil != null) && (experiment.repeatUntil != undefined) && isFinite(Number(experiment.repeatUntil));
				if (!res)
					$scope.showWarningRecurrenceEndingTime = true;
			}
			
			if (res) {
				res = !experiment.requiresSSH;
				if (!res)
					$scope.showWarningSSHNotRecurrence = true;
			}
    	}
		
		if (res) {
			anumber = Number(experiment.deploymentQuota);
			res = isFinite(anumber) && (anumber <= 1024);
			if (!res)
				$scope.showWarningMaxStorageQuota = true;
		}
		
		if (res && experiment.requiresSSH) {
			res = (experiment.nodeType == "type:testing");
			if (!res)
				$scope.showWarningSSHOnlyTesting = true;
			
			if (res) {
				res = (experiment.sshPublicKey.length > 0);
				if (!res)
					$scope.showWarningPublicSSHKeyMissing = true;
			}
		}
    	
		if (res) {
			try {
				JSON.parse("{" + experiment.additionalOptions + "}");
			}
			catch (err) {
				$scope.showWarningNotJSONString = true;
				res = false;
			}
		}

		if (!res)	// Scroll to bottom of page.
			$('html,body').animate({scrollTop: document.body.scrollHeight},"slow");

    	return res
    }
    
	/************* New Experiment **********/
    $scope.newExperiment = function(experiment) {
		ResetWarningPanels();
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
    	  	
    	/*request.interfaces = "";
    	if ($scope.experiment.useInterface1)    request.interfaces += "iface1";
    	if (experiment.useInterface2)    request.interfaces += (request.interfaces == "") ? "iface2" : ",iface2";
    	if (experiment.useInterface3)    request.interfaces += (request.interfaces == "") ? "iface3" : ",iface3";
    	if (request.interfaces == "")            delete request.interfaces;*/
    	
    	PrepareNodeFilters(experiment, request);
    	
    	//// Options
    	request.options = {};
    	anumber = Number(experiment.totalActiveQuota);
    	if (isFinite(anumber))
    	    request.options["traffic"] = anumber;
    	
    	anumber = Number(experiment.resultsQuota);
    	if (isFinite(anumber))    request.options["resultsQuota"] = anumber;
    	anumber = Number(experiment.deploymentQuota);
    	if (isFinite(anumber))
				request.options["storage"] = anumber * 1024*1024;
    	
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
        
    	//// Deployment options
    	//request.deployment_options = new Object;
    	//request.deployment_options["restart"] = 1;
		
		// SSH options.
		if ($scope.experiment.requiresSSH) {
			request.options["ssh"] = {};
			request.options.ssh["server"] = sshServerURL;
			request.options.ssh["server.port"] = 29999;
			request.options.ssh["server.user"] = "tunnel";
			request.options.ssh["client.public"] = $scope.experiment.sshPublicKey;
		}		

		// Convert JSON-stile request options to a string.
        request.options = JSON.stringify(request.options);
		if (experiment.additionalOptions.length > 0)
			request.options = request.options.slice(0, -1) + "," + experiment.additionalOptions + "}";
        
		console.log(request);
		$scope.showWarningPublicSSHKeyMissing = false;
        $http.post(newExperimentURL, request, {withCredentials: true})
            .success(function(data) {
                experiment.schedID = data.experiment;
                experiment.schedNumScheds = data.intervals;
                experiment.schedNodes = data.nodecount;
                experiment.showSuccessPanel = true;
                experiment.showFailurePanel = false;
				// Scroll to bottom of page.
				$('html,body').animate({scrollTop: document.body.scrollHeight},"fast");			
            })
            .error(function(error) {
                console.log("Error submitting experiment: ", error);
                experiment.schedMessage = error.message;
                experiment.showSuccessPanel = false;
                experiment.showFailurePanel = true;
				// Scroll to bottom of page.
				$('html,body').animate({scrollTop: document.body.scrollHeight},"fast");			
            });
    }
    
});


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// resourcesCtrl /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

angular.module("monroe")
	.constant("AuthURL", "https://scheduler.monroe-system.eu/v1/backend/auth")
	.constant("ResourcesURL", "https://scheduler.monroe-system.eu/v1/resources/")
	.constant("GOOD_HEARTBEAT_TIMEOUT_IN_SECONDS", 300)
    .controller("resourcesCtrl", function($scope, $http, $location,
									ResourcesURL, AuthURL, GOOD_HEARTBEAT_TIMEOUT_IN_SECONDS) {
	$scope.userID = -1;
	$scope.nodes = [];
	$scope.showOnlyActive = false; // If true, show only nodes that can currently execute experiments.
	$scope.locationFilter = [];
	$scope.nodeTypeFilter = [];
	$scope.nodeModelFilter = [];
	$scope.currentTime = 2147483647;
	$scope.rangeResources = []; // A range with all the indexes in the array of resources, for ng-repeat.
	$scope.countShownNodes = 0; // Count of nodes that are shown after applying filters.

	$scope.refresh = function() {
		$scope.listNodes();
		setTimeout($scope.refresh, 30000);
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
				$scope.currentTime = Date.now()/1000|0;
				for (var it in $scope.nodes) {
					var node = $scope.nodes[it];
					node.hasRecentHeartbeat = node.heartbeat + GOOD_HEARTBEAT_TIMEOUT_IN_SECONDS > $scope.currentTime;
					node.canScheduleExperiments = (node.status=='active') && node.hasRecentHeartbeat && ((node.type == 'testing') || (node.type == 'deployed'));
				}
				$scope.FilterNodes();
			})
			.error(function(error) {
				$scope.error = error;
			});		
	}

	$scope.Capitalize = function(theString) {		
		if (angular.isString(theString))
			return theString[0].toLocaleUpperCase() + theString.slice(1);
	}
	
	$scope.ClearLocationFilter = function() {
		$scope.locationFilter = [];
		$scope.FilterNodes();
	}
	$scope.ClearNodeTypeFilter = function() {
		$scope.nodeTypeFilter = [];
		$scope.FilterNodes();
	}
	$scope.ClearNodeModelFilter = function() {
		$scope.nodeModelFilter = [];
		$scope.FilterNodes();
	}

	function ArrayIncludes(arr, obj) {
		for(var i=0; i<arr.length; i++) {
			if (arr[i] == obj) return true;
		}
	}
	
	$scope.FilterNodes = function() {
		$scope.rangeResources = [];
		$scope.countShownNodes = 0;
		for (var it in $scope.nodes) {
			var node = $scope.nodes[it];
			node.isVisible = (node.project != 'monroe') && (node.project != 'celerway') && (node.project != 'nimbus') && (node.type != 'storage') && (node.type != 'development');
			node.isVisible = node.isVisible && (($scope.locationFilter.length == 0) || ArrayIncludes($scope.locationFilter, node.project));
			node.isVisible = node.isVisible && (($scope.nodeTypeFilter.length == 0) || ArrayIncludes($scope.nodeTypeFilter, node.type));
			node.isVisible = node.isVisible && (($scope.nodeModelFilter.length == 0) || ArrayIncludes($scope.nodeModelFilter, node.model));
			$scope.rangeResources.push(it); // Needed for ng-repeat.
			if (node.isVisible)
				$scope.countShownNodes = $scope.countShownNodes + 1;
		}
	}
});


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// accountInfoCtrl ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

angular.module("monroe")
	.constant("AuthURL", "https://scheduler.monroe-system.eu/v1/backend/auth")
    .constant("JournalsURLa", "https://scheduler.monroe-system.eu/v1/users/")
	.constant("JournalsURLb", "/journals")
    .controller("accountInfoCtrl", function($scope, $http, $location, AuthURL,
				JournalsURLa, JournalsURLb) {
	$scope.userID = -1;
	$scope.userName = new String;
	$scope.fingerprint = new String;
	$scope.quota_data = 0;
	$scope.quota_storage = 0;
	$scope.quota_time = 0;
	$scope.journal_time = [];
	$scope.journal_data = [];
	$scope.journal_storage = [];
	$scope.journal = [];

	// Get the user ID.
	$scope.GetUserID = function($scope) {
        $http.get(AuthURL, {withCredentials: true})
            .success(function (data) {
                if (data.verified == "SUCCESS") {
                    $scope.userID = data.user.id;
					$scope.userName = data.user.name;
					$scope.fingerprint = data.fingerprint;
					$scope.quota_data = data.user.quota_data;
					$scope.quota_storage = data.user.quota_storage;
					$scope.quota_time = data.user.quota_time;
					$scope.listJournal();
				}
			});
	}
	$scope.GetUserID($scope);

	$scope.TimestampToString = function(timestamp) {
		return (new Date((new Date(timestamp * 1000)).toUTCString())).toString();
	}
	
	// Show all the journal entries of this user.
	$scope.listJournal = function() {
		var userURL = JournalsURLa + $scope.userID + JournalsURLb;
		$http.get(userURL, {withCredentials: true})
			.success(function(data) {
				$scope.UnifyJournal(data);
			})
			.error(function(error) {
				$scope.error = error;
			});		
	}

	$scope.Capitalize = function(theString) {		
		if (angular.isString(theString))
			return theString[0].toLocaleUpperCase() + theString.slice(1);
	}
	
	$scope.Bytes2FriendlyString = function(aNumber) {
		if (aNumber < 0)
			return "";
		else if (aNumber == 1)
			return "1 byte";
		else if (aNumber < 1024)
			return aNumber + " bytes";
		else if (aNumber < 1048576)
			return (aNumber/1024).toFixed(2) + " KB";
		else if (aNumber < 1073741824)
			return (aNumber/1048576).toFixed(2) + " MB";
		else if (aNumber < 1099511627776)
			return (aNumber/1073741824).toFixed(2) + " GB";
		else if (aNumber < 1125899906842624)
			return (aNumber/1099511627776).toFixed(2) + " TB";
		else
			return (aNumber/1125899906842624).toFixed(2) + " PB";
	}
	
	$scope.UnifyJournal = function(data) {
		IdentifyAndUpdateQuota = function(quota_key, value, time, storage, data) {
			if (quota_key.startsWith("quota_owner_time"))
				time = value;
			else if (quota_key.startsWith("quota_owner_data"))
				data = value;
			else if (quota_key.startsWith("quota_owner_storage"))
				storage = value;
			return [time, storage, data]; // Because JS does not support pass-by-reference.
		}
		
		var lastTime = 0, lastStorage = 0, lastData = 0, lastTimestamp = 0;
		var lastReason = [];
		var entry = data.shift();
		$scope.journal = [];
		lastTimestamp = entry.timestamp;
		lastReason.push($scope.Capitalize(entry.reason));
		[lastTime, lastStorage, lastData] = IdentifyAndUpdateQuota(entry.quota, entry.new_value, lastTime, lastStorage, lastData);
		
		for (var it in data) {
			var entry = data[it];
			if (entry.timestamp != lastTimestamp) {
				$scope.journal.push({timestamp: lastTimestamp, reason: lastReason.join('. '), quotaTime: lastTime, quotaStorage: lastStorage, quotaData: lastData});
				lastReason = [];
			}
			lastTimestamp = entry.timestamp;
			lastReason.push($scope.Capitalize(entry.reason));
			[lastTime, lastStorage, lastData] = IdentifyAndUpdateQuota(entry.quota, entry.new_value, lastTime, lastStorage, lastData);
		}
		$scope.journal.push({timestamp: lastTimestamp, reason: lastReason.join('. '), quotaTime: lastTime, quotaStorage: lastStorage, quotaData: lastData});
	}
});
