package main

import (
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"sort"
	"strings"
	"time"
)

type Contract struct{ contractapi.Contract }
type Member struct {
	ID     string `json:"id"`
	MSP    string `json:"mspId"`
	Active bool   `json:"active"`
}
type Evidence struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Hash       string `json:"hash"`
	Size       int64  `json:"size"`
	Mime       string `json:"mime"`
	UploadedBy string `json:"uploadedBy"`
	CreatedAt  string `json:"createdAt"`
}
type Identifier struct {
	Label  string `json:"label"`
	Hash   string `json:"hash"`
	Masked string `json:"masked"`
}
type Vote struct {
	OrgID    string `json:"orgId"`
	UserID   string `json:"userId"`
	Decision string `json:"decision"`
	Reason   string `json:"reason"`
	Implicit bool   `json:"implicit"`
	At       string `json:"at"`
	TxID     string `json:"txId"`
}
type Round struct {
	ID            string     `json:"id"`
	Stage         string     `json:"stage"`
	ProposerOrgID string     `json:"proposerOrgId"`
	Reason        string     `json:"reason"`
	Status        string     `json:"status"`
	Participants  []string   `json:"participants"`
	Threshold     int        `json:"threshold"`
	Votes         []Vote     `json:"votes"`
	Evidence      []Evidence `json:"evidence"`
	CreatedAt     string     `json:"createdAt"`
}
type Event struct {
	ID     string `json:"id"`
	Action string `json:"action"`
	OrgID  string `json:"orgId"`
	UserID string `json:"userId"`
	At     string `json:"at"`
	TxID   string `json:"txId"`
	Detail string `json:"detail"`
}
type Case struct {
	ProvinceID  string       `json:"provinceId"`
	City        string       `json:"city"`
	ID          string       `json:"id"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	FraudType   string       `json:"fraudType"`
	Amount      float64      `json:"amount"`
	Status      string       `json:"status"`
	OrgID       string       `json:"orgId"`
	CreatedBy   string       `json:"createdBy"`
	CreatedAt   string       `json:"createdAt"`
	UpdatedAt   string       `json:"updatedAt"`
	Identifiers []Identifier `json:"identifiers"`
	Evidence    []Evidence   `json:"evidence"`
	Rounds      []Round      `json:"rounds"`
	Events      []Event      `json:"events"`
}

func put(ctx contractapi.TransactionContextInterface, key string, v interface{}) error {
	b, e := json.Marshal(v)
	if e != nil {
		return e
	}
	return ctx.GetStub().PutState(key, b)
}

func timestamp(ctx contractapi.TransactionContextInterface) string {
	t, _ := ctx.GetStub().GetTxTimestamp()
	return time.Unix(t.Seconds, int64(t.Nanos)).UTC().Format(time.RFC3339)
}

func members(ctx contractapi.TransactionContextInterface) ([]Member, error) {
	b, e := ctx.GetStub().GetState("members")
	if e != nil {
		return nil, e
	}
	var m []Member
	if len(b) > 0 {
		e = json.Unmarshal(b, &m)
	}
	return m, e
}

func identity(ctx contractapi.TransactionContextInterface, write bool) (string, error) {
	msp, e := ctx.GetClientIdentity().GetMSPID()
	if e != nil {
		return "", e
	}
	if msp == "OJKMSP" && !write {
		return "ojk", nil
	}
	ms, e := members(ctx)
	if e != nil {
		return "", e
	}
	for _, m := range ms {
		if m.MSP == msp && m.Active {
			return m.ID, nil
		}
	}
	return "", fmt.Errorf("organisasi tidak aktif atau tidak berwenang")
}

func (c *Contract) Init(ctx contractapi.TransactionContextInterface) error {
	msp, _ := ctx.GetClientIdentity().GetMSPID()
	if msp != "OJKMSP" {
		return fmt.Errorf("hanya regulator")
	}
	existing, _ := ctx.GetStub().GetState("members")
	if len(existing) > 0 {
		return nil
	}
	return put(ctx, "members", []Member{
		{"nusantara", "Org1MSP", true},
		{"sentra", "Org2MSP", true},
		{"arunika", "Org3MSP", true},
	})
}

func (c *Contract) SetMember(ctx contractapi.TransactionContextInterface, id string, msp string, active bool) error {
	caller, _ := ctx.GetClientIdentity().GetMSPID()
	if caller != "OJKMSP" {
		return fmt.Errorf("hanya regulator")
	}
	ms, e := members(ctx)
	if e != nil {
		return e
	}
	for i, m := range ms {
		if m.ID == id {
			ms[i].Active = active
			return put(ctx, "members", ms)
		}
	}
	if strings.TrimSpace(id) == "" || !active || (msp != "Org4MSP" && msp != "Org5MSP") {
		return fmt.Errorf("MSP organisasi belum diprovisikan: %s", msp)
	}
	for _, m := range ms {
		if m.MSP == msp {
			return fmt.Errorf("MSP sudah terdaftar")
		}
	}
	return put(ctx, "members", append(ms, Member{id, msp, true}))
}

func makeRound(ctx contractapi.TransactionContextInterface, org, user, stage, reason string, evidence []Evidence) (Round, error) {
	ms, e := members(ctx)
	if e != nil {
		return Round{}, e
	}
	p := []string{}
	for _, m := range ms {
		if m.Active {
			p = append(p, m.ID)
		}
	}
	sort.Strings(p)
	if len(p) < 3 {
		return Round{}, fmt.Errorf("minimal tiga organisasi aktif untuk membuka putaran")
	}
	id := ctx.GetStub().GetTxID()
	at := timestamp(ctx)
	return Round{
		ID:            id,
		Stage:         stage,
		ProposerOrgID: org,
		Reason:        reason,
		Status:        "PENDING",
		Participants:  p,
		Threshold:     (2*len(p) + 2) / 3,
		Votes:         []Vote{{org, user, "APPROVE", "Dukungan pengaju", true, at, id}},
		Evidence:      evidence,
		CreatedAt:     at,
	}, nil
}

func event(ctx contractapi.TransactionContextInterface, c *Case, action, org, user, detail string) {
	id := ctx.GetStub().GetTxID()
	at := timestamp(ctx)
	c.UpdatedAt = at
	c.Events = append(c.Events, Event{id, action, org, user, at, id, detail})
}

func (c *Contract) CreateCase(ctx contractapi.TransactionContextInterface, payload string) (*Case, error) {
	org, e := identity(ctx, true)
	if e != nil {
		return nil, e
	}
	var v Case
	if e = json.Unmarshal([]byte(payload), &v); e != nil {
		return nil, e
	}
	if len(strings.TrimSpace(v.Title)) < 5 || len(strings.TrimSpace(v.Description)) < 20 || len(v.Evidence) == 0 || len(v.Identifiers) == 0 || v.Amount < 0 {
		return nil, fmt.Errorf("data kasus/evidence/identifier tidak lengkap")
	}
	if !validProvince(v.ProvinceID) || len(strings.TrimSpace(v.City)) < 3 || len(v.City) > 100 {
		return nil, fmt.Errorf("provinsi dan kabupaten/kota asal kejadian wajib diisi")
	}
	if len(v.Identifiers) > 20 {
		return nil, fmt.Errorf("maksimal 20 identifier")
	}
	if v.ID == "" || len(v.ID) > 80 {
		return nil, fmt.Errorf("ID tidak valid")
	}
	b, _ := ctx.GetStub().GetState("case:" + v.ID)
	if b != nil {
		return nil, fmt.Errorf("kasus sudah ada")
	}
	r, e := makeRound(ctx, org, v.CreatedBy, "CASE_VALIDATION", "Validasi kasus baru", v.Evidence)
	if e != nil {
		return nil, e
	}
	v.OrgID = org
	v.Status = "PENDING"
	v.CreatedAt = timestamp(ctx)
	v.Rounds = []Round{r}
	v.Events = []Event{}
	event(ctx, &v, "CASE_SUBMITTED", org, v.CreatedBy, "Kasus diajukan dengan satu dukungan pengaju")
	e = put(ctx, "case:"+v.ID, v)
	return &v, e
}

func load(ctx contractapi.TransactionContextInterface, id string) (*Case, error) {
	b, e := ctx.GetStub().GetState("case:" + id)
	if e != nil {
		return nil, e
	}
	if b == nil {
		return nil, fmt.Errorf("kasus tidak ditemukan")
	}
	var c Case
	e = json.Unmarshal(b, &c)
	return &c, e
}

func (c *Contract) GetCase(ctx contractapi.TransactionContextInterface, id string) (*Case, error) {
	if _, e := identity(ctx, false); e != nil {
		return nil, e
	}
	return load(ctx, id)
}

func (c *Contract) ListCases(ctx contractapi.TransactionContextInterface) ([]*Case, error) {
	if _, e := identity(ctx, false); e != nil {
		return nil, e
	}
	it, e := ctx.GetStub().GetStateByRange("case:", "case;")
	if e != nil {
		return nil, e
	}
	defer it.Close()
	out := []*Case{}
	for it.HasNext() {
		kv, e := it.Next()
		if e != nil {
			return nil, e
		}
		var c Case
		if e = json.Unmarshal(kv.Value, &c); e != nil {
			return nil, e
		}
		out = append(out, &c)
	}
	return out, nil
}

func (c *Contract) Invalidate(ctx contractapi.TransactionContextInterface, id, user, reason, evidenceJSON string) (*Case, error) {
	org, e := identity(ctx, true)
	if e != nil {
		return nil, e
	}
	v, e := load(ctx, id)
	if e != nil {
		return nil, e
	}
	if v.Status != "APPROVED" {
		return nil, fmt.Errorf("hanya kasus APPROVED dapat diajukan invalidasi")
	}
	for _, r := range v.Rounds {
		if r.Status == "PENDING" {
			return nil, fmt.Errorf("sudah ada putaran aktif")
		}
		if r.Stage == "CASE_INVALIDATION" && r.Reason == reason {
			return nil, fmt.Errorf("gunakan alasan dan bukti baru")
		}
	}
	var evidence []Evidence
	if e = json.Unmarshal([]byte(evidenceJSON), &evidence); e != nil {
		return nil, e
	}
	if len(strings.TrimSpace(reason)) < 20 || len(evidence) == 0 {
		return nil, fmt.Errorf("alasan dan evidence baru wajib")
	}
	r, e := makeRound(ctx, org, user, "CASE_INVALIDATION", reason, evidence)
	if e != nil {
		return nil, e
	}
	v.Rounds = append(v.Rounds, r)
	event(ctx, v, "INVALIDATION_REQUESTED", org, user, reason)
	e = put(ctx, "case:"+id, v)
	return v, e
}

func (c *Contract) CastVote(ctx contractapi.TransactionContextInterface, id, roundID, user, decision, reason string) (*Case, error) {
	org, e := identity(ctx, true)
	if e != nil {
		return nil, e
	}
	v, e := load(ctx, id)
	if e != nil {
		return nil, e
	}
	if decision != "APPROVE" && decision != "REJECT" {
		return nil, fmt.Errorf("keputusan tidak valid")
	}
	if len(strings.TrimSpace(reason)) < 10 {
		return nil, fmt.Errorf("alasan minimal 10 karakter")
	}
	ri := -1
	for i, r := range v.Rounds {
		if r.ID == roundID {
			ri = i
		}
	}
	if ri < 0 {
		return nil, fmt.Errorf("putaran tidak ditemukan")
	}
	r := &v.Rounds[ri]
	if r.Status != "PENDING" {
		return nil, fmt.Errorf("putaran sudah final")
	}
	eligible := false
	for _, p := range r.Participants {
		if p == org {
			eligible = true
		}
	}
	if !eligible {
		return nil, fmt.Errorf("organisasi tidak terdaftar dalam snapshot")
	}
	for _, vote := range r.Votes {
		if vote.OrgID == org {
			return nil, fmt.Errorf("organisasi sudah memberikan dukungan/vote")
		}
	}
	r.Votes = append(r.Votes, Vote{org, user, decision, reason, false, timestamp(ctx), ctx.GetStub().GetTxID()})
	a, b := 0, 0
	for _, vote := range r.Votes {
		if vote.Decision == "APPROVE" {
			a++
		} else {
			b++
		}
	}
	if a >= r.Threshold {
		r.Status = "APPROVED"
		if r.Stage == "CASE_VALIDATION" {
			v.Status = "APPROVED"
		} else {
			v.Status = "INVALID"
		}
	} else if b >= r.Threshold {
		r.Status = "REJECTED"
		if r.Stage == "CASE_VALIDATION" {
			v.Status = "REJECTED"
		}
	}
	event(ctx, v, "VOTE_RECORDED", org, user, decision+": "+reason)
	if r.Status != "PENDING" {
		event(ctx, v, "ROUND_FINALIZED", org, user, r.Stage+" â†’ "+r.Status+"; kasus "+v.Status)
	}
	e = put(ctx, "case:"+id, v)
	return v, e
}

func validProvince(id string) bool {
	for _, v := range strings.Fields("11 12 13 14 15 16 17 18 19 21 31 32 33 34 35 36 51 52 53 61 62 63 64 65 71 72 73 74 75 76 81 82 91 92 94 95 96 97") {
		if id == v {
			return true
		}
	}
	return false
}

func main() {
	cc, e := contractapi.NewChaincode(&Contract{})
	if e != nil {
		panic(e)
	}
	if e = cc.Start(); e != nil {
		panic(e)
	}
}
