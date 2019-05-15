//SPDX-License-Identifier: Apache-2.0

var insurance = require('./controller.js');

module.exports = function(app){

  app.get('/get_policy/:pan', function(req, res){
    console.log("inside function")
    insurance.get_policy(req, res);
  });
  app.get('/create_policyABC/:policy', function(req, res){
    console.log("inside ABC routes");
    insurance.add_insuranceABC(req, res);
  });
  app.get('/create_policyXYZ/:policy', function(req, res){
    console.log("inside XYZ routes");
    insurance.add_insuranceXYZ(req, res);
  });
  app.get('/get_policy_privateABC/:pan', function(req, res){
    console.log("inside function ABC")
    insurance.get_policy_privateABC(req, res);
  });
  app.get('/get_policy_privateXYZ/:pan', function(req, res){
    console.log("inside function XYZ")
    insurance.get_policy_privateXYZ(req, res);
  });
};
