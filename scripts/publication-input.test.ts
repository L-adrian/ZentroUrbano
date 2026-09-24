import assert from "node:assert/strict";
import { test } from "node:test";
import { getPublicationContactErrors, getPublicationStepErrors, normalizePublicationPhone, parsePublicationDetails, publicationFieldStep, validatePublicationDetails } from "../src/lib/publication-input";
import { getOwnerListingSuggestions } from "../src/lib/owner-listing-suggestions";
import { directRentalDemoProperties } from "../src/lib/direct-rental-demo";

const valid={title:"Departamento en alquiler",type:"Monoambiente",zone:"Centro",address:"Dirección referencial",bedrooms:"1",bathrooms:"",area:"",garage:"0",pets:false,furnished:true,security:true,pool:false,patio:false,grill:false,elevator:true,price:"350",currency:"USD",exchangeRate:"8.5",commonExpenses:"0",guarantee:"Otro monto",guaranteeAmount:"200",description:"Monoambiente equipado con cocina y lavandería para alquiler directo."};
test("publication schema preserves unknown fields, currency and explicit zero values",()=>{
  const result=parsePublicationDetails(valid);assert.ok(result);assert.equal(result.bathrooms,null);assert.equal(result.area,null);assert.equal(result.commonExpenses,0);assert.equal(result.garage,0);assert.equal(result.exchangeRate,8.5);assert.equal(result.guaranteeAmount,200);
});
test("confirmed pet restrictions differ from unknown information",()=>{
  assert.equal(parsePublicationDetails({...valid,petsPolicy:"not_allowed"})?.petsPolicy,"not_allowed");
  assert.equal(parsePublicationDetails(valid)?.petsPolicy,undefined);
  assert.equal(parsePublicationDetails({...valid,petsPolicy:"made-up"}),null);
});
test("owner suggestions count unique photos and disappear when missing information is completed",()=>{
  const details=parsePublicationDetails({...valid,petsPolicy:"consult",guarantee:"Consultar con el propietario"})!;
  const property={...directRentalDemoProperties[0],images:["/a.jpg","/b.jpg","/c.jpg"],area:0,bathrooms:0,pets:false,rentalDetails:details};
  const tips=getOwnerListingSuggestions(property);
  assert.equal(tips.length,5);assert.match(tips[0],/Tienes 3 fotos.*Añade 2 más/);
  assert.equal(getOwnerListingSuggestions({...property,images:[...property.images,"/a.jpg"]})[0],tips[0]);
  assert.deepEqual(getOwnerListingSuggestions({...property,images:["/a.jpg","/b.jpg","/c.jpg","/d.jpg","/e.jpg"],area:40,bathrooms:1,rentalDetails:{...details,guarantee:"1 mes de alquiler",petsPolicy:"not_allowed"}}),[]);
});
test("publication schema rejects malformed costs, coordinates-independent facts and boolean spoofing",()=>{
  for(const patch of [{price:-1},{price:"Infinity"},{exchangeRate:0},{commonExpenses:-2},{bedrooms:1.5},{garage:"unknown"},{pets:"true"},{type:"Terreno"},{guaranteeAmount:""},{description:"short"}]) assert.equal(parsePublicationDetails({...valid,...patch}),null,JSON.stringify(patch));
});

test("empty expenses report the actual field instead of blaming a valid WhatsApp", () => {
  for (const commonExpenses of ["", "   ", null, undefined]) {
    const input = { ...valid, commonExpenses };
    const result = validatePublicationDetails(input);
    assert.equal(result.details, null);
    assert.deepEqual(Object.keys(result.fieldErrors), ["commonExpenses"]);
    assert.match(result.fieldErrors.commonExpenses!, /Escribe 0/);
    assert.deepEqual(getPublicationContactErrors("Propietario", "+591 78504969"), {});
    assert.deepEqual(getPublicationStepErrors(2, input, "Propietario", "+591 78504969"), result.fieldErrors);
  }
  assert.ok(validatePublicationDetails({ ...valid, commonExpenses: "0" }).details);
});

test("Bolivian WhatsApp formatting is shared by browser and server", () => {
  for (const phone of ["78504969", "59178504969", "+591 78504969", "(+591) 7850-4969", " 78504969 "]) {
    assert.equal(normalizePublicationPhone(phone), "59178504969");
    assert.deepEqual(getPublicationContactErrors("Propietario", phone), {});
  }
  assert.equal(normalizePublicationPhone("61234567"), "59161234567");
  for (const phone of ["", "785049469", "+591 785049469", "28504969", "hola78504969", "78504969 / 71234567", null]) {
    assert.equal(normalizePublicationPhone(phone), null);
    assert.ok(getPublicationContactErrors("Propietario", phone).whatsapp);
  }
});

test("wizard and server agree on invalid details and the step to correct", () => {
  const cases = [{garage:""},{garage:101},{bedrooms:1.5},{area:"25.5"},{title:"x"},{zone:"x".repeat(161)},{description:"short"},{price:"Infinity"},{commonExpenses:-1},{guaranteeAmount:""},{exchangeRate:0}];
  for (const patch of cases) {
    const input = { ...valid, ...patch };
    const {details, fieldErrors} = validatePublicationDetails(input);
    assert.equal(details, null);
    assert.deepEqual({...getPublicationStepErrors(1, input, "Owner", "78504969"), ...getPublicationStepErrors(2, input, "Owner", "78504969")}, fieldErrors);
    for (const key of Object.keys(fieldErrors)) assert.ok([1,2].includes(publicationFieldStep(key)));
  }
  assert.deepEqual(getPublicationStepErrors(2, valid, "Owner", "78504969"), {});
  assert.ok(getPublicationStepErrors(2, valid, "x".repeat(161), "78504969").contactName);
});

test("publication parses grouped amounts and preserves the owner's multiline text", () => {
  const description = "Descripción original\n\n  Cocina equipada\n- Un dormitorio\n- Un baño\nContacto directo.";
  const result = parsePublicationDetails({...valid,price:"3.400",commonExpenses:"250,50",guaranteeAmount:"1.500",description});
  assert.ok(result);
  assert.equal(result.price,3400);
  assert.equal(result.commonExpenses,250.5);
  assert.equal(result.guaranteeAmount,1500);
  assert.equal(result.description,description);
});
