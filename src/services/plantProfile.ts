import type {
  PlantCareInfo,
  PlantDiseaseInfo,
  PlantHealthProfile,
} from '@/types/identification'

export type PlantTraitGroup =
  | 'cactus'
  | 'fern'
  | 'orchid'
  | 'palm'
  | 'aquatic'
  | 'herb'
  | 'tropical'
  | 'general'

function textBlob(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function detectPlantTraitGroup(params: {
  scientificName: string
  family: string
  genus?: string | null
}): PlantTraitGroup {
  const blob = textBlob(params.scientificName, params.family, params.genus)

  if (
    /cact|succul|aloe|agave|crassul|euphorbi|sedum|echeveria|haworth|kalancho|sansevier|dracaena|opuntia|mammillaria|lithops/.test(
      blob,
    )
  ) {
    return 'cactus'
  }
  if (/fern|polypodi|adiantum|nephrolepis|pterid|asplenium|dryopter/.test(blob)) {
    return 'fern'
  }
  if (/orchid|phalaenopsis|dendrobium|cattleya|vanda/.test(blob)) {
    return 'orchid'
  }
  if (/palm|arecaceae|phoenix|chamaedorea|washingtonia|cocos/.test(blob)) {
    return 'palm'
  }
  if (/nymphaea|lemna|pistia|water|aquatic|hydrocharit|potamogeton/.test(blob)) {
    return 'aquatic'
  }
  if (
    /lamiaceae|mentha|ocimum|rosmarinus|thymus|origanum|petroselin|coriandrum/.test(
      blob,
    )
  ) {
    return 'herb'
  }
  if (
    /musa|monstera|philodendron|calathea|maranta|alocasia|colocasia|ficus|hibiscus/.test(
      blob,
    )
  ) {
    return 'tropical'
  }
  return 'general'
}

const CARE_BY_GROUP: Record<PlantTraitGroup, PlantCareInfo> = {
  cactus: {
    watering: 'ري متباعد؛ اترك التربة تجف تماماً بين الريات وتجنب تجمع الماء.',
    wateringSchedule: 'كل ١٠–٢١ يوماً صيفاً، وأقل شتاءً — فقط بعد جفاف كامل للتربة.',
    light: 'ضوء ساطع مباشر إلى شمس كاملة معظم اليوم.',
    temperature: '١٨–٣٢°م مع حماية من الصقيع.',
    humidity: 'رطوبة منخفضة ٢٠–٤٠٪ — الهواء الجاف مناسب.',
    soil: 'تربة رملية خفيفة وسريعة التصريف مخصصة للصبار والعصاريات.',
    propagation: 'بالعُقل أو الفسائل بعد ترك الجرح يجف يوماً، ثم زراعتها في تربة جافة.',
  },
  fern: {
    watering: 'حافظ على رطوبة التربة دون إغراق؛ رش الأوراق لرفع الرطوبة.',
    wateringSchedule: '٢–٣ مرات أسبوعياً مع الحفاظ على رطوبة سطحية ثابتة.',
    light: 'ظل جزئي أو إضاءة ساطعة غير مباشرة — تجنّب الشمس الحارقة.',
    temperature: '١٦–٢٤°م مع رطوبة مرتفعة.',
    humidity: 'رطوبة عالية ٦٠–٨٠٪؛ استخدم مرذاذاً أو صينية حصى.',
    soil: 'تربة عضوية غنية جيدة الاحتفاظ بالرطوبة مع تصريف معتدل.',
    propagation: 'بقسمة التاج أو الأبواغ في بيئة رطبة ودافئة.',
  },
  orchid: {
    watering: 'ري معتدل عند جفاف الوسط؛ لا تترك الجذور في ماء راكد.',
    wateringSchedule: 'كل ٥–٧ أيام صيفاً، وكل ١٠–١٤ يوماً شتاءً حسب جفاف اللحاء.',
    light: 'إضاءة ساطعة غير مباشرة؛ تجنّب أشعة الظهيرة المباشرة.',
    temperature: '١٨–٢٨°م مع فرق طفيف بين الليل والنهار.',
    humidity: 'رطوبة ٥٠–٧٠٪ مع تهوية جيدة حول الجذور.',
    soil: 'وسط بساتين (لحاء / ألياف) جيد التهوية وسريع التصريف.',
    propagation: 'بقسمة الكعوب أو الفسائل الجانبية عند وجود جذور هوائية كافية.',
  },
  palm: {
    watering: 'ري منتظم مع السماح بسطح التربة بالجفاف قليلاً بين الريات.',
    wateringSchedule: 'مرة إلى مرتين أسبوعياً حسب حجم الأصيص وحرارة المكان.',
    light: 'شمس معتدلة إلى إضاءة ساطعة؛ بعض الأنواع تتحمل الظل الجزئي.',
    temperature: '١٨–٣٠°م بعيداً عن تيارات الهواء الباردة.',
    humidity: 'رطوبة معتدلة ٤٠–٦٠٪؛ رش الأوراق في الأجواء الجافة.',
    soil: 'تربة طميية جيدة التصريف غنية بالمواد العضوية.',
    propagation: 'بالبذور أو بفصل الفسائل القاعدية للأنواع التي تكوّنها.',
  },
  aquatic: {
    watering: 'يحتاج بيئة مائية دائمة أو تربة مشبعة حسب النوع.',
    wateringSchedule: 'مستوى ماء ثابت؛ جدّد جزءاً من الماء أسبوعياً.',
    light: 'شمس كاملة إلى جزئية بحسب نوع النبات المائي.',
    temperature: '١٨–٢٨°م في مياه نظيفة جيدة التهوية.',
    humidity: 'رطوبة محيطية مرتفعة طبيعية فوق سطح الماء.',
    soil: 'وسط مائي أو طين مائي مخصص للنباتات المائية.',
    propagation: 'بالتقسيم أو المدادات أو العقل العائمة حسب النوع.',
  },
  herb: {
    watering: 'ري منتظم عند جفاف السطح؛ تجنّب الإفراط ليبقى الطعم مركزاً.',
    wateringSchedule: 'كل ٢–٤ أيام في الطقس الدافئ عند جفاف السطح.',
    light: 'شمس كاملة ٦ ساعات يومياً على الأقل.',
    temperature: '١٥–٢٨°م في مكان جيد التهوية.',
    humidity: 'رطوبة ٣٠–٥٠٪ مع تهوية لتقليل الفطريات.',
    soil: 'تربة خفيفة خصبة جيدة التصريف.',
    propagation: 'بالعقل الطرفية أو البذور في تربة خفيفة رطبة قليلاً.',
  },
  tropical: {
    watering: 'ري معتدل عند جفاف السطح؛ حافظ على رطوبة جوية معتدلة.',
    wateringSchedule: 'كل ٤–٧ أيام؛ زد التكرار في الحر وقلّله في البرد.',
    light: 'إضاءة ساطعة غير مباشرة؛ تجنّب الحرق من الشمس المباشرة.',
    temperature: '١٨–٢٩°م بعيداً عن البرودة المفاجئة.',
    humidity: 'رطوبة ٥٠–٧٠٪؛ مفيد قرب مرطب أو تجميع نباتات.',
    soil: 'تربة غنية جيدة التصريف مع مادة عضوية.',
    propagation: 'بعقل الساق في ماء أو تربة رطبة مع رطوبة محيطية مرتفعة.',
  },
  general: {
    watering: 'ري معتدل عند جفاف الطبقة السطحية من التربة؛ تجنّب الإفراط.',
    wateringSchedule: 'كل ٥–٨ أيام كمعدل عام، مع التحقق من جفاف السطح أولاً.',
    light: 'إضاءة ساطعة غير مباشرة إلى شمس معتدلة حسب تحمّل النوع.',
    temperature: '١٦–٢٨°م في بيئة مستقرة بعيداً عن التيارات القاسية.',
    humidity: 'رطوبة ٤٠–٦٠٪ مناسبة لمعظم النباتات المنزلية.',
    soil: 'تربة زراعية جيدة التصريف غنية بالمواد العضوية.',
    propagation: 'بالعقل أو التقسيم أو البذور حسب سهولة إكثار النوع.',
  },
}

function disease(
  id: string,
  name: string,
  symptoms: string,
  prevention: string,
  treatment: string,
  severity: PlantDiseaseInfo['severity'],
): PlantDiseaseInfo {
  return { id, name, symptoms, prevention, treatment, severity }
}

const DISEASES_BY_GROUP: Record<
  PlantTraitGroup,
  { summary: string; diseases: PlantDiseaseInfo[] }
> = {
  cactus: {
    summary:
      'العصاريات حساسة لتعفن الجذور من الري الزائد والآفات الثاقبة في الأجواء الرطبة.',
    diseases: [
      disease(
        'cactus-root-rot',
        'تعفن الجذور',
        'لين في الساق عند القاعدة، اصفرار، ورائحة كريهة من التربة.',
        'تربة سريعة التصريف وري بعد الجفاف الكامل فقط.',
        'أزل الأجزاء المصابة، جفّف النبات، وأعد زراعته في تربة جديدة جافة.',
        'high',
      ),
      disease(
        'cactus-mealybug',
        'البق الدقيقي',
        'كتل قطنية بيضاء في الشقوق وبين الأشواك.',
        'فحص دوري وعزل النباتات الجديدة.',
        'مسح بالكحول المخفف أو مبيد حشري مناسب للصبار مع تكرار العلاج.',
        'medium',
      ),
      disease(
        'cactus-sunburn',
        'حروق الشمس المفاجئة',
        'بقع شاحبة أو بنية على الجانب المعرّض للضوء القوي فجأة.',
        'أقلم النبات تدريجياً على الشمس المباشرة.',
        'انقل إلى ظل جزئي مؤقت واترك الأنسجة تتعافى دون تقليم مبكر.',
        'low',
      ),
    ],
  },
  fern: {
    summary: 'السراخس تتأثر بجفاف الهواء والبقع الفطرية عند سوء التهوية.',
    diseases: [
      disease(
        'fern-browning',
        'احتراق أطراف الأوراق',
        'أطراف بنية جافة مع بقاء مركز الورقة أخضر.',
        'حافظ على رطوبة عالية وتجنّب الهواء الجاف من المكيفات.',
        'قص الأطراف التالفة وارفع الرطوبة مع ري منتظم غير مفرط.',
        'medium',
      ),
      disease(
        'fern-fungal',
        'تبقع فطري',
        'بقع داكنة أو رمادية على الأوراق السفلية.',
        'تهوية جيدة وتجنّب تبليل الأوراق ليلاً بكثافة.',
        'أزل الأوراق المصابة واستخدم مبيداً فطرياً مناسباً عند الحاجة.',
        'medium',
      ),
      disease(
        'fern-scale',
        'الحشرات القشرية',
        'درنات صغيرة ثابتة على الأعناق والسطح السفلي.',
        'فحص دوري وتنظيف الأوراق بقطعة مبللة.',
        'إزالة يدوية ثم زيت بستاني أو مبيد جهازي لطيف.',
        'low',
      ),
    ],
  },
  orchid: {
    summary: 'بساتين الفاكهة تتضرر غالباً من تعفن التاج وسوء التهوية حول الجذور.',
    diseases: [
      disease(
        'orchid-crown-rot',
        'تعفن التاج',
        'اسوداد وليونية في مركز الأوراق مع تساقطها.',
        'لا تترك ماءً راكداً في تاج النبات بعد الري.',
        'جفّف التاج فوراً، أزل الأنسجة الميتة، وعالج بمبيد فطري.',
        'high',
      ),
      disease(
        'orchid-root-rot',
        'تعفن الجذور',
        'جذور طرية بنية ورائحة عفنة مع ذبول عام.',
        'وسط لحاء جيد التهوية وري عند الجفاف فقط.',
        'قص الجذور التالفة وأعد الزرع في وسط جديد نظيف.',
        'high',
      ),
      disease(
        'orchid-mites',
        'العناكب الحمراء',
        'نقاط صفراء ونسيج رفيع على السطح السفلي للأوراق.',
        'رطوبة معتدلة ورش وقائي دوري للسطح السفلي.',
        'اغسل الأوراق وعالج بمبيد عناكب مناسب للبساتين.',
        'medium',
      ),
    ],
  },
  palm: {
    summary: 'النخيل المنزلي يعاني غالباً من نقص المغذيات والآفات الثاقبة.',
    diseases: [
      disease(
        'palm-tip-burn',
        'احتراق أطراف السعف',
        'أطراف بنية جافة تنتشر للداخل تدريجياً.',
        'ماء غير عالي الأملاح ورطوبة معتدلة.',
        'قص الأطراف فقط، عدّل الري، واشطف التربة من الأملاح إن لزم.',
        'medium',
      ),
      disease(
        'palm-spider-mites',
        'العناكب',
        'اصفرار منقط ونسيج ناعم بين السعفات.',
        'رش دوري وزيادة الرطوبة حول النبات.',
        'غسيل قوي للسعف ثم مبيد عناكب عند الإصابة الشديدة.',
        'medium',
      ),
      disease(
        'palm-nutrient',
        'نقص المغذيات',
        'اصفرار بين العروق أو شحوب عام في الأوراق الجديدة.',
        'تسميد متوازن للنخيل حسب الموسم.',
        'سماد غني بالمغنيسيوم والبوتاسيوم مع تصحيح الري.',
        'low',
      ),
    ],
  },
  aquatic: {
    summary: 'النباتات المائية حساسة لسوء جودة الماء ونمو الطحالب.',
    diseases: [
      disease(
        'aquatic-algae',
        'ازدهار الطحالب',
        'طبقة خضراء على الماء أو على الأوراق الطافية.',
        'إضاءة متوازنة وتجديد جزئي منتظم للماء.',
        'أزل الطحالب يدوياً وخفّض الإضاءة الزائدة ونظّف الحاوية.',
        'medium',
      ),
      disease(
        'aquatic-rot',
        'تعفن الأنسجة المغمورة',
        'أنسجة طرية داكنة وتفكك في الأجزاء تحت الماء.',
        'ماء نظيف جيد التهوية وتجنّب الازدحام الشديد.',
        'أزل الأجزاء التالفة وجدّد الماء وقلّل الكثافة النباتية.',
        'high',
      ),
      disease(
        'aquatic-nutrient',
        'اضطراب المغذيات',
        'اصفرار أو نمو ضعيف رغم توفر الماء.',
        'توازن مغذيات مناسب للنباتات المائية.',
        'أضف سماداً مائياً متوازناً حسب تعليمات النوع.',
        'low',
      ),
    ],
  },
  herb: {
    summary: 'الأعشاب العطرية تتأثر بالبياض الدقيقي عند الرطوبة الراكدة.',
    diseases: [
      disease(
        'herb-powdery',
        'البياض الدقيقي',
        'طبقة بيضاء بودرية على الأوراق والسيقان.',
        'تهوية جيدة وتباعد النباتات وتجنّب الري العلوي ليلاً.',
        'أزل الأوراق المصابة ورش محلول صودا الخبز المخفف أو مبيد فطري.',
        'medium',
      ),
      disease(
        'herb-aphids',
        'المنّ',
        'حشرات صغيرة على النمو الجديد مع ندوة عسلية.',
        'فحص القمم النامية وإدخال تهوية جيدة.',
        'رش بماء وصابون لطيف أو زيت النيم مع تكرار قصير.',
        'medium',
      ),
      disease(
        'herb-root-stress',
        'إجهاد الجذور من الإفراط',
        'ذبول مع تربة رطبة واصفرار سفلي.',
        'تربة جيدة التصريف وري عند جفاف السطح.',
        'حسّن التصريف وقلّل الري حتى تعود الحيوية.',
        'low',
      ),
    ],
  },
  tropical: {
    summary:
      'النباتات الاستوائية الداخلية حساسة للجفاف الهوائي والبقع البكتيرية/الفطرية.',
    diseases: [
      disease(
        'tropical-leaf-spot',
        'تبقع الأوراق',
        'بقع بنية أو سوداء محاطة بهالة صفراء.',
        'تجنّب تبليل الأوراق باستمرار وحسّن التهوية.',
        'أزل الأوراق المصابة واستخدم مبيداً فطرياً عند الانتشار.',
        'medium',
      ),
      disease(
        'tropical-thrips',
        'التربس',
        'خطوط فضية وتشوه في الأوراق الحديثة.',
        'فحص دوري وعزل النباتات الجديدة.',
        'مصائد لاصقة ومبيد مناسب مع تكرار العلاج.',
        'medium',
      ),
      disease(
        'tropical-edema',
        'وذمة الري / الرطوبة',
        'نتوءات فلينية على السطح السفلي للأوراق.',
        'ري متوازن وإضاءة كافية مع فرق أقل بين الليل والنهار الرطب.',
        'عدّل جدول الري وحسّن الإضاءة؛ البقع القديمة لا تزول لكن النمو الجديد يتحسن.',
        'low',
      ),
    ],
  },
  general: {
    summary:
      'الملف الصحي العام يغطي أكثر المشكلات شيوعاً للنباتات المنزلية والخارجية.',
    diseases: [
      disease(
        'general-overwater',
        'تعفن الجذور من الإفراط بالري',
        'اصفرار وذبول مع تربة رطبة باستمرار.',
        'تحقق من جفاف السطح قبل كل ري وتصريف جيد للأصيص.',
        'أوقف الري مؤقتاً، حسّن التصريف، واستبدل التربة إن لزم.',
        'high',
      ),
      disease(
        'general-powdery',
        'البياض الدقيقي',
        'غبار أبيض على الأوراق يقلل كفاءة التمثيل الضوئي.',
        'تهوية ومسافات كافية بين النباتات.',
        'إزالة الأوراق المصابة ورش علاجي مناسب.',
        'medium',
      ),
      disease(
        'general-pests',
        'الآفات الثاقبة الماصة',
        'ندوة عسلية، تشوه النمو، أو حشرات مرئية على الأعناق.',
        'فحص أسبوعي وعزل الإصابات المبكرة.',
        'تنظيف ميكانيكي ثم صابون حشري أو زيت نيم حسب شدة الإصابة.',
        'medium',
      ),
    ],
  },
}

/**
 * Build structured Arabic care tips from taxonomy signals.
 * Pl@ntNet does not return care fields — derived from family / genus / name.
 */
export function buildCareInfo(params: {
  scientificName: string
  family: string
  genus?: string | null
}): PlantCareInfo {
  const group = detectPlantTraitGroup(params)
  return { ...CARE_BY_GROUP[group] }
}

export function buildHealthProfile(params: {
  scientificName: string
  family: string
  genus?: string | null
}): PlantHealthProfile {
  const group = detectPlantTraitGroup(params)
  const pack = DISEASES_BY_GROUP[group]
  return {
    summary: pack.summary,
    diseases: pack.diseases.map((d) => ({ ...d })),
  }
}

export function careInfoToGuide(care: PlantCareInfo): string {
  return [
    `الري: ${care.watering}`,
    `جدول الري: ${care.wateringSchedule}`,
    `الإضاءة: ${care.light}`,
    `درجة الحرارة: ${care.temperature}`,
    `الرطوبة: ${care.humidity}`,
    `التربة: ${care.soil}`,
    `الإكثار: ${care.propagation}`,
  ].join('\n')
}
