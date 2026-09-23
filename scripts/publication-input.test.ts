import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePublicationDetails } from "../src/lib/publication-input";

const valid={title:"Departamento en alquiler",type:"Monoambiente",zone:"Centro",address:"Dirección referencial",bedrooms:"1",bathrooms:"",area:"",garage:"0",pets:false,furnished:true,security:true,pool:false,patio:false,grill:false,elevator:true,price:"350",currency:"USD",exchangeRate:"8.5",commonExpenses:"0",guarantee:"Otro monto",guaranteeAmount:"200",description:"Monoambiente equipado con cocina y lavandería para alquiler directo."};
test("publication schema preserves unknown fields, currency and explicit zero values",()=>{
  const result=parsePublicationDetails(valid);assert.ok(result);assert.equal(result.bathrooms,null);assert.equal(result.area,null);assert.equal(result.commonExpenses,0);assert.equal(result.garage,0);assert.equal(result.exchangeRate,8.5);assert.equal(result.guaranteeAmount,200);
});
test("publication schema rejects malformed costs, coordinates-independent facts and boolean spoofing",()=>{
  for(const patch of [{price:-1},{price:"Infinity"},{exchangeRate:0},{commonExpenses:-2},{bedrooms:1.5},{garage:"unknown"},{pets:"true"},{type:"Terreno"},{guaranteeAmount:""},{description:"short"}]) assert.equal(parsePublicationDetails({...valid,...patch}),null,JSON.stringify(patch));
});
