function iso(d){return d.toISOString().slice(0,10)}
export function addDays(date,days){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return iso(d)}
export function generatePaydays(nextPayday,frequency,horizonEnd){
  const gap={weekly:7,biweekly:14,monthly:0}[frequency];
  if(gap===undefined)throw Error("Unsupported pay frequency.");
  const out=[];let d=new Date(nextPayday+"T12:00:00"),end=new Date(horizonEnd+"T12:00:00");
  const monthlyDay=d.getDate();
  while(d<=end){
    out.push(iso(d));
    if(gap)d.setDate(d.getDate()+gap);
    else{
      const y=d.getFullYear(),m=d.getMonth()+1,last=new Date(y,m+1,0,12).getDate();
      d=new Date(y,m,Math.min(monthlyDay,last),12);
    }
  }
  return out;
}
export function monthlyBillDates(startDate,endDate,day){
  day=Number(day);if(!Number.isInteger(day)||day<1||day>31)throw Error("Bill day must be between 1 and 31.");
  const start=new Date(startDate+"T12:00:00"),end=new Date(endDate+"T12:00:00"),out=[];
  let d=new Date(start.getFullYear(),start.getMonth(),1,12);
  while(d<=end){
    const last=new Date(d.getFullYear(),d.getMonth()+1,0,12).getDate();
    const occ=new Date(d.getFullYear(),d.getMonth(),Math.min(day,last),12);
    if(occ>=start&&occ<=end)out.push(iso(occ));
    d.setMonth(d.getMonth()+1);
  }
  return out;
}
export function projectCashflow({startDate,horizonEnd,startingBalance,nextPayday,payAmount,frequency,bills=[]}){
  let balance=Number(startingBalance),minimum=balance;
  if(!Number.isFinite(balance))throw Error("Starting balance is required.");
  payAmount=Number(payAmount);if(!Number.isFinite(payAmount)||payAmount<0)throw Error("Pay amount must be zero or more.");
  const events=[];
  for(const date of generatePaydays(nextPayday,frequency,horizonEnd))events.push({date,type:"income",label:"Payday",amount:payAmount});
  for(const bill of bills){const amount=Number(bill.amount);if(!Number.isFinite(amount)||amount<0)throw Error("Bill amounts must be zero or more.");for(const date of monthlyBillDates(startDate,horizonEnd,bill.day))events.push({date,type:"bill",label:bill.name||"Bill",amount:-amount});}
  events.sort((a,b)=>a.date.localeCompare(b.date)||((a.type==="income"?0:1)-(b.type==="income"?0:1)));
  const timeline=[];for(const e of events){balance+=e.amount;minimum=Math.min(minimum,balance);timeline.push({...e,balance});}
  const beforePay=events.filter(e=>e.date<nextPayday&&e.type==="bill").reduce((s,e)=>s+Math.abs(e.amount),0);
  return{endingBalance:balance,minimumBalance:minimum,safeToSpend:Math.max(0,Number(startingBalance)-beforePay),timeline};
}
