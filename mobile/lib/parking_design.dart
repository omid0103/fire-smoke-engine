import 'dart:math' as math;

class Point3 {
  final double x, y, z;
  const Point3(this.x, this.y, this.z);
}
class DesignBox {
  final String id, layer;
  final Point3 min, max;
  final double flowCfm;
  const DesignBox(this.id, this.layer, this.min, this.max, this.flowCfm);
  List<Point3> get corners => [
    Point3(min.x,min.y,min.z),Point3(max.x,min.y,min.z),
    Point3(max.x,max.y,min.z),Point3(min.x,max.y,min.z),
    Point3(min.x,min.y,max.z),Point3(max.x,min.y,max.z),
    Point3(max.x,max.y,max.z),Point3(min.x,max.y,max.z),
  ];
  static const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
}
class ParkingDesign {
  final double length,width,height,area,exhaustCfm,supplyCfm,ductDepth,ductBottom,velocity,exhaustY,supplyY,minClearance;
  final int outlets;
  final bool fanAtEnd;
  final String reference;
  ParkingDesign({required this.length,required this.width,required this.height,required this.area,
    required this.exhaustCfm,required this.supplyCfm,required this.ductDepth,required this.ductBottom,
    required this.velocity,required this.exhaustY,required this.supplyY,required this.minClearance,
    required this.outlets,required this.fanAtEnd,required this.reference});
  double ductWidth(double cfm) => (cfm / 2118.880003 / velocity / ductDepth / .05).ceil() * .05;
  List<String> validate() {
    final errors=<String>[];
    final numbers=[length,width,height,area,exhaustCfm,supplyCfm,ductDepth,ductBottom,velocity,exhaustY,supplyY,minClearance];
    if(numbers.any((v)=>!v.isFinite)) return ['ورودی نامتناهی یا نامعتبر است.'];
    if(length<3||length>300||width<3||width>300||height<=0||height>20||area<=0||exhaustCfm<=0||exhaustCfm>1e7||supplyCfm<0||supplyCfm>1e7||ductDepth<.05||ductDepth>2||velocity<.1||velocity>30||minClearance<0) return ['ابعاد، دبی یا سرعت خارج از محدوده پشتیبانی است.'];
    if((length*width-area).abs()>math.max(.1,area*.01)) errors.add('مساحت طول × عرض با مساحت زون محاسبه‌شده بیش از ۱٪ اختلاف دارد. محاسبه یا ابعاد را اصلاح کنید.');
    if(ductBottom<minClearance||ductBottom+ductDepth>height) errors.add('ارتفاع زیر کانال باید از ارتفاع آزاد موردنیاز کمتر نباشد و بالای کانال از سقف عبور نکند.');
    if(outlets<2||outlets>40) errors.add('تعداد دریچه هر مسیر باید بین ۲ و ۴۰ باشد.');
    if(outlets>=2&&(length-1.2)/outlets<.35) errors.add('طول مسیر برای نمایش جداگانه این تعداد دریچه کافی نیست.');
    for(final p in [[exhaustY,ductWidth(exhaustCfm)],[supplyY,ductWidth(supplyCfm)]]) {
      if(p[1]>0 && (p[0]-p[1]/2<.2||p[0]+p[1]/2>width-.2)) errors.add('کانال با عرض محاسبه‌شده در محدوده پارکینگ جا نمی‌گیرد؛ محل، ارتفاع مقطع یا سرعت را بازبینی کنید.');
    }
    if(supplyCfm>0&&(exhaustY-supplyY).abs()<(ductWidth(exhaustCfm)+ductWidth(supplyCfm))/2+.2) errors.add('دو مسیر کانال با یکدیگر تداخل دارند.');
    return errors.toSet().toList();
  }
  List<String> get warnings => [
    'طرح اولیهٔ زون مستطیلی؛ موانع، تیرها، رمپ، شفت واقعی، افت فشار، پرتاب دریچه و عملکرد دود بررسی نشده‌اند.',
    'توزیع دبی بین دریچه‌ها مساوی فرض شده؛ اندازه نهایی دریچه و بالانس شبکه تعیین نشده است.',
    'فن در تصویر نماد محل اتصال است؛ ابعاد، فشار و رده دمایی آن انتخاب نشده است.',
    'مقطع کانال ثابت و بر مبنای دبی کل است؛ ابعاد بر حسب متر و دبی بر حسب CFM است.',
    if(supplyCfm==0) 'هوای جبرانی کانالی صفر است؛ مسیر تأمین هوای جبرانی باید جداگانه تعیین شود.',
    if(velocity>12) 'سرعت انتخابی بیشتر از ۱۲ متر بر ثانیه است؛ مبنای طراحی را بازبینی کنید.',
  ];
  List<DesignBox> get boxes {
    final errors=validate();if(errors.isNotEmpty)throw FormatException(errors.join('\n'));
    final items=<DesignBox>[];
    for(final exhaust in [true,false]){
      final q=exhaust?exhaustCfm:supplyCfm;if(q==0)continue;
      final y=exhaust?exhaustY:supplyY,w=ductWidth(q),layer=exhaust?'EXHAUST':'SUPPLY',tag=exhaust?'E':'S';
      items.add(DesignBox('$tag-DUCT',layer,Point3(.3,y-w/2,ductBottom),Point3(length-.3,y+w/2,ductBottom+ductDepth),q));
      for(var i=0;i<outlets;i++){
        final x=.6+(length-1.2)*(i+.5)/outlets;
        items.add(DesignBox('$tag${i+1}','${layer}_OUTLET',Point3(x-.15,y-.15,ductBottom),Point3(x+.15,y+.15,ductBottom+.03),q/outlets));
      }
      final x=fanAtEnd?length-.3:.3;
      items.add(DesignBox('$tag-FAN','${layer}_FAN',Point3(x-.2,y-.2,ductBottom),Point3(x+.2,y+.2,ductBottom+ductDepth),q));
    }
    return items;
  }
  String dxf({bool threeD=false}){
    final geometry=boxes;
    final b=StringBuffer();void pair(int code,Object value){b.writeln(code);b.writeln(value);}
    void point(int base,Point3 p){pair(base,p.x);pair(base+10,p.y);pair(base+20,threeD?p.z:0.0);}
    void line(String layer,Point3 a,Point3 z){pair(0,'LINE');pair(100,'AcDbEntity');pair(8,layer);pair(100,'AcDbLine');point(10,a);point(11,z);}
    void text(String s,double x,double y){pair(0,'TEXT');pair(100,'AcDbEntity');pair(8,'NOTES');pair(100,'AcDbText');point(10,Point3(x,y,0));pair(40,.25);pair(1,s.replaceAll(RegExp(r'[\r\n]'),' ').replaceAll(RegExp(r'[^\x20-\x7E]'),'?'));}
    pair(0,'SECTION');pair(2,'HEADER');pair(9,r'$ACADVER');pair(1,'AC1015');pair(9,r'$INSUNITS');pair(70,6);pair(0,'ENDSEC');
    pair(0,'SECTION');pair(2,'TABLES');pair(0,'TABLE');pair(2,'LAYER');pair(70,8);
    for(final e in {'BOUNDARY':8,'EXHAUST':1,'SUPPLY':4,'EXHAUST_OUTLET':1,'SUPPLY_OUTLET':4,'EXHAUST_FAN':1,'SUPPLY_FAN':4,'NOTES':7}.entries){pair(0,'LAYER');pair(100,'AcDbSymbolTableRecord');pair(100,'AcDbLayerTableRecord');pair(2,e.key);pair(70,0);pair(62,e.value);pair(6,'CONTINUOUS');}
    pair(0,'ENDTAB');pair(0,'ENDSEC');pair(0,'SECTION');pair(2,'ENTITIES');
    final room=DesignBox('ZONE','BOUNDARY',const Point3(0,0,0),Point3(length,width,height),0);
    for(final box in [room,...geometry]){final p=box.corners;for(final e in DesignBox.edges.take(threeD?12:4)){line(box.layer,p[e[0]],p[e[1]]);}}
    text('RABIN AZAR - PRELIMINARY SMOKE CONTROL - NOT FOR CONSTRUCTION',0,-1);
    text('Units: meters; flow: CFM. L=$length W=$width H=$height; equal outlet flow assumed.',0,-1.5);
    text('Source: $reference',0,-2);
    text('No obstacle/clash review, pressure loss, grille throw, balancing or fire performance verification.',0,-2.5);
    text('Fan and outlet symbols are schematic. Outlet sizes are NOT equipment selections.',0,-3);
    text('Duct bottom=$ductBottom m; depth=$ductDepth m; design velocity=$velocity m/s',0,-3.5);
    var row=4.0;
    for(final box in geometry){text('${box.id}: ${box.flowCfm.toStringAsFixed(1)} CFM',box.min.x,box.max.y+.1);if(box.id.endsWith('DUCT')){text('${box.id} WIDTH=${(box.max.y-box.min.y).toStringAsFixed(2)} m DEPTH=$ductDepth m FLOW=${box.flowCfm.toStringAsFixed(1)} CFM',0,-row);row+=.5;}}
    pair(0,'ENDSEC');pair(0,'EOF');return b.toString();
  }
}
