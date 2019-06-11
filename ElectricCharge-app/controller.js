//SPDX-License-Identifier: Apache-2.0

/*
  This code is based on code written by the Hyperledger Fabric community.
  Original code can be found here: https://github.com/hyperledger/fabric-samples/blob/release/fabcar/query.js
  and https://github.com/hyperledger/fabric-samples/blob/release/fabcar/invoke.js
 */

// call the packages we need
var express       = require('express');        // call express
var app           = express();                 // define our app using express
var bodyParser    = require('body-parser');
var http          = require('http')
var fs            = require('fs');
var Fabric_Client = require('fabric-client');
var path          = require('path');
var util          = require('util');
var os            = require('os');

module.exports = (function() {
return{
	add_creditFactor: function(req, res){
		console.log("Addding the conversion factor for credit: ");

		var credit_value = req.body.FactorValue
		console.log(credit_value)

		var fabric_client = new Fabric_Client();

		// setup the fabric network
		var channel = fabric_client.newChannel('mychannel');
		var peer1 = fabric_client.newPeer('grpc://localhost:7051');
		var peer2 = fabric_client.newPeer('grpc://localhost:8051');
		var peer3 = fabric_client.newPeer('grpc://localhost:9051');
		var peer4 = fabric_client.newPeer('grpc://localhost:10051');
		channel.addPeer(peer1);
		channel.addPeer(peer2);
		channel.addPeer(peer3);
		channel.addPeer(peer4);
		var order = fabric_client.newOrderer('grpc://localhost:7050')
		channel.addOrderer(order);

		var member_user = null;
		var store_path = path.join(__dirname, 'hfc-key-store');
		//const collectionsConfigPath = path.resolve(__dirname, collection_definition_json_filepath);
		console.log('Store path:'+store_path);
		var tx_id = null;

		// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
		Fabric_Client.newDefaultKeyValueStore({ path: store_path
		}).then((state_store) => {
		    // assign the store to the fabric client
		    fabric_client.setStateStore(state_store);
		    var crypto_suite = Fabric_Client.newCryptoSuite();
		    // use the same location for the state store (where the users' certificate are kept)
		    // and the crypto store (where the users' keys are kept)
		    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		    crypto_suite.setCryptoKeyStore(crypto_store);
		    fabric_client.setCryptoSuite(crypto_suite);

		    // get the enrolled user from persistence, this user will sign all requests
		    return fabric_client.getUserContext('user1', true);
		}).then((user_from_store) => {
		    if (user_from_store && user_from_store.isEnrolled()) {
		        console.log('Successfully loaded user1 from persistence');
		        member_user = user_from_store;
		    } else {
		        throw new Error('Failed to get user1.... run registerUser.js');
		    }

		    // get a transaction id object based on the current user assigned to fabric client
		    tx_id = fabric_client.newTransactionID();
		    console.log("Assigning transaction_id: ", tx_id._transaction_id);

		    
		    // send proposal to endorser
		    const request = {
		        //targets : --- letting this default to the peers assigned to the channel
		        chaincodeId: 'evchaincode',
		        fcn: 'addCreditFactor',
		        args: [credit_value],
		        //chainId: 'mychannel',
				txId: tx_id
		    };
			console.log(request)
		    // send the transaction proposal to the peers
		    return channel.sendTransactionProposal(request);
		}).then((results) => {
			var proposalResponses = results[0];
			console.log(results[0]);
			var proposal = results[1];
			console.log(results[1]);
		    let isProposalGood = false;
		    if (proposalResponses && proposalResponses[0].response &&
		        proposalResponses[0].response.status === 200) {
		            isProposalGood = true;
		            console.log('Transaction proposal was good');
		        } else {
					console.error('Transaction proposal was bad'+results);
					error = "transaction rejected by chaincode."
		        }
		    if (isProposalGood) {
		        console.log(util.format(
		            'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
		            proposalResponses[0].response.status, proposalResponses[0].response.message));

		        // build up the request for the orderer to have the transaction committed
		        var request = {
		            proposalResponses: proposalResponses,
		            proposal: proposal
		        };

		        // set the transaction listener and set a timeout of 30 sec
		        // if the transaction did not get committed within the timeout period,
		        // report a TIMEOUT status
		        var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		        var promises = [];

		        var sendPromise = channel.sendTransaction(request);
		        promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

		        // get an eventhub once the fabric client has a user assigned. The user
		        // is required bacause the event registration must be signed
		        //let event_hub = fabric_client.newEventHub();
			   // event_hub.setPeerAddr('grpc://localhost:7051');
			   let event_hub = channel.newChannelEventHub('localhost:7051');

		        // using resolve the promise so that result status may be processed
		        // under the then clause rather than having the catch clause process
		        // the status
		        let txPromise = new Promise((resolve, reject) => {
		            let handle = setTimeout(() => {
		                event_hub.disconnect();
		                resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
		            }, 3000);
		            event_hub.connect();
		            event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
		                // this is the callback for transaction event status
		                // first some clean up of event listener
		                clearTimeout(handle);
		                event_hub.unregisterTxEvent(transaction_id_string);
		                event_hub.disconnect();

		                // now let the application know what happened
		                var return_status = {event_status : code, tx_id : transaction_id_string};
		                if (code !== 'VALID') {
		                    console.error('The transaction was invalid, code = ' + code);
		                    resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
		                } else {
							console.log('The transaction has been committed on peer ' + event_hub.getPeerAddr());
							//console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
							
		                    resolve(return_status);
		                }
		            }, (err) => {
		                //this is the callback if something goes wrong with the event registration or processing
		                reject(new Error('There was a problem with the eventhub ::'+err));
		            });
		        });
		        promises.push(txPromise);

		        return Promise.all(promises);
		    } else {
		        console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		        throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		    }
		}).then((results) => {
		    console.log('Send transaction promise and event listener promise have completed');
		    // check the results in the order the promises were added to the promise all list
		    if (results && results[0] && results[0].status === 'SUCCESS') {
		        console.log('Successfully sent transaction to the orderer.');
		        res.send(tx_id.getTransactionID());
		    } else {
		        console.error('Failed to order the transaction. Error code: ' + response.status);
		    }

		    if(results && results[1] && results[1].event_status === 'VALID') {
		        console.log('Successfully committed the change to the ledger by the peer');
		        res.send(tx_id.getTransactionID());
		    } else {
		        console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
		    }
		}).catch((err) => {
		    console.error('Failed to invoke successfully :: ' + err);
		});
	},
	updateChargingDetails: function(req, res){
		console.log(req.body);
		console.log("Updating charging details: ");

		//var input = JSON.parse(req.params.chargingDetails);

		var input = req.body

		//var array = req.params.chargingDetails.split(",");
		console.log("---");
		console.log(input['transactionID'])

		var TransactionID = input.transactionID;
		var StationID = input.stationID;
		var CustomerIDID = input.customerID;
		var ConsumptionType = input.consumptionType;
		var VehicleType = input.vehicleType;
		var ChargedValue = input.chargedValue;
		var ChargedPrice = input.chargedPrice;
		var FactorID = "FID1";

		var fabric_client = new Fabric_Client();

		// setup the fabric network
		var channel = fabric_client.newChannel('mychannel');
		var peer1 = fabric_client.newPeer('grpc://localhost:7051');
		var peer2 = fabric_client.newPeer('grpc://localhost:8051');
		var peer3 = fabric_client.newPeer('grpc://localhost:9051');
		var peer4 = fabric_client.newPeer('grpc://localhost:10051');
		channel.addPeer(peer1);
		channel.addPeer(peer2);
		channel.addPeer(peer3);
		channel.addPeer(peer4);
		var order = fabric_client.newOrderer('grpc://localhost:7050')
		channel.addOrderer(order);

		var member_user = null;
		var store_path = path.join(__dirname, 'hfc-key-store');
		//const collectionsConfigPath = path.resolve(__dirname, collection_definition_json_filepath);
		console.log('Store path:'+store_path);
		var tx_id = null;

		// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
		Fabric_Client.newDefaultKeyValueStore({ path: store_path
		}).then((state_store) => {
		    // assign the store to the fabric client
		    fabric_client.setStateStore(state_store);
		    var crypto_suite = Fabric_Client.newCryptoSuite();
		    // use the same location for the state store (where the users' certificate are kept)
		    // and the crypto store (where the users' keys are kept)
		    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		    crypto_suite.setCryptoKeyStore(crypto_store);
		    fabric_client.setCryptoSuite(crypto_suite);

		    // get the enrolled user from persistence, this user will sign all requests
		    return fabric_client.getUserContext('user1', true);
		}).then((user_from_store) => {
		    if (user_from_store && user_from_store.isEnrolled()) {
		        console.log('Successfully loaded user1 from persistence');
		        member_user = user_from_store;
		    } else {
		        throw new Error('Failed to get user1.... run registerUser1.js');
		    }

		    // get a transaction id object based on the current user assigned to fabric client
		    tx_id = fabric_client.newTransactionID();
		    console.log("Assigning transaction_id: ", tx_id._transaction_id);

		    
		    // send proposal to endorser
		    const request = {
		        //targets : --- letting this default to the peers assigned to the channel
		        chaincodeId: 'evchaincode',
		        fcn: 'updateChargingDetails',
		        args: [TransactionID, StationID, CustomerIDID, ConsumptionType, VehicleType, ChargedValue, ChargedPrice, FactorID],
		        //chainId: 'mychannel',
				txId: tx_id
		    };
			console.log(request)
		    // send the transaction proposal to the peers
		    return channel.sendTransactionProposal(request);
		}).then((results) => {
			var proposalResponses = results[0];
			console.log("-----------------------------------------")
			console.log(results[0].toString());
			var proposal = results[1];
			console.log("-----------------------------------------")
			console.log(results[1].toString());
			console.log("-----------------------------------------")
			console.log(proposalResponses[0].response.payload.toString());
		    let isProposalGood = false;
		    if (proposalResponses && proposalResponses[0].response &&
		        proposalResponses[0].response.status === 200) {
		            isProposalGood = true;
		            console.log('Transaction proposal was good');
		        } else {
					console.error('Transaction proposal was bad'+results);
					error = "transaction rejected by chaincode."
		        }
		    if (isProposalGood) {
		        console.log(util.format(
		            'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
					proposalResponses[0].response.status, proposalResponses[0].response.message));
					//added to send the json response of user back to UI
					//res.write(proposalResponses[0].response.payload.toString());
					
					console.log((JSON.parse(JSON.stringify(proposalResponses[0].response.payload.toString()))));
					res.send(JSON.parse(proposalResponses[0].response.payload.toString()));

					console.log("sucessfully sent the response");
		        // build up the request for the orderer to have the transaction committed
		        var request = {
		            proposalResponses: proposalResponses,
		            proposal: proposal
		        };

		        // set the transaction listener and set a timeout of 30 sec
		        // if the transaction did not get committed within the timeout period,
		        // report a TIMEOUT status
		        var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		        var promises = [];

		        var sendPromise = channel.sendTransaction(request);
		        promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

		        // get an eventhub once the fabric client has a user assigned. The user
		        // is required bacause the event registration must be signed
		        //let event_hub = fabric_client.newEventHub();
			   // event_hub.setPeerAddr('grpc://localhost:7051');
			   let event_hub = channel.newChannelEventHub('localhost:7051');

		        // using resolve the promise so that result status may be processed
		        // under the then clause rather than having the catch clause process
		        // the status
		        let txPromise = new Promise((resolve, reject) => {
		            let handle = setTimeout(() => {
		                event_hub.disconnect();
		                resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
		            }, 3000);
		            event_hub.connect();
		            event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
		                // this is the callback for transaction event status
		                // first some clean up of event listener
		                clearTimeout(handle);
		                event_hub.unregisterTxEvent(transaction_id_string);
		                event_hub.disconnect();

		                // now let the application know what happened
		                var return_status = {event_status : code, tx_id : transaction_id_string};
		                if (code !== 'VALID') {
		                    console.error('The transaction was invalid, code = ' + code);
		                    resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
		                } else {
							console.log('The transaction has been committed on peer ' + event_hub.getPeerAddr());
							//console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
							
		                    resolve(return_status);
		                }
		            }, (err) => {
		                //this is the callback if something goes wrong with the event registration or processing
		                reject(new Error('There was a problem with the eventhub ::'+err));
		            });
		        });
		        promises.push(txPromise);

		        return Promise.all(promises);
		    } else {
		        console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		        throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		    }
		}).then((results) => {
		    console.log('Send transaction promise and event listener promise have completed');
		    // check the results in the order the promises were added to the promise all list
		    if (results && results[0] && results[0].status === 'SUCCESS') {
		        console.log('Successfully sent transaction to the orderer.');
				//res.write(tx_id.getTransactionID());
				
		    } else {
		        console.error('Failed to order the transaction. Error code: ' + response.status);
		    }

		    if(results && results[1] && results[1].event_status === 'VALID') {
		        console.log('Successfully committed the change to the ledger by the peer');
				//res.write("/"+tx_id.getTransactionID());
				res.end();
			
		    } else {
		        console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
		    }
		}).catch((err) => {
		    console.error('Failed to invoke successfully :: ' + err);
		});
	},
	get_transactionHistory: function(req, res){
		console.log("inside controller of transaction history")

		var fabric_client = new Fabric_Client();
		var ID = req.params.ID
		// setup the fabric network
		var channel = fabric_client.newChannel('mychannel');
		var peer1 = fabric_client.newPeer('grpc://localhost:7051');
		var peer2 = fabric_client.newPeer('grpc://localhost:8051');
		var peer3 = fabric_client.newPeer('grpc://localhost:9051');
		var peer4 = fabric_client.newPeer('grpc://localhost:10051');
		channel.addPeer(peer1);
		channel.addPeer(peer2);
		channel.addPeer(peer3);
		channel.addPeer(peer4);

		//
		var member_user = null;
		var store_path = path.join(__dirname, 'hfc-key-store');
		console.log('Store path:'+store_path);
		var tx_id = null;

		// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
		Fabric_Client.newDefaultKeyValueStore({ path: store_path
		}).then((state_store) => {
		    // assign the store to the fabric client
		    fabric_client.setStateStore(state_store);
		    var crypto_suite = Fabric_Client.newCryptoSuite();
		    // use the same location for the state store (where the users' certificate are kept)
		    // and the crypto store (where the users' keys are kept)
		    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		    crypto_suite.setCryptoKeyStore(crypto_store);
		    fabric_client.setCryptoSuite(crypto_suite);

		    // get the enrolled user from persistence, this user will sign all requests
		    return fabric_client.getUserContext('user1', true);
		}).then((user_from_store) => {
		    if (user_from_store && user_from_store.isEnrolled()) {
		        console.log('Successfully loaded user1 from persistence');
		        member_user = user_from_store;
		    } else {
		        throw new Error('Failed to get user1.... run registerUser.js');
		    }

		    
		    const request = {
				targets : [peer1],
		        chaincodeId: 'evchaincode',
		        txId: tx_id,
		        fcn: 'transactionHistory',
				args: [ID]
		    };
			console.log(request)
		    // send the query proposal to the peer
		    return channel.queryByChaincode(request);
		}).then((query_responses) => {
			console.log("Query has completed, checking results");
			console.log(query_responses)
		    // query_responses could have more than one  results if there multiple peers were used as targets
		    if (query_responses && query_responses.length == 1) {
		        if (query_responses[0] instanceof Error) {
		            console.error("error from query = ", query_responses[0]);
		            res.send("Could not retrieve the transaction history for given ID")
		            
		        } else {
		            console.log("Response is ", JSON.parse(query_responses[0].toString()));
		            res.send(JSON.parse(query_responses[0].toString()))
		        }
		    } else {
		        console.log("No payloads were returned from query");
		        res.send("Could not retrieve the transaction history for given ID")
		    }
		}).catch((err) => {
		    console.error('Failed to query successfully :: ' + err);
		    res.send("Could not retrieve the transaction history for given ID")
		});
	}
}
})();