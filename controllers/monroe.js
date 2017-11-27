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
	.constant("rescheduleExperimentURL", "NewExperiment.html#/?retrieveID=")
    .controller("statusExperimentCtrl", function($scope, $http, $location,
											myExperimentsURLa, myExperimentsURLb,
											newExperimentURL,
											AuthURL, DeleteExperimentURL,
											ExperimentSchedulesURLa, ExperimentSchedulesURLb, rescheduleExperimentURL) {
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
		return (new Date((new Date(timestamp * 1000)).toUTCString())).toString().replace(' (Romance Daylight Time)', '').replace(' (Romance Standard Time)', '').replace(' (Central Europe Daylight Time)', '');
	}

	$scope.Bytes2FriendlyString = function(aNumber) {
		if (aNumber < 0)
			return "";
		else if (aNumber == 1)
			return "1 byte";
		else if (aNumber < 1024)
			return aNumber + " bytes";
		else if (aNumber < 1048576)
			return (aNumber/1024).toFixed(2) + " KiB";
		else if (aNumber < 1073741824)
			return (aNumber/1048576).toFixed(2) + " MiB";
		else if (aNumber < 1099511627776)
			return (aNumber/1073741824).toFixed(2) + " GiB";
		else if (aNumber < 1125899906842624)
			return (aNumber/1099511627776).toFixed(2) + " TiB";
		else
			return (aNumber/1125899906842624).toFixed(2) + " PiB";
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

	// Loads the new experiment page and signals to reload the schedule parameters.
	$scope.RescheduleExperiment = function(experiment, event) {
		window.location.replace(rescheduleExperimentURL + experiment.id);
		event.stopPropagation(); // Stop the event before reaching the list controller that would try to show a non-existent experiment.
	}

	$scope.AvoidHiding = function(event) {
		event.stopPropagation();
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
	.constant("ExperimentDetailsURLa", "https://scheduler.monroe-system.eu/v1/experiments/")
	.constant("ExperimentDetailsURLb", "/schedules")
	.constant("ScheduleDetailsURL", "https://scheduler.monroe-system.eu/v1/schedules/")
	.constant("PROPOSED_SCHEDULE_BUFFER_TIME", 60000)
    .controller("newExperimentCtrl", function($scope, $http, $location,
										newExperimentURL, checkScheduleURL, sshServerURL,
										ExperimentDetailsURLa, ExperimentDetailsURLb,
										ScheduleDetailsURL,
										PROPOSED_SCHEDULE_BUFFER_TIME) {
    $scope.experiment = new Object();
    $scope.experiment.nodeCount = 1;
    $scope.experiment.duration = 300;
    $scope.experiment.activeQuota = 10;
	$scope.experiment.deploymentQuota = 128;
	$scope.experiment.additionalOptions = "";
    $scope.experiment.showSuccessPanel = false;
    $scope.experiment.showFailurePanel = false;
	$scope.experiment.recurrence = false;
	$scope.experiment.requiresSSH = false;
	$scope.experiment.sshPublicKey = new String;
	$scope.experiment.rescheduleID = $location.search()["retrieveID"];
	if ($scope.experiment.rescheduleID == undefined)
		$scope.experiment.rescheduleID = -1;
	$scope.experiment.showSubmitProgress = false;
	$scope.experiment.showAvailabilityProgress = false;
	$scope.experiment.disableNodeFilters = false;
	$scope.experiment.templateReadmeURL = "";
	$scope.experiment.showTemplateReadme = false;


	ResetNodeFilters = function() {
		$scope.experiment.projectFilter = [];
		$scope.experiment.nodeType = "type:deployed";
		$scope.experiment.nodeModel = "apu2d4";
		$scope.experiment.interfaceCount = "one";
	}
	ResetNodeFilters();

	ResetWarningPanels = function() {
		$scope.showWarningPublicSSHKeyMissing = false;
		$scope.showWarningSSHOnlyTesting = false;
		$scope.showWarningSSHNotRecurrence = false;
		$scope.showWarningNotJSONString = false;
		$scope.showWarningMinimumRecurrencePeriod = false;
		$scope.showWarningRecurrenceEndingTime = false;
		$scope.showWarningMaxStorageQuota = false;
		$scope.showWarningNotEvenNodesForDualExperiment = false;
		$scope.showWarningActiveQuota = false;
	}

	ResetAvailability = function() {
		$scope.experiment.checkAvailabilityStart = "";
		$scope.experiment.checkAvailabilityStop = "";
		$scope.experiment.checkAvailabilityMaxNodes = "";
		$scope.experiment.checkAvailabilitySlotEnd = "";
		$scope.experiment.checkAvailabilityStartTimestamp = 0;
		$scope.experiment.checkAvailabilityShow = false;
		$scope.experiment.checkAvailabilityShowUseSlot = false;
	}
	ResetAvailability();


    // This turn-around is needed to avoid a date string with milliseconds, which can't be later parsed automatically.
	$scope.experiment.startDate = new Date( (new Date()).toUTCString() );
	$scope.experiment.startASAP = false;

	$scope.SetStartDateToNow = function(experiment) {
		experiment.startDate = new Date( (new Date()).toUTCString() );
		experiment.startASAP = false;
		$scope.UpdateConfirmStartDate(experiment);
	}

    PrepareNodeFilters = function(experiment, request) {
		var excludedProjects = "-project:allbesmart|project:cosmote|project:flex|project:membrane|project:nimbus|project:nor_lab|project:roaming|project:uma,";
		
		if (!experiment.disableNodeFilters) {
			// Join projects in an OR:
			request.nodetypes = experiment.projectFilter.join('|project:');
			// Add node type with an AND (comma):
			if (request.nodetypes != "")
				request.nodetypes = "project:" + request.nodetypes + "," + experiment.nodeType;
			else
				request.nodetypes = excludedProjects + experiment.nodeType;

			request.nodetypes = request.nodetypes + ",model:" + experiment.nodeModel;
			if (experiment.nodeModel == "apu2d4") {
				request.interfaceCount = experiment.interfaceCount == "one" ? 1 : experiment.interfaceCount == "two" ? 2 : 3;
			}
		}
		else {
			request.nodetypes = "";
		}
    }

    $scope.UpdateConfirmStartDate = function (experiment) {
		if ( (experiment.startDate != null) && (experiment.startDate != undefined) )
            experiment.confirmStartDate = experiment.startDate.toString().replace(' (Romance Daylight Time)', '').replace(' (Romance Standard Time)', '').replace(' (Central Europe Daylight Time)', '');
		else
			experiment.confirmStartDate = "--/--/--- --:--:--";
		//experiment.checkAvailabilityShow = false;
		ResetAvailability();
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
		return (new Date(timestamp * 1000)).toUTCString().replace(' (Romance Daylight Time)', '').replace(' (Romance Standard Time)', '').replace(' (Central Europe Daylight Time)', ''); // toLocaleString() / toUTCString()
	}

	$scope.UseProposedSchedule = function(experiment) {
		experiment.startDate = new Date( (new Date(experiment.checkAvailabilityStartTimestamp + PROPOSED_SCHEDULE_BUFFER_TIME)).toUTCString() );
		$scope.UpdateConfirmStartDate(experiment);
		$scope.experiment.startASAP = false;
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

		ResetAvailability();

		experiment.showAvailabilityProgress = true;
    	$http.get(checkScheduleURL, {withCredentials: true, params: request})
    	    .success(function(data) {
    	    	if (data.length == 1) {
					experiment.checkAvailabilityStartTimestamp = data[0].start * 1000;
					experiment.checkAvailabilityStart = 'Available slot starting at "' + TimestampToString(data[0].start) + '".';
					experiment.checkAvailabilityStop = 'Finishing at "' + TimestampToString(data[0].stop) + '".';
					experiment.checkAvailabilityMaxNodes = 'The experiment could use up to ' + data[0].max_nodecount + ' nodes.';
					experiment.checkAvailabilitySlotEnd = 'The experiment may be delayed or the slot extended until "' + TimestampToString(data[0].max_stop) + '".';
					experiment.checkAvailabilityShow = true;
					$scope.experiment.checkAvailabilityShowUseSlot = true;
					experiment.showAvailabilityProgress = false;
				}
    	    	else {
					experiment.checkAvailabilityStartTimestamp = 0;
    	    	    experiment.checkAvailabilityStart = "Unable to satisfy the requirements.";
					experiment.checkAvailabilityShow = true;
					$scope.experiment.checkAvailabilityShowUseSlot = false;
					experiment.showAvailabilityProgress = false;
				}
    	    })
    	    .error(function(error) {
    	    	experiment.checkAvailabilityStartTimestamp = 0;
    	    	experiment.checkAvailabilityStart = "Unable to satisfy the requirements.";
				experiment.checkAvailabilitySlotEnd = error.message;
				experiment.checkAvailabilityShow = true;
				$scope.experiment.checkAvailabilityShowUseSlot = false;
				experiment.showAvailabilityProgress = false;
    	    })
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
			res = isFinite(anumber) && (Math.floor(anumber) == anumber) && (anumber > 0) && (anumber <= 1024);
			if (!res)
				$scope.showWarningMaxStorageQuota = true;
		}

		if (res) {
			anumber = Number(experiment.activeQuota);
			res = isFinite(anumber) && (Math.floor(anumber) == anumber) && (anumber > 0);
			if (!res)
				$scope.showWarningActiveQuota = true;
		}

		if (res && experiment.requiresSSH && !experiment.disableNodeFilters) {
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

		// The scheduler considers pairs if interfaceCount=3, but nodeCount must be even.
		if (res) {
			if ( (experiment.nodeModel == "apu2d4") && (experiment.interfaceCount == "three") && !experiment.disableNodeFilters ) {
				anumber = Number(experiment.nodeCount);
				res = isFinite(anumber) && (anumber % 2 == 0);
				if (!res)
					$scope.showWarningNotEvenNodesForDualExperiment = true;
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
    	anumber = Number(experiment.activeQuota);
    	if (isFinite(anumber))
    	    request.options["traffic"] = anumber * 1024*1024;

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

        if (experiment.specificNodes)
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
		experiment.showSuccessPanel = false;
		experiment.showFailurePanel = false;
		experiment.showSubmitProgress = true;
        $http.post(newExperimentURL, request, {withCredentials: true})
            .success(function(data) {
                experiment.schedID = data.experiment;
                experiment.schedNumScheds = data.intervals;
                experiment.schedNodes = data.nodecount;
                experiment.showSuccessPanel = true;
                experiment.showFailurePanel = false;
				experiment.showSubmitProgress = false;
				// Scroll to bottom of page.
				$('html,body').animate({scrollTop: document.body.scrollHeight},"fast");
            })
            .error(function(error) {
                console.log("Error submitting experiment: ", error);
                console.log("Error submitting experiment: ", error);
                experiment.schedMessage = error.message;
                experiment.showSuccessPanel = false;
                experiment.showFailurePanel = true;
				experiment.showSubmitProgress = false;
				// Scroll to bottom of page.
				$('html,body').animate({scrollTop: document.body.scrollHeight},"fast");
            });
    }

	$scope.ClearNodeList = function() {
		$scope.experiment.specificNodes = "";
		$scope.ActivateNodeList();
	}

	$scope.ActivateNodeList = function() {
		$scope.experiment.disableNodeFilters = ($scope.experiment.specificNodes.length > 0);
		/*if ($scope.experiment.disableNodeFilters)
			ResetNodeFilters();*/
	}

	// Retrieve the details of an experiment by ID.
    $scope.retrieveExperiment = function(id) {
		// Get the full details of the experiment schedules.
		var experimentURL = ExperimentDetailsURLa + id + ExperimentDetailsURLb;
		$http.get(experimentURL, {withCredentials: true})
			.success(function (data) {
				if (data.name)	$scope.experiment.name = data.name;
				if (data.script)	$scope.experiment.script = data.script;
				if (data.nodecount)	$scope.experiment.nodeCount = data.nodecount;
				if (data.start)	{
					$scope.experiment.startDate = new Date( (new Date(data.start * 1000)).toUTCString() );
					$scope.UpdateConfirmStartDate($scope.experiment);
					if (data.stop)
						$scope.experiment.duration = data.stop - data.start;
				}
				$scope.experiment.startASAP = false;
				if (data.options["traffic"])	$scope.experiment.activeQuota = Math.round(data.options["traffic"] / (1024*1024.0));
				if (data.options["storage"])	$scope.experiment.deploymentQuota = Math.round(data.options["storage"] / (1024*1024.0));
				if (data.options["recurrence"]) {
					$scope.experiment.recurrence = true;
					if (data.options["period"])
						$scope.experiment.period = data.options["period"];
					if (data.options["until"]) {
						$scope.experiment.repeatUntil = new Date( (new Date(data.options["until"] * 1000)).toUTCString() );
						$scope.UpdateRepeatUntil($scope.experiment);
					}
				}

				//  To calculate the number of nodes used by the experiment (and their IDs), we have
				// to traverse the list of schedules and identify the distinct nodes.
				var schedID; // We overwrite, but we need just one, any.
				if (data.schedules) {
					var nodes = {};	// Count distinct nodeIds for all schedules.
					for (var it in data.schedules) {
						nodes[data.schedules[it].nodeid] = true;
						schedID = it;
					}
					var nodeIds = Object.keys(nodes);
					$scope.experiment.nodeCount = nodeIds.length;
					$scope.experiment.specificNodes = nodeIds.join(',');
				}
				//$scope.experiment.disableNodeFilters = ($scope.experiment.specificNodes.length > 0);
				$scope.ActivateNodeList();

				// Pick one schedule, retrieve it and populate "additional parameters". (All schedules have the same ones)
				// Extract also SSH parameters (if used).
				var scheduleURL = ScheduleDetailsURL + schedID;
				$http.get(scheduleURL, {withCredentials: true})
					.success(function (data) {
						console.log("1", data.deployment_options);
						// Remove non-user options.
						delete data.deployment_options["script"];
						delete data.deployment_options["shared"];
						delete data.deployment_options["storage"];
						delete data.deployment_options["traffic"];
						delete data.deployment_options["nodes"];
						var optionsSSH = data.deployment_options["ssh"];
						delete data.deployment_options["ssh"];
						delete data.deployment_options["ssh.public"];
						console.log("2", data.deployment_options);
						var optionsString = JSON.stringify(data.deployment_options);
						if (optionsString.length > 0)
							$scope.experiment.additionalOptions = optionsString.slice(1, -1);

						if (optionsSSH != undefined) {
							$scope.experiment.requiresSSH = true;
							$scope.experiment.sshPublicKey = optionsSSH["client.public"];
						}
					})
					.error(function (error) {
					});

			})
			.error(function (error) {
				console.log("Error retrieving experiment " + id + ": ", error);
			});
	}

	Init = function() {
		if ($scope.experiment.rescheduleID >= 0)
			$scope.retrieveExperiment($scope.experiment.rescheduleID);

		ResetWarningPanels();
	}
	Init();

	$scope.SelectExperimentTemplate = function (experiment) {
		if (experiment.template == "webworks") {
			experiment.script = "docker.monroe-system.eu/monroe/monroe-web/image";
			experiment.name = "WebWork (This experiment evaluates the performance of different http protocols (HTTP1.1, HTTP1.1/TLS, HTTP2) using the headless firefox browser)";
			experiment.additionalOptions = '"urls":[["facebook.com/telia/","facebook.com/LeoMessi/","facebook.com/Cristiano/","facebook.com/intrepidtravel","facebook.com/threadless","facebook.com/Nutella","facebook.com/zappos","facebook.com/toughmudder","facebook.com/stjude","facebook.com/Adobe/"],["en.wikipedia.org/wiki/Timeline_of_the_far_future","en.wikipedia.org/wiki/As_Slow_as_Possible","en.wikipedia.org/wiki/List_of_political_catchphrases","en.wikipedia.org/wiki/1958_Lituya_Bay_megatsunami","en.wikipedia.org/wiki/Yonaguni_Monument#Interpretations","en.wikipedia.org/wiki/Crypt_of_Civilization","en.wikipedia.org/wiki/Mad_scientist","en.wikipedia.org/wiki/London_Stone","en.wikipedia.org/wiki/Internet","en.wikipedia.org/wiki/Stream_Control_Transmission_Protocol"],["google.com/search?q=Pok%C3%A9mon+Go","google.com/search?q=iPhone+7","google.com/search?q=Brexit","google.com/#q=stockholm,+sweden","google.com/#q=game+of+thrones","google.com/#q=Oslo","google.com/#q=Paris","google.com/#q=Madrid","google.com/#q=Rome","google.com/#q=the+revenant"]]';
			experiment.templateReadmeURL = "https://github.com/MONROE-PROJECT/Experiments/blob/master/experiments/webworks/readme.md";
			experiment.showTemplateReadme = true;

		}
		else if (experiment.template == "nettest") {
			experiment.script = "docker.monroe-system.eu/monroe/monroe-nettest/image";
			experiment.name = "Nettest (This experiment will run the nettest client for throughput measurements)";
			experiment.additionalOptions = '"cnf_server_host":"bulk.se.monroe-system.eu","cnf_server_port":10080,"cnf_dl_duration_s":2,"cnf_ul_duration_s":2';
			experiment.templateReadmeURL = "https://github.com/MONROE-PROJECT/Experiments/blob/master/experiments/nettest/readme.md";
			experiment.showTemplateReadme = true;
		}
		else {
			experiment.script = "";
			experiment.name = "";
			experiment.additionalOptions = "";
			experiment.templateReadmeURL = "";
			experiment.showTemplateReadme = false;
		}
	}

});


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// resourcesCtrl /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// listSchedules() uses the list of filtered nodes ($scope.nodes), so it must
// be run after listNodes() has completed (and every time it's completed).
// Thus, it's called directly from FilterNodes(), so that it never gets missed.
// listNodes() --> FilterNodes() --> listSchedules() --> CreateSchedulesTable() --> DrawSchedules()
// user modifies filters --> FilterNodes() --> listSchedules() --> CreateSchedulesTable() --> DrawSchedules()
// Todo: Check if we can save the call to listSchedules and run it only after listNodes.

angular.module("monroe")
	.constant("AuthURL", "https://scheduler.monroe-system.eu/v1/backend/auth")
	.constant("ResourcesURL", "https://scheduler.monroe-system.eu/v1/resources/")
	.constant("SchedulePlanURL", "https://scheduler.monroe-system.eu/v1/schedules/")
	.constant("GOOD_HEARTBEAT_TIMEOUT_IN_SECONDS", 300)
    .controller("resourcesCtrl", function($scope, $http, $location,
									ResourcesURL, AuthURL, SchedulePlanURL, GOOD_HEARTBEAT_TIMEOUT_IN_SECONDS) {
	$scope.userID = -1;
	$scope.nodes = [];
	$scope.showOnlyActive = false; // If true, show only nodes that can currently execute experiments.
	$scope.locationFilter = [];
	$scope.nodeTypeFilter = [];
	$scope.nodeModelFilter = [];
	$scope.currentTime = 2147483647;
	$scope.rangeResources = []; // A range with all the indexes in the array of resources, for ng-repeat.
	$scope.countShownNodes = 0; // Count of nodes that are shown after applying filters.
	$scope.scheduleTable = {};

	$scope.canvas = document.getElementById("calendarCanvas");
	$scope.canvasSchedLeftMargin = 20;
	$scope.canvasSchedTopMargin = 190;
	$scope.canvasWidth = 1700;
	$scope.canvasHeight = 20 + 250 * 10 + $scope.canvasSchedTopMargin;

	$scope.refresh = function() {
		$scope.listNodes();
		setTimeout($scope.refresh, 300000);
	}
	setTimeout($scope.refresh, 300000);

	$scope.TimestampToString = function(timestamp) {
		return (new Date((new Date(timestamp * 1000)).toUTCString())).toString().replace(' (Romance Daylight Time)', '').replace(' (Romance Standard Time)', '').replace(' (Central Europe Daylight Time)', '');
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
					node.interfaces = node.interfaces.filter(function(a){return (a['heartbeat'] > 0) && (a['status'] == 'current');});
					node.hasRecentHeartbeat = node.heartbeat + GOOD_HEARTBEAT_TIMEOUT_IN_SECONDS > $scope.currentTime;
					node.canScheduleExperiments = (node.status=='active') && node.hasRecentHeartbeat && ((node.type == 'testing') || (node.type == 'deployed'));
					node.countryVisz = node.project == 'norway' ? 'no' : node.project == 'nsb' ? 'no' : node.project == 'sweden' ? 'se' : node.project == 'vtab' ? 'se' : node.project == 'italy' ? 'it' : node.project == 'gtt' ? 'it' : node.project == 'wsys' ? 'it' : node.project == 'spain' ? 'es' : undefined;
				}
				$scope.FilterNodes();
			})
			.error(function(error) {
				$scope.error = error;
			});
	}

	// Retrieve all the programmed schedules.
	$scope.listSchedules = function() {
		$http.get(SchedulePlanURL, {withCredentials: true})
			.success(function(data) {
				//$scope.schedules = data;
				CreateScheduleTable(data);
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
			node.isVisible = (node.project != 'membrane') && (node.project != 'roaming') && (node.project != 'monroe') && (node.project != 'celerway') && (node.project != 'nimbus') && (node.project != 'nor_lab') && (node.type != 'storage') && (node.type != 'development') && (node.type != 'retired');
			node.isVisible = node.isVisible && (($scope.locationFilter.length == 0) || ArrayIncludes($scope.locationFilter, node.project));
			node.isVisible = node.isVisible && (($scope.nodeTypeFilter.length == 0) || ArrayIncludes($scope.nodeTypeFilter, node.type));
			node.isVisible = node.isVisible && (($scope.nodeModelFilter.length == 0) || ArrayIncludes($scope.nodeModelFilter, node.model));
			$scope.rangeResources.push(it); // Needed for ng-repeat.
			if (node.isVisible)
				$scope.countShownNodes = $scope.countShownNodes + 1;
		}
		$scope.ClearSchedules();
		$scope.listSchedules();
	}

	$scope.Bytes2FriendlyString = function(aNumber) {
		if (aNumber < 0)
			return "";
		else if (aNumber == 1)
			return "1 byte";
		else if (aNumber < 1024)
			return aNumber + " bytes";
		else if (aNumber < 1048576)
			return (aNumber/1024).toFixed(2) + " KiB";
		else if (aNumber < 1073741824)
			return (aNumber/1048576).toFixed(2) + " MiB";
		else if (aNumber < 1099511627776)
			return (aNumber/1073741824).toFixed(2) + " GiB";
		else if (aNumber < 1125899906842624)
			return (aNumber/1099511627776).toFixed(2) + " TiB";
		else
			return (aNumber/1125899906842624).toFixed(2) + " PiB";
	}

	$scope.CalcRemainingQuota = function(iface) {
		var Quotas = {
			"24202": 50*(1024*1024*1024),	// Telia Norge (NO)
			"24201": 50*(1024*1024*1024),	// Telenor (NO)
			//"24001": *(1024*1024*1024),	// Telia Mobile (NO)
			"24214": Infinity,				// ICE Nordisk (NO)

			"22201": 20*(1024*1024*1024),	// TIM (IT)
			"22210": 30*(1024*1024*1024),	// Vodafone (IT)
			"22288": 25*(1024*1024*1024),	// WIND (Blu)

			"24002": 100*(1024*1024*1024),	// H3G Access AB / Tre / Three / 3 (SE)
			"24008": 100*(1024*1024*1024),	// Telenor (Vodafone) (SE)
			"24001": 200*(1024*1024*1024),	// Telia Mobile (SE)

			"21404": 20*(1024*1024*1024),	// Yoigo (ES)
			"21403": 10*(1024*1024*1024),	// Orange (ES)
			"22210": 30*(1024*1024*1024)	// Vodafone (ES)
			};

		var interfaceQuota = Quotas[iface["mccmnc"]];
		if (interfaceQuota == undefined)
			return "";
		else if (interfaceQuota == Infinity)
			return "Unlimited";
		else
			//return $scope.Bytes2FriendlyString(interfaceQuota - iface["quota_current"]) + " / " + $scope.Bytes2FriendlyString(interfaceQuota);
			//return $scope.Bytes2FriendlyString(iface["quota_current"]) + " / " + $scope.Bytes2FriendlyString(iface["quota_reset_value"]);
			return $scope.Bytes2FriendlyString(iface["quota_current"]) + " / " + $scope.Bytes2FriendlyString(interfaceQuota);
	}

	DateToHour = function(date) {
		return (Number(date) / 1000|0) - date.getSeconds() - date.getMinutes() * 60;
	}
	TimestampToHour = function(timestamp) {
		var date = new Date( (new Date(timestamp*1000)).toUTCString() )
		return DateToHour(date);
	}

	//  Given two timestamps, returns (x1, x2) as the corresponding coordinates on the canvas.
	Time2Coords = function(startTime, endTime) {
		var x1, x2;

		var ratio = ($scope.schedulesEndTime - $scope.schedulesStartTime) / ($scope.canvasWidth - $scope.canvasSchedLeftMargin*2);
		x1 = Math.round((startTime - $scope.schedulesStartTime) / ratio);
		x2 = Math.round((endTime - $scope.schedulesStartTime) / ratio);

		//console.log("Converting (", startTime, ",", endTime, ") to (", x1, ",", x2, ");");
		return [x1, x2];
	}

	$scope.ClearSchedules = function() {
		var ctx = $scope.canvas.getContext("2d");
		ctx.beginPath(); // Probably a bug in Chrome (?)
		ctx.clearRect(0, 0, $scope.canvas.width, $scope.canvas.height);
		ctx.stroke();
	}

	$scope.DrawSchedules = function() {
		var shownNodes = $scope.countShownNodes;
		var ctx = $scope.canvas.getContext("2d");
		var topMargin = 10;

		$scope.ClearSchedules();

		var y = 0; // Node count
		for (var iNode in $scope.scheduleTable) {
			// Label the schedule with the node ids
			ctx.font = "10px sans-serif";
			ctx.fillStyle = "#000000";
			ctx.fillText(iNode, 0, topMargin + 8 + y*10 + $scope.canvasSchedTopMargin, $scope.canvasSchedLeftMargin);

			// First paint green for the node.
			ctx.fillStyle = "#80ff80";
			ctx.fillRect($scope.canvasSchedLeftMargin, topMargin + y*10 + $scope.canvasSchedTopMargin, $scope.canvasWidth - $scope.canvasSchedLeftMargin*2, 9);
			ctx.stroke();

			// Then, paint in red the interval for each schedule.
			for (var iSched in $scope.scheduleTable[iNode]) {
        if ($scope.scheduleTable[iNode][iSched][2] == -1) {
  			  ctx.fillStyle = "#c0c0c0";
        } else if ($scope.scheduleTable[iNode][iSched][2] == $scope.userID) {
  			  ctx.fillStyle = "#404040";
        } else {
  			  ctx.fillStyle = "#ff8000";
        }
				var coords = Time2Coords($scope.scheduleTable[iNode][iSched][0], $scope.scheduleTable[iNode][iSched][1]);
				ctx.fillRect($scope.canvasSchedLeftMargin + coords[0], topMargin + y*10 + $scope.canvasSchedTopMargin, coords[1] - coords[0], 9);
				ctx.stroke();
			}

			y += 1;
		}

		// Plot grid of hours.
		ctx.translate(-0.5, 0);
		for (var xx = $scope.schedulesStartTime; xx <= $scope.schedulesEndTime; xx += $scope.schedulesStepTime) {
			var xxpx = Time2Coords(xx, xx+1)[0] + $scope.canvasSchedLeftMargin;
			ctx.lineWidth = 1;
			ctx.strokeStyle = "#808080";
			ctx.beginPath();
			var y1 = 5 + $scope.canvasSchedTopMargin;
			var y2 = 10 + shownNodes * 10 + $scope.canvasSchedTopMargin;
			ctx.moveTo(xxpx, y1);
			ctx.lineTo(xxpx, y2);
			ctx.stroke();
		}
		ctx.translate(0.5, 0);

		// Plot x labels.
		ctx.fillStyle = "#000000";
		ctx.font = "10px sans-serif";
		ctx.save();
		ctx.translate($scope.canvasWidth/2, $scope.canvasHeight/2);
		ctx.rotate(-Math.PI/2);
		for (var xx = $scope.schedulesStartTime; xx < $scope.schedulesEndTime; xx += $scope.schedulesStepTime * 6) {
			var xxpx = Time2Coords(xx, xx + 1)[0] + $scope.canvasSchedLeftMargin + 8;
			var theDate = (new Date( (new Date(xx*1000)).toUTCString() )).toString().replace(' (Romance Daylight Time)', '').replace(' (Romance Standard Time)', '').replace(' (Central Europe Daylight Time)', '');
			ctx.fillText(theDate, $scope.canvasHeight/2 - $scope.canvasSchedTopMargin, -$scope.canvasWidth/2 + xxpx);
			ctx.stroke();
		}
		ctx.restore();
	}

	CreateScheduleTable = function(schedules) {
		/*var schedules = [];
		schedules.push({nodeid:45, start:1497290400, stop: 1497290400+20*3600});
		schedules.push({nodeid:60, start:1497290400+5*3600, stop: 1497290400+10*3600});*/
		// The array has 7*24*3600 columns and as many rows as different nodeids in schedules.
		// Each entry, which corresponds to a node-hour, is a boolean that says if the node is busy.
		$scope.scheduleTable = {};

		var starting = new Date();
		var firstMaintenance = 0;
		$scope.schedulesStartTime = DateToHour(new Date( starting.toUTCString() ));
		$scope.schedulesEndTime = $scope.schedulesStartTime + 7*24*3600;
		$scope.schedulesStepTime = 3600;

		// Calculate the first maintenance point.
		starting = new Date(starting.getTime());
		var maintenanceDate = new Date(starting);
		maintenanceDate.setUTCHours(9);
		maintenanceDate.setUTCMinutes(30);
		maintenanceDate.setUTCSeconds(0);
		maintenanceDate.setUTCMilliseconds(0);
		if ( (maintenanceDate.getTime() < starting.getTime()) && (maintenanceDate.getUTCHours() < starting.getUTCHours()) ) {
			maintenanceDate.setUTCHours(21);
			if ( (maintenanceDate.getTime() < starting.getTime()) && (maintenanceDate.getUTCHours() < starting.getUTCHours()) ) {
				// We are after 21:30 UTC, advance 1 day.
				maintenanceDate = new Date(maintenanceDate.getTime() + 3600000*3); // Advance 1 day.
				maintenanceDate.setUTCHours(9);
			}
		}
		firstMaintenance = maintenanceDate.getTime()/1000|0;

		// Create free entries for all visible nodes.
		for (var node in $scope.nodes) {
			var itNode = $scope.nodes[node];
			if (itNode.isVisible) {
				$scope.scheduleTable[itNode.id] = [];
				// Add maintenance hours.
				for (var maintenance = firstMaintenance; maintenance < $scope.schedulesEndTime; maintenance += 12*3600) {
					$scope.scheduleTable[itNode.id].push([maintenance < $scope.schedulesStartTime ? $scope.schedulesStartTime : maintenance, (maintenance + 1800) > $scope.schedulesEndTime ? $scope.schedulesEndTime : (maintenance + 1800), -1]);
				}
			}
			else {
				//  We have to do this part here (which is quadratic) because we cannot
				// add a simple test in the next loop to test if nodes[sched.nodeid].isVisible,
				// as the nodes are an array that is not indexed by nodeid...
				// An alternative would be to generate all the schedules for all the nodes, and check if visible while painting.
				for (var itSched in schedules)
					if (schedules[itSched].nodeid == itNode.id)
						delete schedules[itSched];
			}
		}

		for (var it in schedules) {
			var sched = schedules[it];
			if ( (sched.start <= $scope.schedulesEndTime) && (sched.stop >= $scope.schedulesStartTime)) {
				if (sched.start < $scope.schedulesStartTime)
					sched.start = $scope.schedulesStartTime;
				if (sched.stop > $scope.schedulesEndTime)
					sched.stop = $scope.schedulesEndTime;
        if (sched.nodeid in $scope.scheduleTable) {
  				$scope.scheduleTable[sched.nodeid].push( [sched.start, sched.stop, sched.ownerid] );
        }
			}
		}
		//console.log($scope.scheduleTable);

		$scope.DrawSchedules();
	}
	CreateScheduleTable();

	$scope.Occupation2Color = function(occupation) {
		return occupation == "busy" ? "#ff4040" : occupation == "free" ? "#40ff40" : "#000000";
	}

	$scope.MakeTooltip = function(occupation, time) {
		var theDate = (new Date( (new Date(time*1000)).toUTCString() )).toString().replace(' (Romance Daylight Time)', '').replace(' (Romance Standard Time)', '').replace(' (Central Europe Daylight Time)', '');
		return theDate + (occupation == "busy" ? " - Busy" : occupation == "free" ? " - Free" : " - Unknown");
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
		return (new Date((new Date(timestamp * 1000)).toUTCString())).toString().replace(' (Romance Daylight Time)', '').replace(' (Romance Standard Time)', '').replace(' (Central Europe Daylight Time)', '');
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
			return (aNumber/1024).toFixed(2) + " KiB";
		else if (aNumber < 1073741824)
			return (aNumber/1048576).toFixed(2) + " MiB";
		else if (aNumber < 1099511627776)
			return (aNumber/1073741824).toFixed(2) + " GiB";
		else if (aNumber < 1125899906842624)
			return (aNumber/1099511627776).toFixed(2) + " TiB";
		else
			return (aNumber/1125899906842624).toFixed(2) + " PiB";
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
