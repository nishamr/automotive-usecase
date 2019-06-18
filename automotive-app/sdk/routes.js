//SPDX-License-Identifier: Apache-2.0

var evCharge = require('./controller.js');
var bodyParser = require('body-parser');

module.exports = function(app){

app.use(bodyParser.json());
var urlencodedParser = bodyParser.urlencoded({ extended: true });


  app.post('/add_creditFactor',urlencodedParser, function(req, res){
    console.log(req.body);
    console.log("inside function add credictFactor")
    evCharge.add_creditFactor(req, res);
  });

  app.get('/searchProduct/:QRCode', function(req, res){
    console.log("inside function add credictFactor")
    evCharge.searchProduct(req, res);
  });

  app.post('/registerProduct',urlencodedParser,function(req,res){
    console.log(req.body);
    console.log("inside function add update charging details");
    evCharge.registerProduct(req, res);
});
app.post('/transferProduct',urlencodedParser,function(req,res){
  console.log(req.body);
  console.log("inside function add update charging details");
  evCharge.transferProduct(req, res);
});

};
