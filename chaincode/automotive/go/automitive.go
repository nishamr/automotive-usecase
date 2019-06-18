/**
* Copyright 2018 Cognizant. All Rights Reserved.
*
* EAS IPM Blockchain Solutions
*
 */
package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

//AutomoitiveChaincode - chaincode name
type AutomoitiveChaincode struct {
}

//ProductEXT - External Asset
type ProductEXT struct {
	HashProductExternalID string `json:"HashProductExternalID"`
	IDType                string `json:"IDType"`
	HashProductUUID       string `json:"HashProductUUID"`
	ProductUUID           string `json:"ProductUUID"`
	ProductExternalID     string `json:"ProductUUIDExt"`
	Sender                string `json:"Sender"`
	Receiver              string `json:"Receiver"`
	ReceiverType          string `json:"ReceiverType"`
	Location              string `json:"Location"`
	TimeStamp             string `json:"TimeStamp"`
	CounterFeitStatus     string `json:"CounterFeitStatus"`
	CounterFeitDesc       string `json:"CounterFeitDesc"`
	BlockchainTxid        string `json:"BlockchainTxid"`
}

//ProductINT - Internal Asset
type ProductINT struct {
	HashProductUUID       string `json:"HashProductUUID"`
	IDType                string `json:"IDType"`
	HashProductExternalID string `json:"HashProductExternalID"`
	ProductUUID           string `json:"ProductUUID"`
	ProductExternalID     string `json:"ProductUUIDExt"`
	PartName              string `json:"PartName"`
	PartNum               string `json:"PartNum"`
	ForModels             string `json:"ForModels"`
	ManufacturedBy        string `json:"ManufacturedBy"`
	ManufacturedAt        string `json:"ManufacturedAt"`
	ManufacturedDate      string `json:"ManufacturedDate"`
	ProductStatus         string `json:"ProductStatus"`
	CounterFeitStatus     string `json:"CounterFeitStatus"`
	CounterFeitDesc       string `json:"CounterFeitDesc"`
	BlockchainTxid        string `json:"BlockchainTxid"`
}

//CounterFeitCheck - to check the status of the product if scanned more than one time by same receiver
type CounterFeitCheck struct {
	CfCheckName  string `json:"CheckName"`
	CfCheckValue string `json:"CheckValue"`
}

//Init - Intialization function of the chaincode
func (t *AutomoitiveChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// nothing to do
	return shim.Success(nil)
}

//Invoke - Chaincode invoke funtions
func (t *AutomoitiveChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()

	if function == "registerProduct" {
		return t.registerProduct(stub, args)
	}

	if function == "transferProduct" {
		return t.transferProduct(stub, args)
	}

	if function == "searchProduct" {
		return t.searchProduct(stub, args)
	}

	return shim.Error("Error invoking function")
}

func (t *AutomoitiveChaincode) registerProduct(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	ProductUUID := args[0]
	ProductExternalID := args[1]
	PartName := args[2]
	PartNum := args[3]
	ForModels := args[4]
	ManufacturedBy := args[5]
	ManufacturedAt := args[6]
	ManufacturedDate := args[7]

	var IDType, ProductStatus, CounterFeitStatus, CounterFeitDesc string
	var Sender, Receiver, ReceiverType, Location, TimeStamp string

	BlockchainTxid := stub.GetTxID()

	HashProductUUIDINT := sha256.New()
	HashProductUUIDINT.Write([]byte(ProductUUID))
	HashProductUUIDInt := base64.URLEncoding.EncodeToString(HashProductUUIDINT.Sum(nil))

	HashProductUUIDEXT := sha256.New()
	HashProductUUIDEXT.Write([]byte(ProductExternalID))
	HashProductUUIDExt := base64.URLEncoding.EncodeToString(HashProductUUIDEXT.Sum(nil))

	// productINTAsBytes, err := stub.GetState(HashProductUUIDInt)
	// if err != nil {
	// 	return shim.Error("Failed to get Product: " + err.Error())
	// } else if productINTAsBytes != nil {
	// 	fmt.Println("This product already exists: ")
	// 	return shim.Error("This marble already exists: ")
	// }

	productINTAsBytes, err := stub.GetState(HashProductUUIDInt)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + HashProductUUIDInt + "\"}"
		return shim.Error(jsonResp)
	} else if productINTAsBytes == nil {
		IDType = "INT"
		ProductStatus = "-NA-"
		CounterFeitStatus = "-NA-"
		CounterFeitDesc = "-NA-"
		fmt.Printf("New User data will be created for " + HashProductUUIDInt + "\n")
	} else if productINTAsBytes != nil {
		fmt.Println("This product already exists: ")
		return shim.Error("This product already exists: ")
	}

	//Registering the product to internal package assset
	productINT := &ProductINT{HashProductUUIDInt, IDType, HashProductUUIDExt, ProductUUID, ProductExternalID, PartName, PartNum, ForModels, ManufacturedBy, ManufacturedAt, ManufacturedDate, ProductStatus, CounterFeitStatus, CounterFeitDesc, BlockchainTxid}
	ProductINTJSONasBytes, err := json.Marshal(productINT)
	if err != nil {
		return shim.Error(err.Error())
	}

	// Write to ledger
	err = stub.PutState(HashProductUUIDInt, ProductINTJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	//return shim.Success(nil)

	productEXTAsBytes, err := stub.GetState(HashProductUUIDExt)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + HashProductUUIDExt + "\"}"
		return shim.Error(jsonResp)
	} else if productEXTAsBytes == nil {
		fmt.Printf("New User data will be created for " + HashProductUUIDExt + "\n")
		IDType = "EXT"
		Sender = "-NA-"
		Receiver = "OEM"
		ReceiverType = "OEM"
		CounterFeitStatus = "-NA-"
		CounterFeitDesc = "-NA-"

	} else if productEXTAsBytes != nil {
		fmt.Println("This product package already exists: ")
		return shim.Error("This product package already exists: ")
	}

	//Registering the product to External package assset
	productEXT := &ProductEXT{HashProductUUIDExt, IDType, HashProductUUIDInt, ProductUUID, ProductExternalID, Sender, Receiver, ReceiverType, Location, TimeStamp, CounterFeitStatus, CounterFeitDesc, BlockchainTxid}
	ProductEXTJSONasBytes, err := json.Marshal(productEXT)
	if err != nil {
		return shim.Error(err.Error())
	}

	// Write to ledger
	err = stub.PutState(HashProductUUIDExt, ProductEXTJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	// var Product [10]string
	// Product[0] = ProductUUID
	// Product[1] = ProductExternalID
	// Product[2] = PartName
	// Product[3] = PartNum
	// Product[4] = ForModels
	// Product[5] = ManufacturedBy
	// Product[6] = ManufacturedAt
	// Product[7] = ManufacturedDate
	// Product[8] = HashProductUUIDInt
	// Product[9] = HashProductUUIDExt

	type Product struct {
		ProductUUID        string
		ProductExternalID  string
		PartName           string
		PartNum            string
		ForModels          string
		ManufacturedBy     string
		ManufacturedAt     string
		ManufacturedDate   string
		HashProductUUIDInt string
		HashProductUUIDExt string
		BlockchainTxid     string
	}
	product := &Product{ProductUUID, ProductExternalID, PartName, PartNum, ForModels, ManufacturedBy, ManufacturedAt, ManufacturedDate, HashProductUUIDInt, HashProductUUIDExt, BlockchainTxid}

	ProductJSONasBytes, err := json.Marshal(product)

	fmt.Println(ProductJSONasBytes)

	return shim.Success(ProductJSONasBytes)

}

func (t *AutomoitiveChaincode) transferProduct(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	QRCode := args[0]
	Receiver := args[1]
	ReceiverType := args[2]
	Location := args[3]
	Timestamp := args[4]

	var counterfeitStatus, productstatus, CfCheckName, CfCheckValue, counterfeitDesc, SenderName string
	BlockchainTxid := stub.GetTxID()

	//UUID := args[0]
	productData, err := stub.GetState(QRCode)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for QR Code " + QRCode + "\"}"
		return shim.Error(jsonResp)
	} else if productData == nil {
		//jsonResp := "{\"Error\":\"User data does not exist for " + QRCode + "\"}"
		//return shim.Error(jsonResp)
		return shim.Error("Data does not exist for the given QR Code . This id counterfeit")
	} else if productData != nil {
		CfCheckName = Receiver + QRCode
		CounterfeitData, err1 := stub.GetState(CfCheckName)
		if err1 != nil {
			jsonResp := "{\"Error\":\"Failed to get data for QR Code " + CfCheckName + "\"}"
			return shim.Error(jsonResp)
		} else if CounterfeitData != nil {
			counterfeitStatus = "TRUE"
			//counterfeitDesc = "This Product is scanned already for the same QR Code by the same receiver. This is a possible counterfeit"
			//return shim.Error("This Product is scanned already for the same QR Code by the same receiver. This is a possible counterfeit")
		} else if CounterfeitData == nil {
			fmt.Println("Counterfeit Data does not exist . New data will be created")
			counterfeitStatus = "FALSE"
			//counterfeitDesc = "The product is scanned correctly. This is not a counterfeit"
		}
		//Adding new data to the CounterfeitCheck struct for the scanned QR Code
		CfCheckValue = "True"
		counterfeitstatus := &CounterFeitCheck{CfCheckName, CfCheckValue}
		counterfeitstatusJSONasBytes, err := json.Marshal(counterfeitstatus)
		if err != nil {
			return shim.Error(err.Error())
		}
		// Write to ledger
		err = stub.PutState(CfCheckName, counterfeitstatusJSONasBytes)
		if err != nil {
			return shim.Error(err.Error())
		}

		productLedger := ProductEXT{}
		err = json.Unmarshal(productData, &productLedger)
		if err != nil {
			return shim.Error(err.Error())
		}

		if productLedger.IDType == "EXT" {
			productIntData, err1 := stub.GetState(productLedger.HashProductUUID)
			productIntDataLedger := ProductINT{}
			err1 = json.Unmarshal(productIntData, &productIntDataLedger)
			if err1 != nil {
				return shim.Error(err1.Error())
			}

			if productIntDataLedger.ProductStatus == "SOLD" {
				return shim.Error("The product is already sold")
			} else {
				productstatus = "IN-TRANSIT"

				type ProductTransfer struct {
					ProductExternalID string
					PartName          string
					PartNum           string
					ForModels         string
					ManufacturedBy    string
					ManufacturedAt    string
					ManufacturedDate  string
					Sender            string
					Receiver          string
					ReceiverType      string
					Location          string
					Timestamp         string
					CounterFeitStatus string
					CounterFeitDesc   string
					ProductStatus     string
					BlockchainTxid    string
				}

				SenderName = productLedger.Receiver

				if counterfeitStatus == "TRUE" {
					counterfeitDesc = "Duplicate package " + productLedger.HashProductExternalID + " received by " + Receiver + ". Please conduct audit with " + SenderName
				} else {
					counterfeitDesc = "-NA-"
				}
				producttransfer := &ProductTransfer{QRCode, productIntDataLedger.PartName, productIntDataLedger.PartNum, productIntDataLedger.ForModels, productIntDataLedger.ManufacturedBy, productIntDataLedger.ManufacturedAt, productIntDataLedger.ManufacturedDate, SenderName, Receiver, ReceiverType, Location, Timestamp, counterfeitStatus, counterfeitDesc, productstatus, BlockchainTxid}
				producttransferJSONasBytes, err := json.Marshal(producttransfer)
				if err != nil {
					return shim.Error(err.Error())
				}
				fmt.Println(producttransferJSONasBytes)

				productEXT := &ProductEXT{productLedger.HashProductExternalID, productLedger.IDType, productLedger.HashProductUUID, productLedger.ProductUUID, productLedger.ProductExternalID, SenderName, Receiver, ReceiverType, Location, Timestamp, counterfeitStatus, counterfeitDesc, BlockchainTxid}
				ProductEXTJSONasBytes, err := json.Marshal(productEXT)
				if err != nil {
					return shim.Error(err.Error())
				}
				// Write to ledger
				err = stub.PutState(productLedger.HashProductExternalID, ProductEXTJSONasBytes)
				if err != nil {
					return shim.Error(err.Error())
				}

				productINT := &ProductINT{productIntDataLedger.HashProductUUID, productIntDataLedger.IDType, productIntDataLedger.HashProductExternalID, productIntDataLedger.ProductUUID, productIntDataLedger.ProductExternalID, productIntDataLedger.PartName, productIntDataLedger.PartNum, productIntDataLedger.ForModels, productIntDataLedger.ManufacturedBy, productIntDataLedger.ManufacturedAt, productIntDataLedger.ManufacturedDate, productstatus, productIntDataLedger.CounterFeitStatus, productIntDataLedger.CounterFeitDesc, BlockchainTxid}
				ProductINTJSONasBytes, err := json.Marshal(productINT)
				if err != nil {
					return shim.Error(err.Error())
				}
				// Write to ledger
				err = stub.PutState(productIntDataLedger.HashProductUUID, ProductINTJSONasBytes)
				if err != nil {
					return shim.Error(err.Error())
				}

				return shim.Success(producttransferJSONasBytes)
			}
		}

		if productLedger.IDType == "INT" {
			productSaletData, err1 := stub.GetState(productLedger.HashProductUUID)
			productSaleDataLedger := ProductINT{}
			err1 = json.Unmarshal(productSaletData, &productSaleDataLedger)
			if err1 != nil {
				return shim.Error(err1.Error())
			}
			productstatus = "SOLD"

			type ProductSale struct {
				ProductUUID       string
				ProductExternalID string
				PartName          string
				PartNum           string
				ForModels         string
				ManufacturedBy    string
				ManufacturedAt    string
				ManufacturedDate  string
				Sender            string
				Receiver          string
				ReceiverType      string
				Location          string
				Timestamp         string
				CounterFeitStatus string
				CounterFeitDesc   string
				ProductStatus     string
				BlockchainTxid    string
			}

			productEXTData, err2 := stub.GetState(productLedger.HashProductExternalID)
			productEXTDataLedger := ProductEXT{}
			err2 = json.Unmarshal(productEXTData, &productEXTDataLedger)
			if err2 != nil {
				return shim.Error(err2.Error())
			}
			SenderName = productEXTDataLedger.Receiver

			if counterfeitStatus == "TRUE" {
				counterfeitDesc = "Duplicate product " + productLedger.ProductUUID + " sold by " + SenderName + ". This product was already " + productstatus
			} else {
				counterfeitDesc = "-NA-"
			}

			//Response structure
			productsale := &ProductSale{productSaleDataLedger.HashProductUUID, productSaleDataLedger.ProductExternalID, productSaleDataLedger.PartName, productSaleDataLedger.PartNum, productSaleDataLedger.ForModels, productSaleDataLedger.ManufacturedBy, productSaleDataLedger.ManufacturedAt, productSaleDataLedger.ManufacturedDate, SenderName, Receiver, ReceiverType, Location, Timestamp, counterfeitStatus, counterfeitDesc, productstatus, BlockchainTxid}
			producttransferJSONasBytes, err := json.Marshal(productsale)
			if err != nil {
				return shim.Error(err.Error())
			}

			fmt.Println(producttransferJSONasBytes)

			//updating the internal asset
			productINT := &ProductINT{productSaleDataLedger.HashProductUUID, productSaleDataLedger.IDType, productSaleDataLedger.HashProductExternalID, productSaleDataLedger.ProductUUID, productSaleDataLedger.ProductExternalID, productSaleDataLedger.PartName, productSaleDataLedger.PartNum, productSaleDataLedger.ForModels, productSaleDataLedger.ManufacturedBy, productSaleDataLedger.ManufacturedAt, productSaleDataLedger.ManufacturedDate, productstatus, counterfeitStatus, counterfeitDesc, BlockchainTxid}
			ProductINTJSONasBytes, err := json.Marshal(productINT)
			if err != nil {
				return shim.Error(err.Error())
			}
			// Write to ledger
			err = stub.PutState(productSaleDataLedger.HashProductUUID, ProductINTJSONasBytes)
			if err != nil {
				return shim.Error(err.Error())
			}

			//updating external asset
			productEXT := &ProductEXT{productEXTDataLedger.HashProductExternalID, productEXTDataLedger.IDType, productEXTDataLedger.HashProductUUID, productEXTDataLedger.ProductUUID, productEXTDataLedger.ProductExternalID, SenderName, Receiver, ReceiverType, Location, Timestamp, productEXTDataLedger.CounterFeitStatus, productEXTDataLedger.CounterFeitDesc, productEXTDataLedger.BlockchainTxid}
			ProductEXTJSONasBytes, err := json.Marshal(productEXT)
			if err != nil {
				return shim.Error(err.Error())
			}
			// Write to ledger
			err = stub.PutState(productEXTDataLedger.HashProductExternalID, ProductEXTJSONasBytes)
			if err != nil {
				return shim.Error(err.Error())
			}

			return shim.Success(producttransferJSONasBytes)

		}

	}

	return shim.Success(nil)
}

func (t *AutomoitiveChaincode) searchProduct(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("PAN required to query user data")
	}

	QRCode := args[0]
	userData, err := stub.GetState(QRCode)

	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get data for " + QRCode + "\"}"
		return shim.Error(jsonResp)
	} else if userData == nil {
		jsonResp := "{\"Error\":\"User data does not exist for " + QRCode + "\"}"
		return shim.Error(jsonResp)
	}

	userLedger := ProductEXT{}
	err = json.Unmarshal(userData, &userLedger)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(userData)
}

func main() {
	err := shim.Start(new(AutomoitiveChaincode))
	if err != nil {
		fmt.Printf("Error starting LifeInsuranceChaincode : %v \n", err)
	}

}
