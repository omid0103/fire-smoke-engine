import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rabin_engineering/parking_design.dart';
import 'package:rabin_engineering/parking_design_page.dart';

ParkingDesign fixture({double length=30,double bottom=2.4,double supply=7200,double sy=16,double ey=4,int outlets=6})=>ParkingDesign(length:length,width:20,height:3,area:600,exhaustCfm:12000,supplyCfm:supply,ductDepth:.3,ductBottom:bottom,velocity:10,exhaustY:ey,supplyY:sy,minClearance:2.2,outlets:outlets,fanAtEnd:false,reference:'TEST-FIXTURE-NOT-A-PROJECT');
void main(){
 test('Geometry rejects stale area, out-of-room ducts, collisions, invalid height and counts',(){
  expect(fixture().validate(),isEmpty);
  for(final d in [fixture(length:40),fixture(bottom:2.9),fixture(bottom:2),fixture(sy:4.1),fixture(ey:0),fixture(outlets:41),fixture(length:double.nan)]){expect(d.validate(),isNotEmpty);expect(()=>d.dxf(),throwsFormatException);}
 });
 test('Duct velocity upper bound and outlet conservation are preserved',(){
  final d=fixture();expect(d.exhaustCfm/2118.880003/(d.ductWidth(d.exhaustCfm)*d.ductDepth),lessThanOrEqualTo(d.velocity));
  final outlets=d.boxes.where((b)=>b.layer=='EXHAUST_OUTLET');expect(outlets.length,6);expect(outlets.fold<double>(0,(sum,b)=>sum+b.flowCfm),closeTo(12000,1e-6));
  expect(fixture(supply:0).boxes.every((b)=>!b.layer.startsWith('SUPPLY')),isTrue);
 });
 test('DXF exports both plans with source and explicit units',(){
  Directory('test/artifacts').createSync(recursive:true);
  for(final threeD in [false,true]){final text=fixture().dxf(threeD:threeD);expect(text,contains('TEST-FIXTURE'));expect(text,contains('\$INSUNITS\n70\n6'));expect(text,endsWith('0\nEOF\n'));File('test/artifacts/parking-${threeD?'3d':'2d'}.dxf').writeAsStringSync(text);}
 });
 testWidgets('Required inputs, generated preview and stale export invalidation',(tester)async{
  await tester.binding.setSurfaceSize(const Size(900,2200));
  addTearDown(()=>tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(MaterialApp(home:ParkingDesignPage(reference:'TEST',calculation:{'zones':[{'inputs':{'area_m2':600,'height_m':3},'results':{'design_exhaust_cfm':12000,'makeup_air_cfm':7200},'warnings':<String>[]}],'warnings':<String>[]})));
  final generate=find.text('ساخت شماتیک سه‌بعدی');await tester.ensureVisible(generate);await tester.tap(generate);await tester.pump();expect(find.text('پیش‌نیازهای طرح اولیه را تأیید کنید.'),findsOneWidget);
  for(final e in {'length':'۳۰','width':'۲۰','depth':'0.3','bottom':'2.4','clearance':'2.2','velocity':'10','exhaustY':'4','supplyY':'16','outlets':'6'}.entries){final f=find.byKey(ValueKey(e.key));await tester.ensureVisible(f);await tester.enterText(f,e.value);}
  await tester.ensureVisible(find.byType(CheckboxListTile));await tester.tap(find.byType(CheckboxListTile));await tester.pump();await tester.ensureVisible(generate);await tester.tap(generate);await tester.pumpAndSettle();
  final preview=find.byKey(const ValueKey('parking-preview'));await tester.ensureVisible(preview);await tester.pumpAndSettle();expect(preview,findsOneWidget);expect(tester.takeException(),isNull);
  await expectLater(preview,matchesGoldenFile('artifacts/parking-preview.png'));
  final length=find.byKey(const ValueKey('length'));await tester.ensureVisible(length);await tester.enterText(length,'31');await tester.pump();expect(find.text('ذخیره / اشتراک نقشه دوبعدی DXF'),findsNothing);
 });
}
