/**
* Copyright 2018 Cognizant. All Rights Reserved.
*
* EAS IPM Blockchain Solutions
*
*/

package main

import (
	"fmt"
	"strconv"
	"encoding/json"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type LifeInsuranceChaincode struct {

}

type Policy struct{
	PolicyNumber	string		`json:"policy_number"`
	CompanyName		string		`json:"company_name"`
	RequestedAmount	string		`json:"requested_amount"`
	InsuredAmount	string		`json:"insured_amount"`
	ClaimStatus		string		`json:"claim_status"`
	DateOfApproval	string		`json:"date_of_approval"`
	Comments		string 		`json:"comments"`
}

type User struct{
	FirstName 		string			`json:"first_name"`
	LastName 		string			`json:"last_name"`
	PAN				string			`json:"pan"`
	DOB          	string   		`json:"dob"`
	AnnualIncome	string			`json:"annual_income"`
	Policies		[10]Policy		`json:"policies"`
	NOP				string			`json:"nop"`				// Number of Policies
}

func (t *LifeInsuranceChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// nothing to do
	return shim.Success(nil)
}

func (t *LifeInsuranceChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()

	if function == "create" {
		return t.create(stub, args)
	}

	if function == "query" {
		return t.query(stub, args)
	}

	return shim.Error("Error invoking function")
}

// create a policy
func (t *LifeInsuranceChaincode) create(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	FirstName 		:= args[0]
	LastName  		:= args[1]
	PAN 	  		:= args[2]
	DOB			 	:= args[3]
	AnnualIncome 	:= args[4]
	CompanyName		:= args[5]
	RequestedAmount := args[6]
	InsuredAmount	:= args[7]
	ClaimStatus		:= args[8]
	DateOfApproval	:= args[9]
	Comment			:= args[10]

	var PoliciesStr [10] Policy
	var NOP , PNO int

	if (PAN == "undefined" || PAN == "" || PAN == "null"){
		return shim.Error("Missing PAN ")
	}
	//size := len(args)
	userData, err	:= stub.GetState(PAN)

	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + PAN + "\"}"
		return shim.Error(jsonResp)
	} else if userData == nil {
		fmt.Printf("New User data will be created for " + PAN + "\n")
		NOP = 0
	} else if userData != nil {
		userLedger := User{}
		err := json.Unmarshal(userData, &userLedger)
		if err != nil {
			return shim.Error(err.Error())
		}
		fmt.Printf(" User data = %s \n" , userData)
		PoliciesStr = userLedger.Policies
		NOP, err   	= strconv.Atoi(userLedger.NOP)
	}

	if NOP == 10 {
		fmt.Printf(" NO MORE THAN 10 CLAIM REQUESTS ALLOWED \n" )
		jsonResp := "{\"Error\":\"No more than 10 claim requests allowed for " + PAN + "\"}"
		return shim.Error(jsonResp)
	}

	PNO = NOP + 1

	if ClaimStatus == "true" {	
		PoliciesStr[NOP].PolicyNumber 	= CompanyName + PAN + "-POLICY-000" + strconv.Itoa(PNO)
		PoliciesStr[NOP].InsuredAmount  = InsuredAmount
		PoliciesStr[NOP].ClaimStatus	= "APPROVED"
	} else {
		PoliciesStr[NOP].PolicyNumber 	= "--NA--"
		PoliciesStr[NOP].InsuredAmount  = "--NA--"
		PoliciesStr[NOP].ClaimStatus	= "REJECTED"
	}

	PoliciesStr[NOP].RequestedAmount = RequestedAmount
	PoliciesStr[NOP].CompanyName 	 = CompanyName
	PoliciesStr[NOP].DateOfApproval	 = DateOfApproval
	PoliciesStr[NOP].Comments	 	 = Comment
	NOP++

	// Create User and marshal to JSON
	User   := &User{FirstName, LastName, PAN, DOB, AnnualIncome, PoliciesStr, strconv.Itoa(NOP)}
	UserJSONasBytes, err := json.Marshal(User)
	if err != nil {
		return shim.Error(err.Error())
	}

	// Write to ledger
	err = stub.PutState(PAN, UserJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(nil)
}

// search a user
func (t *LifeInsuranceChaincode) query(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 1 {
		return shim.Error("PAN required to query user data")
	}

	PAN				:= args[0]
	userData, err	:= stub.GetState(PAN)

	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + PAN + "\"}"
		return shim.Error(jsonResp)
	} else if userData == nil {
		jsonResp := "{\"Error\":\"User data does not exist for " + PAN + "\"}"
		return shim.Error(jsonResp)
	}

	userLedger := User{}
	err = json.Unmarshal(userData, &userLedger)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(userData)
}


func  main()  {
	err := shim.Start(new(LifeInsuranceChaincode))
	if err != nil {
		fmt.Printf("Error starting LifeInsuranceChaincode : %v \n", err)
	}

}
