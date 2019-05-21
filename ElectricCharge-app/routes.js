//SPDX-License-Identifier: Apache-2.0

var insurance = require('./controller.js');
var bodyParser = require('body-parser');

module.exports = function(app){

app.use(bodyParser.json());
var urlencodedParser = bodyParser.urlencoded({ extended: true });


  app.post('/add_creditFactor',urlencodedParser, function(req, res){
    console.log(req.body);
    console.log("inside function add credictFactor")
    insurance.add_creditFactor(req, res);
  });

  app.get('/get_transactionHistory/:ID', function(req, res){
    console.log("inside function add credictFactor")
    insurance.get_transactionHistory(req, res);
  });

  app.post('/update_chargingDetails',urlencodedParser,function(req,res){
    console.log(req.body);
    console.log("inside function add update charging details");
    insurance.updateChargingDetails(req, res);
});

};
