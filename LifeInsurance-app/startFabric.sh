#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0
# This code is based on code written by the Hyperledger Fabric community. 
# Original code can be found here: https://github.com/hyperledger/fabric-samples/blob/release/fabcar/startFabric.sh
#
# Exit on first error

set -e

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

starttime=$(date +%s)

if [ ! -d ~/.hfc-key-store/ ]; then
	mkdir ~/.hfc-key-store/
fi

# launch network; create channel and join peer to channel
cd ../first-network
./byfn.sh -m down
./byfn.sh -m up

# Now launch the CLI container in order to install, instantiate chaincode
#docker-compose -f ./docker-compose.yml up -d cli

#docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" cli peer chaincode install -n insurance-app -v 1.4 -p github.com/insurance-app
#docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" cli peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n insurance-app -v 1.4 -c '{"Args":[""]}' -P "OR ('Org1MSP.member','Org2MSP.member')"
#sleep 10
#docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" cli peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n insurance-app -c '{"Args":["create", "JOE", "DANIEL", "PANABC12", "JAN 10 2000", "5000", "ABC_INSURANCE", "10000", "10000", "true", "Oct 23 2018","Coverage for Parents."]}' 

printf "\nTotal execution time : $(($(date +%s) - starttime)) secs ...\n\n"
printf "\nStart with the registerAdmin.js, then registerUser.js, then server.js\n\n"