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
	add_insuranceABC: function(req, res){
		console.log("submiting insurance policy: ");

		var array = req.params.policy.split(",");
		console.log(array);

		var first_name = array[0];
		var last_name = array[1];
		var pan = array[2];
		var dob = array[3];
		var annual_income = array[4];
		var company_name = array[5];
		var requested_amount = array[6];
		var insured_amount = array[7];
		var claim_status = array[8];
		var date_of_approval=array[9];
		var comment=array[10];
		var nominee=array[11];
		var error = "";

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
		var store_path = path.join(os.homedir(), '.hfc-key-store');
		var collectionsConfigPath = path.join(os.homedir(),'/Desktop/WORKING/fabric-samples-release-1.2/chaincode/insurance_private/collections_config.json');
		//const collectionsConfigPath = path.resolve(__dirname, collection_definition_json_filepath);
		console.log('Store path:'+store_path);
		console.log('colletion path'+collectionsConfigPath)
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
		        chaincodeId: 'insurance_private',
		        fcn: 'create',
		        args: [first_name, last_name, pan, dob, annual_income,company_name,requested_amount,insured_amount,claim_status,date_of_approval,comment,nominee],
		        chainId: 'mychannel',
				txId: tx_id,
				'collections-config': collectionsConfigPath
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
	add_insuranceXYZ: function(req, res){
		console.log("submiting insurance policy: ");

		var array = req.params.policy.split(",");
		console.log(array);

		var first_name = array[0];
		var last_name = array[1];
		var pan = array[2];
		var dob = array[3];
		var annual_income = array[4];
		var company_name = array[5];
		var requested_amount = array[6];
		var insured_amount = array[7];
		var claim_status = array[8];
		var date_of_approval=array[9];
		var comment=array[10];
		var nominee=array[11];
		var error = "";

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
		var store_path = path.join(os.homedir(), '.hfc-key-store');
		var collectionsConfigPath = path.join(os.homedir(),'/Desktop/WORKING/fabric-samples-release-1.2/chaincode/insurance_private/collections_config.json');
		//const collectionsConfigPath = path.resolve(__dirname, collection_definition_json_filepath);
		console.log('Store path:'+store_path);
		console.log('colletion path'+collectionsConfigPath)
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
		    return fabric_client.getUserContext('user2', true);
		}).then((user_from_store) => {
		    if (user_from_store && user_from_store.isEnrolled()) {
		        console.log('Successfully loaded user2 from persistence');
		        member_user = user_from_store;
		    } else {
		        throw new Error('Failed to get user2.... run registerUser2.js');
		    }

		    // get a transaction id object based on the current user assigned to fabric client
		    tx_id = fabric_client.newTransactionID();
		    console.log("Assigning transaction_id: ", tx_id._transaction_id);

		    
		    // send proposal to endorser
		    const request = {
		        //targets : --- letting this default to the peers assigned to the channel
		        chaincodeId: 'insurance_private',
		        fcn: 'create',
		        args: [first_name, last_name, pan, dob, annual_income,company_name,requested_amount,insured_amount,claim_status,date_of_approval,comment,nominee],
		        chainId: 'mychannel',
				txId: tx_id,
				'collections-config': collectionsConfigPath
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
			   let event_hub = channel.newChannelEventHub('localhost:9051');

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
	get_policy: function(req, res){
		console.log("inside controller")

		var fabric_client = new Fabric_Client();
		var key = req.params.pan
		var collectionsConfigPath = path.join(os.homedir(),'/Desktop/WORKING/fabric-samples-release-1.2/chaincode/insurance_private/collections_config.json');
		console.log('colletion path'+collectionsConfigPath)
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
		var store_path = path.join(os.homedir(), '.hfc-key-store');
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
				targets : [peer3],
		        chaincodeId: 'insurance_private',
		        txId: tx_id,
		        fcn: 'queryInsurance',
				args: [key],
				'collections-config': collectionsConfigPath
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
		            res.send("Could not locate insurance for given PAN number")
		            
		        } else {
		            console.log("Response is ", query_responses[0].toString());
		            res.send(query_responses[0].toString())
		        }
		    } else {
		        console.log("No payloads were returned from query");
		        res.send("Could not locate insurance for given PAN number")
		    }
		}).catch((err) => {
		    console.error('Failed to query successfully :: ' + err);
		    res.send("Could not locate insurance for given PAN number")
		});
	},
	get_policy_privateABC: function(req, res){
		console.log("inside controller")

		var fabric_client = new Fabric_Client();
		var key = req.params.pan
		var collectionsConfigPath = path.join(os.homedir(),'/Desktop/WORKING/fabric-samples-release-1.2/chaincode/insurance_private/collections_config.json');
		console.log('colletion path'+collectionsConfigPath)
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
		var store_path = path.join(os.homedir(), '.hfc-key-store');
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
		        chaincodeId: 'insurance_private',
		        txId: tx_id,
		        fcn: 'queryInsurancePrivateDataABC',
				args: [key],
				'collections-config': collectionsConfigPath
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
		            res.send("Could not locate insurance for given PAN number")
		            
		        } else {
		            console.log("Response is ", query_responses[0].toString());
		            res.send(query_responses[0].toString())
		        }
		    } else {
		        console.log("No payloads were returned from query");
		        res.send("Could not locate insurance for given PAN number")
		    }
		}).catch((err) => {
		    console.error('Failed to query successfully :: ' + err);
		    res.send("Could not locate insurance for given PAN number")
		});
	},
	get_policy_privateXYZ: function(req, res){
		console.log("inside controller")

		var fabric_client = new Fabric_Client();
		var key = req.params.pan
		var collectionsConfigPath = path.join(os.homedir(),'/Desktop/WORKING/fabric-samples-release-1.2/chaincode/insurance_private/collections_config.json');
		console.log('colletion path'+collectionsConfigPath)
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
		var store_path = path.join(os.homedir(), '.hfc-key-store');
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
		    return fabric_client.getUserContext('user2', true);
		}).then((user_from_store) => {
		    if (user_from_store && user_from_store.isEnrolled()) {
		        console.log('Successfully loaded user2 from persistence');
		        member_user = user_from_store;
		    } else {
		        throw new Error('Failed to get user2.... run registerUser1.js');
		    }

		    
		    const request = {
				targets : [peer3],
		        chaincodeId: 'insurance_private',
		        txId: tx_id,
		        fcn: 'queryInsurancePrivateDataXYZ',
				args: [key],
				'collections-config': collectionsConfigPath
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
		            res.send("Could not locate insurance for given PAN number")
		            
		        } else {
		            console.log("Response is ", query_responses[0].toString());
		            res.send(query_responses[0].toString())
		        }
		    } else {
		        console.log("No payloads were returned from query");
		        res.send("Could not locate insurance for given PAN number")
		    }
		}).catch((err) => {
		    console.error('Failed to query successfully :: ' + err);
		    res.send("Could not locate insurance for given PAN number")
		});
	},
}
})();