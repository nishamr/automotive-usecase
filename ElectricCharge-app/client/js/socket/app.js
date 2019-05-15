var app = angular.module("myApp", []);
app.controller("EVUser", function ($scope, $http, $window, $location) {
    $scope.companyDisplayName = "";
    $scope.redirectTo = function (name) {
        if (name === "EVCharging") {
            $window.location.href = "EV_Charging.html";
        } else if (name === "XYZ") {
            $window.location.href = "insurer_2_purchase.html";
        } else {
            $window.location.href = "index.html";
        }

    }
 
    $scope.showProceed = true;
    $scope.showDetails = false;
    $scope.showSearch = false;
    $scope.showTransaction = false;
    $scope.createPage = true;
    $scope.user = {};
    $scope.totalInsuredAmount = 0;
    $scope.showWarning = false;
    $scope.loading = false;
    $scope.smallerAmount = 0;
    $scope.insuranceCompanies = [];
    $scope.insuranceAmounts = [];
    $scope.splitUp = [];
    $scope.valuesIncomplete = false;
    $scope.smallerAmountDiv = false;
    $scope.searchResultPolicy = {};
    $scope.policies = [];
    $scope.claimStatus = true;
    $scope.insuredAmount = "";
    $scope.getNominee = true;
    $scope.proceed = function () {
        $scope.loading = true;
        $scope.finalStep = false;
  

       /* var chargingDetails='{'
            + '"transactionID" : "$scope.user.transactionID",'
            +'"stationID": $scope.user.stationID,'
            +' "customerID": $scope.customerID,'
            +'"consumptionType": $scope.user.consumptionType,'
            +'"vehicleType": $scope.user.vehicleType,'
            +'"chargedValue": $scope.user.chargedValue,'
            +'"chargedPrice": $scope.user.chargedPrice '    
       '}';*/

       var ChargingDetails = new Object();
       ChargingDetails.transactionID = $scope.user.transactionID;
       ChargingDetails.stationID = $scope.user.stationID;
       ChargingDetails.customerID = $scope.customerID;
       ChargingDetails.consumptionType = $scope.user.consumptionType;
       ChargingDetails.vehicleType = $scope.user.vehicleType;
       ChargingDetails.chargedValue = $scope.user.chargedValue;
       ChargingDetails.chargedPrice = $scope.user.chargedPrice;
       var chargingDetails = JSON.stringify(ChargingDetails);

        console.log("chargingDetails")
        console.log(chargingDetails)

var requestInfo = Request();

data : requestInfo 


      // var chargingDetails = $scope.user.transactionID + "," + $scope.user.stationID + "," + $scope.customerID + "," + $scope.user.consumptionType + "," + $scope.user.vehicleType + "," + $scope.user.chargedValue + "," + $scope.user.chargedPrice;
            console.log("inside abc create");
        $http.get('/update_chargingDetails/'+chargingDetails).then(function(output){
            console.log("output of update charging details")
            console.log(output);
            var response = output.data.split("/");
            console.log("response after splitting");
            console.log(response)
            //$scope.txid=output.data;
            $scope.txid = response[1];
            $scope.showTransaction=true;
            $scope.showProceed=false;
            $scope.showSearch=false;
            $scope.showDetails=false;
            $scope.loading=false;
            $scope.finalStep=false;
		}).catch(function(err){
            console.log(err);
            $scope.showTransaction=false;
            $scope.showProceed=false;
            $scope.showSearch=false;
            $scope.showDetails=false;
            $scope.loading=false;
            $scope.finalStep=false;
            $scope.showWarning=true;
            $scope.warningMessage=err;
            
        });
    }
    $scope.update = function () {
        $scope.loading = true;
        $scope.finalStep = false;

        var chargingValue = $scope.user.FactorValue;
            console.log("inside update value");
        $http.get('/add_creditFactor/'+chargingValue).then(function(output){
            console.log("output of update  value")
            console.log(output);
            //$scope.txid=output.data;
            $scope.txid = output.data;
            $scope.showTransaction=true;
            $scope.showProceed=false;
            $scope.showSearch=false;
            $scope.showDetails=false;
            $scope.loading=false;
            $scope.finalStep=false;
		}).catch(function(err){
            console.log(err);
            $scope.showTransaction=false;
            $scope.showProceed=false;
            $scope.showSearch=false;
            $scope.showDetails=false;
            $scope.loading=false;
            $scope.finalStep=false;
            $scope.showWarning=true;
            $scope.warningMessage=err;
            
        });
    }

    

    $scope.closeResults = function () {
        $scope.showTransaction = false;
        $scope.showProceed = true;
        $scope.showSearch = false;
        $scope.createPage = true;
    }


    $scope.search = function () {
        if ($scope.searchHistory) {
            $scope.showWarning = false;
            $scope.policies = [];
            console.log();
            $scope.loading = true;
            $scope.finalStep = false;
            console.log($scope.searchHistory);
            $http.get('/get_transactionHistory/' + $scope.searchHistory).then(function (output) {
                console.log(output);
                if (output.data === "" || output.data == null || output.data == "Could not locate insurance for given PAN number") {
                    $scope.createPage = true;
                    $scope.showWarning = true;
                    $scope.showTransaction = false;
                    $scope.showProceed = false;
                    $scope.showSearch = false;
                    $scope.showDetails = false;
                    $scope.loading = false;
                    $scope.warningMessage = "No results found for PAN : " + $scope.searchHistory;
                } else {
                    $scope.searchResults = output.data;
                    for (var i = 0; i < $scope.searchResults.policies.length; ++i) {
                        $scope.searchResults.policies[i].date_of_approval = $scope.searchResults.policies[i].date_of_approval.substring(4, 15);
                        console.log($scope.searchResults.policies[i].date_of_approval);
                        $scope.searchResults.policies[i].nominee = '';
                    }
                    $scope.totalInsuredAmount = 0;
                    var total_insureamount = 0;
                    for (var i = 0; i < parseInt(output.data.nop); ++i) {
                        if (output.data.policies[i].claim_status === "APPROVED") {
                            total_insureamount = total_insureamount + parseInt(output.data.policies[i].insured_amount);
                        }
                    }
                    $scope.totalInsuredAmount = total_insureamount;
                    var statusCount = 0;
                    for (var j = 0; j < $scope.searchResults.policies.length; ++j) {
                        if ($scope.searchResults.policies[j].claim_status === "REJECTED")
                            statusCount++;
                    }
                    if (statusCount >= 5)
                        $scope.riskStatus = "HIGH";
                    else if (statusCount >= 2)
                        $scope.riskStatus = "MODERATE";
                    else
                        $scope.riskStatus = "LOW";

                    $scope.showWarning = false;
                    $scope.createPage = false;
                    $scope.showSearch = true;
                    $scope.showTransaction = false;
                    $scope.showProceed = false;
                    $scope.loading = false;
                    console.log($scope.searchResults);
                }
            }).catch(function (err) {
                console.log(err);
                $scope.loading = false;
                $scope.showWarning = true;
                $scope.warningMessage = err;
            });
        }
    }



    $scope.closeWarning = function () {
        $scope.showTransaction = false;
        $scope.showProceed = true;
        $scope.showSearch = false;
        $scope.showWarning = false;
        $scope.createPage = true;
    }

    $scope.calculateInsuranceSplitUp = function (policies) {
        $scope.splitUp = [];
        $scope.splitUpEntity = {};
        $scope.insuranceCompanies = [];
        $scope.insuranceAmounts = [];
        var indexOfCompany = -1;
        for (var i = 0; i < policies.length; ++i) {
            if (policies[i].claim_status === "APPROVED") {
                if ($scope.insuranceCompanies.indexOf(policies[i].company_name) < 0) {
                    $scope.insuranceCompanies.push(policies[i].company_name);
                    indexOfCompany = $scope.insuranceCompanies.indexOf(policies[i].company_name);
                    $scope.insuranceAmounts[indexOfCompany] = policies[i].insured_amount;
                } else {
                    indexOfCompany = $scope.insuranceCompanies.indexOf(policies[i].company_name);
                    $scope.insuranceAmounts[indexOfCompany] = parseInt($scope.insuranceAmounts[indexOfCompany]) + parseInt(policies[i].insured_amount);
                }
            }
        }
        for (var i = 0; i < $scope.insuranceCompanies.length; ++i) {
            $scope.splitUpEntity = {};
            $scope.splitUpEntity.companyName = $scope.insuranceCompanies[i];
            $scope.splitUpEntity.amount = $scope.insuranceAmounts[i];
            console.log($scope.splitUpEntity);
            $scope.splitUp.push($scope.splitUpEntity);
        }
    }

    $scope.createInsurance = function () {
        $scope.showProceed = true;
        $scope.createPage = true;
        $scope.showDetails = false;
        $scope.showSearch = false;
        $scope.showTransaction = false;
        $scope.finalStep = false;
        $scope.loading = false;
        $scope.smallerAmountDiv = false;
        $scope.smallerAmount = 0;
        $scope.user = {};
    }
    $scope.checkCurrentValue = function (name) {
        if (name == '') {
            return false;
        } else {
            return true;
        }
    }
    $scope.updateValue = function () {
        $scope.createPage = false;
        $scope.updatePage = true;
        $scope.showDetails = false;
        $scope.showSearch = false;
        $scope.showTransaction = false;
        $scope.finalStep = false;
        $scope.loading = false;
        $scope.smallerAmountDiv = false;
        $scope.smallerAmount = 0;
        $scope.user = {};
    }

    function Request() {
			 
        return {
          "Request" : {
            "transactionID" : "",
            "stationID": "",
             "consumptionType": "",
             "vehicleType": "",
             "chargedValue": "",
             "chargedPrice": ""   
         }
          }
        };
 
});