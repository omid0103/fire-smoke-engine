import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'catalog.dart';
import 'parking_design_page.dart';

const backend=String.fromEnvironment('SUPABASE_URL',defaultValue:'https://ezbdoudxtgqqewkrzzyg.supabase.co');
const publicKey=String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY',defaultValue:'sb_publishable_AmZGxbLa-suJaeoZekEkBA_TSN5iGm6');
final api=Api();
class SecureSession extends LocalStorage {
 final storage=const FlutterSecureStorage();
 @override Future<void> initialize() async {}
 @override Future<String?> accessToken()=>storage.read(key:'rabin.auth.session.v1');
 @override Future<bool> hasAccessToken() async =>await accessToken()!=null;
 @override Future<void> persistSession(String session)=>storage.write(key:'rabin.auth.session.v1',value:session);
 @override Future<void> removePersistedSession()=>storage.delete(key:'rabin.auth.session.v1');
}
Future<void> main() async {
 WidgetsFlutterBinding.ensureInitialized();
 try {
  await Supabase.initialize(url:backend,publishableKey:publicKey,authOptions:FlutterAuthClientOptions(localStorage:SecureSession()));
  runApp(const RabinApp());
 }catch(_){runApp(const MaterialApp(home:Scaffold(body:Center(child:Text('راه‌اندازی امن انجام نشد. برنامه را دوباره باز کنید.')))));}
}
class Api {
 SupabaseClient get client=>Supabase.instance.client;
 Future<Map<String,dynamic>> billing([String action='status',Map<String,dynamic> payload=const {}]) async =>Map<String,dynamic>.from(await client.rpc('billing',params:{'action':action,'payload':payload}) as Map);
 Future<List<Map<String,dynamic>>> projects() async =>await client.from('engineering_projects').select().order('updated_at',ascending:false);
 Future<List<Map<String,dynamic>>> reports() async =>await client.from('design_runs').select().order('created_at',ascending:false).limit(100);
 Future<Map<String,dynamic>> calculate(String module,Map<String,dynamic> input,String? project) async {
  if(await client.rpc('has_subscription')!=true)throw const FormatException('اشتراک فعال برای محاسبات جدید لازم است.');
  final r=await client.functions.invoke('calculate',body:{'module':module,'input':input,if(project!=null)'project_id':project});
  final data=Map<String,dynamic>.from(r.data as Map);
  if(data['ok']!=true)throw FormatException('${data['error']??'محاسبه انجام نشد.'}');
  return data;
 }
}
String messageFor(Object e){
 if(e is AuthException)return e.message;
 if(e is PostgrestException)return e.message;
 if(e is FormatException)return e.message;
 if(e is FunctionException){final d=e.details;return d is Map?'${d['error']??'خطای سرویس محاسبات'}':'خطای سرویس محاسبات';}
 return 'ارتباط کامل نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.';
}
String date(dynamic v){final d=DateTime.tryParse('$v')?.toLocal();return d==null?'—':'${d.year}/${d.month}/${d.day}';}
void showError(BuildContext context,Object error)=>ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(messageFor(error))));
Future<T?> open<T>(BuildContext c,Widget page)=>Navigator.of(c).push<T>(MaterialPageRoute(builder:(_)=>page));
class RabinApp extends StatelessWidget {
 const RabinApp({super.key});
 @override Widget build(BuildContext context)=>MaterialApp(debugShowCheckedModeBanner:false,title:'رابین آذر',locale:const Locale('fa'),supportedLocales:const [Locale('fa')],localizationsDelegates:GlobalMaterialLocalizations.delegates,
 theme:ThemeData(brightness:Brightness.dark,useMaterial3:true,colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xffb62638),brightness:Brightness.dark),scaffoldBackgroundColor:const Color(0xff11151d),inputDecorationTheme:const InputDecorationTheme(border:OutlineInputBorder())),home:const SessionGate());
}
class SessionGate extends StatefulWidget {const SessionGate({super.key});@override State<SessionGate> createState()=>_SessionGateState();}
class _SessionGateState extends State<SessionGate>{
 StreamSubscription<AuthState>? sub;bool recovery=false;
 @override void initState(){super.initState();sub=api.client.auth.onAuthStateChange.listen((s){if(mounted)setState((){if(s.event==AuthChangeEvent.passwordRecovery)recovery=true;});});}
 @override void dispose(){sub?.cancel();super.dispose();}
 @override Widget build(BuildContext context)=>recovery?PasswordPage(onDone:()=>setState(()=>recovery=false)):api.client.auth.currentSession==null?const LoginPage():HomePage(key:ValueKey(api.client.auth.currentUser!.id));
}
class LoginPage extends StatefulWidget{const LoginPage({super.key});@override State<LoginPage> createState()=>_LoginPageState();}
class _LoginPageState extends State<LoginPage>{
 final email=TextEditingController(),password=TextEditingController(),phone=TextEditingController(),code=TextEditingController();
 bool sms=false,signup=false,busy=false;String? sentPhone;String message='';DateTime? retryAt;Timer? timer;int wait=0;
 @override void dispose(){for(final c in [email,password,phone,code]){c.dispose();}timer?.cancel();super.dispose();}
 Future<void> act(Future<void> Function() fn)async{if(busy)return;setState((){busy=true;message='';});try{await fn();}catch(e){if(mounted)setState(()=>message=messageFor(e));}finally{if(mounted)setState(()=>busy=false);}}
 Future<void> send()async{
  if(wait>0)throw const FormatException('برای ارسال مجدد صبر کنید.');
  final n=normalizePhone(phone.text);await api.client.auth.signInWithOtp(phone:n);
  if(!mounted)return;setState((){sentPhone=n;retryAt=DateTime.now().add(const Duration(seconds:60));wait=60;message='کد پیامک‌شده را وارد کنید.';});
  timer?.cancel();timer=Timer.periodic(const Duration(seconds:1),(t){if(!mounted){t.cancel();return;}setState(()=>wait=retryAt!.difference(DateTime.now()).inSeconds.clamp(0,60));if(wait==0)t.cancel();});
 }
 Future<void> submit()async=>act(()async{
  if(sms){if(sentPhone==null){await send();}else{await api.client.auth.verifyOTP(phone:sentPhone,token:latinDigits(code.text).trim(),type:OtpType.sms);}}
  else if(signup){await api.client.auth.signUp(email:email.text.trim(),password:password.text);if(mounted)setState(()=>message='اگر تأیید ایمیل لازم باشد، لینک ارسال‌شده را باز کنید.');}
  else{await api.client.auth.signInWithPassword(email:email.text.trim(),password:password.text);}
 });
 @override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(padding:const EdgeInsets.all(24),child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:480),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
 const Icon(Icons.local_fire_department,size:72,color:Colors.redAccent),const Text('رابین آذر',textAlign:TextAlign.center,style:TextStyle(fontSize:30,fontWeight:FontWeight.bold)),const Text('محاسبات مهندسی حریق',textAlign:TextAlign.center),const SizedBox(height:24),
 SegmentedButton<bool>(segments:const [ButtonSegment(value:false,label:Text('ایمیل')),ButtonSegment(value:true,label:Text('موبایل'))],selected:{sms},onSelectionChanged:busy?null:(v)=>setState((){sms=v.first;message='';})),const SizedBox(height:16),
 if(sms)...[TextField(controller:phone,enabled:!busy&&sentPhone==null,keyboardType:TextInputType.phone,textDirection:TextDirection.ltr,decoration:const InputDecoration(labelText:'شماره موبایل')),if(sentPhone!=null)...[const SizedBox(height:12),TextField(controller:code,enabled:!busy,keyboardType:TextInputType.number,autofillHints:const [AutofillHints.oneTimeCode],decoration:const InputDecoration(labelText:'کد یک‌بارمصرف')),TextButton(onPressed:busy||wait>0?null:()=>act(send),child:Text(wait>0?'ارسال مجدد در $wait ثانیه':'ارسال مجدد')),TextButton(onPressed:busy?null:()=>setState((){sentPhone=null;code.clear();}),child:const Text('ویرایش شماره'))],const Text('حساب موبایل و ایمیل به‌صورت خودکار ادغام نمی‌شوند.')]
 else...[TextField(controller:email,enabled:!busy,keyboardType:TextInputType.emailAddress,autofillHints:const [AutofillHints.email],textDirection:TextDirection.ltr,decoration:const InputDecoration(labelText:'ایمیل')),const SizedBox(height:12),TextField(controller:password,enabled:!busy,obscureText:true,autofillHints:const [AutofillHints.password],decoration:const InputDecoration(labelText:'رمز عبور'))],
 const SizedBox(height:16),if(message.isNotEmpty)Text(message,semanticsLabel:message),FilledButton(onPressed:busy?null:submit,child:Text(busy?'در حال پردازش…':sms?(sentPhone==null?'دریافت کد':'تأیید کد'):signup?'ایجاد حساب':'ورود')),
 if(!sms)...[TextButton(onPressed:busy?null:()=>setState(()=>signup=!signup),child:Text(signup?'ورود به حساب موجود':'ایجاد حساب جدید')),TextButton(onPressed:busy?null:()=>act(()async{if(!email.text.contains('@'))throw const FormatException('ابتدا ایمیل حساب را وارد کنید.');await api.client.auth.resetPasswordForEmail(email.text.trim(),redirectTo:'https://engin.rabinazar.ir/login');if(mounted)setState(()=>message='در صورت وجود حساب، لینک بازیابی ارسال می‌شود. آن را در مرورگر باز کنید.');}),child:const Text('بازیابی رمز با ایمیل'))],
 const Text('ابزار کمک‌مهندسی؛ تأیید نهایی طرح نیازمند بازبینی متخصص و مرجع ذی‌صلاح است.')]))))));
}
class PasswordPage extends StatefulWidget{final VoidCallback onDone;const PasswordPage({super.key,required this.onDone});@override State<PasswordPage> createState()=>_PasswordPageState();}
class _PasswordPageState extends State<PasswordPage>{final password=TextEditingController(),repeat=TextEditingController();bool busy=false;@override void dispose(){password.dispose();repeat.dispose();super.dispose();}
 @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('رمز جدید')),body:ListView(padding:const EdgeInsets.all(20),children:[TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'رمز جدید حداقل ۱۲ نویسه')),TextField(controller:repeat,obscureText:true,decoration:const InputDecoration(labelText:'تکرار رمز')),FilledButton(onPressed:busy?null:()async{if(password.text.length<12||password.text!=repeat.text){showError(context,const FormatException('رمزها باید یکسان و حداقل ۱۲ نویسه باشند.'));return;}setState(()=>busy=true);try{await api.client.auth.updateUser(UserAttributes(password:password.text));await api.client.auth.signOut();if(mounted)widget.onDone();}catch(e){if(context.mounted)showError(context,e);}finally{if(mounted)setState(()=>busy=false);}},child:const Text('ذخیره رمز'))]));}

class HomePage extends StatefulWidget{const HomePage({super.key});@override State<HomePage> createState()=>_HomePageState();}
class _HomePageState extends State<HomePage>{int index=0;
 @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('رابین آذر'),actions:[IconButton(tooltip:'خروج',icon:const Icon(Icons.logout),onPressed:()async{try{await api.client.auth.signOut();}catch(e){if(context.mounted)showError(context,e);}})]),body:IndexedStack(index:index,children:const [ProjectsPage(),ModelsPage(),ReportsPage(),BillingPage()]),bottomNavigationBar:NavigationBar(selectedIndex:index,onDestinationSelected:(v)=>setState(()=>index=v),destinations:const [NavigationDestination(icon:Icon(Icons.folder_outlined),label:'پروژه‌ها'),NavigationDestination(icon:Icon(Icons.calculate_outlined),label:'محاسبات'),NavigationDestination(icon:Icon(Icons.description_outlined),label:'گزارش‌ها'),NavigationDestination(icon:Icon(Icons.verified_user_outlined),label:'اشتراک')]));
}
class LoadPanel extends StatelessWidget{final AsyncSnapshot<dynamic> snapshot;final VoidCallback retry;final Widget Function(dynamic) builder;const LoadPanel({super.key,required this.snapshot,required this.retry,required this.builder});
 @override Widget build(BuildContext context){if(snapshot.connectionState!=ConnectionState.done)return const Center(child:CircularProgressIndicator());if(snapshot.hasError)return Center(child:Column(mainAxisSize:MainAxisSize.min,children:[Text(messageFor(snapshot.error!)),TextButton(onPressed:retry,child:const Text('تلاش مجدد'))]));return builder(snapshot.data);}}
class ProjectsPage extends StatefulWidget{const ProjectsPage({super.key});@override State<ProjectsPage> createState()=>_ProjectsPageState();}
class _ProjectsPageState extends State<ProjectsPage>{late Future<List<Map<String,dynamic>>> data=api.projects();void reload()=>setState(()=>data=api.projects());
 @override Widget build(BuildContext context)=>Column(children:[ListTile(title:const Text('پروژه‌های من'),trailing:IconButton(tooltip:'پروژه جدید',icon:const Icon(Icons.add),onPressed:()async{await open(context,const ProjectEditor());if(mounted)reload();})),Expanded(child:FutureBuilder(future:data,builder:(c,s)=>LoadPanel(snapshot:s,retry:reload,builder:(d)=>RefreshIndicator(onRefresh:()async{reload();await data;},child:ListView(physics:const AlwaysScrollableScrollPhysics(),children:[if((d as List).isEmpty)const Padding(padding:EdgeInsets.all(24),child:Text('پروژه‌ای ثبت نشده است.')),...d.map((p)=>Card(child:ListTile(title:Text('${p['name']}'),subtitle:Text('${p['city']??''} • ${p['building_use']??''}'),trailing:const Icon(Icons.edit_outlined),onTap:()async{await open(context,ProjectEditor(project:Map<String,dynamic>.from(p)));if(mounted)reload();})))])))))]);
}
class ProjectEditor extends StatefulWidget{final Map<String,dynamic>? project;const ProjectEditor({super.key,this.project});@override State<ProjectEditor> createState()=>_ProjectEditorState();}
class _ProjectEditorState extends State<ProjectEditor>{final fields=<String,TextEditingController>{};bool busy=false;final labels={'name':'نام پروژه','project_code':'کد پروژه','client_name':'کارفرما','city':'شهر','building_use':'کاربری','address_text':'آدرس','floors_above':'طبقات روی زمین','floors_below':'طبقات زیر زمین','total_area_m2':'مساحت m²'};
 @override void initState(){super.initState();for(final k in labels.keys){fields[k]=TextEditingController(text:'${widget.project?[k]??''}');}}
 @override void dispose(){for(final c in fields.values){c.dispose();}super.dispose();}
 Future<void> save()async{if(busy)return;setState(()=>busy=true);try{
 if(fields['name']!.text.trim().isEmpty)throw const FormatException('نام پروژه الزامی است.');
 final payload=<String,dynamic>{};for(final k in fields.keys){final v=fields[k]!.text.trim();if(k.startsWith('floors_')||k=='total_area_m2'){final n=v.isEmpty?0:num.tryParse(latinDigits(v));if(n==null||!n.isFinite||n<0||(k.startsWith('floors_')&&n!=n.round()))throw FormatException('${labels[k]} معتبر نیست.');payload[k]=n;}else{payload[k]=v.isEmpty?null:v;}}
 if(widget.project==null){final org=await api.client.rpc('bootstrap_default_organization');await api.client.from('engineering_projects').insert({...payload,'organization_id':org,'created_by':api.client.auth.currentUser!.id,'status':'active'});}else{await api.client.from('engineering_projects').update({...payload,'updated_at':DateTime.now().toUtc().toIso8601String()}).eq('id',widget.project!['id']).select('id').single();}
 if(mounted)Navigator.pop(context);
 }catch(e){if(mounted)showError(context,e);}finally{if(mounted)setState(()=>busy=false);}}
 @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(widget.project==null?'پروژه جدید':'ویرایش پروژه')),body:ListView(padding:const EdgeInsets.all(20),children:[...labels.entries.map((e)=>Padding(padding:const EdgeInsets.only(bottom:14),child:TextField(controller:fields[e.key],enabled:!busy,keyboardType:e.key.startsWith('floors_')||e.key=='total_area_m2'?const TextInputType.numberWithOptions(decimal:true):TextInputType.text,decoration:InputDecoration(labelText:e.value)))),FilledButton(onPressed:busy?null:save,child:Text(busy?'در حال ثبت…':'ذخیره'))]));
}
class ModelsPage extends StatelessWidget{const ModelsPage({super.key});@override Widget build(BuildContext context)=>ListView(children:[const Padding(padding:EdgeInsets.all(20),child:Text('مقادیر اولیه صرفاً نمونه‌اند. ورودی، سناریو و مبنای طراحی را برای پروژه تعیین کنید.')), ...models.map((m)=>Card(child:ListTile(leading:const Icon(Icons.calculate),title:Text(m.title),onTap:()=>open(context,CalculatorPage(model:m)))))]);}
class CalculatorPage extends StatefulWidget{final Model model;const CalculatorPage({super.key,required this.model});@override State<CalculatorPage> createState()=>_CalculatorPageState();}
class _CalculatorPageState extends State<CalculatorPage>{
 final values=<String,TextEditingController>{};final rows=<String,List<Map<String,TextEditingController>>>{};List<Map<String,dynamic>> projects=[];String? project;String? projectError;bool busy=false;Map<String,dynamic>? result;
 @override void initState(){super.initState();for(final f in widget.model.fields){values[f.key]=TextEditingController(text:f.value);}for(final c in widget.model.collections.entries){rows[c.key]=[newRow(c.value)];}loadProjects();}
 Map<String,TextEditingController> newRow(List<InputField> fs)=>{for(final f in fs)f.key:TextEditingController(text:f.value)};
 Future<void> loadProjects()async{try{final p=await api.projects();if(mounted)setState((){projects=p;projectError=null;});}catch(e){if(mounted)setState(()=>projectError=messageFor(e));}}
 @override void dispose(){for(final c in values.values){c.dispose();}for(final list in rows.values){for(final row in list){for(final c in row.values){c.dispose();}}}super.dispose();}
 Widget input(InputField f,TextEditingController c)=>Padding(padding:const EdgeInsets.only(bottom:12),child:f.choices.isNotEmpty?DropdownButtonFormField<String>(initialValue:c.text,decoration:InputDecoration(labelText:f.label),items:f.choices.map((v)=>DropdownMenuItem(value:v,child:Text({'single_zone':'حریق در یک زون','all_zones':'حریق هم‌زمان همه زون‌ها','smoke':'دودی','heat':'حرارتی'}[v]??v))).toList(),onChanged:busy?null:(v){c.text=v!;setState(()=>result=null);}):TextField(controller:c,enabled:!busy,textDirection:f.text?null:TextDirection.ltr,keyboardType:f.text?TextInputType.text:const TextInputType.numberWithOptions(decimal:true,signed:true),decoration:InputDecoration(labelText:'${f.label} ${f.unit}'),onChanged:(_)=>setState(()=>result=null)));
 Future<void> calculate()async{setState((){busy=true;result=null;});try{final data=<String,dynamic>{for(final f in widget.model.fields)f.key:parseField(f,values[f.key]!.text)};for(final c in widget.model.collections.entries){data[c.key]=rows[c.key]!.map((r)=>{for(final f in c.value)f.key:parseField(f,r[f.key]!.text)}).toList();}final response=await api.calculate(widget.model.key,data,project);if(mounted)setState(()=>result=response);}catch(e){if(mounted)showError(context,e);}finally{if(mounted)setState(()=>busy=false);}}
 @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(widget.model.title)),body:ListView(padding:const EdgeInsets.all(16),children:[
 const Text('نتیجه جایگزین تأیید نهایی طراحی نیست. مدل و حدود کاربرد را بررسی کنید.'),const SizedBox(height:16),
 if(projectError!=null)TextButton(onPressed:loadProjects,child:Text('$projectError — دریافت مجدد پروژه‌ها')),
 DropdownButtonFormField<String>(initialValue:project,decoration:const InputDecoration(labelText:'ذخیره در پروژه'),items:[const DropdownMenuItem(value:'',child:Text('محاسبه بدون ذخیره')),...projects.map((p)=>DropdownMenuItem(value:'${p['id']}',child:Text('${p['name']}')))],onChanged:busy?null:(v)=>setState((){project=v==''?null:v;result=null;})),const SizedBox(height:16),
 ...widget.model.fields.map((f)=>input(f,values[f.key]!)),
 ...widget.model.collections.entries.map((c)=>Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text({'zones':'زون‌ها','nodes':'گره‌ها','edges':'مسیرها'}[c.key]!),...rows[c.key]!.asMap().entries.map((r)=>Card(key:ObjectKey(r.value),child:Padding(padding:const EdgeInsets.all(12),child:Column(children:[Row(children:[Text('${r.key+1}'),const Spacer(),IconButton(tooltip:'حذف ردیف',onPressed:busy||rows[c.key]!.length<=1?null:(){setState((){rows[c.key]!.removeAt(r.key);result=null;});for(final v in r.value.values){v.dispose();}},icon:const Icon(Icons.delete_outline))]),...c.value.map((f)=>input(f,r.value[f.key]!))])))),TextButton.icon(onPressed:busy||rows[c.key]!.length>=(c.key=='edges'?200:60)?null:()=>setState((){rows[c.key]!.add(newRow(c.value));result=null;}),icon:const Icon(Icons.add),label:const Text('افزودن ردیف'))])),
 FilledButton(onPressed:busy?null:calculate,child:Text(busy?'در حال محاسبه…':'محاسبه روی سرور')),
 if(result!=null)...[Text('${result!['persistence']?['message']??'محاسبه بدون ذخیره'}'),ResultView(data:result!),if(widget.model.key=='parking_smoke_group')FilledButton.icon(onPressed:()=>open(context,ParkingDesignPage(calculation:Map<String,dynamic>.from(result!['calculation'] as Map),reference:'${result!["input_hash"]} / engine ${result!["engine_version"]}')),icon:const Icon(Icons.view_in_ar),label:const Text('طراحی اولیه و نقشه پارکینگ'))]
 ]));
}
class ResultView extends StatelessWidget{final Map<String,dynamic> data;const ResultView({super.key,required this.data});@override Widget build(BuildContext context){final c=data['calculation'] as Map?;return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[const SizedBox(height:16),Text('نسخه موتور: ${data['engine_version']??'—'}'),if(c!=null)...[const Text('خروجی‌ها'),JsonView(value:c['results']),const Text('هشدارها و دامنه مدل'),JsonView(value:c['warnings']),JsonView(value:c['source_profile']),const Text('ردیابی محاسبه'),JsonView(value:c['trace'])]else JsonView(value:data)]);}}
class JsonView extends StatelessWidget{final dynamic value;const JsonView({super.key,this.value});@override Widget build(BuildContext context){if(value==null)return const Text('—');if(value is Map)return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:(value as Map).entries.map((e)=>Card(child:Padding(padding:const EdgeInsets.all(10),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text('${e.key}',style:const TextStyle(fontWeight:FontWeight.bold)),JsonView(value:e.value)])))).toList());if(value is List)return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:(value as List).map((e)=>JsonView(value:e)).toList());return SelectableText('$value');}}
class ReportsPage extends StatefulWidget{const ReportsPage({super.key});@override State<ReportsPage> createState()=>_ReportsPageState();}
class _ReportsPageState extends State<ReportsPage>{late Future<List<Map<String,dynamic>>> data=api.reports();void reload()=>setState(()=>data=api.reports());@override Widget build(BuildContext context)=>FutureBuilder(future:data,builder:(c,s)=>LoadPanel(snapshot:s,retry:reload,builder:(d)=>RefreshIndicator(onRefresh:()async{reload();await data;},child:ListView(physics:const AlwaysScrollableScrollPhysics(),children:[const ListTile(title:Text('۱۰۰ گزارش اخیر — برای تازه‌سازی پایین بکشید')),if((d as List).isEmpty)const ListTile(title:Text('گزارشی ثبت نشده است.')),...d.map((r)=>ListTile(title:Text('${r['module_key']}'),subtitle:Text('${date(r['created_at'])} • ${r['status']}'),onTap:()=>open(context,Scaffold(appBar:AppBar(title:const Text('گزارش محاسبات')),body:ListView(padding:const EdgeInsets.all(20),children:[TextButton.icon(icon:const Icon(Icons.copy),label:const Text('کپی JSON گزارش'),onPressed:()=>Clipboard.setData(ClipboardData(text:const JsonEncoder.withIndent('  ').convert(r)))),const Text('گزارش شامل داده پروژه است؛ فقط با افراد مجاز به اشتراک بگذارید.'),JsonView(value:r)])))))]))));}
class BillingPage extends StatefulWidget{const BillingPage({super.key});@override State<BillingPage> createState()=>_BillingPageState();}
class _BillingPageState extends State<BillingPage>{late Future<Map<String,dynamic>> data=api.billing();void reload()=>setState(()=>data=api.billing());
 @override Widget build(BuildContext context)=>FutureBuilder(future:data,builder:(c,s)=>LoadPanel(snapshot:s,retry:reload,builder:(d){final v=d as Map<String,dynamic>;return RefreshIndicator(onRefresh:()async{reload();await data;},child:ListView(physics:const AlwaysScrollableScrollPhysics(),padding:const EdgeInsets.all(20),children:[Text(v['is_admin']==true?'حساب مدیر':v['active']==true?'اشتراک فعال':'اشتراک غیرفعال',style:Theme.of(context).textTheme.headlineSmall),Text('پایان اعتبار (میلادی): ${date(v['subscription']?['valid_until'])}'),const Text('پس از انقضا گزارش‌های ذخیره‌شده حفظ می‌شوند. تمدید خودکار وجود ندارد.'),const Text('این نسخه برای استفاده از اشتراک موجود است؛ خرید درون‌برنامه‌ای هنوز فعال نیست.'),const Divider(),const Text('سفارش‌های قبلی'),...(v['orders'] as List).map((o)=>Card(child:ListTile(title:Text('${o['months']} ماه — ${o['amount_toman']} تومان'),subtitle:Text('${o['status']}\n${o['review_note']??''}'))))]));}));
}
