import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'catalog.dart';
import 'parking_design.dart';

class ParkingDesignPage extends StatefulWidget {
  final Map<String,dynamic> calculation;
  final String reference;
  const ParkingDesignPage({super.key,required this.calculation,required this.reference});
  @override State<ParkingDesignPage> createState()=>_ParkingDesignPageState();
}
class _ParkingDesignPageState extends State<ParkingDesignPage>{
  int zone=0;bool confirmed=false,fanAtEnd=false,sharing=false;
  double yaw=-.65,tilt=.65,zoom=1;
  ParkingDesign? design;
  String? error;
  final fields=<String,TextEditingController>{};
  static const labels={
    'length':'طول زون در راستای X (متر)', 'width':'عرض زون در راستای Y (متر)',
    'depth':'ارتفاع مقطع کانال (متر)','bottom':'ارتفاع زیر کانال از کف (متر)',
    'clearance':'حداقل ارتفاع آزاد موردنیاز پروژه (متر)',
    'velocity':'سرعت مبنای سایزینگ کانال (متر بر ثانیه)',
    'exhaustY':'فاصله محور کانال تخلیه از ضلع Y=0 (متر)',
    'supplyY':'فاصله محور کانال جبرانی از ضلع Y=0 (متر)',
    'outlets':'تعداد دریچه در هر مسیر (۲ تا ۴۰)',
  };
  List get zones=>(widget.calculation['zones'] as List?)??[];
  Map get selected=>zones[zone] as Map;
  Map get sourceInput=>selected['inputs'] as Map;
  Map get sourceResult=>selected['results'] as Map;
  @override void initState(){super.initState();for(final k in labels.keys){fields[k]=TextEditingController();}}
  @override void dispose(){for(final c in fields.values){c.dispose();}super.dispose();}
  double number(String key){final n=double.tryParse(latinDigits(fields[key]!.text).trim());if(n==null||!n.isFinite)throw FormatException('${labels[key]} را به‌درستی وارد کنید.');return n;}
  double source(Map m,String k){final n=m[k];if(n is! num||!n.isFinite)throw const FormatException('نتیجه محاسبات کامل نیست؛ محاسبه را دوباره انجام دهید.');return n.toDouble();}
  void generate(){
    setState((){design=null;error=null;});
    try{
      if(!confirmed)throw const FormatException('پیش‌نیازهای طرح اولیه را تأیید کنید.');
      final n=number('outlets');if(n!=n.roundToDouble())throw const FormatException('تعداد دریچه باید عدد صحیح باشد.');
      final d=ParkingDesign(length:number('length'),width:number('width'),height:source(sourceInput,'height_m'),area:source(sourceInput,'area_m2'),
        exhaustCfm:source(sourceResult,'design_exhaust_cfm'),supplyCfm:source(sourceResult,'makeup_air_cfm'),
        ductDepth:number('depth'),ductBottom:number('bottom'),velocity:number('velocity'),exhaustY:number('exhaustY'),supplyY:number('supplyY'),minClearance:number('clearance'),outlets:n.toInt(),fanAtEnd:fanAtEnd,reference:'${widget.reference} zone ${zone+1}');
      final errors=d.validate();if(errors.isNotEmpty)throw FormatException(errors.join('\n'));
      setState(()=>design=d);
    }on FormatException catch(e){setState(()=>error=e.message);}
  }
  Future<void> export(BuildContext buttonContext,bool threeD)async{
    final d=design;if(d==null||sharing)return;
    setState(()=>sharing=true);
    try{
      final box=buttonContext.findRenderObject() as RenderBox;
      final name='Rabin-Parking-Z${zone+1}-${threeD?'3D':'2D'}-${DateTime.now().millisecondsSinceEpoch}.dxf';
      await SharePlus.instance.share(ShareParams(files:[XFile.fromData(Uint8List.fromList(utf8.encode(d.dxf(threeD:threeD))),mimeType:'application/dxf')],fileNameOverrides:[name],title:'نقشه اولیه کنترل دود پارکینگ',sharePositionOrigin:box.localToGlobal(Offset.zero)&box.size));
    }catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('خروجی ذخیره نشد؛ دوباره تلاش کنید و مقصد ذخیره یا اشتراک‌گذاری را انتخاب کنید.')));}
    finally{if(mounted)setState(()=>sharing=false);}
  }
  @override Widget build(BuildContext context){
    if(zones.isEmpty)return Scaffold(appBar:AppBar(title:const Text('طراحی اولیه پارکینگ')),body:const Center(child:Text('ابتدا محاسبه کنترل دود پارکینگ را انجام دهید.')));
    return Scaffold(appBar:AppBar(title:const Text('طراحی اولیه کنترل دود')),body:ListView(padding:const EdgeInsets.all(16),children:[
      const Text('۱. انتخاب زون و بررسی مبنای محاسبه',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
      DropdownButtonFormField<int>(initialValue:zone,decoration:const InputDecoration(labelText:'زون'),items:List.generate(zones.length,(i)=>DropdownMenuItem(value:i,child:Text('زون ${i+1}'))),onChanged:(v)=>setState((){zone=v!;design=null;error=null;confirmed=false;for(final c in fields.values){c.clear();}})),
      Text('مساحت: ${sourceInput['area_m2']} m²  |  ارتفاع: ${sourceInput['height_m']} m\nتخلیه زون: ${sourceResult['design_exhaust_cfm']} CFM\nهوای جبرانی زون: ${sourceResult['makeup_air_cfm']} CFM'),
      const Text('دبی این طرح مربوط به زون انتخاب‌شده است، نه فن مشترک همه طبقات.'),
      for(final w in {...?widget.calculation['warnings'] as List?,...?selected['warnings'] as List?}) Padding(padding:const EdgeInsets.only(top:6),child:Text('$w',style:const TextStyle(color:Colors.amber))),
      const Divider(),const Text('۲. اطلاعات لازم برای جانمایی',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
      const Text('مبدأ مختصات گوشه زون است؛ X در راستای طول و Y در راستای عرض. این نسخه دو مسیر مستقیم موازی می‌سازد. ابعاد را از پلان واقعی وارد کنید. مسیرها باید پیش از اجرا از نظر تیر، ستون، رمپ و شفت بازبینی شوند.'),
      ...labels.entries.map((e)=>Padding(padding:const EdgeInsets.only(top:12),child:TextField(key:ValueKey(e.key),controller:fields[e.key],keyboardType:const TextInputType.numberWithOptions(decimal:true),textDirection:TextDirection.ltr,decoration:InputDecoration(labelText:e.value),onChanged:(_)=>setState(()=>design=null)))),
      SwitchListTile(title:const Text('محل اتصال فن‌ها در انتهای طول (X=L)'),subtitle:Text(fanAtEnd?'سمت انتهای طول':'سمت ابتدای طول (X=0)'),value:fanAtEnd,onChanged:(v)=>setState((){fanAtEnd=v;design=null;})),
      CheckboxListTile(value:confirmed,onChanged:(v)=>setState((){confirmed=v??false;design=null;}),title:const Text('ابعاد و محل مسیرها را از اطلاعات پروژه وارد کرده‌ام و خروجی را به‌عنوان شماتیک اولیه بازبینی می‌کنم.')),
      if(error!=null)Text(error!,style:const TextStyle(color:Colors.orangeAccent)),
      FilledButton.icon(onPressed:generate,icon:const Icon(Icons.view_in_ar),label:const Text('ساخت شماتیک سه‌بعدی')),
      if(design!=null)...[
        const SizedBox(height:20),const Text('۳. نمایش سه‌بعدی و خروجی',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
        const Text('قرمز: تخلیه دود  •  آبی: هوای جبرانی\nبرای چرخش، روی مدل بکشید. مقیاس ارتفاع واقعی است.'),
        RepaintBoundary(key:const ValueKey('parking-preview'),child:SizedBox(height:320,child:ClipRect(child:GestureDetector(onPanUpdate:(d)=>setState((){yaw+=d.delta.dx*.01;tilt=(tilt+d.delta.dy*.005).clamp(.15,1.45);}),child:Semantics(label:'شماتیک سه‌بعدی دو مسیر کانال و دریچه‌ها',child:CustomPaint(painter:ParkingPainter(design!,yaw,tilt,zoom),child:const SizedBox.expand())))))),
        Row(children:[const Text('بزرگ‌نمایی'),Expanded(child:Slider(value:zoom,min:.5,max:2,onChanged:(v)=>setState(()=>zoom=v))),TextButton(onPressed:()=>setState((){yaw=-.65;tilt=.65;zoom=1;}),child:const Text('بازنشانی'))]),
        Text('مقطع تخلیه: ${(design!.ductWidth(design!.exhaustCfm)*1000).round()} × ${(design!.ductDepth*1000).round()} میلی‌متر\nمقطع جبرانی: ${(design!.ductWidth(design!.supplyCfm)*1000).round()} × ${(design!.ductDepth*1000).round()} میلی‌متر'),
        ...design!.warnings.map((w)=>Padding(padding:const EdgeInsets.only(top:6),child:Text(w))),
        Builder(builder:(c)=>FilledButton.icon(onPressed:sharing?null:()=>export(c,false),icon:const Icon(Icons.download),label:const Text('ذخیره / اشتراک نقشه دوبعدی DXF'))),
        Builder(builder:(c)=>OutlinedButton.icon(onPressed:sharing?null:()=>export(c,true),icon:const Icon(Icons.download),label:const Text('ذخیره / اشتراک شماتیک سه‌بعدی DXF'))),
        const Text('واحد نقشه متر است. خروجی سه‌بعدی خطی است؛ فایل بومی Revit یا مدل BIM نیست. پس از خروج از صفحه، اطلاعات جانمایی ذخیره نمی‌شود؛ خروجی موردنیاز را دریافت کنید.'),
      ]
    ]));
  }
}

class ParkingPainter extends CustomPainter{
  final ParkingDesign design;final double yaw,tilt,zoom;
  ParkingPainter(this.design,this.yaw,this.tilt,this.zoom);
  @override void paint(Canvas canvas,Size size){
    canvas.drawColor(const Color(0xff161e2b),BlendMode.src);
    final scale=math.min(size.width,size.height)/math.sqrt(design.length*design.length+design.width*design.width+design.height*design.height)*.8*zoom;
    Point3 transform(Point3 p){final x=p.x-design.length/2,y=p.y-design.width/2;final u=x*math.cos(yaw)-y*math.sin(yaw),v=x*math.sin(yaw)+y*math.cos(yaw);return Point3(u,v*math.sin(tilt)-(p.z-design.height/2)*math.cos(tilt),v*math.cos(tilt)+(p.z-design.height/2)*math.sin(tilt));}
    Offset screen(Point3 p){final t=transform(p);return Offset(size.width/2+t.x*scale,size.height/2+t.y*scale);}
    final floor=[const Point3(0,0,0),Point3(design.length,0,0),Point3(design.length,design.width,0),Point3(0,design.width,0)];
    final path=Path()..addPolygon(floor.map(screen).toList(),true);canvas.drawPath(path,Paint()..color=const Color(0xff283246));canvas.drawPath(path,Paint()..style=PaintingStyle.stroke..color=Colors.white38);
    for(final p in floor){canvas.drawLine(screen(p),screen(Point3(p.x,p.y,design.height)),Paint()..color=Colors.white24);}
    final faces=<({List<Point3> points,Color color,double depth})>[];
    for(final b in design.boxes){final p=b.corners;final color=b.layer.startsWith('EXHAUST')?Colors.redAccent:Colors.cyanAccent;for(final indices in [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]){final points=indices.map((i)=>p[i]).toList();faces.add((points:points,color:color,depth:points.map((p)=>transform(p).z).reduce((a,b)=>a+b)/4));}}
    faces.sort((a,b)=>a.depth.compareTo(b.depth));
    for(final f in faces){final p=Path()..addPolygon(f.points.map(screen).toList(),true);canvas.drawPath(p,Paint()..color=f.color.withValues(alpha:.45));canvas.drawPath(p,Paint()..style=PaintingStyle.stroke..strokeWidth=1..color=f.color);}
    void label(String value,Point3 p){final t=TextPainter(text:TextSpan(text:value,style:const TextStyle(color:Colors.white,fontSize:11)),textDirection:TextDirection.ltr)..layout();t.paint(canvas,screen(p));}
    label('X ${design.length} m',Point3(design.length,0,0));label('Y ${design.width} m',Point3(0,design.width,0));label('0',const Point3(0,0,0));
    for(final b in design.boxes.where((b)=>!b.id.endsWith('DUCT'))){label(b.id,Point3(b.min.x,b.min.y,b.max.z+.1));}
  }
  @override bool shouldRepaint(covariant ParkingPainter old)=>old.design!=design||old.yaw!=yaw||old.tilt!=tilt||old.zoom!=zoom;
}
