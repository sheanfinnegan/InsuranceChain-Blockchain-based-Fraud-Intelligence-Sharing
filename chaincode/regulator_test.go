package main

import (
	"crypto/x509"
	"encoding/json"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"testing"
)

type testIdentity struct{ msp string }

func (i *testIdentity) GetID() (string, error)                         { return "test-admin", nil }
func (i *testIdentity) GetMSPID() (string, error)                      { return i.msp, nil }
func (i *testIdentity) GetAttributeValue(string) (string, bool, error) { return "", false, nil }
func (i *testIdentity) AssertAttributeValue(string, string) error      { return nil }
func (i *testIdentity) GetX509Certificate() (*x509.Certificate, error) { return nil, nil }
func regulatorContext() (*contractapi.TransactionContext, *shimtest.MockStub) {
	ctx := new(contractapi.TransactionContext)
	stub := shimtest.NewMockStub("insurance", nil)
	ctx.SetStub(stub)
	ctx.SetClientIdentity(&testIdentity{"OJKMSP"})
	stub.MockTransactionStart("regulator-test")
	return ctx, stub
}
func TestRegulatorPeerDoesNotBecomeBusinessVoter(t *testing.T) {
	ctx, stub := regulatorContext()
	defer stub.MockTransactionEnd("regulator-test")
	c := new(Contract)
	if err := c.Init(ctx); err != nil {
		t.Fatal(err)
	}
	for _, m := range []Member{{"cakrawala", "Org4MSP", true}, {"pradana", "Org5MSP", true}} {
		if err := c.SetMember(ctx, m.ID, m.MSP, true); err != nil {
			t.Fatal(err)
		}
	}
	r, err := makeRound(ctx, "nusantara", "analyst", "CASE_VALIDATION", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Participants) != 5 || r.Threshold != 4 {
		t.Fatalf("expected N=5 T=4, got %v", r)
	}
	if err := c.SetMember(ctx, "ojk", "OJKMSP", true); err == nil {
		t.Fatal("OJK added as insurer")
	}
	if _, err := c.CreateCase(ctx, "{}"); err == nil {
		t.Fatal("OJK may not submit business case")
	}
	if _, err := c.CastVote(ctx, "missing", "round", "regulator", "APPROVE", "must be refused"); err == nil {
		t.Fatal("OJK may not vote")
	}
	if _, err := c.Invalidate(ctx, "missing", "regulator", "must be refused", "[]"); err == nil {
		t.Fatal("OJK may not invalidate")
	}
	if _, err := c.ListCases(ctx); err != nil {
		t.Fatal("OJK must read", err)
	}
	if err := c.SetMember(ctx, "nusantara", "Org1MSP", false); err != nil {
		t.Fatal(err)
	}
	r2, err := makeRound(ctx, "sentra", "analyst", "CASE_INVALIDATION", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(r2.Participants) != 4 || r2.Threshold != 3 {
		t.Fatal("active insurer threshold wrong")
	}
	if len(r.Participants) != 5 || r.Threshold != 4 {
		t.Fatal("old round changed")
	}
	ctx.SetClientIdentity(&testIdentity{"Org2MSP"})
	if err := c.SetMember(ctx, "nusantara", "Org1MSP", true); err == nil {
		t.Fatal("insurer may not govern")
	}
	raw, _ := stub.GetState("members")
	var ms []Member
	if err := json.Unmarshal(raw, &ms); err != nil {
		t.Fatal(err)
	}
	for _, m := range ms {
		if m.MSP == "OJKMSP" {
			t.Fatal("regulator is a business voter")
		}
	}
}
