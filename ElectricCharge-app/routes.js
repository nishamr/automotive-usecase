//SPDX-License-Identifier: Apache-2.0

var insurance = require('./controller.js');

module.exports = function(app){


  app.get('/add_creditFactor/:FactorValue', function(req, res){
    console.log("inside function add credictFactor")
    insurance.add_creditFactor(req, res);
  });

  app.get('/update_chargingDetails/:chargingDetails', function(req, res){
    console.log("inside function add update charging details");
    insurance.updateChargingDetails(req, res);
  });
  
  app.get('/get_transactionHistory/:ID', function(req, res){
    console.log("inside function add credictFactor")
    insurance.get_transactionHistory(req, res);
  });
};
