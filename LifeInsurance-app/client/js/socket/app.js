var app = angular.module("myApp", []);
app.controller("insuranceABC", function ($scope, $http, $window, $location) {
    $scope.companyDisplayName = "";
    $scope.redirectTo = function (name) {
        if (name === "ABC") {
            $window.location.href = "insurer_1_purchase.html";
        } else if (name === "XYZ") {
            $window.location.href = "insurer_2_purchase.html";
        } else {
            $window.location.href = "index.html";
        }

    }
    $scope.setInsuranceCompany = function (name) { // TO START MODULARIZATION
        if (name === 'ABC_INSURANCE') {
            $scope.protectionFactor = "3";
            $scope.companyCode = "ABC";
            $scope.companyName = "ABC_INSURANCE";
            $scope.companyDisplayName = "ABC INSURANCE";
        } else {
            $scope.protectionFactor = "5";
            $scope.companyName = "XYZ_INSURANCE";
            $scope.companyCode = "XYZ";
            $scope.companyDisplayName = "XYZ INSURANCE";
        }
    }
    $scope.searchPrivateABCdata = "";
    $scope.riskStatus = "";
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
        $scope.dateOfApproval = new Date();
        $scope.loading = true;
        $scope.finalStep = false;
        console.log($scope.companyName);
        if ($scope.smallerAmount != 0) {
            $scope.insuredAmount = $scope.smallerAmount;
        }
        //$scope.nominee="cris11345";
        console.log("status :" + $scope.claimStatus);
        var policy = $scope.user.firstName + "," + $scope.user.lastName + "," + $scope.user.pan + "," + $scope.user.dob + "," + $scope.user.annualIncome + "," + $scope.companyName + "," + $scope.user.requestedAmount + "," + $scope.insuredAmount + "," + $scope.claimStatus + "," + $scope.dateOfApproval + "," + $scope.user.comments + "," + $scope.nominee;
        console.log(policy);
        if($scope.companyName === 'ABC_INSURANCE')
        {
            console.log("inside abc create");
        $http.get('/create_policyABC/'+policy).then(function(output){
            console.log("output of createpolicy")
            console.log(output.data);
            $scope.txid=output.data;
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
    else if($scope.companyName === 'XYZ_INSURANCE')
    {
        console.log("inside xyz create");
        $http.get('/create_policyXYZ/'+policy).then(function(output){
            console.log(output.data);
            $scope.txid=output.data;
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

    }

    $scope.checkDetails = function () {
        if ($scope.user.firstName && $scope.user.lastName && $scope.user.pan && $scope.user.dob && $scope.user.annualIncome && $scope.user.requestedAmount) {
            $scope.valuesIncomplete = false;
            $scope.loading = true;
            $scope.totalInsuredAmount = 0;
            $http.get('/get_policy/' + $scope.user.pan).then(function (output) {
                console.log("output");
                console.log(output.data);
                if (output.data === "" || output.data == null || output.data == "Could not locate insurance for given PAN number") {
                    if (parseInt($scope.user.requestedAmount) <= parseInt($scope.protectionFactor) * parseInt($scope.user.annualIncome)) {
                        $scope.insuredAmount = $scope.user.requestedAmount;
                        $scope.finalStep = true;
                        $scope.simpleConfirm = true;
                        $scope.rejected = false;
                        $scope.claimStatus = true;
                        $scope.user.smallerAmountDiv = false;
                    }
                    else {
                        $scope.finalStep = true;
                        $scope.rejected = false;
                        $scope.simpleConfirm = false;
                        $scope.smallerAmountDiv = true;
                        $scope.claimStatus = true;
                        $scope.user.comments = "";
                        $scope.smallerAmount = parseInt($scope.protectionFactor) * parseInt($scope.user.annualIncome).toString();
                        console.log($scope.smallerAmount);
                    }
                } else {
                    var total_insureamount = 0;
                    $scope.totalInsuredAmount = 0;
                    console.log("number of policies by " + output.data.first_name + " = " + output.data.policies.length);
                    for (var i = 0; i < parseInt(output.data.policies.length); ++i) {
                        if (output.data.policies[i].claim_status === "APPROVED") {
                            total_insureamount = total_insureamount + parseInt(output.data.policies[i].insured_amount);
                        }
                    }
                    console.log("total_insureamount" + total_insureamount);
                    $scope.totalInsuredAmount = total_insureamount;
                    console.log($scope.totalInsuredAmount);
                    console.log(parseInt(output.data.annual_income) * 1.3);
                    if ((parseInt($scope.totalInsuredAmount) < parseInt($scope.protectionFactor) * parseInt($scope.user.annualIncome)) && (parseInt($scope.user.annualIncome) <= parseInt(output.data.annual_income) * 1.3)) {
                        console.log("entered if loop : " + $scope.totalInsuredAmount + " AI :" + parseInt($scope.protectionFactor) * parseInt($scope.user.annualIncome));
                        if ((parseInt($scope.totalInsuredAmount) + parseInt($scope.user.requestedAmount)) <= parseInt($scope.protectionFactor) * parseInt($scope.user.annualIncome)) {
                            console.log("inside second if");
                            console.log($scope.totalInsuredAmount);
                            $scope.finalStep = true;
                            $scope.simpleConfirm = true;
                            $scope.claimStatus = true;
                            console.log($scope.claimStatus);
                            $scope.insuredAmount = $scope.user.requestedAmount;
                            $scope.user.comments = "";
                            $scope.rejected = false;
                            $scope.smallerAmountDiv = false;
                        } else {
                            $scope.finalStep = true;
                            $scope.simpleConfirm = false;
                            $scope.smallerAmountDiv = true;
                            $scope.claimStatus = true;
                            $scope.user.comments = "";
                            $scope.rejected = false;
                            $scope.smallerAmount = (parseInt($scope.protectionFactor) * parseInt($scope.user.annualIncome) - parseInt($scope.totalInsuredAmount)).toString();
                            console.log($scope.smallerAmount);
                        }
                        $scope.calculateInsuranceSplitUp(output.data.policies);
                        console.log($scope.splitUp);
                    }
                    else {
                        $scope.finalStep = true;
                        $scope.rejected = true;
                        $scope.claimStatus = false;
                        $scope.simpleConfirm = false;
                        $scope.smallerAmount = 0;
                        $scope.insuredAmount = $scope.user.requestedAmount;
                        if (parseInt($scope.user.annualIncome) > (parseInt(output.data.annual_income) * 1.3)) {
                            $scope.user.comments = "High variation in the annual income";
                            $scope.user.annualIncome = output.data.annual_income;
                            console.log(output.data.annual_income);
                        } else {
                            $scope.user.comments = "Maximum coverage utilised";
                        }
                    }
                }
                $scope.showTransaction = false;
                $scope.showProceed = false;
                $scope.showSearch = false;
                $scope.createPage = true;
                $scope.loading = false;
            }).catch(function (err) {
                console.log(err);
                $scope.showTransaction = false;
                $scope.showWarning = true;
                $scope.showProceed = false;
                $scope.showSearch = false;
                $scope.showDetails = false;
                $scope.loading = false;
                $scope.warningMessage = "error :" + err;
            });;
        } else {
            $scope.valuesIncomplete = true;
        }
    }

    $scope.closeResults = function () {
        $scope.showTransaction = false;
        $scope.showProceed = true;
        $scope.showSearch = false;
        $scope.createPage = true;
    }

    async function getNomineeName(policy_number) {
        try {
            if (policy_number != '') {
                let res = await $http.get('/get_policy_privateABC/' + policy_number);
                console.log('got it FOR :' + policy_number);
                console.log(res.data.nominee);
                return res.data.nominee;
            }
        } catch (err) {
            console.log(err);
            let nam = '-';
            return nam.resolve();
        }
    }
    $scope.search = function () {
        if ($scope.searchPan) {
            $scope.showWarning = false;
            $scope.policies = [];
            console.log();
            $scope.loading = true;
            $scope.finalStep = false;
            console.log($scope.searchPan);
            $http.get('/get_policy/' + $scope.searchPan).then(function (output) {
                console.log(output);
                if (output.data === "" || output.data == null || output.data == "Could not locate insurance for given PAN number") {
                    $scope.createPage = true;
                    $scope.showWarning = true;
                    $scope.showTransaction = false;
                    $scope.showProceed = false;
                    $scope.showSearch = false;
                    $scope.showDetails = false;
                    $scope.loading = false;
                    $scope.warningMessage = "No results found for PAN : " + $scope.searchPan;
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

    $scope.nomineeName = function (policy) {
        $http.get('/get_policy_private'+$scope.companyCode+'/' + policy.policy_number).then(function (output) {
            console.log(output);
            $scope.getNominee = false;
            if (output.data == "Could not locate insurance for given PAN number") {
                policy.nominee = "-";
            } else {
                policy.nominee = output.data.nominee;
            }

        }, function (output) {

        });
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
    $scope.searchPrivateABC = function () {
        if ($scope.searchPrivateABCdata) {
            $scope.showWarning = false;
            $scope.policies = [];
            console.log();
            $scope.loading = true;
            $scope.finalStep = false;
            console.log($scope.searchPrivateABCdata);
            $http.get('/get_policy_privateABC/' + $scope.searchPrivateABCdata).then(function (output) {
                console.log(output);
                if (output.data === "" || output.data == null) {
                    $scope.createPage = true;
                    $scope.showWarning = true;
                    $scope.showTransaction = false;
                    $scope.showProceed = false;
                    $scope.showSearch = false;
                    $scope.showDetails = false;
                    $scope.loading = false;
                    $scope.warningMessage = "No results found for PAN : " + $scope.searchPrivateABCdata;
                } else {
                    $scope.searchResults = output.data;
                    for (var i = 0; i < $scope.searchResults.policies.length; ++i) {
                        $scope.searchResults.policies[i].date_of_approval = $scope.searchResults.policies[i].date_of_approval.substring(4, 15);
                        console.log($scope.searchResults.policies[i].date_of_approval);
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

    $scope.searchPrivateXYZ = function () {
        if ($scope.searchPrivateXYZdata) {
            $scope.showWarning = false;
            $scope.policies = [];
            console.log();
            $scope.loading = true;
            $scope.finalStep = false;
            console.log($scope.searchPrivateABCdata);
            $http.get('/get_policy_privateXYZ/' + $scope.searchPrivateXYZdata).then(function (output) {
                console.log(output);
                if (output.data === "" || output.data == null) {
                    $scope.createPage = true;
                    $scope.showWarning = true;
                    $scope.showTransaction = false;
                    $scope.showProceed = false;
                    $scope.showSearch = false;
                    $scope.showDetails = false;
                    $scope.loading = false;
                    $scope.warningMessage = "No results found for PAN : " + $scope.searchPrivateXYZdata;
                } else {
                    $scope.searchResults = output.data;
                    for (var i = 0; i < $scope.searchResults.policies.length; ++i) {
                        $scope.searchResults.policies[i].date_of_approval = $scope.searchResults.policies[i].date_of_approval.substring(4, 15);
                        console.log($scope.searchResults.policies[i].date_of_approval);
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
});