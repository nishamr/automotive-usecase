/**
* Copyright 2018 Cognizant. All Rights Reserved.
*
* EAS IPM Blockchain Solutions
*
 */

package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

type LifeInsuranceChaincode struct {
}

type Policy struct {
	PolicyNumber    string `json:"policy_number"`
	CompanyName     string `json:"company_name"`
	RequestedAmount string `json:"requested_amount"`
	InsuredAmount   string `json:"insured_amount"`
	ClaimStatus     string `json:"claim_status"`
	DateOfApproval  string `json:"date_of_approval"`
	Comments        string `json:"comments"`
}

//user
type User struct {
	FirstName    string     `json:"first_name"`
	LastName     string     `json:"last_name"`
	PAN          string     `json:"pan"`
	DOB          string     `json:"dob"`
	AnnualIncome string     `json:"annual_income"`
	Policies     [10]Policy `json:"policies"`
	NOP          string     `json:"nop"` // Number of Policies
}

type insurancePrivateDetails struct { //docType is used to distinguish the various types of objects in state database
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	PAN         string `json:"pan"`
	CompanyName string `json:"company_name"`
	Nominee     string `json:"nominee"`
	PolicyNum   string `json:"policynum"`
}

type InsurancePrivateDetail struct {
	InsurancePrivate [10]insurancePrivateDetails `json:"insuranceprivatedetails"`
	NOP              string                      `json:"nop"` // Number of Policies
}

//

func (t *LifeInsuranceChaincode) Init(stub shim.ChaincodeStubInterface) sc.Response {
	// nothing to do
	return shim.Success(nil)
}

func (t *LifeInsuranceChaincode) Invoke(stub shim.ChaincodeStubInterface) sc.Response {
	function, args := stub.GetFunctionAndParameters()

	if function == "create" {
		return t.create(stub, args)
	}
	if function == "query" {
		return t.query(stub, args)
	}
	if function == "queryInsurance" {
		return t.queryInsurance(stub, args)
	}
	if function == "queryInsurancePrivateDataABC" {
		return t.queryInsurancePrivateDataABC(stub, args)
	}
	if function == "queryInsurancePrivateDataXYZ" {
		return t.queryInsurancePrivateDataXYZ(stub, args)
	}

	return shim.Error("Error invoking function")
}

//create new insurance private data
/*func (t *LifeInsuranceChaincode) InitInsurance(stub shim.ChaincodeStubInterface, args []string) sc.Response {

	FirstName := args[0]
	LastName := args[1]
	PAN := args[2]
	DOB := args[3]
	AnnualIncome := args[5]
	NOP := args[4]

	//var PoliciesStr [10]Policy
	//var NOP, PNO int

	User := &User{FirstName, LastName, PAN, DOB, NOP}
	UserBytes, err := json.Marshal(User)
	if err != nil {
		return shim.Error(err.Error())
	}
	// ==== Input sanitation ====
	insurancePrivateDetails := &insurancePrivateDetails{PAN, FirstName, LastName, AnnualIncome}
	insurancePrivateDetailsBytes, err1 := json.Marshal(insurancePrivateDetails)
	if err1 != nil {
		return shim.Error(err1.Error())
	}

	err3 := stub.PutPrivateData("collectionInsurance", PAN, UserBytes)
	if err3 != nil {
		return shim.Error(err3.Error())
	}

	err4 := stub.PutPrivateData("collectioninsurancePrivateDetails", PAN, insurancePrivateDetailsBytes)
	if err4 != nil {
		return shim.Error(err4.Error())
	}

	fmt.Println("- end init marble")
	return shim.Success(nil)
}*/

func (t *LifeInsuranceChaincode) queryInsurancePrivateDataABC(stub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("PAN required to query user data")
	}

	PolicyNum := args[0]
	userData, err := stub.GetPrivateData("collectionPrivateDetailsABC", PolicyNum)

	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + PolicyNum + "\"}"
		return shim.Error(jsonResp)
	} else if userData == nil {
		jsonResp := "{\"Error\":\"User data does not exist for " + PolicyNum + "\"}"
		return shim.Error(jsonResp)
	}

	return shim.Success(userData)
}

func (t *LifeInsuranceChaincode) queryInsurancePrivateDataXYZ(stub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("PAN required to query user data")
	}

	PolicyNum := args[0]
	userData, err := stub.GetPrivateData("collectionPrivateDetailsXYZ", PolicyNum)

	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + PolicyNum + "\"}"
		return shim.Error(jsonResp)
	} else if userData == nil {
		jsonResp := "{\"Error\":\"User data does not exist for " + PolicyNum + "\"}"
		return shim.Error(jsonResp)
	}

	return shim.Success(userData)
}

// create a policy
func (t *LifeInsuranceChaincode) create(stub shim.ChaincodeStubInterface, args []string) sc.Response {

	FirstName := args[0]
	LastName := args[1]
	PAN := args[2]
	DOB := args[3]
	AnnualIncome := args[4]
	CompanyName := args[5]
	RequestedAmount := args[6]
	InsuredAmount := args[7]
	ClaimStatus := args[8]
	DateOfApproval := args[9]
	Comment := args[10]
	Nominee := args[11]

	var PolicyNum string
	var PoliciesStr [10]Policy
	//var PrivateDataStr [10]insurancePrivateDetails
	var NOP, PNO int

	if PAN == "undefined" || PAN == "" || PAN == "null" {
		return shim.Error("Missing PAN ")
	}
	//size := len(args)
	//userData, err := stub.GetState(PAN)
	userData, err := stub.GetPrivateData("collectionInsurance", PAN)

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
		fmt.Printf(" User data = %s \n", userData)
		PoliciesStr = userLedger.Policies
		NOP, err = strconv.Atoi(userLedger.NOP)
	}

	if NOP == 10 {
		fmt.Printf(" NO MORE THAN 10 CLAIM REQUESTS ALLOWED \n")
		jsonResp := "{\"Error\":\"No more than 10 claim requests allowed for " + PAN + "\"}"
		return shim.Error(jsonResp)
	}

	PNO = NOP + 1

	if ClaimStatus == "true" {
		PoliciesStr[NOP].PolicyNumber = CompanyName + PAN + "-POLICY-000" + strconv.Itoa(PNO)
		PoliciesStr[NOP].InsuredAmount = InsuredAmount
		PoliciesStr[NOP].ClaimStatus = "APPROVED"
		PolicyNum = CompanyName + PAN + "-POLICY-000" + strconv.Itoa(PNO)

	} else {
		PoliciesStr[NOP].PolicyNumber = "--NA--"
		PoliciesStr[NOP].InsuredAmount = "--NA--"
		PoliciesStr[NOP].ClaimStatus = "REJECTED"

	}

	PoliciesStr[NOP].RequestedAmount = RequestedAmount
	PoliciesStr[NOP].CompanyName = CompanyName
	PoliciesStr[NOP].DateOfApproval = DateOfApproval
	PoliciesStr[NOP].Comments = Comment

	NOP++

	// Create User and marshal to JSON
	User := &User{FirstName, LastName, PAN, DOB, AnnualIncome, PoliciesStr, strconv.Itoa(NOP)}
	UserJSONasBytes, err := json.Marshal(User)
	if err != nil {
		return shim.Error(err.Error())
	}
	// Write to ledger
	//err = stub.PutState(PAN, UserJSONasBytes)
	err = stub.PutPrivateData("collectionInsurance", PAN, UserJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	/*userDataPrivate, err3 := stub.GetPrivateData("collectionPrivateDetailsABC", PAN)
	if err3 != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + PAN + "\"}"
		return shim.Error(jsonResp)
	} else if userDataPrivate == nil {
		fmt.Printf("New User data will be created for " + PAN + "\n")
		NOP = 0
	} else if userDataPrivate != nil {
		userLedgerPrivate := InsurancePrivateDetail{}
		err4 := json.Unmarshal(userDataPrivate, &userLedgerPrivate)
		if err4 != nil {
			return shim.Error(err4.Error())
		}
		fmt.Printf(" User data = %s \n", userDataPrivate)
		PrivateDataStr = userLedgerPrivate.InsurancePrivate
		NOP, err = strconv.Atoi(userLedgerPrivate.NOP)
	}*/

	/*PrivateDataStr[NOP].FirstName = FirstName
	PrivateDataStr[NOP].LastName = LastName
	PrivateDataStr[NOP].PAN = PAN
	PrivateDataStr[NOP].CompanyName = CompanyName
	PrivateDataStr[NOP].Nominee = Nominee
	NOP++ */
	if ClaimStatus == "true" {
		if CompanyName == "ABC_INSURANCE" {
			userDataPrivate, err3 := stub.GetPrivateData("collectionPrivateDetailsABC", PolicyNum)
			if err3 != nil {
				jsonResp := "{\"Error\":\"Failed to get data for " + PolicyNum + "\"}"
				return shim.Error(jsonResp)
			} else if userDataPrivate == nil {
				// Create User and marshal to JSON
				InsurancePrivateDetails := &insurancePrivateDetails{FirstName, LastName, PAN, CompanyName, Nominee, PolicyNum}
				InsurancePrivateDetailsJSONasBytes, err := json.Marshal(InsurancePrivateDetails)
				if err != nil {
					return shim.Error(err.Error())
				}

				err1 := stub.PutPrivateData("collectionPrivateDetailsABC", PolicyNum, InsurancePrivateDetailsJSONasBytes)
				if err1 != nil {
					return shim.Error(err1.Error())
				}
			}
		} else if CompanyName == "XYZ_INSURANCE" {
			userDataPrivate, err3 := stub.GetPrivateData("collectionPrivateDetailsXYZ", PolicyNum)
			if err3 != nil {
				jsonResp := "{\"Error\":\"Failed to get data for " + PolicyNum + "\"}"
				return shim.Error(jsonResp)
			} else if userDataPrivate == nil {
				InsurancePrivateDetails := &insurancePrivateDetails{FirstName, LastName, PAN, CompanyName, Nominee, PolicyNum}
				InsurancePrivateDetailsJSONasBytes, err := json.Marshal(InsurancePrivateDetails)
				if err != nil {
					return shim.Error(err.Error())
				}
				err2 := stub.PutPrivateData("collectionPrivateDetailsXYZ", PolicyNum, InsurancePrivateDetailsJSONasBytes)
				if err2 != nil {
					return shim.Error(err2.Error())
				}
			}
		}
	}
	return shim.Success(nil)
}

func (t *LifeInsuranceChaincode) queryInsurance(stub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("PAN required to query user data")
	}

	PAN := args[0]
	userData, err := stub.GetPrivateData("collectionInsurance", PAN)

	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + PAN + "\"}"
		return shim.Error(jsonResp)
	} else if userData == nil {
		jsonResp := "{\"Error\":\"User data does not exist for " + PAN + "\"}"
		return shim.Error(jsonResp)
	}
	return shim.Success(userData)
}

// search a user
func (t *LifeInsuranceChaincode) query(stub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("PAN required to query user data")
	}

	PAN := args[0]
	userData, err := stub.GetState(PAN)

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

func main() {
	err := shim.Start(new(LifeInsuranceChaincode))
	if err != nil {
		fmt.Printf("Error starting LifeInsuranceChaincode : %v \n", err)
	}

}
