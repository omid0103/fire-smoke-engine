import 'package:flutter_test/flutter_test.dart';
import 'package:rabin_engineering/catalog.dart';
void main(){
 test('Persian and Arabic mobile numbers normalize to E164',(){
 expect(normalizePhone('۰۹۱۲۱۲۳۴۵۶۷'),'+989121234567');
 expect(normalizePhone('٠٩١٢١٢٣٤٥٦٧'),'+989121234567');
 expect(normalizePhone('00989121234567'),'+989121234567');
 expect(()=>normalizePhone('123'),throwsFormatException);
 });
 test('Numerical engineering inputs reject nonfinite and malformed values',(){
 const f=InputField('x','value','','');
 expect(parseField(f,'۱۲٫۵'),12.5);
 for(final bad in ['NaN','Infinity','1e999','not a number','']){expect(()=>parseField(f,bad),throwsFormatException);}
 expect(parseField(const InputField('x','value','','',optional:true),''),isNull);
 });
 test('Catalog uses unique engine module names and field keys',(){
 expect(models.map((m)=>m.key).toSet().length,13);
 for(final m in models){expect(m.fields.map((f)=>f.key).toSet().length,m.fields.length);}
 expect(models.first.collections['zones']!.map((f)=>f.key),contains('fire_ach'));
 });
}
