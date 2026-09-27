import {formatNumber} from '../lib/persian'
const labels:Record<string,string>={id:'شناسه',from:'از',to:'به',nodes:'گره‌ها',edges:'مسیرها',boundaries:'منابع / مرزها',pressure_pa:'فشار (Pa)',pressure_bar:'فشار (bar)',total_head_m:'هد کل (m)',discharge_lpm:'مصرف (L/min)',flow_lpm:'دبی (L/min)',flow_m3_s:'دبی (m³/s)',head_loss_m:'افت هد (m)',driving_pressure_pa:'فشار محرک (Pa)',velocity_mps:'سرعت (m/s)',criteria:'کنترل حدود ورودی',boundary:'مرز ثابت',net_supply:'تأمین خالص (واحد موازنه)',net_demand_m3_s:'خروجی خالص (m³/s)',pass:'در محدوده',fail:'خارج محدوده',not_specified:'تعریف نشده'}
function value(v:unknown):string{return typeof v==='number'?formatNumber(v,5):typeof v==='boolean'?(v?'بله':'خیر'):typeof v==='object'?JSON.stringify(v):labels[String(v)]||String(v??'—')}
export default function EngineeringValues({data}:{data:unknown}){
 if(Array.isArray(data)&&data.every(v=>v&&typeof v==='object'&&!Array.isArray(v))){const keys=[...new Set(data.flatMap(v=>Object.keys(v)))];return <div className="network-table"><table><thead><tr>{keys.map(k=><th key={k}>{labels[k]||k}</th>)}</tr></thead><tbody>{data.map((row,i)=><tr key={i}>{keys.map(k=><td key={k}>{value(row[k])}</td>)}</tr>)}</tbody></table></div>}
 if(data&&typeof data==='object')return <dl className="engineering-values">{Object.entries(data).map(([k,v])=><div key={k}><dt>{labels[k]||k}</dt><dd>{typeof v==='object'?<EngineeringValues data={v}/>:value(v)}</dd></div>)}</dl>
 return <span>{value(data)}</span>
}
