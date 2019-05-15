/**
* Copyright 2018 Cognizant. All Rights Reserved.
*
* EAS IPM Blockchain Solutions
*
 */

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type ElectricVehicleChaincode struct {
}

type EVUser struct {
	CustomerID          string `json:"CustomerID"`
	CreditPtsOpeningBal string `json:"CreditPtsOpeningBal"`
	CreditPtsEarned     string `json:"CreditPtsEarned"`
	CreditFinalBalance  string `json:"CreditFinalBalance"`
	TransactionID       string `json:"TransactionID"`
	StationID           string `json:"StationID"`
	ConsumptionType     string `json:"ConsumptionType"`
	VehicleType         string `json:"VehicleType"`
	ChargedValue        string `json:"ChargedValue"`
	ChargedPrice        string `json:"ChargedPrice"`
}

type ChargingStation struct {
	StationID           string `json:"StationID"`
	CreditPtsOpeningBal string `json:"CreditPtsOpeningBal"`
	CreditPtsEarned     string `json:"CreditPtsEarned"`
	CreditFinalBalance  string `json:"CreditFinalBalance"`
	TransactionID       string `json:"TransactionID"`
	ConsumerID          string `json:"ConsumerID"`
	ConsumptionType     string `json:"ConsumptionType"`
	VehicleType         string `json:"VehicleType"`
	ChargedValue        string `json:"ChargedValue"`
	ChargedPrice        string `json:"ChargedPrice"`
}

type CreditFactor struct {
	FactorID    string `json:"FactorID"`
	FactorValue string `json:"FactorValue"`
}

func (t *ElectricVehicleChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// nothing to do
	return shim.Success(nil)
}

func (t *ElectricVehicleChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()

	if function == "updateChargingDetails" {
		return t.updateChargingDetails(stub, args)
	}

	if function == "transactionHistory" {
		return t.transactionHistory(stub, args)
	}

	if function == "addCreditFactor" {
		return t.addCreditFactor(stub, args)
	}

	return shim.Error("Error invoking function")
}

//updating charging details
func (t *ElectricVehicleChaincode) updateChargingDetails(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	TransactionID := args[0]
	StationID := args[1]
	ConsumerID := args[2]
	ConsumptionType := args[3]
	VehicleType := args[4]
	ChargedValue, err := strconv.Atoi(args[5])
	ChargedPrice := args[6]
	FactorID := args[7]

	var CreditPtsOpeningBalCo, CreditPtsEarnedCo, CreditFinalBalanceCo int
	var CreditPtsOpeningBalCs, CreditPtsEarnedCs, CreditFinalBalanceCs int
	var ConversionFactor int

	//retreiving the cinversion factor from Credit Factor list
	FactorData, err := stub.GetState(FactorID)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for credit factor " + FactorID + "\"}"
		return shim.Error(jsonResp)
	} else if FactorData == nil {
		fmt.Printf("Credit Factor not available")
	} else if FactorData != nil {
		FactorDataLedger := CreditFactor{}
		err := json.Unmarshal(FactorData, &FactorDataLedger)
		if err != nil {
			return shim.Error(err.Error())
		}
		ConversionFactor, err = strconv.Atoi(FactorDataLedger.FactorValue)
	}

	//getting data from EVUser and saving new data
	UserData, err := stub.GetState(ConsumerID)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + ConsumerID + "\"}"
		return shim.Error(jsonResp)
	} else if UserData == nil {
		fmt.Printf("New User data will be created for " + ConsumerID + "\n")
		CreditPtsOpeningBalCo = 0
		CreditPtsEarnedCo = 0
		CreditFinalBalanceCo = 0
	} else if UserData != nil {
		userDataLedger := EVUser{}
		err := json.Unmarshal(UserData, &userDataLedger)
		if err != nil {
			return shim.Error(err.Error())
		}
		fmt.Printf(" User data for given customer ID = %s \n", UserData)
		CreditPtsOpeningBalCo, err = strconv.Atoi(userDataLedger.CreditPtsOpeningBal)
		CreditPtsEarnedCo, err = strconv.Atoi(userDataLedger.CreditPtsEarned)
		CreditFinalBalanceCo, err = strconv.Atoi(userDataLedger.CreditFinalBalance)
	}
	CreditPtsOpeningBalCo = CreditPtsOpeningBalCo + CreditPtsEarnedCo
	CreditPtsEarnedCo = (ChargedValue * ConversionFactor)
	CreditFinalBalanceCo = CreditFinalBalanceCo + CreditPtsEarnedCo
	EVUser := &EVUser{ConsumerID, strconv.Itoa(CreditPtsOpeningBalCo), strconv.Itoa(CreditPtsEarnedCo), strconv.Itoa(CreditFinalBalanceCo), TransactionID, StationID, ConsumptionType, VehicleType, strconv.Itoa(ChargedValue), ChargedPrice}
	EVUserJSONasBytes, err := json.Marshal(EVUser)
	if err != nil {
		return shim.Error(err.Error())
	}
	// Write to ledger of EV User
	err = stub.PutState(ConsumerID, EVUserJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	//getting data from charging Station and saving new data
	UserDataStation, err := stub.GetState(StationID)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + StationID + "\"}"
		return shim.Error(jsonResp)
	} else if UserDataStation == nil {
		fmt.Printf("New User data will be created for station ID " + StationID + "\n")
		CreditPtsOpeningBalCs = 0
		CreditPtsEarnedCs = 0
		CreditFinalBalanceCs = 0
	} else if UserDataStation != nil {
		UserDataStationLedger := ChargingStation{}
		err := json.Unmarshal(UserDataStation, &UserDataStationLedger)
		if err != nil {
			return shim.Error(err.Error())
		}
		fmt.Printf(" User data for given station ID = %s \n", UserDataStation)
		CreditPtsOpeningBalCs, err = strconv.Atoi(UserDataStationLedger.CreditPtsOpeningBal)
		CreditPtsEarnedCs, err = strconv.Atoi(UserDataStationLedger.CreditPtsEarned)
		CreditFinalBalanceCs, err = strconv.Atoi(UserDataStationLedger.CreditFinalBalance)
	}
	CreditPtsOpeningBalCs = CreditPtsOpeningBalCs + CreditPtsEarnedCs
	CreditPtsEarnedCs = (ChargedValue * ConversionFactor)
	CreditFinalBalanceCs = CreditFinalBalanceCs + CreditPtsEarnedCs
	ChargingStation := &ChargingStation{StationID, strconv.Itoa(CreditPtsOpeningBalCs), strconv.Itoa(CreditPtsEarnedCs), strconv.Itoa(CreditFinalBalanceCs), TransactionID, ConsumerID, ConsumptionType, VehicleType, strconv.Itoa(ChargedValue), ChargedPrice}
	ChargingStationJSONasBytes, err := json.Marshal(ChargingStation)
	if err != nil {
		return shim.Error(err.Error())
	}
	// Write to ledger of ChargingStation
	err = stub.PutState(StationID, ChargingStationJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(EVUserJSONasBytes)
}

func (t *ElectricVehicleChaincode) transactionHistory(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) < 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	ID := args[0]

	fmt.Printf("- start getHistory: %s\n", ID)

	resultsIterator, err := stub.GetHistoryForKey(ID)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing historic values for the marble
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(response.TxId)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Value\":")
		// if it was a delete operation on given key, then we need to set the
		//corresponding value null. Else, we will write the response.Value
		//as-is (as the Value itself a JSON marble)
		if response.IsDelete {
			buffer.WriteString("null")
		} else {
			buffer.WriteString(string(response.Value))
		}

		buffer.WriteString(", \"Timestamp\":")
		buffer.WriteString("\"")
		buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
		buffer.WriteString("\"")

		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- getHistory returning:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func (t *ElectricVehicleChaincode) addCreditFactor(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	FactorID := args[0]
	FactorValue := args[0]

	FactorID = "FID1"
	CreditFactor := &CreditFactor{FactorID, FactorValue}
	CreditFactorJSONasBytes, err := json.Marshal(CreditFactor)
	if err != nil {
		return shim.Error(err.Error())
	}
	//write to ledger
	err = stub.PutState(FactorID, CreditFactorJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

func main() {
	err := shim.Start(new(ElectricVehicleChaincode))
	if err != nil {
		fmt.Printf("Error starting LifeInsuranceChaincode : %v \n", err)
	}

}
