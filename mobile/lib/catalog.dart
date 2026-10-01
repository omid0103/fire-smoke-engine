class InputField {
  final String key, label, unit, value;
  final bool text, optional;
  final List<String> choices;
  const InputField(this.key, this.label, this.unit, this.value,
      {this.text = false, this.optional = false, this.choices = const []});
}
class Model {
  final String key, title;
  final List<InputField> fields;
  final Map<String,List<InputField>> collections;
  const Model(this.key,this.title,this.fields,{this.collections=const {}});
}
String latinDigits(String value) {
  const fa='۰۱۲۳۴۵۶۷۸۹', ar='٠١٢٣٤٥٦٧٨٩';
  for(var i=0;i<10;i++){value=value.replaceAll(fa[i],'$i').replaceAll(ar[i],'$i');}
  return value.replaceAll('٫','.');
}
String normalizePhone(String value){
 var v=latinDigits(value).replaceAll(RegExp(r'[\s()\-]'),'');
 if(v.startsWith('0098'))v='+${v.substring(2)}';
 if(RegExp(r'^09\d{9}$').hasMatch(v))v='+98${v.substring(1)}';
 if(RegExp(r'^989\d{9}$').hasMatch(v))v='+$v';
 if(!RegExp(r'^\+989\d{9}$').hasMatch(v))throw const FormatException('شماره موبایل معتبر نیست.');
 return v;
}
dynamic parseField(InputField f,String value){
 if(f.optional&&value.trim().isEmpty)return null;
 if(f.text){if(value.trim().isEmpty)throw FormatException('${f.label} الزامی است.');return value.trim();}
 final n=num.tryParse(latinDigits(value).trim());
 if(n==null||!n.isFinite)throw FormatException('${f.label}: عدد معتبر وارد کنید.');
 return n;
}
const models=<Model>[
 Model('parking_smoke_group','کنترل دود پارکینگ',[
 InputField('fire_scenario','سناریوی حریق','','single_zone',text:true,choices:['single_zone','all_zones']),
 InputField('makeup_percent','هوای جبرانی','%','60'),InputField('shaft_velocity_mps','سرعت شفت','m/s','10'),InputField('damper_velocity_mps','سرعت دمپر','m/s','10')],collections:{'zones':[
 InputField('area_m2','مساحت','m²','600'),InputField('height_m','ارتفاع','m','2.8'),InputField('normal_ach','تعویض هوای عادی','1/h','6'),InputField('fire_ach','تعویض هوای حریق','1/h','10')]}),
 Model('duct_velocity','سرعت کانال',[InputField('flow_cfm','دبی','CFM','12000'),InputField('width_mm','عرض','mm','1000'),InputField('height_mm','ارتفاع','mm','500')]),
 Model('hazen_williams','افت فشار لوله',[InputField('flow_lpm','دبی','L/min','1500'),InputField('length_m','طول معادل','m','30'),InputField('diameter_mm','قطر داخلی','mm','80'),InputField('c_factor','ضریب هیزن ویلیامز','','120')]),
 Model('fire_pump','پمپ آتش‌نشانی',[InputField('flow_lpm','دبی','L/min','1500'),InputField('elevation_m','اختلاف ارتفاع','m','30'),InputField('residual_pressure_bar','فشار باقیمانده','bar','4.5'),InputField('friction_head_m','افت اصطکاک','m','12'),InputField('safety_percent','حاشیه طراحی','%','5'),InputField('efficiency_percent','بازده','%','70')]),
 Model('sprinkler_preliminary','برآورد اولیه اسپرینکلر',[InputField('density_lpm_m2','چگالی پاشش','L/min/m²','8.1'),InputField('design_area_m2','مساحت طراحی','m²','139'),InputField('coverage_per_sprinkler_m2','پوشش هر اسپرینکلر','m²','12'),InputField('k_metric','ضریب K متریک','','57.276'),InputField('hose_allowance_lpm','مصرف شیلنگ','L/min','0'),InputField('duration_min','مدت تأمین','min','90'),InputField('active_sprinkler_count','تعداد اسپرینکلر فعال اختیاری','','',optional:true)]),
 Model('npsha','هد خالص مکش',[InputField('atmospheric_pressure_kpa','فشار جو','kPa','101.325'),InputField('vapor_pressure_kpa','فشار بخار','kPa','2.34'),InputField('density_kg_m3','چگالی','kg/m³','1000'),InputField('static_suction_head_m','هد استاتیک مکش','m','2'),InputField('suction_loss_m','افت مکش','m','1')]),
 Model('atrium_axisymmetric','دود آتریوم ـ ستون متقارن',[InputField('hrr_kw','توان حریق','kW','4000'),InputField('convective_fraction','سهم جابجایی','0–1','0.7'),InputField('layer_height_m','ارتفاع لایه از آتش','m','12'),InputField('ambient_c','دمای محیط','°C','30'),InputField('pressure_pa','فشار مطلق','Pa','101300'),InputField('heat_fraction','سهم گرمای باقی‌مانده','0–1','1')]),
 Model('pressurization_single_zone','فشار مثبت یک ناحیه',[InputField('pressure_pa','فشار هدف','Pa','50'),InputField('leakage_area_m2','سطح نشت بسته','m²','0.1'),InputField('discharge_coefficient','ضریب تخلیه','','0.65'),InputField('density_kg_m3','چگالی هوا','kg/m³','1.2'),InputField('open_door_area_m2','سطح در باز','m²','2'),InputField('open_door_velocity_mps','سرعت در باز','m/s','1'),InputField('margin_percent','حاشیه دبی','%','10'),InputField('door_width_m','عرض در','m','1'),InputField('door_height_m','ارتفاع در','m','2.1'),InputField('handle_arm_m','بازوی دستگیره','m','0.9'),InputField('closer_force_n','نیروی آرام‌بند','N','30')]),
 Model('fire_alarm_battery','باتری اعلام حریق',[InputField('standby_current_a','جریان آماده‌باش','A','0.5'),InputField('standby_hours','مدت آماده‌باش','h','24'),InputField('alarm_current_a','جریان آلارم','A','2'),InputField('alarm_hours','مدت آلارم','h','0.5'),InputField('margin_percent','حاشیه ظرفیت','%','25')]),
 Model('voltage_drop','افت ولتاژ',[InputField('one_way_length_m','طول یک‌طرفه','m','100'),InputField('current_a','جریان','A','1'),InputField('cable_area_mm2','سطح مقطع','mm²','1.5'),InputField('resistivity_ohm_mm2_m','مقاومت ویژه','Ω mm²/m','0.0175'),InputField('nominal_voltage_v','ولتاژ نامی','V','24')]),
 Model('fire_alarm_preliminary','برآورد اولیه آشکارساز',[InputField('floor_area_m2','مساحت','m²','100'),InputField('detector_type','نوع آشکارساز','','smoke',text:true,choices:['smoke','heat']),InputField('ceiling_height_m','ارتفاع سقف','m','3')]),
 Model('hydraulic_network','شبکه هیدرولیک',[InputField('design_basis','مرجع، ویرایش و سناریوی طراحی','','',text:true)],collections:{'nodes':[
 InputField('id','شناسه گره','','',text:true),InputField('fixed','هد کل ثابت؛ خالی یعنی مجهول','m','',optional:true),InputField('elevation_m','تراز','m','0'),InputField('demand','مصرف ثابت','L/min','0'),InputField('k_metric','ضریب K','','0'),InputField('min','حداقل فشار','bar','',optional:true),InputField('max','حداکثر فشار','bar','',optional:true)],'edges':[
 InputField('id','شناسه مسیر','','',text:true),InputField('from','از گره','','',text:true),InputField('to','به گره','','',text:true),InputField('length_m','طول','m','30'),InputField('diameter_mm','قطر داخلی','mm','65'),InputField('c_factor','ضریب هیزن','','120')]}),
 Model('airflow_network','شبکه فشار مثبت',[InputField('design_basis','مرجع، ویرایش و سناریوی طراحی','','',text:true)],collections:{'nodes':[
 InputField('id','شناسه گره','','',text:true),InputField('fixed','فشار ثابت؛ خالی یعنی مجهول','Pa','',optional:true),InputField('demand','خروجی؛ تزریق منفی','m³/s','0'),InputField('min','حداقل فشار','Pa','',optional:true),InputField('max','حداکثر فشار','Pa','',optional:true)],'edges':[
 InputField('id','شناسه مسیر','','',text:true),InputField('from','از گره','','',text:true),InputField('to','به گره','','',text:true),InputField('coefficient','ضریب مسیر','m³/s/Paⁿ','0.085'),InputField('exponent','توان','','0.5'),InputField('offset_pa','فشار محرک','Pa','0')]}),
];
